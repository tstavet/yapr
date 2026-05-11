import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

// Shown once, after a magic-link login, when profiles.password_set is false.
// Lets the user set a real password so they can log in directly next time
// without waiting for another email. Skip is allowed — flag stays false and
// they get prompted again next session.

const MIN_PASSWORD_LENGTH = 6; // Supabase default; raise if you bump it server-side

export default function SetPassword({ userId, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('idle'); // idle | working | error
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setStatus('error');
      setErrorMsg(`Password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setStatus('error');
      setErrorMsg("Passwords don't match.");
      return;
    }

    setStatus('working');
    setErrorMsg('');

    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setStatus('error');
      setErrorMsg(updateErr.message);
      return;
    }

    // Flip the flag so we don't prompt again. RLS lets the user write their own row.
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ password_set: true })
      .eq('id', userId);
    if (profileErr) {
      // Password is set in auth.users; just log and move on. Worst case we ask again.
      console.error('Failed to flip password_set flag:', profileErr);
    }

    onDone?.();
  }

  function handleSkip() {
    // Don't flip the DB flag — they can set a password later. But mark this
    // session as dismissed so we don't re-prompt mid-session.
    sessionStorage.setItem('yapr.skipSetPassword', '1');
    onDone?.();
  }

  return (
    <main className="relative z-10 min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="mb-12 text-center">
          <h1 className="font-oswald font-bold text-5xl md:text-6xl tracking-[0.005em] mb-4 text-brown">
            Set a password
          </h1>
          <p className="font-dmsans text-mist text-sm">
            So you can log back in without waiting for an email.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label htmlFor="password" className="sr-only">New password</label>
            <input
              id="password"
              type="password"
              required
              autoFocus
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-mist/40 focus:border-brown pb-3 pt-2 text-lg text-brown placeholder:text-mist/60 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="sr-only">Confirm password</label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-transparent border-b border-mist/40 focus:border-brown pb-3 pt-2 text-lg text-brown placeholder:text-mist/60 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'working'}
            className="w-full py-4 bg-brown text-cream font-medium tracking-wide hover:bg-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'working' ? 'Saving…' : 'Save password'}
          </button>

          {status === 'error' && (
            <p className="text-brown text-sm text-center">{errorMsg}</p>
          )}

          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={handleSkip}
              className="text-mist hover:text-brown transition-colors text-sm underline underline-offset-4 decoration-dotted"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
