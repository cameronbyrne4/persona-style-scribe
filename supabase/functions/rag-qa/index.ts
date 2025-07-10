// supabase/functions/rag-qa/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("RAG QA function loaded");

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per user

// In-memory rate limit store (in production, you'd use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting function
const checkRateLimit = (userId: string): { allowed: boolean; remaining: number; resetTime: number } => {
  const now = Date.now();
  const key = `rag_qa:${userId}`;
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
    const { question, sourceText, sourceFile, answerLength = 'medium' } = await req.json();
    
    if (!question || !question.trim()) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    if (!sourceText && !sourceFile) {
      return new Response(JSON.stringify({ error: "Source material is required" }), {
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
    
    console.log(`Found ${documents.length} style documents`);
    
    // Process source material
    let sourceContent = "";
    if (sourceText) {
      sourceContent = sourceText.trim();
    } else if (sourceFile) {
      // For now, we'll assume the file content is passed directly
      // In a full implementation, you'd download from storage
      sourceContent = sourceFile;
    }

    if (!sourceContent) {
      return new Response(JSON.stringify({ error: "No source content found" }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    // Simple text chunking (500 words per chunk)
    const chunkText = (text: string, chunkSize: number = 500): string[] => {
      const words = text.split(/\s+/);
      const chunks: string[] = [];
      
      for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(' '));
      }
      
      return chunks;
    };

    // Simple keyword-based retrieval
    const findRelevantChunks = (chunks: string[], question: string, maxChunks: number = 3): string[] => {
      const questionWords = question.toLowerCase().split(/\s+/).filter(word => word.length > 3);
      
      const chunkScores = chunks.map((chunk, index) => {
        const chunkLower = chunk.toLowerCase();
        let score = 0;
        
        questionWords.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          const matches = chunkLower.match(regex);
          if (matches) {
            score += matches.length;
          }
        });
        
        return { index, score, chunk };
      });
      
      // Sort by score and return top chunks
      return chunkScores
        .sort((a, b) => b.score - a.score)
        .slice(0, maxChunks)
        .map(item => item.chunk);
    };

    // Chunk the source content
    const sourceChunks = chunkText(sourceContent);
    console.log(`Created ${sourceChunks.length} chunks from source material`);
    
    // Find relevant chunks
    const relevantChunks = findRelevantChunks(sourceChunks, question);
    console.log(`Found ${relevantChunks.length} relevant chunks`);
    
    if (relevantChunks.length === 0) {
      return new Response(JSON.stringify({ 
        error: "The source material doesn't contain information relevant to your question. Please try a different question or provide different source material." 
      }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    // Combine all writing samples and clean them (same as style transfer)
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

    // Prepare the RAG prompt
    const systemPrompt = `You are an expert linguistic analyst and research assistant. Your purpose is to answer questions based on provided source material while writing in a specific author's unique style.

You will be given three pieces of text: a writing sample to learn style from, source material to answer from, and a question to answer.

1. **Analyze the Writing Sample:** First, you will silently and internally analyze the text provided within the \`<style>\` tags. You are to deconstruct the author's stylistic fingerprint, paying close attention to:
   * **Vocabulary:** Extract and memorize the specific vocabulary, word choices, and terminology used by the author. You MUST use ONLY words that appear in the sample text or very close synonyms of those words. Do NOT introduce any vocabulary that is more sophisticated or complex than what the author uses.
   * **Sentence Structure:** Average sentence length, rhythm, and the mix of simple, compound, and complex sentences.
   * **Punctuation:** Common habits, such as the use of em-dashes, semicolons, or Oxford commas.
   * **Tone:** The overall voice (e.g., academic, casual, critical, enthusiastic).
   * **Transitions:** How ideas are linked (e.g., "Furthermore," "However," "On the other hand,").

2. **Answer the Question:** Next, you will answer the question provided within the \`<question>\` tags using ONLY information from the source material within the \`<source>\` tags. You must apply the precise stylistic fingerprint you analyzed in the first step. **CRITICAL:** Do NOT reference, mention, or incorporate any topics, subjects, or content from the sample text. The sample text is ONLY for learning writing style - ignore its subject matter completely.

**CRITICAL OUTPUT REQUIREMENTS:**

* **Vocabulary Constraint:** You MUST use ONLY vocabulary that appears in the sample text or very close synonyms. Do NOT introduce any words that are more sophisticated, complex, or academic than what the author uses in their writing samples. If the author uses simple, everyday language, stick to simple, everyday language. **CRITICAL:** Match the simplicity and formality level of the question, not the writing samples. If the question is casual and simple, keep the answer casual and simple regardless of the sample text's complexity.
* **Source Material Only:** Answer using ONLY information from the provided source material. Do NOT add external knowledge, background context, or information not present in the source.
* **Content Isolation:** Do NOT reference, mention, or incorporate any topics, subjects, or content from the writing sample. The sample text is ONLY for learning writing style - ignore its subject matter completely. **CRITICAL:** If the sample text discusses South Asian topics, food practices, or any other subjects, do NOT mention these in your answer. Focus only on the question and source material content. **ABSOLUTE RULE:** Never use phrases like "In South Asian fashion" or reference any topics from the sample text. The sample text's content is completely irrelevant to your answer.
* **Length Constraint:**
  - For a short answer, you MUST NOT exceed 3 sentences. Your answer must be complete and well-structured within this limit. If you cannot answer fully, summarize or condense as needed, but do not exceed the sentence limit. Do not cut off mid-idea; instead, provide a concise, self-contained answer.
  - For a medium answer, you MUST NOT exceed 5 sentences. Your answer must be complete and well-structured within this limit. If you cannot answer fully, summarize or condense as needed, but do not exceed the sentence limit. Do not cut off mid-idea.
  - For a long answer, you MUST NOT exceed 10 sentences. Your answer must be complete and well-structured within this limit. If you cannot answer fully, summarize or condense as needed, but do not exceed the sentence limit. Do not cut off mid-idea.
* **Output Purity:** Your entire output must consist ONLY of the answer. Do NOT include any commentary, explanations, analysis, apologies, or notes about your process. Do not enclose the output in quotes. Do not state what you have done.`;

    // Build the length rule for the user prompt
    let lengthRule = '';
    if (answerLength === 'short') {
      lengthRule = 'IMPORTANT: You MUST NOT exceed 3 sentences for a short answer. Your answer must be complete and well-structured within this limit. If you cannot answer fully, summarize or condense as needed, but do not exceed the sentence limit. Do not cut off mid-idea; instead, provide a concise, self-contained answer.';
    } else if (answerLength === 'medium') {
      lengthRule = 'IMPORTANT: You MUST NOT exceed 5 sentences for a medium answer. Your answer must be complete and well-structured within this limit. If you cannot answer fully, summarize or condense as needed, but do not exceed the sentence limit. Do not cut off mid-idea.';
    } else if (answerLength === 'long') {
      lengthRule = 'IMPORTANT: You MUST NOT exceed 10 sentences for a long answer. Your answer must be complete and well-structured within this limit. If you cannot answer fully, summarize or condense as needed, but do not exceed the sentence limit. Do not cut off mid-idea.';
    }

    const userPrompt = `<style>
${writingSamples}
</style>

<source>
${relevantChunks.join('\n\n---\n\n')}
</source>

<question>
${question}
</question>

${lengthRule}\n\nAnswer using ONLY information from the source material, written in the author's style. If the source material doesn't contain enough information to answer the question, explain what information is missing.`;

    console.log("Calling Anthropic Claude API for RAG...");
    console.log("Writing samples length:", writingSamples.length);
    console.log("Source chunks length:", relevantChunks.join('\n\n').length);
    console.log("Question length:", question.length);
    
    // Get and clean the API key
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const cleanKey = anthropicKey?.trim().replace(/[\r\n]/g, '');
    
    if (!cleanKey || !cleanKey.startsWith('sk-ant-')) {
      console.log("Invalid Anthropic API key");
      return new Response(JSON.stringify({ error: "API configuration error" }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }
    
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
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.log("Anthropic API error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to generate answer" }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    const anthropicData = await anthropicResponse.json();
    console.log("Anthropic response received");
    
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
      return new Response(JSON.stringify({ error: "No answer generated" }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    console.log("RAG answer generated successfully");
    
    // Store generation in history
    const { error: historyError } = await supabase
      .from('generation_history')
      .insert([
        {
          user_id: verifiedUser.id,
          generation_type: 'RAG_QA',
          input_text: `Question: ${question}\nSource: ${sourceContent.substring(0, 500)}...`,
          output_text: fullResponse,
        },
      ]);

    if (historyError) {
      console.log("Error storing generation history:", historyError);
      // Don't fail the request if history storage fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      answer: fullResponse,
      question: question,
      chunksUsed: relevantChunks.length
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