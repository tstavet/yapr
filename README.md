# yapr

A voice-first AI buddy. v1 instance is **Kones**, built for Victoria.

## What this is

A PWA that lets you tap a glowing orb, talk to an AI friend, and have the AI remember what matters across conversations. Designed specifically for ADD brains — short responses, lateral thinking, no lecturing.

## Architecture

```
┌─────────────────────────┐
│  React PWA (Vercel)     │  ← Victoria's phone/desktop
└───────────┬─────────────┘
            │ HTTPS + Supabase JWT
┌───────────▼─────────────┐
│  Cloudflare Worker      │  ← API orchestration
│  /api/transcribe        │
│  /api/chat              │
│  /api/speak             │
│  /api/end-conversation  │
└──┬──────┬────────┬──────┘
   │      │        │
   │      │        └──► Supabase (Postgres + pgvector + Auth)
   │      │
   │      └──► Anthropic (Claude Sonnet 4.6 main, Haiku 4.5 background)
   │
   └──► OpenAI (Whisper, TTS, embeddings)
```

## Three-layer memory

- **L1 session buffer** — last 20 messages, verbatim
- **L2 structured facts** — living JSON bio, merged into system prompt
- **L3 episodic vector memory** — semantic search over every moment worth remembering

L2 and L3 are updated in the background after each conversation by Haiku 4.5 + OpenAI embeddings. The main conversation path never waits on these.

## Quick start

Read `docs/SETUP.md` for the full deploy walkthrough. Estimated time for a fresh clone to Victoria-can-use-it: **2–3 hours** if you don't hit any snags.

## Cost envelope

Targeting **under $40/month** for one user chatting ~20 min/day, 5 days/week.
- OpenAI Whisper + TTS + embeddings: ~$15–20/month
- Claude Sonnet 4.6 + Haiku 4.5: ~$5–10/month
- Supabase, Vercel, Cloudflare: free tier
- Total: ~$20–30/month

Swap OpenAI TTS for ElevenLabs later if voice quality becomes the ceiling.

## Scripts

```bash
npm install              # install frontend deps
npm run dev              # run frontend locally
npm run build            # production build

cd workers && npm install
npm run worker:dev       # run Worker locally
npm run worker:deploy    # deploy to Cloudflare
```

## Files that matter most

- `workers/src/prompts.js` — Kones's personality. Edit this first when tuning.
- `workers/src/lib/memory.js` — the three-layer retrieval logic.
- `workers/src/handlers/end-conversation.js` — the background memory extraction.
- `supabase/schema.sql` — database + pgvector setup.
- `src/routes/Talk.jsx` — the main voice loop UI.

## License

Private. Not for redistribution.
