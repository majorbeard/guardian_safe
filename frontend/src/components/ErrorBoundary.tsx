import { Component } from "preact";
import { AlertTriangle, RefreshCw, Home } from "lucide-preact";

interface ErrorBoundaryProps {
  children: preact.ComponentChildren;
  fallback?: (error: Error, reset: () => void) => preact.ComponentChildren;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Log to external service (add Sentry, LogRocket, etc. here)
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService(error: Error, errorInfo: any) {
    // TODO: Send to error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });

    // For now, just log locally
    const errorLog = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.error("Error logged:", errorLog);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.handleReset);
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Something went wrong
              </h1>

              <p className="text-gray-600 text-center mb-6">
                We're sorry, but something unexpected happened. The error has
                been logged and we'll look into it.
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm font-mono text-red-600 break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                        Stack trace
                      </summary>
                      <pre className="mt-2 text-xs text-gray-700 overflow-x-auto">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 btn btn-primary"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex-1 btn btn-secondary"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
