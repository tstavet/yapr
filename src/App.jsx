import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Marketing from './pages/Marketing';
import Talk from './routes/Talk';
import SetPassword from './routes/SetPassword';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  // null = unknown/not logged in; true/false = loaded from profiles.password_set
  const [passwordSet, setPasswordSet] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Whenever the session changes, refresh the password_set flag.
  useEffect(() => {
    if (!session?.user?.id) {
      setPasswordSet(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('password_set')
        .eq('id', session.user.id)
        .single();
      if (cancelled) return;
      if (error) {
        // If the profile row is missing for any reason, treat as not-set so we
        // prompt them. Worst case the user clicks skip.
        console.error('profile load failed:', error);
        setPasswordSet(false);
      } else {
        setPasswordSet(!!data?.password_set);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="atmosphere" />
        <div className="grain" />
        <p className="display text-mist text-2xl italic">A moment…</p>
      </div>
    );
  }

  // Logged in but we haven't checked the password flag yet — hold to avoid a flash.
  if (session && passwordSet === null) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="atmosphere" />
        <div className="grain" />
        <p className="display text-mist text-2xl italic">A moment…</p>
      </div>
    );
  }

  const skippedThisSession = sessionStorage.getItem('yapr.skipSetPassword') === '1';
  const needsPassword = session && passwordSet === false && !skippedThisSession;

  // Wrapper for in-app routes — keeps the atmospheric gradients and paper
  // grain on Login/Talk/SetPassword. Marketing renders its own background.
  const inAppShell = (children) => (
    <>
      <div className="atmosphere" />
      <div className="grain" />
      {children}
    </>
  );

  return (
    <Routes>
      {/* Marketing landing at /. Public; if a session exists, Marketing itself
          renders <Navigate to="/chat" /> using the session prop. */}
      <Route path="/" element={<Marketing session={session} />} />

      <Route
        path="/login"
        element={session ? <Navigate to="/chat" replace /> : inAppShell(<Login />)}
      />

      <Route
        path="/chat"
        element={
          !session
            ? <Navigate to="/login" replace />
            : needsPassword
              ? <Navigate to="/set-password" replace />
              : inAppShell(<Talk />)
        }
      />

      <Route
        path="/set-password"
        element={
          !session
            ? <Navigate to="/login" replace />
            : !needsPassword
              ? <Navigate to="/chat" replace />
              : inAppShell(
                  <SetPassword
                    userId={session.user.id}
                    onDone={() => setPasswordSet(true)}
                  />
                )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
