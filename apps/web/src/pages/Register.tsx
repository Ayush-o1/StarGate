import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { AuthResponse } from '@stargate/shared';
import { ArrowRight, AlertCircle } from 'lucide-react';

import { AuthLayout } from '../components/auth/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data: AuthResponse = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setAuth(data.user, data.tokens);
      navigate('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to register');
      } else {
        setError('Failed to register');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create an Account" subtitle="Start orchestrating your workflows">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl mb-6 flex items-start gap-3 animate-in shake">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-5">
        <Input
          label="Full Name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          autoComplete="name"
        />

        <Input
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@stargate.local"
          autoComplete="email"
        />
        
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          minLength={8}
          autoComplete="new-password"
        />

        <Button
          type="submit"
          isLoading={loading}
          className="w-full mt-6"
        >
          {!loading && 'Create account'}
          {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-400 mt-8">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};
