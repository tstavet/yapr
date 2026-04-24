// workers/src/lib/auth.js
// Verifies the Supabase JWT and returns the user id.

export async function requireUser(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Missing auth token');

  // Verify via Supabase's /auth/v1/user endpoint
  const resp = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY
    }
  });
  if (!resp.ok) throw new Error('Invalid or expired token');
  const user = await resp.json();
  return { userId: user.id, token };
}
