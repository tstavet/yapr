import React from 'react';

// Yap the Pinecone. Wanders the Talk view, reacts to conversation state.
//
// Asset contract:
//   public/yap.png — transparent PNG of Yap (square aspect recommended).
//   If the file is missing, we fall back to the warm brown gradient orb so
//   the app keeps shipping while the asset is being prepped.
//
// Pass-2 swap: replace the <img> below with <Lottie animationData={yapJson} />
// from lottie-react. Drop the .json at public/yap.json (or import it) and the
// surrounding wander/state motion keeps working unchanged.

const YAP_SRC = '/yap.png';
const SIZE = 160;

const STATE_MOTION = {
  idle: 'animate-yap-breathe',
  listening: 'animate-yap-breathe',
  thinking: 'animate-yap-tilt',
  speaking: 'animate-yap-wiggle'
};

export default function Orb({ state = 'idle', level = 0 }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const reactiveScale = state === 'listening' ? 1 + level * 0.18 : 1;
  const motion = STATE_MOTION[state] || STATE_MOTION.idle;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div
        className="absolute animate-yap-wander"
        style={{ width: SIZE, height: SIZE, willChange: 'top, left' }}
      >
        <div
          className="w-full h-full"
          style={{
            transform: `scale(${reactiveScale})`,
            transition: 'transform 80ms linear'
          }}
        >
          <div className={`w-full h-full ${motion}`}>
            {imgFailed ? (
              <div
                className="w-full h-full rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at 35% 30%, rgba(248, 245, 242, 0.85), rgba(107, 68, 35, 0.95) 40%, rgba(61, 40, 23, 1) 85%)',
                  boxShadow:
                    'inset 0 0 40px rgba(61, 40, 23, 0.5), 0 12px 32px rgba(107, 68, 35, 0.25)'
                }}
              />
            ) : (
              <img
                src={YAP_SRC}
                alt=""
                draggable={false}
                onError={() => setImgFailed(true)}
                className="w-full h-full object-contain select-none"
                style={{ filter: 'drop-shadow(0 10px 18px rgba(107, 68, 35, 0.28))' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
