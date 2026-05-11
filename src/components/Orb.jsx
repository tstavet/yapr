import React from 'react';

// Yap the Pinecone. The video itself carries the dance; we just center it.
//
// Asset contract (in source order):
//   public/yap.webm — VP9 with true alpha (yuva420p, BT.709). Lets the page
//                     cream + atmosphere gradient show through cleanly so
//                     there's no halo. Supported by Chrome, Firefox, and
//                     Safari 17.4+. Browsers that can't decode VP9 alpha
//                     fall through to the MP4 below.
//   public/yap.mp4  — H.264 with the page-cream background painted in.
//                     Universal fallback for older Safari; ~2 RGB units off
//                     the page cream, so a faint square may be visible.
//   public/yap.png  — Transparent PNG fallback if neither video plays.
//
// If everything fails we render the warm brown gradient orb so the app
// keeps shipping.

export default function Orb() {
  const [videoFailed, setVideoFailed] = React.useState(false);
  const [imgFailed, setImgFailed] = React.useState(false);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="aspect-square"
        style={{ width: 'clamp(260px, 62vmin, 520px)' }}
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
