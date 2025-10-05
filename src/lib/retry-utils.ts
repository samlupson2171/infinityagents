/**
 * Retry mechanisms for network failures and API calls
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT_ERROR' ||
      error.code === 'INTERNAL_ERROR' ||
      (error.status >= 500 && error.status < 600) ||
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError'
    );
  },
};

/**
 * Exponential backoff delay calculation
 */
function calculateDelay(
  attempt: number,
  options: Required<RetryOptions>
): number {
  const delay =
    options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(delay, options.maxDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if condition is not met or it's the last attempt
      if (!config.retryCondition(error) || attempt === config.maxAttempts) {
        throw error;
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, config);
      console.warn(
        `Operation failed (attempt ${attempt}/${config.maxAttempts}). Retrying in ${delay}ms...`,
        error
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Fetch wrapper with retry logic
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  return withRetry(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Throw error for non-ok responses
      if (!response.ok) {
        const error = new Error(
          `HTTP ${response.status}: ${response.statusText}`
        );
        (error as any).status = response.status;
        throw error;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout');
        (timeoutError as any).code = 'TIMEOUT_ERROR';
        throw timeoutError;
      }

      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = new Error('Network error');
        (networkError as any).code = 'NETWORK_ERROR';
        throw networkError;
      }

      throw error;
    }
  }, retryOptions);
}

/**
 * API call wrapper with retry and error handling
 */
export async function apiCall<T>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    },
    retryOptions
  );

  const data = await response.json();

  // Handle API error responses
  if (!data.success) {
    const error = new Error(data.error?.message || 'API call failed');
    (error as any).code = data.error?.code;
    (error as any).details = data.error?.details;
    throw error;
  }

  return data.data;
}

/**
 * File upload with retry logic
 */
export async function uploadFileWithRetry(
  url: string,
  file: File,
  onProgress?: (progress: number) => void,
  retryOptions: RetryOptions = {}
): Promise<any> {
  return withRetry(
    async () => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);

        // Progress tracking
        if (onProgress) {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 100;
              onProgress(progress);
            }
          });
        }

        // Success handler
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            const error = new Error(
              `Upload failed: ${xhr.status} ${xhr.statusText}`
            );
            (error as any).status = xhr.status;
            reject(error);
          }
        });

        // Error handlers
        xhr.addEventListener('error', () => {
          const error = new Error('Network error during upload');
          (error as any).code = 'NETWORK_ERROR';
          reject(error);
        });

        xhr.addEventListener('timeout', () => {
          const error = new Error('Upload timeout');
          (error as any).code = 'TIMEOUT_ERROR';
          reject(error);
        });

        // Configure and send
        xhr.timeout = 60000; // 60 second timeout for uploads
        xhr.open('POST', url);
        xhr.send(formData);
      });
    },
    {
      maxAttempts: 2, // Fewer retries for uploads
      baseDelay: 2000,
      ...retryOptions,
    }
  );
}
