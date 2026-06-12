import React from 'react';

/**
 * PageLoader — Full-screen branded loading state.
 *
 * Replaces the bare `animate-spin rounded-full border-t-2 border-indigo-500`
 * spinners in Dashboard.tsx and WorkflowDetail.tsx.
 *
 * Uses the Stargate custom SVG logomark with a breathing (pulse) animation
 * rather than a spinning border — communicates "the app is alive" rather than
 * "something is happening that you can't see."
 */
export const PageLoader: React.FC = () => {
  return (
    <div
      role="status"
      aria-label="Loading Stargate"
      className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-5"
    >
      {/* Stargate logomark — geometric gate/portal SVG */}
      <div className="animate-logo-breathe">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Outer ring */}
          <circle
            cx="24"
            cy="24"
            r="21"
            stroke="url(#logo-gradient)"
            strokeWidth="2"
            opacity="0.8"
          />
          {/* Inner ring */}
          <circle
            cx="24"
            cy="24"
            r="13"
            stroke="url(#logo-gradient)"
            strokeWidth="1.5"
            opacity="0.5"
          />
          {/* Gate arch — top */}
          <path
            d="M14 24 C14 18.477 18.477 14 24 14 C29.523 14 34 18.477 34 24"
            stroke="url(#logo-gradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Gate pillars */}
          <line x1="14" y1="24" x2="14" y2="32" stroke="url(#logo-gradient)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="34" y1="24" x2="34" y2="32" stroke="url(#logo-gradient)" strokeWidth="2.5" strokeLinecap="round" />
          {/* Center dot */}
          <circle cx="24" cy="24" r="2.5" fill="url(#logo-gradient)" />

          <defs>
            <linearGradient id="logo-gradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#818cf8" />   {/* brand-400 */}
              <stop offset="100%" stopColor="#a78bfa" />  {/* violet-400 */}
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Wordmark */}
      <span className="text-sm font-medium text-zinc-500 tracking-widest uppercase">
        Stargate
      </span>

      <span className="sr-only">Loading…</span>
    </div>
  );
};

PageLoader.displayName = 'PageLoader';
