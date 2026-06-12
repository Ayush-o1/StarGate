/**
 * Toast — Sonner wrapper pre-configured for Stargate's dark theme.
 *
 * Usage:
 *   import { toast } from '../components/ui/Toast';
 *   toast.success('Workflow imported');
 *   toast.error('Failed to run workflow');
 *   toast('Copied to clipboard');
 *
 * Add <Toaster /> once in App.tsx — it handles its own portal.
 */
import React from 'react';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

// ─── Pre-configured Toaster ───────────────────────────────────────────────────

export const Toaster: React.FC = () => (
  <SonnerToaster
    theme="dark"
    position="bottom-right"
    richColors
    closeButton
    duration={4000}
    gap={8}
    offset={20}
    expand={true}
    toastOptions={{
      style: {
        background:   '#18181b',
        border:       '1px solid #27272a',
        color:        '#fafafa',
        fontFamily:   "'Inter', ui-sans-serif, sans-serif",
        fontSize:     '13px',
        borderRadius: '12px',
        boxShadow:    '0 8px 24px -4px rgba(0,0,0,0.5)',
      },
    }}
  />
);

// ─── Re-export toast for use across the app ───────────────────────────────────

export const toast = sonnerToast;
