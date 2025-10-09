/**
 * ErrorBoundary - Resilient top-level fallback with logging
 */

import { Component, ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: any) { 
    super(props); 
    this.state = { hasError: false }; 
  }
  
  static getDerivedStateFromError() { 
    return { hasError: true }; 
  }
  
  componentDidCatch(err: any, info: any) { 
    console.error("[ui-error]", err, info); 
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