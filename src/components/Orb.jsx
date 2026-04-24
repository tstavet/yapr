import React from 'react';

// The orb has four states: idle, listening, thinking, speaking.
// Each state has its own motion. This is Kones's "face."

export default function Orb({ state = 'idle', level = 0 }) {
  const scale = state === 'listening' ? 1 + level * 0.25 : 1;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
      {/* Outer glow */}
      <div
        className={`absolute inset-0 rounded-full blur-3xl transition-opacity duration-700 ${
          state === 'idle' ? 'opacity-30' : 'opacity-60'
        }`}
        style={{
          background:
            state === 'speaking'
              ? 'radial-gradient(circle, rgba(196, 74, 42, 0.7), transparent 70%)'
              : state === 'listening'
              ? 'radial-gradient(circle, rgba(74, 93, 58, 0.6), transparent 70%)'
              : 'radial-gradient(circle, rgba(244, 239, 230, 0.3), transparent 70%)'
        }}
      />

      {/* The orb itself */}
      <div
        className={`relative rounded-full transition-all duration-300 ${
          state === 'idle' ? 'animate-breathe' : ''
        } ${state === 'speaking' ? 'animate-listen-pulse' : ''}`}
        style={{
          width: 180,
          height: 180,
          transform: `scale(${scale})`,
          background:
            'radial-gradient(circle at 35% 30%, rgba(244, 239, 230, 0.9), rgba(196, 74, 42, 0.8) 40%, rgba(74, 93, 58, 0.7) 80%)',
          boxShadow:
            'inset 0 0 60px rgba(0,0,0,0.4), inset 0 -20px 40px rgba(196, 74, 42, 0.3), 0 0 80px rgba(196, 74, 42, 0.3)'
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
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.4), transparent 70%)',
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
            borderColor: 'rgba(74, 93, 58, 0.5)',
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
              className="w-2 h-2 rounded-full bg-cream/70"
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
