/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ─── Typography ──────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },

      // ─── Color System ────────────────────────────────────────────────────────
      colors: {
        // Brand — Indigo/Violet developer-tool identity
        // Anchored at brand-500 = #6366f1 (indigo-500)
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5', // CTA default
          700: '#4338ca', // CTA hover
          800: '#3730a3', // CTA pressed
          900: '#312e81',
        },

        // Semantic success — green-500 anchor (passes WCAG AA on zinc-900)
        success: {
          DEFAULT: '#22c55e',
          muted:   '#16a34a',
          subtle:  '#052e16',
          border:  '#166534',
        },

        // Semantic warning — amber (not yellow; holds identity at low opacity)
        warning: {
          DEFAULT: '#f59e0b',
          muted:   '#d97706',
          subtle:  '#1c1400',
          border:  '#92400e',
        },

        // Semantic danger — red-500 anchor
        danger: {
          DEFAULT: '#ef4444',
          muted:   '#dc2626',
          subtle:  '#1c0a0a',
          border:  '#991b1b',
        },

        // Semantic info — blue-500, distinct from brand-indigo
        info: {
          DEFAULT: '#3b82f6',
          muted:   '#2563eb',
          subtle:  '#0c1b33',
          border:  '#1e40af',
        },

        // Surface semantic aliases (zinc-based)
        surface: {
          base:          '#09090b', // zinc-950 — page background
          elevated:      '#18181b', // zinc-900 — card/panel background
          overlay:       '#27272a', // zinc-800 — hover/selected rows
          border:        '#3f3f46', // zinc-700 — default element borders
          'border-subtle': '#27272a', // zinc-800 — section dividers
        },
      },

      // ─── Shadow System (dark-mode tuned — higher opacity than Tailwind defaults) ──
      boxShadow: {
        'surface':  '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        'elevated': '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
        'modal':    '0 10px 25px -5px rgb(0 0 0 / 0.6), 0 4px 10px -5px rgb(0 0 0 / 0.5)',
        'overlay':  '0 20px 40px -8px rgb(0 0 0 / 0.7)',
        'brand-sm': '0 0 0 1px rgb(99 102 241 / 0.3), 0 4px 12px rgb(99 102 241 / 0.15)',
        'brand-md': '0 0 0 1px rgb(99 102 241 / 0.4), 0 8px 24px rgb(99 102 241 / 0.2)',
        'success-glow': '0 0 8px rgb(34 197 94 / 0.25)',
        'danger-glow':  '0 0 8px rgb(239 68 68 / 0.25)',
      },

      // ─── Border Radius (5 values — deprecated rounded-md) ───────────────────
      borderRadius: {
        // Keeps Tailwind defaults, adds semantic aliases
        'component': '0.5rem',   // 8px — inputs, small buttons, table rows
        'card':      '0.75rem',  // 12px — modals, cards, panels
        'hero':      '1rem',     // 16px — auth card, prominent containers
      },

      // ─── Animation Durations ─────────────────────────────────────────────────
      transitionDuration: {
        'instant':    '100',
        'fast':       '150',
        'standard':   '200',
        'deliberate': '300',
        'dramatic':   '400',
      },

      // ─── Custom Easings ──────────────────────────────────────────────────────
      transitionTimingFunction: {
        'spring':    'cubic-bezier(0.16, 1, 0.3, 1)',
        'snappy':    'cubic-bezier(0.4, 0, 0.2, 1)',
        'out-expo':  'cubic-bezier(0.19, 1, 0.22, 1)',
      },

      // ─── Keyframes ───────────────────────────────────────────────────────────
      keyframes: {
        // Existing (keep for backward compat)
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },

        // Entrance
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'slide-in-bottom': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },

        // Attention / status
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 4px rgb(99 102 241 / 0.3)' },
          '50%':       { boxShadow: '0 0 16px rgb(99 102 241 / 0.6)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.3' },
        },

        // Loading
        'shimmer': {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition: '200% 0' },
        },
        'logo-breathe': {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%':       { opacity: '1',   transform: 'scale(1.04)' },
        },

        // Dropdown / popover entrance (scale + fade + slight translate)
        'fade-in-scale': {
          from: { opacity: '0', transform: 'scale(0.95) translateY(-4px)' },
          to:   { opacity: '1', transform: 'scale(1)   translateY(0)' },
        },

        // Modal close (reverse of scale-in)
        'scale-out': {
          from: { opacity: '1', transform: 'scale(1)' },
          to:   { opacity: '0', transform: 'scale(0.97)' },
        },

        // Generic fade-out (for overlay/backdrop close)
        'fade-out': {
          from: { opacity: '1' },
          to:   { opacity: '0' },
        },

        // Count badge pop — for execution count badge when new item arrives
        'count-pop': {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.3)' },
          '70%':  { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },

        // Slide in from left — for sidebars/panels (future use)
        'slide-in-left': {
          from: { transform: 'translateX(-8px)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
      },

      // ─── Animation Utilities ─────────────────────────────────────────────────
      animation: {
        // Keep existing
        'shake':           'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',

        // Entrance
        'fade-in':         'fade-in 200ms ease-out',
        'fade-in-up':      'fade-in-up 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-down':    'fade-in-down 200ms ease-out',
        'scale-in':        'scale-in 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right':  'slide-in-right 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-bottom': 'slide-in-bottom 400ms cubic-bezier(0.16, 1, 0.3, 1)',

        // Attention
        'pulse-glow':      'pulse-glow 2s ease-in-out infinite',
        'pulse-dot':       'pulse-dot 1.5s ease-in-out infinite',

        // Loading
        'shimmer':         'shimmer 1.5s linear infinite',
        'logo-breathe':    'logo-breathe 2s ease-in-out infinite',

        // Dropdown / popover
        'fade-in-scale':   'fade-in-scale 180ms cubic-bezier(0.16, 1, 0.3, 1)',

        // Modal close
        'scale-out':       'scale-out 150ms cubic-bezier(0.4, 0, 1, 1)',
        'fade-out':        'fade-out 150ms ease-in',

        // Count badge pop
        'count-pop':       'count-pop 300ms cubic-bezier(0.16, 1, 0.3, 1)',

        // Slide-in variants
        'slide-in-left':   'slide-in-left 250ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
