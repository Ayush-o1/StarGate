import React, { useEffect, useCallback, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  isOpen:           boolean;
  onClose:          () => void;
  title?:           React.ReactNode;
  size?:            ModalSize;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?:   boolean;
  footer?:          React.ReactNode;
  className?:       string;
  children:         React.ReactNode;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-4xl',
};

// ─── Animation duration for close — must match CSS animation duration ─────────
const CLOSE_ANIMATION_MS = 150;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape   = true,
  footer,
  className,
  children,
}) => {
  const titleId = React.useId();
  // isClosing drives the exit animation before actually unmounting
  const [isClosing, setIsClosing] = useState(false);

  // ─── Trigger animated close ───────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setIsClosing(true);
    const timer = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, CLOSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  // ─── Escape key handler ───────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    },
    [closeOnEscape, handleClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // ─── Reset isClosing if parent re-opens while animating ───────────────────
  useEffect(() => {
    if (isOpen) setIsClosing(false);
  }, [isOpen]);

  // ─── Body scroll lock ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => { document.body.classList.remove('scroll-locked'); };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-zinc-950/80 backdrop-blur-sm',
        // Open: fade-in / Closing: fade-out
        isClosing ? 'animate-fade-out' : 'animate-fade-in',
      )}
      aria-hidden={!isOpen}
      onClick={closeOnBackdrop ? handleClose : undefined}
    >
      {/* FocusTrap keeps keyboard focus inside the dialog */}
      <FocusTrap
        focusTrapOptions={{
          escapeDeactivates: false, // we handle Escape ourselves above
          allowOutsideClick: true,
          fallbackFocus: '[data-modal-panel]',
        }}
      >
        {/* Panel */}
        <div
          data-modal-panel
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative w-full bg-zinc-900 border border-zinc-800',
            'rounded-2xl shadow-modal overflow-hidden flex flex-col',
            // Open: scale-in / Closing: scale-out
            isClosing ? 'animate-scale-out' : 'animate-scale-in',
            sizeStyles[size],
            className
          )}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
              {title && (
                <h2
                  id={titleId}
                  className="text-base font-semibold text-zinc-100 tracking-tight"
                >
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  onClick={handleClose}
                  aria-label="Close dialog"
                  className={cn(
                    'p-1.5 rounded-lg text-zinc-500',
                    'hover:bg-zinc-800 hover:text-zinc-100',
                    'transition-colors duration-standard',
                    'focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-brand-500/70 focus-visible:ring-offset-1',
                    'focus-visible:ring-offset-zinc-900',
                    !title && 'ml-auto'
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0 bg-zinc-900/60">
              {footer}
            </div>
          )}
        </div>
      </FocusTrap>
    </div>
  );
};

Modal.displayName = 'Modal';
