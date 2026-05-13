# Yapr handoff — marketing page polish session

You're inheriting Yapr, a voice-first AI companion (assistant name "Yap"). This document is a hard reset for the next LLM session focused on continuing to refine the public marketing landing page. The previous-session brief (full app context) is preserved at the end — read both halves.

Branch state as of this handoff: `claude/review-yapr-codebase-cfgjW`, last commit `9b04ccc`. Branch is ahead of `main` by ~16 commits; Theodore reviews + merges manually.

---

## What just shipped in this session

Sixteen commits, all on `src/pages/Marketing.jsx`. Most of the work was a section-by-section polish pass — hero, `#about`, `#how`, `#memory`, pricing, header. Animations stripped, sentence-case sweep reversed on Oswald headings (Theodore re-uppercased between sessions — Marketing is now all-caps Oswald again for headlines, sentence case elsewhere).

### Hero (`<main>` in Marketing.jsx)
- Mascot swapped from `yap-walking.png` to `yap.png` (the 1024×1024 portrait used on the Talk orb).
- **Mobile**: centered vertical stack — pinecone on top, YAPR wordmark below, subtitle below, brown "Start yapping" CTA at bottom. Whole composition centered in a `min-h-[70svh]` viewport.
- **Desktop**: row layout — YAPR left, pinecone right (mascot wrapper uses `min-[761px]:order-2` to swap from the JSX order). Subtitle + CTA stack below, left-aligned.
- Mascot size — desktop `clamp(12rem, 36vw, 39rem)` (height), mobile `clamp(10rem, 50vw, 17rem)`.
- Wordmark — desktop `clamp(8rem, 24vw, 26rem)`, mobile `clamp(3.5rem, 17vw, 7rem)`.
- Tagline copy now: *"Your buddy to yap with. Tap to start and Yapr listens, chats back, and remembers what matters."*

### `#about` ("Ready to chat when you are")
- Headline shortened from "Yapr is ready to chat when you are." → "Ready to chat when you are". Hard `<br/>` dropped.
- Body trimmed to *"Vent about your day, gossip about the groupchat, or talk through a hard event."* (Removed the duplicated "where you left off." bug and the memory line — that's `#memory`'s job.)
- Coffee pinecone enlarged: mobile `max-w-[340px]` (was 280), desktop `max-w-[560px]` (was 420).

### `#how` ("How it works.")
- Floating `01`/`02`/`03` numbers removed.
- All three step PNGs are 1254×1254 squares — the old `aspect-[500/923]`, `[537/845]`, `[674/852]` per-step ratios were stale and made the labels stagger. Now all three wrappers use `aspect-square` with `bg-bottom`, so every pinecone box is identical size → labels auto-align on a shared baseline.
- Pinecone width bumped from `clamp(140px, 18vw, 220px)` → `clamp(260px, 30vw, 420px)`.
- Section `py` reduced (`clamp(80px,12vw,180px)` → `clamp(60px,9vw,140px)`), headline margin and grid gap tightened.
- The three duplicated step blocks collapsed into a `.map()` so they can't drift apart.
- Trailing whitespace in "Tap to start " label removed.

### `#memory` ("Yapr remembers.")
- Pinecone (`yap-stretch.png`, 1254² square) enlarged to `clamp(280px, 30vw, 500px)`. Stale `aspect-[930/725]` → `aspect-square`. Absolute desktop positioning adjusted from `-top-10 -right-5` → `-top-4 right-0` so the bigger image stays in section bounds.
- List items unchanged.

### Pricing (`#start`)
- Mirrored walking pinecone (`yap-walking.png`, 1024² square) enlarged to `clamp(280px, 30vw, 500px)`. Stale `aspect-[544/686]` → `aspect-square`. `[transform:scaleX(-1)]` preserved.

