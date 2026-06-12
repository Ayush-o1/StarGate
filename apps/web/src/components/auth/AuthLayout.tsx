import React from 'react';
import { cn } from '../../lib/utils';
import { Zap, GitBranch, Shield } from 'lucide-react';

// ─── Stargate logomark ────────────────────────────────────────────────────────

const Logo: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="24" cy="24" r="21" stroke="url(#auth-g)" strokeWidth="2" opacity="0.8" />
    <circle cx="24" cy="24" r="13" stroke="url(#auth-g)" strokeWidth="1.5" opacity="0.4" />
    <path d="M14 24 C14 18.477 18.477 14 24 14 C29.523 14 34 18.477 34 24" stroke="url(#auth-g)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="14" y1="24" x2="14" y2="32" stroke="url(#auth-g)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="34" y1="24" x2="34" y2="32" stroke="url(#auth-g)" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="24" cy="24" r="2.5" fill="url(#auth-g)" />
    <defs>
      <linearGradient id="auth-g" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#818cf8" />
        <stop offset="100%" stopColor="#a78bfa" />
      </linearGradient>
    </defs>
  </svg>
);

// ─── Feature highlight card ────────────────────────────────────────────────────

interface FeatureProps {
  icon:  React.ElementType;
  title: string;
  desc:  string;
  delay: number;
}

const Feature: React.FC<FeatureProps> = ({ icon: Icon, title, desc, delay }) => (
  <div
    className="flex items-start gap-3 animate-fade-in-up fill-mode-both"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/20 flex items-center justify-center shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-brand-400" aria-hidden="true" />
    </div>
    <div>
      <div className="text-sm font-semibold text-zinc-200">{title}</div>
      <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{desc}</div>
    </div>
  </div>
);

// ─── AuthLayout ────────────────────────────────────────────────────────────────

interface AuthLayoutProps {
  children: React.ReactNode;
  title:    string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex bg-zinc-950 selection:bg-brand-500/30">

      {/* ── Left panel — brand + feature highlights ──────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 border-r border-zinc-800/60 bg-zinc-950 relative overflow-hidden px-12 py-10">

        {/* Background gradient orbs */}
        <div className="absolute -top-32 -left-24 w-80 h-80 bg-brand-500/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 -right-16 w-64 h-64 bg-violet-500/8 rounded-full blur-[80px] pointer-events-none" />

        {/* Top: Logo + brand name */}
        <div className="flex items-center gap-3 animate-fade-in">
          <Logo />
          <span className="text-lg font-bold text-zinc-100 tracking-tight">Stargate</span>
        </div>

        {/* Middle: Feature list */}
        <div className="space-y-6 py-8">
          <div className="animate-fade-in-up fill-mode-both" style={{ animationDelay: '100ms' }}>
            <div className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-5">
              Why engineers choose Stargate
            </div>
          </div>
          <Feature
            icon={GitBranch}
            title="Visual DAG Editor"
            desc="Chain HTTP requests and conditional logic in a drag-and-drop canvas. No YAML required."
            delay={160}
          />
          <Feature
            icon={Zap}
            title="Built-in Observability"
            desc="Every execution is logged with per-node timings, status, and full request/response bodies."
            delay={240}
          />
          <Feature
            icon={Shield}
            title="Secure by Default"
            desc="SSRF protection, workspace isolation, token refresh, and audit-ready execution history."
            delay={320}
          />
        </div>

        {/* Bottom: Testimonial / tagline */}
        <div className="animate-fade-in-up fill-mode-both" style={{ animationDelay: '400ms' }}>
          <blockquote className="border-l-2 border-brand-500/40 pl-4">
            <p className="text-sm text-zinc-400 italic leading-relaxed">
              "Visual workflow automation for developers who care about reliability."
            </p>
          </blockquote>
        </div>
      </div>

      {/* ── Right panel — auth form ───────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">

        {/* Subtle radial gradient behind the form */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06)_0%,transparent_70%)] pointer-events-none" />

        <div
          className={cn(
            'w-full max-w-md relative z-10',
            'animate-fade-in-up fill-mode-both',
          )}
          style={{ animationDelay: '80ms' }}
        >
          {/* Mobile-only logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <Logo />
            <span className="text-base font-bold text-zinc-100">Stargate</span>
          </div>

          {/* Form card */}
          <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-modal p-8">
            {/* Title */}
            <div className="mb-7">
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">{title}</h1>
              <p className="text-sm text-zinc-500 mt-1.5">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
