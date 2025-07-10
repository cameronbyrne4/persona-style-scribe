// supabase/functions/style-transfer/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Style transfer function loaded");

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15; // 15 requests per minute per user (higher than RAG QA)

// In-memory rate limit store (in production, you'd use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting function
const checkRateLimit = (userId: string): { allowed: boolean; remaining: number; resetTime: number } => {
  const now = Date.now();
  const key = `style_transfer:${userId}`;
  const userLimit = rateLimitStore.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize rate limit
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetTime: now + RATE_LIMIT_WINDOW };
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: userLimit.resetTime };
  }

  // Increment count
  userLimit.count++;
  rateLimitStore.set(key, userLimit);
  
  return { 
    allowed: true, 
    remaining: RATE_LIMIT_MAX_REQUESTS - userLimit.count, 
    resetTime: userLimit.resetTime 
  };
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), {
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Parse request body
    const { inputText } = await req.json();
    
    if (!inputText || !inputText.trim()) {
      return new Response(JSON.stringify({ error: "Input text is required" }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    console.log("Setting up Supabase client");
    // Set up Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // Verify the user's token and get their actual user ID
    console.log("Verifying user token...");
    const { data: { user: verifiedUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !verifiedUser) {
      console.log("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Invalid authentication token" }), {
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }
    
    console.log("User verified:", verifiedUser.id);
    
    // Check rate limit
    const rateLimit = checkRateLimit(verifiedUser.id);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded. Please wait before making another request.",
        resetTime: rateLimit.resetTime
      }), {
        status: 429,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetTime.toString(),
        },
      });
    }
    
    // Fetch user's documents to understand their writing style
    console.log("Fetching user documents...");
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('extracted_text')
      .eq('user_id', verifiedUser.id)
      .order('uploaded_at', { ascending: false });
    
    if (docsError) {
      console.log("Error fetching documents:", docsError);
      return new Response(JSON.stringify({ error: "Failed to fetch user documents" }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }
    
    if (!documents || documents.length === 0) {
      return new Response(JSON.stringify({ error: "No writing samples found. Please upload some documents first." }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }
    
    console.log(`Found ${documents.length} documents`);
    console.log("calling anthropic api");
    // Combine all writing samples and clean them
    const writingSamples = documents.map(doc => {
      let text = doc.extracted_text;
      
      // Remove common header patterns
      text = text.replace(/^.*?(Introduction:|Abstract:|The Crucial Significance|Firstly,)/s, '$1');
      
      // Remove word count, date, course info at the beginning
      text = text.replace(/^.*?(Word Count:|Date:|Course:|Dr\.|Professor).*?\n/g, '');
      
      // Remove author name and course info patterns
      text = text.replace(/^.*?(Dr\.|Professor|SN\d+|Word Count:).*?\n/g, '');
      
      // Clean up any remaining header-like content
      text = text.replace(/^.*?(Introduction:|Abstract:|The Crucial Significance|Firstly,)/s, '$1');
      
      return text.trim();
    }).join('\n\n');
    
    // Prepare the prompt for AI
    const systemPrompt = `You are an expert linguistic analyst and stylistic chameleon. Your purpose is to meticulously analyze a provided writing sample and then rewrite a new piece of text to perfectly match the original author's style in every discernible way.

You will be given two pieces of text: a sample to learn from, and a text to rewrite.

1. **Analyze the Writing Sample:** First, you will silently and internally analyze the text provided within the \`<sample>\` tags. You are to deconstruct the author's stylistic fingerprint, paying close attention to:
   * **Vocabulary:** Extract and memorize the specific vocabulary, word choices, and terminology used by the author. You MUST use ONLY words that appear in the sample text or very close synonyms of those words. Do NOT introduce any vocabulary that is more sophisticated or complex than what the author uses.
   * **Sentence Structure:** Average sentence length, rhythm, and the mix of simple, compound, and complex sentences.
   * **Punctuation:** Common habits, such as the use of em-dashes, semicolons, or Oxford commas.
   * **Tone:** The overall voice (e.g., academic, casual, critical, enthusiastic).
   * **Transitions:** How ideas are linked (e.g., "Furthermore," "However," "On the other hand,").

2. **Rewrite the Target Text:** Next, you will rewrite the text provided within the \`<rewrite>\` tags. You must apply the precise stylistic fingerprint you analyzed in the first step. The goal is for the new text to sound as if the original author wrote it. **CRITICAL:** Do NOT reference, mention, or incorporate any topics, subjects, or content from the sample text. The sample text is ONLY for learning writing style - ignore its subject matter completely.

**CRITICAL OUTPUT REQUIREMENTS:**

* **Vocabulary Constraint:** You MUST use ONLY vocabulary that appears in the sample text or very close synonyms. Do NOT introduce any words that are more sophisticated, complex, or academic than what the author uses in their writing samples. If the author uses simple, everyday language, stick to simple, everyday language. **CRITICAL:** Match the simplicity and formality level of the input text, not the writing samples. If the input is casual and simple, keep the output casual and simple regardless of the sample text's complexity.
* **Length Parity:** The word count of your rewritten text MUST be within 10-20% of the word count of the original text in the \`<rewrite>\` tags. Do not add new concepts, arguments, or examples. If the original is brief, your output must be brief.
* **Content Fidelity:** Preserve the core meaning, information, and level of detail of the original text. Do not add or invent any information. **CRITICAL:** Do NOT introduce any topics, subjects, or references from the sample text. The sample text is for style only - its content is irrelevant.
* **Output Purity:** Your entire output must consist ONLY of the rewritten text. Do NOT include any commentary, explanations, analysis, apologies, or notes about your process. Do not enclose the output in quotes. Do not state what you have done.`;

    const userPrompt = `<sample>
${writingSamples}
</sample>

<rewrite>
${inputText}
</rewrite>

IMPORTANT: The text to rewrite is ${inputText.split(' ').length} words long. Your output must be of a similar length.`;

    console.log("Calling Anthropic Claude API...");
    console.log("Writing samples length:", writingSamples.length);
    console.log("Input text length:", inputText.length);
    
    // Comprehensive API key debugging
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    console.log("=== API Key Debug Info ===");
    console.log("Key present:", !!anthropicKey);
    console.log("Key length:", anthropicKey?.length);
    console.log("Starts with sk-ant-:", anthropicKey?.startsWith('sk-ant-'));
    console.log("Key preview:", anthropicKey?.substring(0, 15) + "..." + anthropicKey?.substring(anthropicKey.length - 5));
    console.log("Has whitespace:", /\s/.test(anthropicKey || ''));
    console.log("Has newlines:", /\n/.test(anthropicKey || ''));

    // Clean the key
    const cleanKey = anthropicKey?.trim().replace(/[\r\n]/g, '');
    console.log("Cleaned key length:", cleanKey?.length);
    console.log("Cleaned key starts with sk-ant-:", cleanKey?.startsWith('sk-ant-'));
    console.log("========================");
    
    console.log("API key verified, proceeding with style transfer...");
    
    // Call Anthropic Claude API
    const headers = new Headers({
      'x-api-key': cleanKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    });
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        temperature: 0.7,
        messages: [
          { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.log("Anthropic API error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to generate text" }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    const anthropicData = await anthropicResponse.json();
    console.log("Anthropic response structure:", JSON.stringify(anthropicData, null, 2));
    
    // Handle both possible response formats
    let fullResponse;
    if (anthropicData.content && anthropicData.content[0] && anthropicData.content[0].text) {
      fullResponse = anthropicData.content[0].text;
    } else if (anthropicData.choices && anthropicData.choices[0] && anthropicData.choices[0].message) {
      fullResponse = anthropicData.choices[0].message.content;
    } else {
      console.log("Unexpected response structure:", anthropicData);
      return new Response(JSON.stringify({ error: "Unexpected API response format" }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    if (!fullResponse) {
      return new Response(JSON.stringify({ error: "No text generated" }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    console.log("Text generated successfully");
    const generatedText = fullResponse;
    
    // Store generation in history
    const { error: historyError } = await supabase
      .from('generation_history')
      .insert([
        {
          user_id: verifiedUser.id,
          generation_type: 'STYLE_TRANSFER',
          input_text: inputText,
          output_text: generatedText,
        },
      ]);

    if (historyError) {
      console.log("Error storing generation history:", historyError);
      // Don't fail the request if history storage fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      generatedText,
      inputText
    }), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString(),
      },
    });

  } catch (error) {
    console.log("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  }
});
