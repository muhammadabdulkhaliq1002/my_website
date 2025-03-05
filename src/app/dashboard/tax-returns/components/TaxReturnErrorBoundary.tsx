'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class TaxReturnErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Tax return error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private getErrorMessage(error: Error): string {
    // Handle known error types for ITR-1
    if (error.message.includes('80C')) {
      return 'Section 80C deductions exceed the maximum limit of ₹1,50,000';
    }
    if (error.message.includes('salary')) {
      return 'Invalid salary income details. Please check your salary information.';
    }
    if (error.message.includes('house property')) {
      return 'Invalid house property details. Please verify your property income information.';
    }
    if (error.message.includes('otherIncome')) {
      return 'Invalid other income details. Please check your additional income sources.';
    }
    // Default error message
    return 'An error occurred while processing your tax return. Please try again.';
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {this.state.error && this.getErrorMessage(this.state.error)}
                </p>
                <div className="mt-6 flex flex-col space-y-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Try Again
                  </button>
                  <Link
                    href="/dashboard/tax-returns"
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    Return to Tax Returns
                  </Link>
                </div>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-4 text-left">
                    <summary className="text-sm text-gray-500 cursor-pointer">
                      Technical Details
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto">
                      {this.state.error && this.state.error.toString()}
                      <br />
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}