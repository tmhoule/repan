/**
 * CSRF-protected fetch wrapper
 * Automatically includes CSRF token in state-changing requests
 */

let csrfToken: string | null = null;

/**
 * Fetch and cache CSRF token
 */
async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }
  
  try {
    const response = await fetch('/api/csrf');
    const data = await response.json();
    csrfToken = data.token;
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw new Error('Failed to fetch CSRF token');
  }
}

/**
 * Clear cached CSRF token (e.g., after logout)
 */
export function clearCsrfToken(): void {
  csrfToken = null;
}

/**
 * CSRF-protected fetch wrapper
 * Automatically adds CSRF token header for POST/PUT/PATCH/DELETE requests
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  
  // Only add CSRF token for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await getCsrfToken();
    
    options.headers = {
      ...options.headers,
      'X-CSRF-Token': token,
    };
  }
  
  const response = await fetch(url, options);
  
  // If we get a 403 CSRF error, clear the token and retry once
  if (response.status === 403) {
    const data = await response.clone().json().catch(() => ({}));
    if (data.error && data.error.includes('CSRF')) {
      csrfToken = null;
      
      // Retry with fresh token
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const freshToken = await getCsrfToken();
        options.headers = {
          ...options.headers,
          'X-CSRF-Token': freshToken,
        };
        return fetch(url, options);
      }
    }
  }
  
  return response;
}

/**
 * Hook to preload CSRF token on component mount
 * Call this in your root layout or app component
 */
export function usePreloadCsrfToken(): void {
  if (typeof window !== 'undefined') {
    getCsrfToken().catch(console.error);
  }
}
