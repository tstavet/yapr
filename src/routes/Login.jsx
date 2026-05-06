import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

// Two paths in here:
//   1. email + password (primary, fast re-login on any device)
//   2. magic link (fallback for first-time users or anyone who lost their pwd)
// First-time users go through magic link, then get prompted to set a password
// on the SetPassword screen so future logins skip the email.

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('password'); // 'password' | 'magic'
  const [status, setStatus] = useState('idle'); // idle | working | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  function friendlyError(err) {
    const m = (err?.message || '').toLowerCase();
    if (m.includes('invalid login')) {
      return 'wrong password, or no account yet. try the magic link below.';
    }
    if (m.includes('email not confirmed')) {
      return 'check your email for a confirmation link first.';
    }
    return err?.message || 'something went sideways.';
  }

  async function handlePasswordLogin(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setStatus('working');
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) {
      setStatus('error');
      setErrorMsg(friendlyError(error));
    }
    // success path: App.jsx picks up the session change and routes us forward.
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    if (!email.trim()) {
      setStatus('error');
      setErrorMsg('enter your email first.');
      return;
    }
    setStatus('working');
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) {
      setStatus('error');
      setErrorMsg(friendlyError(error));
    } else {
      setStatus('sent');
    }
  }

  return (
    <main className="relative z-10 min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="mb-12 text-center">
          <h1 className="display text-7xl md:text-8xl tracking-tight mb-3">
            yapr<span className="text-rust">.</span>
          </h1>
          <p className="text-mist text-sm uppercase tracking-[0.3em]">
            The AI buddy you yap with
          </p>
        </div>

        {status === 'sent' ? (
          <div className="text-center space-y-4">
            <p className="display text-2xl italic text-cream">check your email.</p>
            <p className="text-mist text-sm">
              we sent a link to <span className="text-cream">{email}</span>
            </p>
            <button
              onClick={() => {
                setStatus('idle');
                setMode('password');
                setEmail('');
                setPassword('');
              }}
              className="text-mist hover:text-cream transition-colors text-sm underline underline-offset-4 decoration-dotted"
            >
              use a different email
            </button>
          </div>
        ) : mode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-mist/40 focus:border-cream pb-3 pt-2 text-lg text-cream placeholder:text-mist/60 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-mist/40 focus:border-cream pb-3 pt-2 text-lg text-cream placeholder:text-mist/60 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'working'}
              className="w-full py-4 bg-cream text-ink font-medium tracking-wide hover:bg-rust hover:text-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'working' ? 'logging in…' : 'log in'}
            </button>

            {status === 'error' && (
              <p className="text-rust text-sm text-center">{errorMsg}</p>
            )}

            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('magic');
                  setStatus('idle');
                  setErrorMsg('');
                }}
                className="text-mist hover:text-cream transition-colors text-sm underline underline-offset-4 decoration-dotted"
              >
                first time, or forgot your password?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-5">
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-mist/40 focus:border-cream pb-3 pt-2 text-lg text-cream placeholder:text-mist/60 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'working'}
              className="w-full py-4 bg-cream text-ink font-medium tracking-wide hover:bg-rust hover:text-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'working' ? 'sending…' : 'send me a link'}
            </button>

            {status === 'error' && (
              <p className="text-rust text-sm text-center">{errorMsg}</p>
            )}

            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('password');
                  setStatus('idle');
                  setErrorMsg('');
                }}
                className="text-mist hover:text-cream transition-colors text-sm underline underline-offset-4 decoration-dotted"
              >
                log in with password instead
              </button>
            </div>
          </form>
        )}

        <p className="mt-16 text-center text-mist/60 text-xs italic">
          For victoria, with love.
        </p>
      </div>
    </main>
  );
}
