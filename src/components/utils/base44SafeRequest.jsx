/**
 * Safe request wrapper with exponential backoff for rate limit handling
 * @param {Function} fn - The async function to execute
 * @param {number} maxRetries - Maximum number of retries (default 4)
 * @returns {Promise} - Result of the function or null on failure
 */
export async function safeRequest(fn, maxRetries = 4) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = 
        error?.status === 429 || 
        error?.message?.includes('Rate limit') ||
        error?.message?.includes('429');
      
      if (!isRateLimit || attempt === maxRetries) {
        // Not a rate limit error, or we've exhausted retries
        throw error;
      }
      
      // Calculate delay with exponential backoff + jitter
      const baseDelay = 800 * Math.pow(2, attempt); // 800ms, 1600ms, 3200ms, 6400ms
      const jitter = Math.random() * 200; // 0-200ms random jitter
      const delay = baseDelay + jitter;
      
      console.log(`⏳ Rate limit hit, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Should never reach here, but just in case
  return null;
}