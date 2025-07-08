// supabase/functions/extract-text/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Cam log 1");
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Parse request body
  console.log("SERVICE_ROLE_KEY:", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const { filePath, userId } = await req.json();
  console.log("Cam log 2 -- about to setup client");
  // Set up Supabase client (Edge Functions use env vars)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  console.log("Cam log 3 -- downloading file");
  // Download file from storage
  const { data, error } = await supabase.storage
    .from("user-uploads")
    .download(filePath);

  if (error || !data) {
    return new Response(JSON.stringify({ error: "Failed to download file" }), { 
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  }

  // Only support .txt files
  if (!filePath.endsWith(".txt")) {
  return new Response(
      JSON.stringify({ error: "Only .txt files are supported." }),
      { 
        status: 415,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Extract text from .txt file
  const extractedText = await new Response(data).text();

  // Insert into documents table
  const { error: insertError } = await supabase
    .from("documents")
    .insert([
      {
        user_id: userId,
        file_url: filePath,
        file_type: "txt",
        uploaded_at: new Date().toISOString(),
        extracted_text: extractedText,
      },
    ]);
  
  if (insertError) {
    
    console.log("Insert error details:", insertError);
    return new Response(JSON.stringify({ error: "Failed to insert document" }), { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } else {
    console.log("Insert successful");
  }

  return new Response(JSON.stringify({ success: true }), { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
});
