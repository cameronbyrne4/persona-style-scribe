// Shared validation utilities for Supabase Edge Functions

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Input text validation
export const validateInputText = (text: string, maxLength: number = 50000): ValidationResult => {
  if (!text || typeof text !== 'string') {
    return { isValid: false, error: "Input text is required and must be a string" };
  }
  
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: "Input text cannot be empty" };
  }
  
  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Input text exceeds maximum length of ${maxLength} characters` };
  }
  
  // Check for potentially malicious content
  if (trimmed.includes('<script>') || trimmed.includes('javascript:')) {
    return { isValid: false, error: "Input contains potentially malicious content" };
  }
  
  return { isValid: true };
};

// File path validation
export const validateFilePath = (filePath: string, userId: string): ValidationResult => {
  if (!filePath || typeof filePath !== 'string') {
    return { isValid: false, error: "File path is required" };
  }
  
  // Ensure file path starts with user's ID
  if (!filePath.startsWith(`${userId}/`)) {
    return { isValid: false, error: "Invalid file path" };
  }
  
  // Prevent path traversal attacks
  if (filePath.includes('..') || filePath.includes('//')) {
    return { isValid: false, error: "Invalid file path" };
  }
  
  // Only allow specific file extensions
  if (!filePath.endsWith('.txt') && !filePath.endsWith('.pdf')) {
    return { isValid: false, error: "Only .txt and .pdf files are supported" };
  }
  
  return { isValid: true };
};

// User ID validation
export const validateUserId = (userId: string): ValidationResult => {
  if (!userId || typeof userId !== 'string') {
    return { isValid: false, error: "User ID is required" };
  }
  
  // UUID validation pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(userId)) {
    return { isValid: false, error: "Invalid user ID format" };
  }
  
  return { isValid: true };
};

// Generation type validation
export const validateGenerationType = (type: string): ValidationResult => {
  const validTypes = ['STYLE_TRANSFER', 'RAG_QA'];
  
  if (!type || typeof type !== 'string') {
    return { isValid: false, error: "Generation type is required" };
  }
  
  if (!validTypes.includes(type)) {
    return { isValid: false, error: `Invalid generation type. Must be one of: ${validTypes.join(', ')}` };
  }
  
  return { isValid: true };
};

// Answer length validation for RAG QA
export const validateAnswerLength = (length: string): ValidationResult => {
  const validLengths = ['short', 'medium', 'long'];
  
  if (!length || typeof length !== 'string') {
    return { isValid: false, error: "Answer length is required" };
  }
  
  if (!validLengths.includes(length)) {
    return { isValid: false, error: `Invalid answer length. Must be one of: ${validLengths.join(', ')}` };
  }
  
  return { isValid: true };
};

// Word count validation
export const validateWordCount = (text: string, minWords: number = 1, maxWords: number = 5000): ValidationResult => {
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  
  if (wordCount < minWords) {
    return { isValid: false, error: `Text must contain at least ${minWords} word(s)` };
  }
  
  if (wordCount > maxWords) {
    return { isValid: false, error: `Text cannot exceed ${maxWords} words` };
  }
  
  return { isValid: true };
};

// API key validation
export const validateApiKey = (apiKey: string): ValidationResult => {
  if (!apiKey || typeof apiKey !== 'string') {
    return { isValid: false, error: "API key is required" };
  }
  
  const trimmed = apiKey.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: "API key cannot be empty" };
  }
  
  // Basic format validation for Anthropic API key
  if (!trimmed.startsWith('sk-ant-')) {
    return { isValid: false, error: "Invalid API key format" };
  }
  
  return { isValid: true };
};

// Rate limit validation
export const validateRateLimit = (userId: string, currentCount: number, maxCount: number): ValidationResult => {
  if (currentCount >= maxCount) {
    return { 
      isValid: false, 
      error: `Rate limit exceeded. Maximum ${maxCount} requests allowed per minute.` 
    };
  }
  
  return { isValid: true };
}; 