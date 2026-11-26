import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Input } from '../ui/primitives';

type AuthMode = 'login' | 'signup' | 'reset';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordRecovery,
  } = useApp();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleGoogle = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      // Toast already handled in AppContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (mode !== 'reset' && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email.trim(), password);
      } else if (mode === 'signup') {
        await signUpWithEmail(name.trim(), email.trim(), password);
      } else {
        await sendPasswordRecovery(email.trim());
        setMode('login');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1C2421] p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => setAuthModalOpen(false)}
          aria-label="Close authentication modal"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#A0AAA5] hover:bg-white/5 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <p className="text-xs font-medium text-[#00FFAA]">SUvita Account · Cloud Sync</p>
          <h2 id="auth-modal-title" className="mt-1 text-xl font-semibold text-white">
            {mode === 'login' && 'Sign in to SUvita'}
            {mode === 'signup' && 'Create your SUvita account'}
            {mode === 'reset' && 'Reset your password'}
          </h2>
          <p className="mt-1 text-sm text-[#A0AAA5]">
            Sync scans, saved products, comparisons, and SUvita AI conversations securely across devices.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="w-full h-11"
        >
          Continue with Google
          <ArrowRight className="h-4 w-4" />
        </Button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-[#8E9B94]">or with email</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-medium text-[#C8D3CD] mb-1.5">
                Full name
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7A8781]" />
                <Input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="pl-9"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-[#C8D3CD] mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7A8781]" />
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.in"
                className="pl-9"
                required
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-[#C8D3CD] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7A8781]" />
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pl-9"
                  required
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="rounded-lg border border-[#E05A5A]/30 bg-[#E05A5A]/10 px-3 py-2 text-xs text-[#F38B8B]">
              {errorMsg}
            </p>
          )}

          <Button
            type="submit"
            variant="secondary"
            disabled={submitting}
            className="w-full h-10"
          >
            {submitting
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign in with Email'
              : mode === 'signup'
              ? 'Create Account'
              : 'Send Recovery Email'}
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs text-[#A0AAA5]">
          {mode === 'login' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                }}
                className="hover:text-white underline-offset-4 hover:underline cursor-pointer"
              >
                Create an account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  setErrorMsg(null);
                }}
                className="hover:text-white underline-offset-4 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className="hover:text-white underline-offset-4 hover:underline cursor-pointer"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
