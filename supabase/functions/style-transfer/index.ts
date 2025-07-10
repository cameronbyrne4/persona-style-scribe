// supabase/functions/style-transfer/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Style transfer function loaded");

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
    
    // Prepare the prompt for OpenAI
    const systemPrompt = `You are a high-achieving undergraduate student in humanities. You will be helping rewrite text to match a specific author's style so it sounds like they wrote it.

CRITICAL LENGTH REQUIREMENTS:
- The output MUST be approximately the same length as the input text (within 10-20%).
- If the input is short and casual, keep the output short and casual.
- If the input is a brief statement, do NOT expand it into a lengthy analysis.
- Count the words in the input and aim for a similar word count in the output.
- Do NOT add unnecessary elaboration, examples, or explanations.

Other Instructions:
- Do NOT add any commentary, analysis, or explanation before or after the rewritten text.
- Do NOT introduce quotes, references, or sources that are not present in the original input.
- Focus on mirroring the student's habits in punctuation, grammar, vocabulary, sentence structure, transitions, and tone.
- Maintain the same level of formality and complexity as the original input.

Focus on: punctuation, grammar, vocabulary, depth of analysis, transitions between ideas, transition phrases, quote introductions, sentence complexity, sentence length, and tone.`;

    const userPrompt = `I will share with you sample writings from the student so you can mimic their writing style.

STUDENT'S WRITING SAMPLE:

${writingSamples}

TEXT TO REWRITE IN THE STUDENT'S STYLE:

${inputText}

IMPORTANT: The input text above is ${inputText.split(' ').length} words long. Your output should be approximately the same length (within 10-20% of this word count).

Please rewrite the text above to mimic the student's writing style while maintaining the same length and level of detail. If the original is brief and casual, keep your response brief and casual. Do not expand or elaborate beyond what's necessary to match the student's style.`;

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
