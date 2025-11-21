type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
  userId?: string;
  url?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private createEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      url: window.location.href,
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);

    // Keep only last 100 logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      console.debug(message, data);
    }
    this.addLog(this.createEntry("debug", message, data));
  }

  info(message: string, data?: any) {
    console.info(message, data);
    this.addLog(this.createEntry("info", message, data));
  }

  warn(message: string, data?: any) {
    console.warn(message, data);
    this.addLog(this.createEntry("warn", message, data));
  }

  error(message: string, error?: any) {
    console.error(message, error);

    const entry = this.createEntry("error", message, {
      error: error?.message || error,
      stack: error?.stack,
    });

    this.addLog(entry);

    // TODO:
    // Send to error tracking service
    this.reportError(entry);
  }

  private reportError(entry: LogEntry) {
    // TODO:
    // Send to error tracking service
    if (!this.isDevelopment) {
      // Sentry.captureMessage(entry.message, { level: 'error', extra: entry.data });
      console.log("Would report error to monitoring service:", entry);
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter((log) => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  // Download logs as JSON
  downloadLogs() {
    const dataStr = JSON.stringify(this.logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `guardian-safe-logs-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export const logger = new Logger();
