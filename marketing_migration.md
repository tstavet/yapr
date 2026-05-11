If the current login component lives somewhere other than `src/pages/`, move it to `src/pages/Login.jsx` as part of this work for consistency.

## Scroll-reveal behavior

The marketing HTML has an IntersectionObserver at the bottom that adds `.is-visible` to `.reveal` elements when they enter the viewport. Port this to a `useEffect` inside `Marketing.jsx`:

- Run on mount
- Observe all elements with the `reveal` class
- Add `is-visible` when intersecting (threshold 0.15, rootMargin `0px 0px -80px 0px`)
- Unobserve after first reveal (one-time animation, not on every scroll)
- Clean up the observer on unmount

## Authentication-aware routing

The marketing page at `/` needs to check auth state on mount and redirect to `/chat` if the user is already logged in.

The auth state is currently managed somewhere in the existing app (likely a Supabase session check based on the `supabase/` folder I can see in the repo). Use whatever pattern is already established. Do NOT introduce a new auth library or pattern; use the existing one.

If the auth check is async (which Supabase typically is), render nothing (or a small loading state) while the check resolves rather than flashing the marketing page before redirecting.

## What to do FIRST, before writing any code

Read these files and tell me your plan before changing anything:

1. `package.json` — confirm React Router version and any other relevant deps
2. `vite.config.js` — confirm build setup
3. `tailwind.config.js` — see current customizations so you don't overwrite them
4. `src/App.jsx` — understand current routing
5. The current login component (wherever it lives) — confirm it's a clean component you can move without breaking imports
6. Whatever file handles the Supabase session/auth state — confirm the pattern to reuse for the redirect
7. `marketing-source.html` — read the full file so you understand what you're porting

Then write a plan with:
- File-by-file diff summary (what gets created, modified, moved, deleted)
- The `tailwind.config.js` additions you'll make
- The auth pattern you'll reuse for the marketing → chat redirect
- Any ambiguities or assumptions you're making

Wait for my approval before touching code.

## Acceptance criteria

The migration is done when ALL of these pass:

1. `npm run dev` starts cleanly with no console errors or warnings related to the changes
2. Visiting `/` while logged out shows the marketing page with all six mascot poses loaded (no 404s in Network tab)
3. Visiting `/` while logged in redirects to `/chat` (or whatever the current main app route is)
4. Visiting `/login` shows the old login screen, unchanged in appearance and behavior
5. Logging in from `/login` lands on `/chat` (existing behavior, should not have changed)
6. Visiting `/chat` while logged out redirects to `/login` (existing behavior, should not have changed)
7. Clicking the top-right "Start Yapping" pill on the marketing page navigates to `/login`
8. Clicking the bottom "Start yapping" CTA on the marketing page navigates to `/login`
9. The "Hear Yap Talk" pill is present and styled, but clicking it does nothing visible (href="#")
10. Scrolling down the marketing page triggers fade-in-up reveals on each section
11. The hero mascot has its float animation, the bounce pose has its hop animation, the three blips pulse, the scroll-hint bobs
12. The radial gradient atmosphere is visible on the cream background
13. On a 375px-wide viewport (iPhone SE), the layout is not broken: wordmark fits, mascots scale down, three-column "How it works" stacks to one column, etc.
14. Build passes: `npm run build` completes with no errors
15. After completing the migration, delete `marketing-source.html` from the repo root
16. After completing the migration, delete the `testing-px9/` folder if it still exists

## Comparison check before declaring done

After the conversion, open both versions side by side:
- Original: open `marketing-source.html` directly in a browser
- Converted: `npm run dev` and visit `/`

Walk through each section and confirm visual parity:
- Hero: wordmark size, mascot position, blip pulse timing, tagline weight, scroll-hint visibility
- "Yap is here whenever": two-column layout on desktop, stacked on mobile, coffee mascot aspect ratio correct
- "How it works": three-column grid, three different poses, "01 / 02 / 03" labels, hop animation only on step 01
- "Yap remembers": stretch pose positioned top-right (or stacked on mobile), giant Oswald list items with brown underlines
- Pricing: cream-alt background, mirrored walking mascot, "$49 a month" headline, dark brown CTA button with hover state
- Footer: small Oswald wordmark, italic Playfair "For Victoria, with love.", three small footer links

Any visible difference from the original is a bug to fix before considering the task done. Report each one you find, even minor.

## Things to leave alone

- Don't touch the Cloudflare Worker code in `workers/`
- Don't touch the Supabase schema or anything in `supabase/`
- Don't refactor the existing chat interface — only move/rename if necessary for the routing changes
- Don't introduce new dependencies (React Router, Tailwind, Supabase client should all already be present)
- Don't change the existing system prompt, voice API, or anything in the actual chat flow
- Don't change the `.env.example` file or add new env variables

## After the migration is merged

These are follow-up tasks, NOT part of this migration:
- Image optimization (resize mascot PNGs to 600px max width, consider WebP)
- Real "Hear Yap Talk" audio sample wiring
- Pricing flow (Stripe checkout integration when "Start Yapping" CTA should go through payment before chat access)
- SEO meta tags, OG image, structured data
- robots.txt + sitemap.xml for the new public marketing page
- Crisis-handling fallback in the chat system prompt (separate launch checklist item)

Do not preemptively start any of these. Stop after acceptance criteria pass.
