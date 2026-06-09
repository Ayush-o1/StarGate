import React from 'react';
import { Orbit } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Mesh/Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-violet-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className={cn(
        "w-full max-w-md relative z-10",
        "animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both"
      )}>
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-2xl shadow-2xl shadow-black/50 p-8">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-5 border border-indigo-400/20">
              <Orbit className="text-white w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">{title}</h2>
            <p className="text-zinc-400 text-sm mt-2">{subtitle}</p>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  );
};
