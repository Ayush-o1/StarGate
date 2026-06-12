import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { AuthResponse } from '@stargate/shared';
import { ArrowRight } from 'lucide-react';

import { AuthLayout } from '../components/auth/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

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
    <AuthLayout
      title="Create an account"
      subtitle="Build and automate your first workflow in minutes"
    >
      {error && (
        <div className="mb-6">
          <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>
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
          rightIcon={<ArrowRight />}
          className="w-full mt-6"
        >
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-400 mt-8">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};
