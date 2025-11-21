import { logger } from "./logger";

export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();

  const result = fn();

  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - start;
      logger.debug(`Performance: ${name}`, {
        duration: `${duration.toFixed(2)}ms`,
      });

      // Warn if slow
      if (duration > 3000) {
        logger.warn(`Slow operation: ${name}`, {
          duration: `${duration.toFixed(2)}ms`,
        });
      }
    }) as T;
  } else {
    const duration = performance.now() - start;
    logger.debug(`Performance: ${name}`, {
      duration: `${duration.toFixed(2)}ms`,
    });
    return result;
  }
}

export function trackPageLoad() {
  if (typeof window === "undefined") return;

  window.addEventListener("load", () => {
    const perfData = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming;

    if (perfData) {
      logger.info("Page load metrics", {
        dns: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcp: perfData.connectEnd - perfData.connectStart,
        request: perfData.responseStart - perfData.requestStart,
        response: perfData.responseEnd - perfData.responseStart,
        dom:
          perfData.domContentLoadedEventEnd -
          perfData.domContentLoadedEventStart,
        total: perfData.loadEventEnd - perfData.fetchStart,
      });
    }
  });
}
