import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '../lib/utils';

// ─── ResizablePanel ───────────────────────────────────────────────────────────
// Wraps a bottom panel and lets the user drag the top edge to resize it.
// Height is persisted to localStorage.

interface ResizablePanelProps {
  children:     React.ReactNode;
  defaultHeight?: number;
  minHeight?:   number;
  maxHeight?:   number;
  storageKey?:  string;
  className?:   string;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  defaultHeight = 288,
  minHeight     = 160,
  maxHeight     = 520,
  storageKey    = 'sg-panel-height',
  className,
}) => {
  const [height, setHeight] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return clamp(parseInt(stored, 10), minHeight, maxHeight);
    } catch {}
    return defaultHeight;
  });

  const isDragging = useRef(false);
  const startY     = useRef(0);
  const startH     = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [height]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      // Dragging UP increases height (panel grows upward)
      const delta = startY.current - e.clientY;
      const next  = clamp(startH.current + delta, minHeight, maxHeight);
      setHeight(next);
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Persist
      try { localStorage.setItem(storageKey, String(height)); } catch {}
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, [minHeight, maxHeight, storageKey, height]);

  // Persist on height change (debounced via useEffect)
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(storageKey, String(height)); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [height, storageKey]);

  return (
    <div
      className={cn('flex flex-col flex-none border-t border-zinc-800 bg-zinc-900', className)}
      style={{ height }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className={cn(
          'h-1.5 w-full shrink-0 cursor-ns-resize group',
          'flex items-center justify-center',
          'hover:bg-brand-500/20 transition-colors duration-instant',
          'select-none',
        )}
        aria-label="Drag to resize panel"
        role="separator"
        aria-orientation="horizontal"
      >
        {/* Visual pill */}
        <div className="w-8 h-0.5 rounded-full bg-zinc-700 group-hover:bg-brand-500/60 transition-colors duration-instant" />
      </div>

      {/* Panel content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {children}
      </div>
    </div>
  );
};

ResizablePanel.displayName = 'ResizablePanel';
