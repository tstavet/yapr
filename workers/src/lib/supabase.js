// workers/src/lib/supabase.js
// Thin Supabase REST wrapper. We avoid the full JS SDK to keep Worker bundle small.

export function createSupabase(env, userToken) {
  const base = `${env.SUPABASE_URL}/rest/v1`;
  const headers = {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${userToken || env.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };

  async function req(path, opts = {}) {
    const resp = await fetch(`${base}${path}`, {
      ...opts,
      headers: { ...headers, ...(opts.headers || {}) }
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Supabase ${resp.status}: ${text}`);
    }
    if (resp.status === 204) return null;
    return resp.json();
  }

  async function rpc(fn, args) {
    return req(`/rpc/${fn}`, {
      method: 'POST',
      body: JSON.stringify(args)
    });
  }

  return { req, rpc };
}

// For background work (fact extraction, embedding insertion) we need service role
// to bypass RLS. Never exposed to the client.
export function createAdminSupabase(env) {
  const base = `${env.SUPABASE_URL}/rest/v1`;
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };

  async function req(path, opts = {}) {
    const resp = await fetch(`${base}${path}`, {
      ...opts,
      headers: { ...headers, ...(opts.headers || {}) }
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Supabase admin ${resp.status}: ${text}`);
    }
    if (resp.status === 204) return null;
    return resp.json();
  }

  async function rpc(fn, args) {
    return req(`/rpc/${fn}`, {
      method: 'POST',
      body: JSON.stringify(args)
    });
  }

  return { req, rpc };
}
