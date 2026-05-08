import React from 'react';

// Yap the Pinecone. The video itself carries the dance; we just center it.
//
// Asset contract (in source order):
//   public/yap.mp4  — H.264 with the page-cream background painted in.
//                     Plays in every browser; the cream blends seamlessly
//                     with the Talk page so Yap looks transparent.
//   public/yap.webm — VP9-with-alpha for browsers that prefer WebM.
//   public/yap.png  — transparent fallback if neither video plays.
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
            <source src="/yap.mp4" type="video/mp4" />
            <source src="/yap.webm" type="video/webm" />
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
