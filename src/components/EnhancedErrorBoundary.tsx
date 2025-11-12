/**
 * Enhanced Error Boundary with Recovery, Retry, and Reporting
 * Production-grade error handling for StrideGuide
 */

import React, { Component, ReactNode } from 'react';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/utils/ProductionLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private resetTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const correlationId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log to production logger
    logger.error('React Error Boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      correlationId,
      errorCount: this.state.errorCount + 1,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Auto-recovery attempt after 5 seconds (only once)
    if (this.state.errorCount === 0) {
      this.resetTimeout = setTimeout(() => {
        logger.info('Attempting auto-recovery from error boundary');
        this.handleReset();
      }, 5000);
    }
  }

  componentWillUnmount() {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }
  }

  handleReset = () => {
    logger.info('Resetting error boundary');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    logger.info('Reloading application from error boundary');
    window.location.reload();
  };

  handleGoHome = () => {
    logger.info('Navigating to home from error boundary');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with recovery options
      return (
        <div 
          role="alert" 
          className="min-h-screen flex items-center justify-center p-4 bg-background"
          aria-live="assertive"
        >
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
              <h1 className="text-xl font-semibold text-foreground">
                Something Went Wrong
              </h1>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              StrideGuide encountered an unexpected error. Don't worry - your data is safe.
            </p>

            {/* Error details (only show in development) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-4 p-3 bg-muted rounded text-xs">
                <summary className="cursor-pointer font-medium mb-2">
                  Technical Details
                </summary>
                <pre className="whitespace-pre-wrap overflow-auto max-h-32">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Recovery options */}
            <div className="space-y-2">
              <Button
                onClick={this.handleReset}
                className="w-full"
                variant="default"
                aria-label="Try again"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>

              <Button
                onClick={this.handleGoHome}
                className="w-full"
                variant="outline"
                aria-label="Go to home page"
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Home
              </Button>

              {this.state.errorCount > 1 && (
                <Button
                  onClick={this.handleReload}
                  className="w-full"
                  variant="destructive"
                  aria-label="Reload application"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload App
                </Button>
              )}
            </div>

            {/* Support message */}
            <p className="text-xs text-muted-foreground mt-4 text-center">
              If this problem persists, please contact support with error code:{' '}
              <code className="bg-muted px-1 py-0.5 rounded">
                {this.state.error?.message?.substring(0, 20) || 'UNKNOWN'}
              </code>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
