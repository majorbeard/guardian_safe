import { toast } from "../components/Toast";

export interface RetryConfig {
  maxRetries?: number;
  delayMs?: number;
  backoff?: boolean;
  onRetry?: (attempt: number) => void;
}

export async function retryRequest<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, backoff = true, onRetry } = config;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on auth errors or client errors (4xx)
      if (
        error.status === 401 ||
        error.status === 403 ||
        error.status === 404 ||
        (error.status >= 400 && error.status < 500)
      ) {
        throw error;
      }

      // Don't retry if no more attempts left
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with optional exponential backoff
      const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;

      console.log(
        `Request failed, retrying in ${delay}ms (attempt ${
          attempt + 1
        }/${maxRetries})`
      );

      if (onRetry) {
        onRetry(attempt + 1);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries failed
  console.error("All retry attempts failed:", lastError);
  throw lastError;
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function setupNetworkListeners() {
  window.addEventListener("online", () => {
    console.log("Network connection restored");
    toast.success("Connection restored");
  });

  window.addEventListener("offline", () => {
    console.log("Network connection lost");
    toast.error("No internet connection");
  });
}

export async function waitForNetwork(
  timeoutMs: number = 30000
): Promise<boolean> {
  if (isOnline()) {
    return true;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener("online", onOnline);
      resolve(false);
    }, timeoutMs);

    const onOnline = () => {
      clearTimeout(timeout);
      window.removeEventListener("online", onOnline);
      resolve(true);
    };

    window.addEventListener("online", onOnline);
  });
}
