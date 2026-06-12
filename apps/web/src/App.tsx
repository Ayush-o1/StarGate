import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { WorkflowDetail } from './pages/WorkflowDetail';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CommandPalette } from './components/CommandPalette';
import { Toaster } from './components/ui/Toast';

// ─── Global ⌘K / Ctrl+K handler ──────────────────────────────────────────────

function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { isOpen, setIsOpen, fileInputRef };
}

// ─── App ──────────────────────────────────────────────────────────────────────

export const App: React.FC = () => {
  const { isOpen, setIsOpen } = useCommandPalette();

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/workflows/:id" element={<WorkflowDetail />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global command palette — renders above everything via z-[9990] */}
        <CommandPalette
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />

        {/* Global toast notification system */}
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
