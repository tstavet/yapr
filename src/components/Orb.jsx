import React from 'react';

// Yap the Pinecone. Renders the looping dance video (or its fallbacks) inside
// a square wrapper with a soft elliptical mask that fades the painted-cream
// background of any source into the page.
//
// Asset contract (in source order):
//   public/yap.webm — VP9 with true alpha (yuva420p, BT.709). Modern Chrome,
//                     Firefox, and iOS Safari 17.4+ render this cleanly.
//   public/yap.mp4  — H.264 with the page-cream background painted in.
//                     Universal fallback for older Safari.
//   public/yap.png  — Static PNG fallback if neither video plays.
//
// The component renders inline — Talk.jsx controls layout (centering,
// stacking with the status label, etc).

const FEATHER_MASK =
  'radial-gradient(ellipse 55% 65% at 50% 55%, black 78%, transparent 100%)';

export default function Orb() {
  const [videoFailed, setVideoFailed] = React.useState(false);
  const [imgFailed, setImgFailed] = React.useState(false);

  return (
    <div
      className="aspect-square pointer-events-none"
      style={{
        width: 'clamp(280px, 68vmin, 520px)',
        WebkitMaskImage: FEATHER_MASK,
        maskImage: FEATHER_MASK
      }}
      aria-hidden="true"
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
  );
}
