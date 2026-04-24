# Yapr Setup Walkthrough

Everything you need to get from a fresh clone to Victoria using Kones on her phone. Do these in order.

Estimated time: **2–3 hours** start to finish. The Supabase and Cloudflare steps are the unfamiliar parts. Vercel and the frontend should feel like home.

---

## 1. API Keys You Need

Create accounts and get keys. Do this first so you're not context-switching mid-deploy.

### Anthropic
1. Go to https://console.anthropic.com
2. Add a payment method, load $20 credit
3. Create an API key: `sk-ant-api03-...`
4. Save it somewhere. You'll paste it into Cloudflare later.

### OpenAI
1. Go to https://platform.openai.com
2. Add payment method, load $20 credit
3. Create API key: `sk-proj-...`
4. Save it.

### Supabase
1. Go to https://supabase.com and sign up
2. Create new project. Name it `yapr`. Pick a region near you (`us-east-1` is fine from Nashville).
3. Save the database password somewhere safe.
4. Wait ~2 minutes for project provisioning.
5. Once ready, go to **Project Settings → API**. You'll need three values:
   - `Project URL` (e.g. `https://abcdefgh.supabase.co`)
   - `anon / public key` (the short one, client-safe)
   - `service_role key` (the long one, NEVER expose to client)

### Cloudflare
1. Go to https://cloudflare.com and sign up (free tier)
2. No setup needed yet — we'll deploy the Worker via CLI.

### Vercel
1. Go to https://vercel.com and sign in with GitHub
2. No setup needed yet.

---

## 2. Supabase Database Setup

1. In the Supabase dashboard, click **SQL Editor** in the sidebar.
2. Click **New query**.
3. Open `supabase/schema.sql` from this repo, copy the entire contents.
4. Paste into the SQL Editor and click **Run**.
5. You should see "Success. No rows returned."
6. Verify by clicking **Table Editor** — you should see `profiles`, `user_facts`, `conversations`, `messages`, `episodic_memories`.

### Configure auth redirect
1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to your eventual Vercel URL (e.g. `https://yapr.vercel.app`). For now you can use `http://localhost:5173` and update later.
3. Under **Redirect URLs**, add both:
   - `http://localhost:5173`
   - `https://yapr.vercel.app` (or whatever your Vercel URL will be)

### Configure magic link email (optional but recommended)
1. Go to **Authentication → Email Templates → Magic Link**.
2. Customize the subject line and body to something warmer than the default. Something like:

   > Subject: Your Yapr link
   > Body: Tap this to come back in: {{ .ConfirmationURL }}

---

## 3. Deploy the Cloudflare Worker

```bash
cd workers
npm install
npx wrangler login     # opens browser to authenticate
```

Set the secrets (these are stored encrypted by Cloudflare, never in git):

```bash
npx wrangler secret put ANTHROPIC_API_KEY
# paste your sk-ant-... key

npx wrangler secret put OPENAI_API_KEY
# paste your sk-proj-... key

npx wrangler secret put SUPABASE_URL
# paste https://YOUR_PROJECT.supabase.co

npx wrangler secret put SUPABASE_ANON_KEY
# paste the anon public key

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# paste the service_role key (long one)
```

Edit `workers/wrangler.toml` and update `ALLOWED_ORIGIN` to your eventual frontend URL (default `https://yapr.vercel.app`). You can come back and change this later.

Deploy:

```bash
npm run deploy
```

Wrangler will print a URL like `https://yapr-api.yourname.workers.dev`. **Copy this.** You need it for the frontend.

Verify it's alive:

```bash
curl https://yapr-api.yourname.workers.dev/api/health
# should return: {"ok": true}
```

---

## 4. Deploy the Frontend to Vercel

### Set local env first
Create `.env.local` in the project root (not committed):

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_WORKER_URL=https://yapr-api.yourname.workers.dev
```

### Test locally
```bash
npm install
npm run dev
```

Open http://localhost:5173. You should see the login screen. Enter your email, check your inbox, click the magic link. It should redirect you to the Talk screen with the glowing orb.

Tap the orb. Grant mic permission. Say something. If Kones responds, you're winning.

### Deploy to Vercel
```bash
npm install -g vercel
vercel login
vercel           # follow prompts — accept defaults
vercel --prod    # deploy production
```

In the Vercel dashboard, go to your project → **Settings → Environment Variables** and add the same three `VITE_*` variables.

Redeploy: `vercel --prod`

### Update the CORS allowlist
Go back to `workers/wrangler.toml` and set `ALLOWED_ORIGIN` to your Vercel URL. Redeploy:

```bash
cd workers
npm run deploy
```

---

## 5. Give Victoria the Link

On her phone:
1. Open Safari, go to your Vercel URL
2. Tap Share → Add to Home Screen. Name it "Yapr".
3. Open from home screen — it launches full-screen like an app.
4. Enter her email, click the magic link in her email.
5. Tap the orb. Give mic permission. Talk.

---

## 6. Known Quirks & Troubleshooting

### "Mic access denied" on iOS PWA
iOS only grants mic access to PWAs added to home screen, not Safari tabs. If Victoria opens Yapr in a normal Safari tab, mic will work. But for the full-screen app experience, she needs to Add to Home Screen.

### Magic link opens in Safari instead of the PWA
Known iOS limitation. Workaround: she opens the PWA fresh from home screen after clicking the link. Session will be picked up. For v2, we can switch to 6-digit OTP codes for a cleaner flow.

### Kones's voice sounds robotic
Expected for OpenAI TTS tier 1. When you're ready to upgrade, swap the `/api/speak` handler to use ElevenLabs Flash v2.5. The code change is ~10 lines. Budget impact: roughly $30–40/month extra at current usage.

### Memory extraction isn't happening
The fact extraction and episodic memory run in the background via `ctx.waitUntil`. Check Cloudflare Workers logs:
```bash
cd workers
npx wrangler tail
```
You'll see the extraction logs as conversations end.

### Cost spiking unexpectedly
Most common cause: TTS on long responses. Kones's prompt caps responses at "1–3 sentences default," but if you notice responses creeping longer, tighten the prompt in `workers/src/prompts.js`.

---

## 7. What to Watch For in Week 1

Things you want to tune based on Victoria's actual usage:

- **Response length** — if Kones is too chatty or too terse, adjust the prompt
- **Voice speed** — change `speed: 1.0` in `speak.js` to 0.9 (slower) or 1.1 (faster)
- **Voice identity** — try all six OpenAI voices (alloy, echo, fable, onyx, nova, shimmer) by updating `buddy_voice` in her profile row in Supabase
- **Memory drift** — read what's in `user_facts` weekly; if Kones is remembering the wrong things, tune the FACT_EXTRACTION_PROMPT

---

## 8. Version Bumps (v2 roadmap)

Once Victoria is using it daily and you're ready to level up:

1. ElevenLabs for voice quality
2. Resumption prompts on session start ("hey, last time you were stuck on X — how'd that go?")
3. Body-doubling mode (quiet ambient presence while she works)
4. Task extraction (she rambles, Kones extracts todos)
5. Multi-user signup flow (for the commercial version)

Architecture is ready for all of these. None require rework — each is an additive feature.
