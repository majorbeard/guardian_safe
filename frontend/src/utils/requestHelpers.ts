import { toast } from "../components/Toast";

export interface RequestOptions {
  timeoutMs?: number;
  onTimeout?: () => void;
  showErrorToast?: boolean;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  options: RequestOptions = {}
): Promise<T> {
  const { timeoutMs = 30000, onTimeout, showErrorToast = true } = options;

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
    if (onTimeout) {
      onTimeout();
    }
  }, timeoutMs);

  try {
    const result = await promise;
    clearTimeout(timeoutId);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError" || error.message?.includes("aborted")) {
      const message = "Request timed out. Please check your connection.";
      if (showErrorToast) {
        toast.error(message);
      }
      throw new Error(message);
    }

    throw error;
  }
}

export function createAbortController(timeoutMs: number = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  };
}
