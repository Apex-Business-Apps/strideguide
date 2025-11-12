/**
 * ErrorBoundary - Simple fallback (use EnhancedErrorBoundary for production)
 * This is kept for backwards compatibility
 */

import { Component, ReactNode } from "react";
import { logger } from "@/utils/ProductionLogger";

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    logger.error("[ui-error]", { 
      error: err.message,
      stack: err.stack,
      componentStack: info.componentStack 
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-4 text-sm bg-rose-50 text-rose-900 rounded">
          Something went wrong. Try reload.
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;