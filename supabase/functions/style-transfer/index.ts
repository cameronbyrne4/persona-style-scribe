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
    
    // Combine all writing samples and clean them
    const writingSamples = documents.map(doc => {
      let text = doc.extracted_text;
      
      // Remove common header patterns
      text = text.replace(/^.*?(Introduction:|Abstract:|The Crucial Significance|Firstly,)/s, '$1');
      
      // Remove word count, date, course info at the beginning
      text = text.replace(/^.*?(Word Count:|Date:|Course:|Dr\.|Professor).*?\n/g, '');
      
      // Remove author name and course info patterns
      text = text.replace(/^.*?(Cameron Byrne|Dr\.|SN\d+|Word Count:).*?\n/g, '');
      
      // Clean up any remaining header-like content
      text = text.replace(/^.*?(Introduction:|Abstract:|The Crucial Significance|Firstly,)/s, '$1');
      
      return text.trim();
    }).join('\n\n');
    
    // Prepare the prompt for OpenAI
    const systemPrompt = `You are a high-achieving undergraduate student in humanities. You will be helping rewrite text to match a specific author's style so it sounds like they wrote it.

Your task is to:
1. Analyze the writing samples to identify the author's style characteristics
2. Rewrite the input text to match that style exactly

Focus on: punctuation, grammar, vocabulary, depth of analysis, transitions between ideas, transition phrases, quote introductions, sentence complexity, sentence length, and tone.`;

    const userPrompt = `I will share with you an old essay from the student so you can mimic their writing style.

STUDENT'S WRITING SAMPLE:

${writingSamples}

TEXT TO REWRITE IN THE STUDENT'S STYLE:

${inputText}

Please rewrite the text above to match the student's writing style exactly.`;

    console.log("Calling OpenAI API...");
    
    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.log("OpenAI API error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to generate text" }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    const openaiData = await openaiResponse.json();
    const fullResponse = openaiData.choices[0]?.message?.content;

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