### Header
- Top-left hamburger replaced with the **Yapr wordmark** (Oswald 700 uppercase, `text-3xl min-[761px]:text-4xl`, links to `/`). Matches Login/SetPassword/Talk pages.
- **"Hear Yap talk" pill removed** entirely (was `href="#"`, non-functional).
- "Start yapping" pill in top-right unchanged.

### Animations — all gone
- Stripped every `animate-rise`, `animate-rise-slow`, `animate-float`, `animate-hop`, `animate-bob`, `animate-blip` class from the JSX.
- Removed the `.marketing-reveal` IntersectionObserver `useEffect` and its CSS.
- Removed the `prefers-reduced-motion` override block (now redundant).
- The three hero blip dots (tied to `animate-blip`, invisible without it) are gone.
- The "Scroll" hint at the bottom of the hero is gone.
- Page renders static on first paint.

### Type hierarchy — unified
| Level | Size token |
|---|---|
| Hero title (YAPR wordmark) | desktop `clamp(8rem, 24vw, 26rem)` · mobile `clamp(3.5rem, 17vw, 7rem)` |
| All section H2s | `clamp(2.5rem, 11vw, 11rem)` *(was `4rem` floor — the floor caused the H2 to nearly match the hero on mobile, no hierarchy)* |
| All body subtitles | `clamp(1.1rem, 1.6vw, 1.5rem)` *(unified from three different prior values across hero / #about / pricing)* |
| `#memory` list items | `clamp(2rem, 5.5vw, 5rem)` — special design element, not a subtitle |
| `#how` step labels | `clamp(2rem, 4vw, 3.5rem)` — labels under pinecones, mid-tier |

Hero is biggest, H2s ~38% of hero on desktop, body ~5% of hero. On a 393px phone: hero 67px → H2 43px → body 17.6px.

### Pinecone size token
For consistency across major sections: roughly `clamp(280px, 30vw, 500px)`. Exceptions:
- Hero mascot (yap.png) has its own clamp — it's the brand anchor.
- `#how` is constrained by the 3-column grid; uses `clamp(260px, 30vw, 420px)`.
- `#about` coffee pinecone uses `max-w-[340px] / max-w-[560px]` because it's in a 2-col grid with its own width sizing.

---

## Tech stack

- **Frontend**: React 18 + Vite + Tailwind. PWA via `vite-plugin-pwa` (generateSW). Hosted on Vercel at `yapr-delta.vercel.app`, auto-deploys on push to `main`.
- **Routing**: `react-router-dom`. Routes in `src/App.jsx`: `/` → Marketing, `/login` → Login, `/chat` → Talk, `/set-password` → SetPassword.
- **Worker**: Cloudflare Worker at `yapr-api.soft-surf-dcc7.workers.dev`. NOT auto-deployed — Theodore runs `wrangler` manually. Pinned to `wrangler@3.114.17`.
- **Database**: Supabase Postgres + pgvector. Tables: `auth.users`, `profiles`, `user_facts`, `conversations`, `messages`, `episodic_memories`. RLS enabled.
- **External APIs**: OpenAI (Whisper STT, `text-embedding-3-small`), ElevenLabs Flash v2.5 (TTS, default voice Gigi `n7Wi4g1bhpw4Bs8HK5ph`), Anthropic (Sonnet 4.6 for `/api/talk` and `/api/resume`; Haiku 4.5 for both extractors).
- **Repo**: `tstavet/yapr`. Theodore merges feature branches to `main` manually.

---

## Marketing page structure

File: `src/pages/Marketing.jsx`. Single component, no sub-components.

```
<div marketing-bg, font-dmsans, overflow-x-hidden>
  <style> .mk-hero-wordmark / .mk-hero-mascot CSS clamps </style>
  <div marketing-root>
    <div radial-gradient background wash />
    <header> [Yapr wordmark left] [Start yapping pill right] </header>
    <main hero>
      <wordmark + mascot row (flex-col mobile / flex-row desktop)>
      <subtitle paragraph>
      <brown CTA button>
    </main>
    <section #about> [headline + body left] [coffee pinecone right] </section>
    <section #how> [headline] [3-column step grid] </section>
    <section #memory> [stretch pinecone top-right absolute] [headline] [5-line list] </section>
    <section #start> [walking mirror pinecone] [$99 a month.] [subtitle] [CTA] </section>
    <footer> [Yapr wordmark] [For Victoria, with love] [Privacy/Terms/Contact] </footer>
  </div>
</div>
```

### Custom breakpoints (memorize)
The original HTML source used 760px and 900px breakpoints. Tailwind defaults are 768/1024. **Use the arbitrary variants `min-[761px]:` and `min-[901px]:` everywhere — do NOT reach for `md:` / `lg:`** unless you want silent 8px / 124px drift ranges.

Also: the hero CSS clamps (in the inline `<style>` block) gate phone-vs-desktop at `max-width: 760px`, not 420px. iPhone Pro Max is 430 CSS px wide — the prior 420 boundary missed it and caused the hero to render with the desktop clamp, overflowing the viewport. **Don't drop the breakpoint back to 420.**

### Palette tokens
Marketing palette is namespaced under `marketing.*` in `tailwind.config.js` so the marketing surface can be tuned independently of the in-app palette:
- `marketing-bg` `#F1EADB` — page background tan
- `marketing-bg-alt` `#EDE4D1`
- `marketing-brown` `#6b4423` — primary text and CTA color
- `marketing-brown-deep` `#4a2f18`
- `marketing-brown-soft` `#8a6440`
- `marketing-ink` `#2a1a0d`
- `marketing-muted` `#8a7560`
- `marketing-card` `#ffffff`

The app-level tokens (`bg-cream`, `text-brown`, `text-ink`) are still in use on Login/SetPassword/Talk and cascade from the same hex values — keep the two systems separated; don't cross-reference.

### Fonts
- Body: DM Sans (set on `body` in `index.css`)
- Display: Oswald 700 (`font-oswald`) — wordmarks, headlines, list items
- Italic accent: Playfair Display italic 400 (`font-playfair`) — only on footer "For Victoria, with love."

All three are loaded via the Google Fonts `<link>` in `index.html`.

---

## Theodore's workflow quirks (do not forget these)

- His laptop folder `~/Desktop/yapr/` is **not a git clone**. He pulls individual files via `curl` from raw GitHub URLs into the local folder, then runs `wrangler`. Don't tell him to `git pull`.
- Wrangler is pinned to `3.114.17` (v4 has a `.Trash` permission bug). Deploy: `cd ~/Desktop/yapr/workers && npx wrangler@3.114.17 deploy`. Verify the "Total Upload: X.XX KiB" increased from the previous deploy — if not, the curl didn't overwrite, re-curl and redeploy.
- Non-technical-but-comfortable. Likes step-by-step terminal commands. Ask for screenshots fast — read upload size, version ID, error text.
- **PWA service-worker + Safari caches are aggressive.** First thing to suggest when a frontend deploy seems broken: kill the PWA from the iPhone app switcher AND hard-refresh Safari (long-press the reload button → "Reload Without Content Blockers" or kill the tab in the switcher). Or Cmd+Shift+R on desktop.
- He uses Google's Veo (Flow) for mascot animation. Output is opaque H.264 with backgrounds baked in. **Always verify with `ffprobe`** — `pix_fmt=yuv420p` means no alpha.
- "Pull a fresh version of my GitHub" = he's pushed something to `main` and wants you to merge it into your branch. `git fetch origin && git merge origin/main` is usually right.
- **iPhone Pro Max is 430 CSS px wide.** If you scope a media query at `max-width: 420px`, you skip Pro Max users and ship a broken hero. Use `max-width: 760px` for the phone breakpoint, matching the rest of the page.

---

## Critical rules

- **No animations on the marketing page.** Theodore explicitly asked for static. Don't reintroduce `animate-rise`, `animate-float`, `animate-blip`, `marketing-reveal`, or anything else without checking first.
- **Sentence case for body text; uppercase Oswald is fine for headlines/wordmarks.** The page mixes both conventions intentionally. If you change one, ask.
- **Body subtitle size token**: `clamp(1.1rem, 1.6vw, 1.5rem)`. If you add a new body paragraph in any section, match this token for cohesion.
- **Section H2 size token**: `clamp(2.5rem, 11vw, 11rem)`. Don't bump the floor — at 4rem the headline rivals the hero on mobile.
- **Custom breakpoints**: `min-[761px]:` for desktop, `min-[901px]:` for the 3-column layouts. Don't use `md:`/`lg:`.
- **Pinecone PNGs are all squares now** (1024 or 1254 pixels). Use `aspect-square`, not stale per-pose ratios.
- **Never** `git push --force`, amend a published commit, or `--no-verify`.
- **Worker changes need a manual redeploy.** Frontend changes auto-deploy via Vercel on `main` merge. Schema changes need a manual SQL run in Supabase (call it out separately).
- Use `ctx.waitUntil` for any post-response work in Worker handlers. Don't `await` heavy I/O before returning the SSE Response in `talk.js` / `resume.js`.

---

## Next steps for the marketing page

Priority order — pick from the top.

1. **Hamburger replacement done; wire up the new wordmark click destination.** Currently `<Link to="/">` — clicking it refreshes the page. Fine for now, but if you ever want a `#top` smooth-scroll or a slide-out menu, this is the spot.
2. **Footer wordmark sizing.** The header wordmark is now `text-3xl/text-4xl` (30/36px). The footer wordmark is still `text-[18px]`. Inconsistent. Bump it.
3. **Footer links (`Privacy`/`Terms`/`Contact`) are all `href="#"`.** Same problem as the old hamburger. Stub them to real pages or remove.
4. **Mobile real-device check on a regular iPhone (not Pro Max).** I did the math at 393px but never saw a screenshot from one. Hero composition was designed for centered stack on phones; verify it lands.
5. **Image optimization deferred.** The mascot PNGs are 366–650 KB each. Six of them on the marketing page = ~3 MB of imagery. Resize to 600px max and convert to WebP. Use `sharp` or `squoosh-cli`.
6. **Stripe checkout integration.** Both "Start yapping" CTAs (header + hero + pricing) route to `/login`. Should gate behind payment first.
7. **SEO meta tags, OG image, structured data, robots.txt, sitemap.xml.** Marketing is now the public surface — no SEO config yet.
8. **`marketing_migration.md` at repo root** is the spec for the original migration. Now stale (covers work done before this session). Safe to delete.
9. **`.display` CSS class in `src/styles/index.css`** is defined but unused (was Fraunces). Safe to delete.

Out-of-scope-for-marketing but still on the worklist: HEVC-with-alpha MP4 for older iOS Talk orb, resumption prompt tuning, Wrangler v4 upgrade, voice picker UI. See the previous-session brief for context.

---

## Tools you have access to

- GitHub MCP (`mcp__github__*`) — restricted to `tstavet/yapr` only.
- Standard read/edit/write/bash.
- `ffmpeg` / `ffprobe` **not preinstalled** — `apt-get install -y ffmpeg` if needed.
- You **cannot** deploy the worker yourself. Frame all worker work as "here's the recipe for you to run."

---

## Tone with Theodore

- Concise. Step-by-step terminal commands when stuck. Screenshots requested early when a deploy looks off.
- He'll push back when something looks wrong ("It still looks off", "I feel like you're not trying"). When he does, **commit to one strong design direction** rather than ping-ponging through small tweaks. He invoked "imagine you're Steve Jobs" once this session — that's the signal to stop reactive tweaking and propose a coherent composition.
- He'll sometimes give contradictory direction across messages. Honor the latest, but flag the tension if it matters.
- When a screenshot looks broken but you just pushed a fix: assume **stale cache** first. Ask him to hard-refresh before redoing work.
- Acknowledge landings tersely ("Pushed [hash]") rather than over-summarizing.

---

## End of new handoff. The previous-session brief follows below for full app context (memory system, /api/resume gates, sanitizer, etc.) — do not lose it.

---

# Previous-session brief (preserved verbatim)

You're inheriting a voice-first AI companion called Yapr (assistant name: "Yap"). Read the whole brief before touching anything — the workflow quirks bite if you skip them.

## Repo & deploys

- Repo: `tstavet/yapr`. Theodore reviews + merges your feature branch to main manually.
- Frontend: Vite/React PWA at `yapr-delta.vercel.app`. Auto-deploys on main push. No CLI needed.
- Worker: Cloudflare Worker at `yapr-api.soft-surf-dcc7.workers.dev`. Does not auto-deploy. Theodore runs wrangler from his laptop.
- Database: Supabase Postgres + pgvector. Tables: `auth.users`, `profiles` (with `last_resumption_at`, `password_set`, `buddy_voice`), `user_facts`, `conversations`, `messages`, `episodic_memories`. RLS enabled.
- External APIs: OpenAI (Whisper `gpt-4o-mini-transcribe` for STT, embeddings `text-embedding-3-small`); ElevenLabs Flash v2.5 (TTS, default voice Gigi `n7Wi4g1bhpw4Bs8HK5ph`); Anthropic (Sonnet 4.6 for `/api/talk` and `/api/resume`, Haiku 4.5 for both extractors).

## Routing & layout

`src/App.jsx` is the routing brain. Session state is fetched once via `supabase.auth.getSession()` + `onAuthStateChange`, then passed to children.

- `/` — Marketing (public). Receives `session` prop; if truthy, renders `<Navigate to="/chat" replace />`. Renders its own background; does NOT get the atmosphere/grain overlays.
- `/login` — Login. If session exists, redirects to `/chat`. Wrapped in `inAppShell` (atmosphere + grain).
- `/chat` — Talk. Requires session; if missing → `/login`. If `passwordSet === false` → `/set-password`. Wrapped in `inAppShell`.
- `/set-password` — SetPassword. Requires session + `needsPassword`. Wrapped in `inAppShell`.
- `/*` → `<Navigate to="/" />`.

The `inAppShell` helper in App.jsx wraps children with `<div class="atmosphere">` and `<div class="grain">`. Don't put these on Marketing — Marketing has its own background composition.

Pages vs routes mixed convention: Login lives at `src/pages/Login.jsx` and Marketing at `src/pages/Marketing.jsx`, but Talk and SetPassword still live at `src/routes/Talk.jsx` and `src/routes/SetPassword.jsx`. If a future task touches Talk/SetPassword non-trivially, consider moving them too for consistency.

## Yap mascot — current state (Talk page)

- Component: `src/components/Orb.jsx`. Renders inline; positioning + flex centering live in `Talk.jsx`.
- Asset chain: `public/yap.webm` (634 KB, true-alpha VP9, primary) → `public/yap.mp4` (683 KB, painted-cream H.264, fallback) → `public/yap.png` → CSS gradient orb (last resort).
- Sizing: `clamp(280px, 68vmin, 520px)`.
- Mask: `radial-gradient(ellipse 55% 65% at 50% 55%, black 78%, transparent 100%)` on the aspect-square wrapper.
- Video attrs: `autoPlay loop muted playsInline preload="auto"` — all four required for iOS Safari autoplay.

The 6 marketing poses (yap-walking, yap-coffee, yap-bounce, yap-kick, yap-run, yap-stretch) are static PNGs used only on the Marketing page. **As of this session, all six are 1024×1024 or 1254×1254 squares** — Theodore replaced them mid-handoff. Don't conflate with the Talk-page video orb.

## Memory system state (don't break)

All three layers populated and verified live. Untouched this session.

- **L1 session buffer** — last 20 messages from `messages` table.
- **L2 `user_facts`** — structured `jsonb`. `extractFactsIncremental` in `workers/src/handlers/talk.js` runs in `ctx.waitUntil` per turn.
- **L3 `episodic_memories`** — `vector(1536)` embeddings, `match_memories` RPC for semantic search. `extractEpisodicIncremental` in `talk.js` runs per turn, embeds each "moment," inserts via PostgREST.
- `loadRelevantMemories()` in `workers/src/lib/memory.js` does the embedding + RPC. Gated in `talk.js`: skip when input is < 16 chars OR `user_facts` is empty; otherwise runs with a 600ms `Promise.race` cap. Frontend handles `{type: 'recall', items: string[]}` SSE events and shows a "Remembering…" chip above Yap.

## Models & prompts (unchanged)

- `/api/talk` and `/api/resume`: Sonnet 4.6 (`claude-sonnet-4-6`). Don't downgrade.
- Both extractors: Haiku 4.5 (`claude-haiku-4-5-20251001`). Don't upgrade.
- `chat.js` is a legacy endpoint — not called by the live frontend, ignore.
- `speak.js` is also legacy but kept updated to ElevenLabs.
- System prompt for talk: `workers/src/prompts.js` `buildSystemPrompt`. Earlier versions had a HARD RULES block with banned words. That's gone — replaced with one line ("You don't swear...") and four Victoria-style examples. **Don't reintroduce a "don't" list — examples beat rules.**
- `buildResumptionPrompt({ facts, recentMoments, now })`: single-shot call (no streaming), 1–2 sentence cap.

## `/api/resume` gates (production)

All in `workers/src/handlers/resume.js`:
- User has at least one episodic memory in last 72 hours.
- Last activity (latest message) was > 4 hours ago.
- `last_resumption_at` is null or > 1 hour ago (back-to-back guard).
- User must not be brand-new (≥1 prior message exists).

Failure on any gate → handler returns `{ type: 'skip', reason: '...' }`. On fire, the handler creates a fresh `conversations` row but does not persist the opener as a message — a session buffer that starts with an assistant message breaks Claude's alternating-roles requirement.

For testing, gates can be temporarily lowered. Always pair the loosening commit with a same-session revert.

## Sanitizer behavior

- `BANNED_WORDS` list + `BANNED_REGEX` in `talk.js` are a safety net.
- `flushSentence` detects a banned word (or >10% length reduction post-sanitize) and drops the entire sentence — no text event, no TTS. The next sentence carries the response.
- `/api/resume` has a smaller version of the same regex — if the opener trips it, the whole resumption is dropped.

## Sandbox notes

- `ffmpeg`/`ffprobe` are NOT preinstalled. `apt-get install -y ffmpeg` first.
- `ffmpeg`'s overlay filter cannot composite a VP9-alpha WebM — to verify an alpha matte, save the colorkey output as RGBA PNG directly and inspect alpha values per pixel via Pillow.
- `npm install` required before `npm run build` if `node_modules` isn't there yet.
- Background dev servers: kill them before ending the session.

## Working notes

- Commit per task with descriptive messages, push to your active branch. Network has been flaky — push retries with `for delay in 0 2 4 8 16; do sleep $delay; git push -u origin <branch> && break; done` work well.
- For each worker change, give Theodore: GitHub raw URLs to curl (one per file), the deploy command, and remind him to verify upload size.
- For each schema change, give him the SQL to paste into the Supabase SQL Editor and remind him it's a separate step before deploy.
- If Theodore reports "it doesn't work" before you make code changes: ask for (1) a screenshot of the wrangler upload size, (2) any error text, (3) `wrangler tail` output during repro, and (4) whether he hard-refreshed the PWA. Most "doesn't work" reports are stale workers OR stale frontend caches.
