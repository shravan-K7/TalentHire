import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          style={{
            minHeight: '100vh',
            width: '100%',
            backgroundColor: '#181818',
            color: '#F7F7F7',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: '#212121',
              border: '1px solid #303030',
              borderRadius: '16px',
              padding: '36px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 87, 34, 0.15)',
                color: '#FF5722',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h1
              style={{
                fontSize: '1.45rem',
                fontWeight: 700,
                margin: '0 0 10px',
                color: '#F7F7F7',
                letterSpacing: '-0.01em',
              }}
            >
              Application Encountered an Issue
            </h1>

            <p
              style={{
                fontSize: '0.92rem',
                color: '#A0A0A0',
                margin: '0 0 24px',
                lineHeight: 1.55,
              }}
            >
              An unexpected error occurred while rendering this view. Your session and account data remain intact.
            </p>

            {this.state.error && (
              <div
                style={{
                  backgroundColor: '#161616',
                  border: '1px solid #2d2d2d',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  margin: '0 0 24px',
                  textAlign: 'left',
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}
              >
                <code
                  style={{
                    fontSize: '0.8rem',
                    color: '#FF5722',
                    fontFamily: 'monospace',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  backgroundColor: '#FF5722',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '11px 22px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                Reload Page
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  backgroundColor: '#2e2e2e',
                  color: '#F7F7F7',
                  border: '1px solid #404040',
                  borderRadius: '10px',
                  padding: '11px 22px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                Return to Home
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
