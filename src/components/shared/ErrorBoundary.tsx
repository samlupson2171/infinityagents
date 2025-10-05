/**
 * Error boundary component for catching and displaying React errors
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorCode, getUserFriendlyMessage } from '@/lib/error-handling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <span className="text-red-600 text-xl">⚠</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800">
                  Something went wrong
                </h3>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-red-700">
                {getUserFriendlyMessage(ErrorCode.INTERNAL_ERROR)}
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-3">
                  <summary className="text-xs text-red-600 cursor-pointer">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto">
                    {this.state.error.message}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ErrorDisplayProps {
  error: {
    code?: ErrorCode;
    message: string;
    details?: any;
    field?: string;
  } | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className = '',
}: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div
      className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-red-600 text-lg">⚠</span>
        </div>
        <div className="ml-3 flex-1">
          <h4 className="text-red-800 font-medium">Error</h4>
          <p className="text-red-700 text-sm mt-1">{error.message}</p>

          {error.code && (
            <p className="text-red-600 text-xs mt-1">Code: {error.code}</p>
          )}

          {process.env.NODE_ENV === 'development' && error.details && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer">
                Details
              </summary>
              <pre className="mt-1 text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 flex space-x-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-400 hover:text-red-600"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
