import React from 'react';
import { Link, Navigate } from 'react-router-dom';

// Marketing landing page. Shown to logged-out visitors at `/`. If `session`
// is truthy, App.jsx is still rendering us so we redirect to `/chat` — the
// existing session state up there is the single source of truth.
//
// Ported from marketing-homepage/index.html. Source uses two custom
// breakpoints (760px and 900px) which don't line up with Tailwind's defaults
// (md=768, lg=1024), so this file uses arbitrary `min-[761px]:` and
// `min-[901px]:` variants for layout switches.
export default function Marketing({ session }) {
  if (session) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="relative min-h-screen bg-marketing-bg text-marketing-ink font-dmsans overflow-x-hidden antialiased">
      <style>{`
        /* Hero wordmark + mascot need a real CSS clamp curve with a phone-vs-
           desktop split — Tailwind can't express conditional clamps. On mobile
           the mascot is the visual anchor (~50vw, bigger than the wordmark),
           on desktop the wordmark dominates and the mascot sits beside it. */
        .mk-hero-wordmark { font-size: clamp(8rem, 24vw, 26rem); }
        .mk-hero-mascot   { height: clamp(12rem, 36vw, 39rem); }
        @media (max-width: 760px) {
          .mk-hero-wordmark { font-size: clamp(3.5rem, 17vw, 7rem); }
          .mk-hero-mascot   { height: clamp(10rem, 50vw, 17rem); }
        }
      `}</style>

      <div className="marketing-root">
      {/* Tonal warm highlight behind the hero — a brighter wash of the same tan,
          not a new color. Helps the wordmark feel like it's catching light. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 20%, rgba(255, 240, 215, 0.55) 0%, transparent 55%)'
        }}
      />

      {/* ============ HEADER ============ */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-[18px] min-[761px]:px-9 min-[761px]:py-6">
        <Link
          to="/"
          aria-label="Yapr home"
          className="font-oswald font-bold uppercase text-3xl min-[761px]:text-4xl text-marketing-brown tracking-[0.005em] no-underline select-none leading-none"
        >
          Yapr
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            to="/login"
            aria-label="Start yapping"
            className="inline-flex items-center gap-3 px-[18px] py-[14px] min-[761px]:px-[26px] min-[761px]:py-4 rounded-2xl font-dmsans font-semibold text-[14px] min-[761px]:text-[15px] -tracking-[0.01em] bg-marketing-bg text-marketing-brown border-[1.5px] border-marketing-brown/35 whitespace-nowrap shadow-[0_1px_2px_rgba(74,47,24,0.08)] transition-all duration-[250ms] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(74,47,24,0.12)] no-underline"
          >
            <span className="w-[26px] h-[26px] flex items-center justify-center">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="6" y="2" width="12" height="20" rx="3"></rect>
                <line x1="11" y1="18" x2="13" y2="18"></line>
              </svg>
            </span>
            <span className="flex flex-col leading-[1.1] text-left">
              <span className="hidden min-[761px]:inline text-[10px] font-medium text-marketing-ink">
                Start
              </span>
              <span className="text-[14px] min-[761px]:text-[16px] font-bold text-marketing-brown">
                yapping
              </span>
            </span>
          </Link>
        </nav>
      </header>

      {/* ============ HERO ============ */}
      {/* Mobile: centered stack (pinecone hero on top, YAPR below, subtext below).
          Desktop: left-aligned row (YAPR + pinecone side-by-side, subtext below). */}
      <main className="relative z-[1] min-h-[70svh] flex flex-col items-center text-center justify-center px-[clamp(24px,6vw,96px)] pt-[80px] pb-[40px] min-[761px]:min-h-screen min-[761px]:items-start min-[761px]:text-left min-[761px]:pt-[140px] min-[761px]:pb-20">
        <div className="flex flex-col items-center gap-3 min-[761px]:flex-row min-[761px]:items-center min-[761px]:gap-[clamp(20px,4vw,72px)] relative">
          <div
            className="mk-hero-mascot relative flex-shrink-0 aspect-square order-1 min-[761px]:order-2"
            aria-hidden="true"
          >
            <div
              role="img"
              aria-label="Yapr the Pinecone"
              className="w-full h-full bg-contain bg-no-repeat bg-center [filter:drop-shadow(0_12px_18px_rgba(74,47,24,0.18))]"
              style={{ backgroundImage: "url('/yap.png')" }}
            />
          </div>
          <h1 className="mk-hero-wordmark font-oswald font-bold uppercase text-marketing-brown leading-[0.85] tracking-[0.005em] select-none order-2 min-[761px]:order-1">
            Yapr
          </h1>
        </div>

        <p
          className="mt-[clamp(20px,3vw,28px)] font-dmsans font-bold text-marketing-ink -tracking-[0.015em] max-w-[34ch] min-[761px]:max-w-[52ch]"
          style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.5rem)', textWrap: 'pretty' }}
        >
          Your buddy to yap with. Tap to start and Yapr listens, chats back, and remembers what matters.
        </p>

        <Link
          to="/login"
          className="mt-[clamp(20px,2.5vw,32px)] inline-block px-14 py-[22px] bg-marketing-brown text-marketing-bg no-underline rounded-[18px] font-dmsans font-bold tracking-[0.01em] transition-all duration-[250ms] shadow-[0_6px_24px_rgba(74,47,24,0.18)] hover:bg-marketing-ink hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(74,47,24,0.25)]"
          style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.5rem)' }}
        >
          Start yapping
        </Link>
      </main>

      {/* ============ WHAT YAP IS FOR ============ */}
      <section
        id="about"
        className="relative z-[1] overflow-hidden px-[clamp(24px,6vw,96px)] py-[clamp(80px,12vw,180px)]"
      >
        <div className="grid grid-cols-1 min-[901px]:grid-cols-[1.3fr_1fr] gap-[clamp(40px,6vw,96px)] items-center max-w-[1400px] mx-auto">
          <div className="flex flex-col gap-8 items-center text-center min-[901px]:items-start min-[901px]:text-left">
            <h2
              className="font-oswald font-bold uppercase text-marketing-brown leading-[0.9] tracking-[0.005em]"
              style={{ fontSize: 'clamp(2.5rem, 11vw, 11rem)' }}
            >
              Ready to chat when you are
            </h2>
            <p
              className="font-dmsans font-medium leading-[1.45] text-marketing-ink max-w-[36ch]"
              style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.5rem)' }}
            >
              Vent about your day, gossip about the groupchat, or talk through a hard event.
            </p>
          </div>
          <div
            role="img"
            aria-label="Yap holding a coffee mug, sitting cross-legged"
            className="bg-contain bg-no-repeat bg-center w-full aspect-[555/767] mx-auto max-w-[340px] min-[901px]:max-w-[560px] min-[901px]:mx-0 min-[901px]:justify-self-end [filter:drop-shadow(0_12px_18px_rgba(74,47,24,0.18))]"
            style={{ backgroundImage: "url('/yap-coffee.png')" }}
          />
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      {/* All three PNGs are 1254x1254 squares, so each step uses aspect-square
          with a shared width clamp. That keeps every pinecone box the same
          size, which auto-aligns the labels on a shared baseline below. */}
      <section
        id="how"
        className="relative z-[1] overflow-hidden bg-marketing-bg text-center px-[clamp(24px,6vw,96px)] py-[clamp(60px,9vw,140px)]"
      >
        <h2
          className="font-oswald font-bold uppercase text-marketing-brown leading-[0.9] tracking-[0.005em] text-center mb-[clamp(32px,5vw,72px)]"
          style={{ fontSize: 'clamp(2.5rem, 11vw, 11rem)' }}
        >
          How it works.
        </h2>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-3 gap-10 min-[901px]:gap-[clamp(24px,4vw,64px)] max-w-[1400px] mx-auto">
          {[
            { src: '/yap-bounce.png', label: 'Tap to start' },
            { src: '/yap-kick.png', label: 'Chat' },
            { src: '/yap-run.png', label: 'Yapr chats back' }
          ].map((step) => (
            <div key={step.label} className="flex flex-col items-center">
              <div
                aria-hidden="true"
                className="aspect-square bg-contain bg-bottom bg-no-repeat [filter:drop-shadow(0_12px_18px_rgba(74,47,24,0.18))]"
                style={{
                  backgroundImage: `url('${step.src}')`,
                  width: 'clamp(260px, 30vw, 420px)'
                }}
              />
              <div
                className="mt-6 font-oswald font-bold uppercase text-marketing-brown leading-[0.9] tracking-[0.005em]"
                style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}
              >
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ YAP REMEMBERS ============ */}
      <section
        id="memory"
        className="relative z-[1] overflow-hidden px-[clamp(24px,6vw,96px)] py-[clamp(80px,12vw,180px)]"
      >
        <div className="max-w-[1400px] mx-auto relative">
          <div
            aria-hidden="true"
            className="bg-contain bg-no-repeat bg-center aspect-square mx-auto mb-8 block min-[901px]:absolute min-[901px]:-top-4 min-[901px]:right-0 min-[901px]:mx-0 min-[901px]:mb-0 [filter:drop-shadow(0_12px_18px_rgba(74,47,24,0.18))]"
            style={{
              backgroundImage: "url('/yap-stretch.png')",
              width: 'clamp(280px, 30vw, 500px)'
            }}
          />
          <h2
            className="font-oswald font-bold uppercase text-marketing-brown leading-[0.9] tracking-[0.005em] mb-[clamp(48px,6vw,80px)] max-w-none text-center min-[901px]:max-w-[14ch] min-[901px]:text-left"
            style={{ fontSize: 'clamp(2.5rem, 11vw, 11rem)' }}
          >
            Yapr remembers.
          </h2>
          <ul className="list-none flex flex-col gap-[clamp(20px,2.4vw,36px)]">
            {[
              "Your dog's name.",
              "The meeting Thursday.",
              "How you take your coffee.",
              "Why you're not speaking to your friend.",
              "That show you keep meaning to start."
            ].map((line) => (
              <li
                key={line}
                className="font-oswald font-bold uppercase leading-none text-marketing-brown tracking-[0.005em] border-b-2 border-marketing-brown/[0.18] pb-[clamp(16px,2vw,28px)]"
                style={{ fontSize: 'clamp(2rem, 5.5vw, 5rem)' }}
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section
        id="start"
        className="relative z-[1] overflow-hidden bg-marketing-bg text-center flex flex-col items-center gap-[clamp(20px,3vw,40px)] px-[clamp(24px,6vw,96px)] py-[clamp(80px,12vw,180px)]"
      >
        <div
          aria-hidden="true"
          className="bg-contain bg-no-repeat bg-center aspect-square [transform:scaleX(-1)] mb-2 [filter:drop-shadow(0_12px_18px_rgba(74,47,24,0.18))]"
          style={{
            backgroundImage: "url('/yap-walking.png')",
            width: 'clamp(280px, 30vw, 500px)'
          }}
        />
        <h2
          className="font-oswald font-bold uppercase text-marketing-brown leading-[0.9] tracking-[0.005em]"
          style={{ fontSize: 'clamp(2.5rem, 11vw, 11rem)' }}
        >
          $99 a month.
        </h2>
        <p
          className="font-dmsans font-medium text-marketing-ink tracking-[0.02em]"
          style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.5rem)' }}
        >
          Unlimited yapping. Cancel anytime.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-block px-14 py-[22px] bg-marketing-brown text-marketing-bg no-underline rounded-[18px] font-dmsans font-bold tracking-[0.01em] transition-all duration-[250ms] shadow-[0_6px_24px_rgba(74,47,24,0.18)] hover:bg-marketing-ink hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(74,47,24,0.25)]"
          style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.4rem)' }}
        >
          Start yapping
        </Link>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="relative z-[1] text-center px-6 pt-[60px] pb-20">
        <div className="font-oswald font-bold uppercase text-[18px] text-marketing-brown tracking-[0.005em] mb-3">
          Yapr
        </div>
        <div className="font-playfair italic text-[13px] text-marketing-ink">
          For Victoria, with love.
        </div>
        <div className="mt-5 flex justify-center gap-6 text-[12px] text-marketing-ink">
          <a href="#" className="text-marketing-ink no-underline hover:text-marketing-brown">
            Privacy
          </a>
          <a href="#" className="text-marketing-ink no-underline hover:text-marketing-brown">
            Terms
          </a>
          <a href="#" className="text-marketing-ink no-underline hover:text-marketing-brown">
            Contact
          </a>
        </div>
      </footer>
      </div>
    </div>
  );
}
