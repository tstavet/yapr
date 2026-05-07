import React from 'react';

// The orb has four states: idle, listening, thinking, speaking.
// Each state has its own motion. This is Kones's "face."

export default function Orb({ state = 'idle', level = 0 }) {
  const scale = state === 'listening' ? 1 + level * 0.25 : 1;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
      {/* Soft warm halo — much subtler than the dark-mode glow */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-700 ${
          state === 'idle' ? 'opacity-25' : 'opacity-50'
        }`}
        style={{
          background:
            state === 'speaking'
              ? 'radial-gradient(circle, rgba(107, 68, 35, 0.45), transparent 70%)'
              : state === 'listening'
              ? 'radial-gradient(circle, rgba(107, 68, 35, 0.3), transparent 70%)'
              : 'radial-gradient(circle, rgba(107, 68, 35, 0.2), transparent 70%)'
        }}
      />

      {/* The orb itself — solid warm brown with cream highlight */}
      <div
        className={`relative rounded-full transition-all duration-300 ${
          state === 'idle' ? 'animate-breathe' : ''
        } ${state === 'speaking' ? 'animate-listen-pulse' : ''}`}
        style={{
          width: 180,
          height: 180,
          transform: `scale(${scale})`,
          background:
            'radial-gradient(circle at 35% 30%, rgba(248, 245, 242, 0.85), rgba(107, 68, 35, 0.95) 40%, rgba(61, 40, 23, 1) 85%)',
          boxShadow:
            'inset 0 0 50px rgba(61, 40, 23, 0.5), inset 0 -20px 40px rgba(61, 40, 23, 0.4), 0 12px 32px rgba(107, 68, 35, 0.25)'
        }}
      >
        {/* Inner highlight */}
        <div
          className="absolute rounded-full"
          style={{
            top: '15%',
            left: '20%',
            width: '30%',
            height: '25%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.55), transparent 70%)',
            filter: 'blur(8px)'
          }}
        />
      </div>

      {/* Listening ring */}
      {state === 'listening' && (
        <div
          className="absolute rounded-full border animate-listen-pulse"
          style={{
            width: 220,
            height: 220,
            borderColor: 'rgba(107, 68, 35, 0.4)',
            borderWidth: 1
          }}
        />
      )}

      {/* Thinking dots */}
      {state === 'thinking' && (
        <div className="absolute -bottom-12 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-brown/70"
              style={{
                animation: `breathe 1.4s ease-in-out ${i * 0.2}s infinite`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
