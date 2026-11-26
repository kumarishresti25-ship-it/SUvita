import React, { useState } from 'react';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button, Dialog, Input } from './ui/primitives';

export function AuthModal() {
  const {
    authModalOpen,
    setAuthModalOpen,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleGoogle = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google Sign-In did not complete.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetSent(false);

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'reset') {
        await sendPasswordReset(email);
        setResetSent(true);
      } else if (mode === 'login') {
        if (!password) {
          setErrorMsg('Please enter your password.');
          return;
        }
        await signInWithEmail(email, password);
      } else {
        if (!name.trim()) {
          setErrorMsg('Please enter your name.');
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          return;
        }
        await signUpWithEmail(name, email, password);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={authModalOpen}
      onOpenChange={setAuthModalOpen}
      title={
        mode === 'login'
          ? 'Sign in to SUvita'
          : mode === 'signup'
          ? 'Create your SUvita account'
          : 'Reset your password'
      }
      description="Sync your scanned products, saved collections, and sustainability preferences across devices."
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={submitting}
          onClick={handleGoogle}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          Continue with Google
        </Button>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-white/10" />
          <span className="mx-3 text-xs text-[#7E8C84]">or with email</span>
          <div className="flex-grow border-t border-white/10" />
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#141A17] p-1 border border-white/[0.06]">
          {(
            [
              ['login', 'Sign in'],
              ['signup', 'Sign up'],
              ['reset', 'Recover'],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setMode(tab);
                setErrorMsg(null);
                setResetSent(false);
              }}
              className={`rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                mode === tab
                  ? 'bg-[#202923] text-white'
                  : 'text-[#A0AAA5] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-medium text-[#C2CCC6] mb-1.5">
                Full name
              </label>
              <Input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Maya Lin"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-[#C2CCC6] mb-1.5">
              Email address
            </label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-[#C2CCC6] mb-1.5">
                Password
              </label>
              <Input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}

          {errorMsg && (
            <p role="alert" className="rounded-lg border border-[#E05A5A]/30 bg-[#E05A5A]/10 px-3 py-2 text-xs text-[#F2A3A3]">
              {errorMsg}
            </p>
          )}

          {resetSent && (
            <p className="rounded-lg border border-[#00FFAA]/30 bg-[#00FFAA]/10 px-3 py-2 text-xs text-[#00FFAA]">
              Recovery link dispatched. Check your inbox to set a new password.
            </p>
          )}

          <Button type="submit" variant="secondary" className="w-full" disabled={submitting}>
            <Mail className="h-4 w-4" />
            {mode === 'login'
              ? 'Sign in with Email'
              : mode === 'signup'
              ? 'Create Account'
              : 'Send Recovery Link'}
          </Button>
        </form>
      </div>
    </Dialog>
  );
}
