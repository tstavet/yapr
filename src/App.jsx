import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './routes/Login';
import Talk from './routes/Talk';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="atmosphere" />
        <div className="grain" />
        <p className="display text-mist text-2xl italic">a moment…</p>
      </div>
    );
  }

  return (
    <>
      <div className="atmosphere" />
      <div className="grain" />
      <Routes>
        <Route
          path="/"
          element={session ? <Talk /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <Login />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
