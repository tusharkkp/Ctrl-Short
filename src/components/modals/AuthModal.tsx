/**
 * Purpose:
 * Minimalist monochrome authentication modal allowing developers to sign in,
 * create accounts, or test with quick-access developer credentials.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevLogin = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await signIn('dev@ctrlshort.io', 'Password123!');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick sign-in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-[#0A0A0A] border border-white/20 rounded-2xl p-6 sm:p-8 text-white shadow-2xl">
        {/* Header with Close */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="font-heading text-xl tracking-tight font-medium">Ctrl Short</span>
            <span className="text-xl leading-none select-none text-white/80" aria-hidden="true">✳︎</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-white/60 hover:text-white p-1 rounded transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-white/10 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 pb-3 text-sm font-medium transition-colors ${
              mode === 'signin'
                ? 'text-white border-b-2 border-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 pb-3 text-sm font-medium transition-colors ${
              mode === 'signup'
                ? 'text-white border-b-2 border-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        <h2 id="auth-modal-title" className="text-xl font-medium mb-1">
          {mode === 'signin' ? 'Welcome back' : 'Create developer account'}
        </h2>
        <p className="text-xs text-white/60 mb-5">
          {mode === 'signin'
            ? 'Access your link command center and live analytics.'
            : 'Start shortening links with sub-millisecond edge latency.'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500/40 rounded-lg text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/70 mb-1.5 font-mono">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@example.com"
              required
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-white/70 mb-1.5 font-mono">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-white text-black hover:bg-white/90 font-medium rounded-full text-sm transition-all disabled:opacity-50 mt-2 cursor-pointer"
          >
            {isSubmitting ? 'Authenticating...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-3 text-white/40 text-xs">or</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button
            type="button"
            onClick={handleDevLogin}
            disabled={isSubmitting}
            className="w-full py-2 px-4 bg-transparent border border-white/25 text-white/80 hover:text-white hover:border-white text-xs font-mono rounded-full transition-colors cursor-pointer"
          >
            ⚡ Continue as Guest Developer
          </button>
        </form>
      </div>
    </div>
  );
};
