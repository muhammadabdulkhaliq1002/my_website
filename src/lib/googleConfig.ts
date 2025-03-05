export const googleConfig = {
  apiKey: process.env.GOOGLE_API_KEY || '',
  placeId: process.env.GOOGLE_PLACE_ID || '',
  // Add allowed origins if needed
  allowedOrigins: [
    'http://localhost:3000',
    'https://yourdomain.com', // Replace with your production domain
  ],
};

// Validate required configuration
export function validateGoogleConfig() {
  if (!googleConfig.apiKey) {
    throw new Error('Missing GOOGLE_API_KEY environment variable');
  }
  if (!googleConfig.placeId) {
    throw new Error('Missing GOOGLE_PLACE_ID environment variable');
  }
}