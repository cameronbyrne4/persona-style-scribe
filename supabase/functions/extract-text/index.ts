// supabase/functions/extract-text/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Cam log 1");

// Word-based rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_WORDS_PER_MINUTE = 5000; // 5000 words per minute per user
const MAX_FILES_PER_MINUTE = 20; // 20 files per minute per user (fallback for small file spam)

// In-memory rate limit store (in production, you'd use Redis or database)
const rateLimitStore = new Map<string, { 
  wordCount: number; 
  fileCount: number; 
  resetTime: number 
}>();

// Helper function to count words in text
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Word-based rate limiting function
const checkWordBasedRateLimit = (userId: string, newWordCount: number): { 
  allowed: boolean; 
  remainingWords: number; 
  remainingFiles: number;
  resetTime: number;
  reason?: string;
} => {
  const now = Date.now();
  const key = `extract_text:${userId}`;
  const userLimit = rateLimitStore.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize rate limit for new minute
    const newLimit = {
      wordCount: newWordCount,
      fileCount: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    };
    rateLimitStore.set(key, newLimit);
    
    return { 
      allowed: true, 
      remainingWords: MAX_WORDS_PER_MINUTE - newWordCount,
      remainingFiles: MAX_FILES_PER_MINUTE - 1,
      resetTime: now + RATE_LIMIT_WINDOW
    };
  }

  // Check if adding this file would exceed limits
  const totalWords = userLimit.wordCount + newWordCount;
  const totalFiles = userLimit.fileCount + 1;

  if (totalWords > MAX_WORDS_PER_MINUTE) {
    return { 
      allowed: false, 
      remainingWords: 0,
      remainingFiles: MAX_FILES_PER_MINUTE - userLimit.fileCount,
      resetTime: userLimit.resetTime,
      reason: 'word_limit_exceeded'
    };
  }

  if (totalFiles > MAX_FILES_PER_MINUTE) {
    return { 
      allowed: false, 
      remainingWords: MAX_WORDS_PER_MINUTE - userLimit.wordCount,
      remainingFiles: 0,
      resetTime: userLimit.resetTime,
      reason: 'file_limit_exceeded'
    };
  }

  // Update the rate limit
  userLimit.wordCount = totalWords;
  userLimit.fileCount = totalFiles;
  rateLimitStore.set(key, userLimit);
  
  return { 
    allowed: true, 
    remainingWords: MAX_WORDS_PER_MINUTE - totalWords,
    remainingFiles: MAX_FILES_PER_MINUTE - totalFiles,
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
  console.log("SERVICE_ROLE_KEY:", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const { filePath, userId } = await req.json();
  
  console.log("Cam log 2 -- about to setup client");
  // Set up Supabase client (Edge Functions use env vars)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  // Verify the user's token and get their actual user ID
  console.log("About to verify user token...");
  const { data: { user: verifiedUser }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError) {
    console.log("Auth error:", authError);
    return new Response(JSON.stringify({ error: "Invalid authentication token", details: authError }), {
      status: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  }
  
  if (!verifiedUser) {
    console.log("No verified user found");
    return new Response(JSON.stringify({ error: "No user found for token" }), {
      status: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  }
  
  console.log("User verified:", verifiedUser.id);
  
  // Ensure the user is uploading to their own folder
  if (verifiedUser.id !== userId) {
    console.log("User ID mismatch:", verifiedUser.id, "vs", userId);
    return new Response(JSON.stringify({ error: "User ID mismatch" }), {
      status: 403,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  }
  
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
  
  // Count words in the extracted text
  const wordCount = countWords(extractedText);
  console.log(`File contains ${wordCount} words`);
  
  // Check word-based rate limit
  const rateLimit = checkWordBasedRateLimit(verifiedUser.id, wordCount);
  if (!rateLimit.allowed) {
    const errorMessage = rateLimit.reason === 'word_limit_exceeded' 
      ? `Word limit exceeded. You can process up to ${MAX_WORDS_PER_MINUTE} words per minute. This file has ${wordCount} words.`
      : `File limit exceeded. You can upload up to ${MAX_FILES_PER_MINUTE} files per minute.`;
      
    return new Response(JSON.stringify({ 
      error: errorMessage,
      resetTime: rateLimit.resetTime,
      wordCount: wordCount,
      remainingWords: rateLimit.remainingWords,
      remainingFiles: rateLimit.remainingFiles
    }), {
      status: 429,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining-Words': rateLimit.remainingWords.toString(),
        'X-RateLimit-Remaining-Files': rateLimit.remainingFiles.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString(),
      },
    });
  }

  // Insert into documents table
  console.log("About to insert document for user:", userId);
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

  return new Response(JSON.stringify({ 
    success: true,
    wordCount: wordCount,
    remainingWords: rateLimit.remainingWords,
    remainingFiles: rateLimit.remainingFiles
  }), { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining-Words': rateLimit.remainingWords.toString(),
      'X-RateLimit-Remaining-Files': rateLimit.remainingFiles.toString(),
      'X-RateLimit-Reset': rateLimit.resetTime.toString(),
    },
  });
});
