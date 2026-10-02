import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to external service in production
    if (import.meta.env.PROD) {
      // Could send to Sentry or other error tracking service
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-fufu px-4 py-10">
          <div className="max-w-lg w-full">
            <div className="bg-peach text-clay p-6 sm:p-8 rounded-t-lg">
              <div className="w-14 h-14 bg-clay text-peach flex items-center justify-center">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <p className="eyebrow mt-6">Kitchen mishap</p>
              <h1 className="display text-[44px] sm:text-[56px] mt-2 leading-[0.92]">
                We burnt the toast
              </h1>
              <p className="mt-3 font-medium">
                Something went wrong on our side and this page fell on the floor. Try again, or head
                home while we sweep up.
              </p>
            </div>
            <div className="grid grid-cols-2">
              <button
                onClick={this.handleReset}
                className="h-14 bg-moringa text-fufu font-bold hover:bg-moringa-dark transition-colors cursor-pointer rounded-none rounded-bl-lg"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="h-14 border-2 border-moringa text-moringa font-bold hover:bg-mint transition-colors cursor-pointer rounded-none rounded-br-lg"
              >
                Go home
              </button>
            </div>
            {!import.meta.env.PROD && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer eyebrow text-[11px] text-moringa-muted">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-white border border-char/10 text-xs overflow-auto text-clay">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
