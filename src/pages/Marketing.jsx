import React, { useEffect } from 'react';
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
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -80px 0px' }
    );

    const els = document.querySelectorAll('.marketing-reveal');
    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  if (session) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="relative min-h-screen bg-marketing-bg text-marketing-ink font-dmsans overflow-x-hidden antialiased">
      <style>{`
        .marketing-reveal {
          opacity: 0;
          transform: translateY(40px);
          transition:
            opacity 0.9s cubic-bezier(0.2, 0.7, 0.2, 1),
            transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .marketing-reveal.is-visible { opacity: 1; transform: translateY(0); }

        /* Hero wordmark + mascot need a real CSS clamp curve with a 420px
           breakpoint override — Tailwind can't express conditional clamps. */
        .mk-hero-wordmark { font-size: clamp(8rem, 24vw, 26rem); }
        .mk-hero-mascot   { width: clamp(120px, 18vw, 260px); }
        @media (max-width: 420px) {
          .mk-hero-wordmark { font-size: clamp(5.5rem, 26vw, 9rem); }
          .mk-hero-mascot   { width: 96px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .marketing-root *,
          .marketing-root *::before,
          .marketing-root *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .marketing-reveal { opacity: 1; transform: none; }
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
        <button
          type="button"
          aria-label="Open menu"
          className="w-12 h-12 min-[761px]:w-14 min-[761px]:h-14 rounded-2xl border-[1.5px] border-marketing-brown/35 bg-white/40 backdrop-blur-md flex flex-col items-center justify-center gap-[5px] cursor-pointer transition-all duration-[250ms] hover:bg-white/70 hover:scale-[1.03]"
        >
          <span className="block w-[18px] h-[1.75px] bg-marketing-brown rounded-sm" />
          <span className="block w-[18px] h-[1.75px] bg-marketing-brown rounded-sm" />
        </button>

        <nav className="flex items-center gap-3">
          <a
            href="#"
            aria-label="Hear Yap talk"
            className="hidden min-[761px]:inline-flex items-center gap-3 px-[26px] py-4 rounded-2xl font-dmsans font-semibold text-[15px] -tracking-[0.01em] text-marketing-brown bg-white/40 border-[1.5px] border-marketing-brown/35 backdrop-blur-md whitespace-nowrap transition-all duration-[250ms] hover:bg-white/70 hover:-translate-y-px no-underline"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="6 4 20 12 6 20 6 4"></polygon>
            </svg>
            <span>Hear Yap talk</span>
          </a>
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
      <main className="relative z-[1] min-h-screen flex flex-col items-center justify-center px-4 pt-[110px] pb-[100px] min-[761px]:px-6 min-[761px]:pt-[140px] min-[761px]:pb-20">
        <div className="flex items-center justify-center gap-2 min-[761px]:gap-[clamp(12px,2vw,36px)] relative animate-rise">
          <h1 className="mk-hero-wordmark font-oswald font-bold text-marketing-brown leading-[0.85] tracking-[0.005em] select-none">
            Yapr
          </h1>
          <div
            className="mk-hero-mascot relative flex-shrink-0"
            aria-hidden="true"
          >
            <div className="absolute top-[18%] -left-4 min-[761px]:-left-[22px] flex flex-col gap-1 z-[2]">
              <span className="w-[6px] h-[6px] rounded-full bg-marketing-brown opacity-0 animate-blip" />
              <span className="w-[9px] h-[9px] rounded-full bg-marketing-brown opacity-0 animate-blip [animation-delay:0.3s]" />
              <span className="w-[7px] h-[7px] rounded-full bg-marketing-brown opacity-0 animate-blip [animation-delay:0.6s]" />
            </div>
            <div
              role="img"
              aria-label="Yap the Pinecone"
              className="bg-contain bg-no-repeat bg-center animate-float origin-[50%_85%] aspect-[544/686] [filter:drop-shadow(0_12px_18px_rgba(74,47,24,0.18))]"
              style={{ backgroundImage: "url('/yap-walking.png')" }}
            />
          </div>
        </div>

        <p
          className="mt-[clamp(28px,4.5vw,64px)] font-dmsans font-bold text-marketing-ink -tracking-[0.015em] text-center animate-rise-slow [animation-delay:0.15s]"
          style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.4rem)' }}
        >
          Your AI buddy to yap with.
        </p>

        <span className="absolute bottom-8 left-1/2 -translate-x-1/2 font-dmsans text-[11px] tracking-[0.04em] text-marketing-ink opacity-70 animate-bob">
          Scroll
        </span>
      </main>

      {/* ============ WHAT YAP IS FOR ============ */}
      <section
        id="about"
        className="marketing-reveal relative z-[1] overflow-hidden px-[clamp(24px,6vw,96px)] py-[clamp(80px,12vw,180px)]"
      >
        <div className="grid grid-cols-1 min-[901px]:grid-cols-[1.3fr_1fr] gap-[clamp(40px,6vw,96px)] items-center max-w-[1400px] mx-auto">
          <div className="flex flex-col gap-8 items-center text-center min-[901px]:items-start min-[901px]:text-left">
            <h2
              className="font-oswald font-bold text-marketing-brown leading-[0.9] tracking-[0.005em]"
              style={{ fontSize: 'clamp(4rem, 11vw, 11rem)' }}
            >
              Yap is here
              <br />
              whenever.
            </h2>
            <p
              className="font-dmsans font-medium leading-[1.45] text-marketing-ink max-w-[36ch]"
              style={{ fontSize: 'clamp(1.25rem, 2vw, 1.8rem)' }}
            >
              Perfect for venting, gossiping, and casual yapping. Just press to
              start chatting, and Yap remembers what matters so you can pick up
              where you left off.
            </p>
          </div>
          <div
            role="img"
            aria-label="Yap holding a coffee mug, sitting cross-legged"
            className="bg-contain bg-no-repeat bg-center w-full aspect-[555/767] mx-auto max-w-[280px] min-[901px]:max-w-[420px] min-[901px]:mx-0 min-[901px]:justify-self-end [filter:drop-shadow(0_12px_18px_rgba(74,47,24,0.18))]"
            style={{ backgroundImage: "url('/yap-coffee.png')" }}
          />
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section
        id="how"
        className="marketing-reveal relative z-[1] overflow-hidden bg-marketing-bg text-center px-[clamp(24px,6vw,96px)] py-[clamp(80px,12vw,180px)]"
      >
        <h2
          className="font-oswald font-bold text-marketing-brown leading-[0.9] tracking-[0.005em] text-center mb-[clamp(40px,6vw,80px)]"
          style={{ fontSize: 'clamp(4rem, 11vw, 11rem)' }}
        >
          How it works.
        </h2>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-3 gap-14 min-[901px]:gap-[clamp(24px,4vw,64px)] max-w-[1400px] mx-auto items-end">
          <div className="flex flex-col items-center gap-5">
            <div
              className="font-oswald font-bold text-marketing-ink tracking-[0.1em]"
              style={{ fontSize: 'clamp(1.6rem, 2.4vw, 2.4rem)' }}
            >
              01
            </div>
            <div
              aria-hidden="true"
              className="bg-contain bg-no-repeat bg-center animate-hop aspect-[500/923] [filter:drop-shadow(0_12px_18px_rgba(74,47,24,0.18))]"
              style={{
                backgroundImage: "url('/yap-bounce.png')",
                width: 'clamp(140px, 18vw, 220px)'
              }}
            />
            <div
              className="font-oswald font-bold text-marketing-brown leading-[0.9] tracking-[0.005em]"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}
            >
              Press
            </div>
          </div>

          <div className="flex flex-col items-center gap-5">
            <div
              className="font-oswald font-bold text-marketing-ink tracking-[0.1em]"
              style={{ fontSize: 'clamp(1.6rem, 2.4vw, 2.4rem)' }}
            >
              02
            </div>
            <div
              aria-hidden="true"
              className="bg-contain bg-no-repeat bg-center aspect-[537/845] [filter:drop-shadow(0_12px_18px_rgba(74,47,24,0.18))]"
              style={{
                backgroundImage: "url('/yap-kick.png')",
                width: 'clamp(140px, 18vw, 220px)'
              }}
            />
            <div
              className="font-oswald font-bold text-marketing-brown leading-[0.9] tracking-[0.005em]"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}
            >
              Talk
            </div>
          </div>

          <div className="flex flex-col items-center gap-5">
            <div
              className="font-oswald font-bold text-marketing-ink tracking-[0.1em]"
              style={{ fontSize: 'clamp(1.6rem, 2.4vw, 2.4rem)' }}
            >
              03
            </div>
            <div
              aria-hidden="true"
              className="bg-contain bg-no-repeat bg-center aspect-[674/852] [filter:drop-shadow(0_12px_18px_rgba(74,47,24,0.18))]"
              style={{
                backgroundImage: "url('/yap-run.png')",
                width: 'clamp(140px, 18vw, 220px)'
              }}
            />
            <div
              className="font-oswald font-bold text-marketing-brown leading-[0.9] tracking-[0.005em]"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}
            >
              Yap back
            </div>
          </div>
        </div>
      </section>

      {/* ============ YAP REMEMBERS ============ */}
      <section
        id="memory"
        className="marketing-reveal relative z-[1] overflow-hidden px-[clamp(24px,6vw,96px)] py-[clamp(80px,12vw,180px)]"
      >
        <div className="max-w-[1400px] mx-auto relative">
          <div
            aria-hidden="true"
            className="bg-contain bg-no-repeat bg-center aspect-[930/725] mx-auto mb-8 block min-[901px]:absolute min-[901px]:-top-10 min-[901px]:-right-5 min-[901px]:mx-0 min-[901px]:mb-0 [filter:drop-shadow(0_12px_18px_rgba(74,47,24,0.18))]"
            style={{
              backgroundImage: "url('/yap-stretch.png')",
              width: 'clamp(180px, 24vw, 320px)'
            }}
          />
          <h2
            className="font-oswald font-bold text-marketing-brown leading-[0.9] tracking-[0.005em] mb-[clamp(48px,6vw,80px)] max-w-none text-center min-[901px]:max-w-[14ch] min-[901px]:text-left"
            style={{ fontSize: 'clamp(4rem, 11vw, 11rem)' }}
          >
            Yap remembers.
          </h2>
          <ul className="list-none flex flex-col gap-[clamp(20px,2.4vw,36px)]">
            {[
              "Your dog's name.",
              "The meeting Thursday.",
              "How you take your coffee.",
              "Why you're not speaking to Karen.",
              "That show you keep meaning to start."
            ].map((line) => (
              <li
                key={line}
                className="font-oswald font-bold leading-none text-marketing-brown tracking-[0.005em] border-b-2 border-marketing-brown/[0.18] pb-[clamp(16px,2vw,28px)]"
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
        className="marketing-reveal relative z-[1] overflow-hidden bg-marketing-bg text-center flex flex-col items-center gap-[clamp(20px,3vw,40px)] px-[clamp(24px,6vw,96px)] py-[clamp(80px,12vw,180px)]"
      >
        <div
          aria-hidden="true"
          className="bg-contain bg-no-repeat bg-center aspect-[544/686] [transform:scaleX(-1)] mb-2 [filter:drop-shadow(0_12px_18px_rgba(74,47,24,0.18))]"
          style={{
            backgroundImage: "url('/yap-walking.png')",
            width: 'clamp(160px, 22vw, 260px)'
          }}
        />
        <h2
          className="font-oswald font-bold text-marketing-brown leading-[0.9] tracking-[0.005em]"
          style={{ fontSize: 'clamp(4rem, 11vw, 11rem)' }}
        >
          $99 a month.
        </h2>
        <p
          className="font-dmsans font-medium text-marketing-ink tracking-[0.02em]"
          style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)' }}
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
        <div className="font-oswald font-bold text-[18px] text-marketing-brown tracking-[0.005em] mb-3">
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
