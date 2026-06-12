import React from 'react';
import { RefreshCw, LayoutDashboard } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error:    Error | null;
}

interface ErrorBoundaryProps {
  children:  React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * ErrorBoundary — Global React error boundary.
 *
 * Catches unhandled rendering errors and displays a branded fallback screen
 * instead of a blank white crash page.
 *
 * Usage: Wrap <BrowserRouter> in App.tsx so all routes are covered.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production, this is where you'd send to Sentry / logging service
    console.error('[Stargate] Unhandled render error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="main"
          className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 p-6 text-center"
        >
          {/* Logomark */}
          <div className="opacity-60">
            <svg
              width="40"
              height="40"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="24" cy="24" r="21" stroke="url(#eb-gradient)" strokeWidth="2" />
              <circle cx="24" cy="24" r="13" stroke="url(#eb-gradient)" strokeWidth="1.5" opacity="0.5" />
              <path d="M14 24 C14 18.477 18.477 14 24 14 C29.523 14 34 18.477 34 24" stroke="url(#eb-gradient)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="14" y1="24" x2="14" y2="32" stroke="url(#eb-gradient)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="34" y1="24" x2="34" y2="32" stroke="url(#eb-gradient)" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="24" cy="24" r="2.5" fill="url(#eb-gradient)" />
              <defs>
                <linearGradient id="eb-gradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Headline */}
          <div className="space-y-2 max-w-sm">
            <h1 className="text-xl font-semibold text-zinc-100">
              Something went wrong
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              An unexpected error occurred. Try refreshing the page — if the problem persists, check the browser console for details.
            </p>
          </div>

          {/* Error detail (collapsed) */}
          {this.state.error && (
            <details className="max-w-sm w-full text-left">
              <summary className="text-xs text-zinc-600 cursor-pointer select-none hover:text-zinc-400 transition-colors">
                Error details
              </summary>
              <pre className="mt-2 text-xs text-red-400/80 bg-zinc-900 border border-zinc-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                {this.state.error.message}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors duration-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <RefreshCw className="w-4 h-4" />
              Reload page
            </button>
            <button
              onClick={this.handleGoHome}
              className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition-colors duration-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <LayoutDashboard className="w-4 h-4" />
              Go to dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
