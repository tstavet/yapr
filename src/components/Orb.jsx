import React from 'react';

// Yap the Pinecone. The video itself carries the dance; we just center it.
//
// Asset contract (in source order):
//   public/yap.webm — VP9 with true alpha (yuva420p, BT.709). Modern Chrome,
//                     Firefox, and iOS Safari 17.4+ render this with the page
//                     showing cleanly through.
//   public/yap.mp4  — H.264 with the page-cream background painted in.
//                     Universal fallback for older Safari.
//   public/yap.png  — Static PNG fallback if neither video plays.
//
// Whichever source plays, we feather the edges with a CSS mask so the
// painted-cream background of the MP4 (and any 1px halo on the WebM) fades
// smoothly into the page instead of leaving a visible square. The mask is
// an ellipse offset to 50%/55% — Yap's bounding box leans downward in the
// Veo render, so the solid zone has to reach a little lower than higher.
//
// If every asset 404s we render the warm brown gradient orb so the app
// keeps shipping.

const FEATHER_MASK =
  'radial-gradient(ellipse 55% 65% at 50% 55%, black 78%, transparent 100%)';

export default function Orb() {
  const [videoFailed, setVideoFailed] = React.useState(false);
  const [imgFailed, setImgFailed] = React.useState(false);

  return (
    <div
      className="absolute inset-0 flex items-start md:items-center justify-center pointer-events-none pt-[4vh] md:pt-0 md:pb-[18vh]"
      aria-hidden="true"
    >
      <div
        className="aspect-square"
        style={{
          width: 'clamp(280px, 68vmin, 520px)',
          WebkitMaskImage: FEATHER_MASK,
          maskImage: FEATHER_MASK
        }}
      >
        {!videoFailed ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={() => setVideoFailed(true)}
            className="w-full h-full object-contain select-none"
          >
            <source src="/yap.webm" type="video/webm" />
            <source src="/yap.mp4" type="video/mp4" />
          </video>
        ) : !imgFailed ? (
          <img
            src="/yap.png"
            alt=""
            draggable={false}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-contain select-none"
          />
        ) : (
          <div
            className="w-full h-full rounded-full"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, rgba(248, 245, 242, 0.85), rgba(107, 68, 35, 0.95) 40%, rgba(61, 40, 23, 1) 85%)',
              boxShadow:
                'inset 0 0 40px rgba(61, 40, 23, 0.5), 0 12px 32px rgba(107, 68, 35, 0.25)'
            }}
          />
        )}
      </div>
    </div>
  );
}
