// supabase/functions/rag-qa/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("RAG QA function loaded");

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
    const { question, sourceText, sourceFile } = await req.json();
    
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
    const systemPrompt = `You are a high-achieving undergraduate student in humanities. You will be answering questions based on provided source material while writing in a specific author's style.

Instructions:
- Answer the question using ONLY information from the provided source material
- If the source material doesn't contain enough information to answer the question, say so clearly
- Write the answer in the student's unique writing style (vocabulary, sentence structure, tone, etc.)
- Do NOT add external knowledge unless it's minimal background context that helps explain the source material
- Keep the answer focused and academically rigorous
- Use the student's typical transition phrases, quote introductions, and analytical depth

Focus on: punctuation, grammar, vocabulary, depth of analysis, transitions between ideas, transition phrases, quote introductions, sentence complexity, sentence length, and tone.`;

    const userPrompt = `I will share with you:
1. Sample writings from the student so you can mimic their writing style
2. Source material to answer the question from
3. The specific question to answer

STUDENT'S WRITING SAMPLE:
${writingSamples}

SOURCE MATERIAL (relevant excerpts):
${relevantChunks.join('\n\n---\n\n')}

QUESTION TO ANSWER:
${question}

Please answer the question using only the provided source material, written in the student's unique style. If the source material doesn't contain enough information to answer the question, explain what information is missing.`;

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