import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  // Fix: Refactored to use a constructor for state initialization to address
  // errors where `this.props` and `this.setState` were not being found. This
  // classic approach is more robust in some build environments.
  public state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service.
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleRetry = () => {
    // Reset the error state to allow the user to try again.
    this.setState({ hasError: false, error: null });
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI.
      return (
        <div className="text-center py-16 px-4 bg-red-50 border border-red-200 rounded-xl shadow-md">
            <svg className="w-16 h-16 mx-auto text-red-400" fill="none" viewBox="0 0 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-red-800">Something went wrong</h2>
            <p className="mt-2 text-red-600">There was an unexpected error. Please try again.</p>
            {this.state.error && (
                <pre className="mt-4 text-left text-xs text-red-500 bg-red-100 p-2 rounded overflow-auto">
                    {this.state.error.toString()}
                </pre>
            )}
            <button
                onClick={this.handleRetry}
                className="mt-6 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
                Try Again
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
