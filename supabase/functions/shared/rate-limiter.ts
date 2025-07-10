// Shared rate limiting utility for Supabase Edge Functions

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// In-memory rate limit store (in production, you'd use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const createRateLimiter = (config: RateLimitConfig) => {
  return (userId: string): RateLimitResult => {
    const now = Date.now();
    const key = `${config.keyPrefix}:${userId}`;
    const userLimit = rateLimitStore.get(key);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize rate limit
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return { 
        allowed: true, 
        remaining: config.maxRequests - 1, 
        resetTime: now + config.windowMs 
      };
    }

    if (userLimit.count >= config.maxRequests) {
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: userLimit.resetTime 
      };
    }

    // Increment count
    userLimit.count++;
    rateLimitStore.set(key, userLimit);
    
    return { 
      allowed: true, 
      remaining: config.maxRequests - userLimit.count, 
      resetTime: userLimit.resetTime 
    };
  };
};

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  ragQa: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    keyPrefix: 'rag_qa'
  }),
  
  styleTransfer: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 15, // 15 requests per minute
    keyPrefix: 'style_transfer'
  }),
  
  extractText: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute
    keyPrefix: 'extract_text'
  })
};

// Helper function to create rate limit response
export const createRateLimitResponse = (rateLimit: RateLimitResult) => {
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
};

// Helper function to add rate limit headers to success response
export const addRateLimitHeaders = (headers: Headers, rateLimit: RateLimitResult) => {
  headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
  return headers;
}; 