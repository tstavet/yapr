// workers/src/index.js
// Yapr API worker — voice loop + memory pipeline.

import { handleChat } from './handlers/chat.js';
import { handleTranscribe } from './handlers/transcribe.js';
import { handleSpeak } from './handlers/speak.js';
import { handleTalk } from './handlers/talk.js';
import { handleEndConversation } from './handlers/end-conversation.js';

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || env.ALLOWED_ORIGIN;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    try {
      let response;

      switch (url.pathname) {
        case '/api/transcribe':
          response = await handleTranscribe(request, env);
          break;
        case '/api/chat':
          response = await handleChat(request, env, ctx);
          break;
        case '/api/speak':
          response = await handleSpeak(request, env);
          break;
        case '/api/talk':
          response = await handleTalk(request, env, ctx);
          break;
        case '/api/end-conversation':
          response = await handleEndConversation(request, env, ctx);
          break;
        case '/api/health':
          response = new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
          break;
        default:
          response = new Response('Not found', { status: 404 });
      }

      // Attach CORS headers to every response
      const headers = new Headers(response.headers);
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => headers.set(k, v));
      return new Response(response.body, { status: response.status, headers });
    } catch (err) {
      console.error('Worker error:', err);
      return new Response(
        JSON.stringify({ error: err.message || 'Internal error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
        }
      );
    }
  }
};
