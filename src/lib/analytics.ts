import { track } from '@vercel/analytics';

// Custom analytics tracking functions
export const analytics = {
  // Track page views
  trackPageView: (page: string) => {
    track('page_view', { page });
  },

  // Track user actions
  trackAction: (action: string, properties?: Record<string, any>) => {
    track(action, properties);
  },

  // Track feature usage
  trackFeature: (feature: string, properties?: Record<string, any>) => {
    track('feature_used', { feature, ...properties });
  },

  // Track errors
  trackError: (error: string, properties?: Record<string, any>) => {
    track('error', { error, ...properties });
  },

  // Track document uploads
  trackDocumentUpload: (fileType: string, fileSize: number) => {
    track('document_uploaded', { fileType, fileSize });
  },

  // Track style transfers
  trackStyleTransfer: (inputLength: number, outputLength: number) => {
    track('style_transfer', { inputLength, outputLength });
  },

  // Track research answers
  trackResearchAnswer: (questionLength: number, answerLength: number) => {
    track('research_answer', { questionLength, answerLength });
  },

  // Track user engagement
  trackEngagement: (action: string, duration?: number) => {
    track('engagement', { action, duration });
  }
};

export default analytics; 