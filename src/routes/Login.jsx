import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');  // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('sending');
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
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
            a voice for the tangents
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
                setEmail('');
              }}
              className="text-mist hover:text-cream transition-colors text-sm underline underline-offset-4 decoration-dotted"
            >
              use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
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
              disabled={status === 'sending'}
              className="w-full py-4 bg-cream text-ink font-medium tracking-wide hover:bg-rust hover:text-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'sending' ? 'sending…' : 'send me a link'}
            </button>

            {status === 'error' && (
              <p className="text-rust text-sm text-center">{errorMsg}</p>
            )}
          </form>
        )}

        <p className="mt-16 text-center text-mist/60 text-xs italic">
          for victoria, with love.
        </p>
      </div>
    </main>
  );
}
