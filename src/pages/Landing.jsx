import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVaultless } from '../lib/VaultlessContext';

export default function Landing() {
  const navigate = useNavigate();
  const { demoMode, setDemoMode } = useVaultless();
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
    const cleanup = animateParticles(canvasRef.current);
    return cleanup;
  }, []);

  return (
    <div style={s.root}>
      <canvas ref={canvasRef} style={s.canvas} />
      <div style={s.scanline} />

      {/* Demo toggle */}
      <div style={s.demoToggle}>
        <span style={s.demoLabel}>DEMO MODE</span>
        <button
          style={{ ...s.toggle, background: demoMode ? '#00ff88' : '#333' }}
          onClick={() => setDemoMode(!demoMode)}
        >
          {demoMode ? 'ON' : 'OFF'}
        </button>
      </div>

      <div style={{
        ...s.hero,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.9s ease',
      }}>

        {/* Badge */}
        <div style={s.badge}>
          <span style={s.badgeDot} />
          <span style={s.badgeText}>LIVE ON ETHEREUM SEPOLIA</span>
        </div>

        {/* Headline */}
        <h1 style={s.headline}>
          <span style={s.hl1}>Your password</span>
          <br />
          <span style={s.hl2}>is how you move.</span>
        </h1>

        {/* Sub */}
        <p style={s.sub}>
          Password can be stolen. Behaviours can't.
        </p>

        {/* CTAs */}
        <div style={s.actions}>
          <button
            style={s.ctaPrimary}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            onClick={() => navigate('/gmail')}
          >
            Get Started →
          </button>
          <a
            href="https://sepolia.etherscan.io"
            target="_blank"
            rel="noreferrer"
            style={s.ctaSecondary}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,255,136,0.6)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,255,136,0.25)'}
          >
            View on Etherscan ↗
          </a>
        </div>

        {/* Counter */}
        <div style={s.counter}>⬡ 0 identities enrolled on-chain</div>

        {/* Feature cards */}
        <div style={s.cards}>
          {[
            { title: 'Behavioural DNA', desc: 'Keystroke timing + mouse dynamics. 64-dimensional vector unique to you. No biometric stored anywhere.', tag: 'Float32Array[64]', tagColor: '#00d4ff' },
            { title: 'Ethereum Trust Layer', desc: 'Every auth event, failed attempt, and duress trigger logged permanently on Sepolia. Immutable. Public. Forever.', tag: 'keccak256 · Sepolia', tagColor: '#00d4ff' },
            { title: 'Anti-Coercion Protocol', desc: 'Stress signature detected in rhythm. Ghost session loads.Blockchain records the attack.', tag: 'DuressActivated · on-chain', tagColor: '#ff6b35' },
          ].map(card => (
            <div key={card.title} style={s.card}>
              <div style={s.cardTopEdge} />
              <div style={{ color: '#00ff88', fontSize: 20, marginBottom: 12 }}>⬡</div>
              <div style={s.cardTitle}>{card.title}</div>
              <div style={s.cardDesc}>{card.desc}</div>
              <div style={{ ...s.cardTag, color: card.tagColor }}>{card.tag}</div>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div style={s.statsBar}>
          {[
            { num: '1.8B', label: 'passwords stolen last year' },
            { num: '0', label: 'databases in VAULTLESS' },
            { num: '∞', label: 'auth records on Ethereum' },
          ].map((stat, i) => (
            <div key={stat.label} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <div style={s.statDivider} />}
              <div style={s.stat}>
                <div style={s.statNum}>{stat.num}</div>
                <div style={s.statLabel}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

function animateParticles(canvas) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  let animId;

  const mouse = { x: null, y: null };

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // 🔥 more particles
  const particles = Array.from({ length: 180 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8,
    r: Math.random() * 1.8 + 0.6,
    cyan: Math.random() < 0.1,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // normal motion
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      // 🧲 cursor attraction
      if (mouse.x && mouse.y) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 200) {
          p.x += dx * 0.02;
          p.y += dy * 0.02;
        }
      }

      // draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.cyan
        ? 'rgba(0,212,255,0.6)'
        : 'rgba(0,255,136,0.65)';
      ctx.fill();

      // draw connections
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(0,255,136,${0.08 * (1 - dist / 150)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    animId = requestAnimationFrame(draw);
  }

  draw();

  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', resize);
  };
}

const s = {
  root: {
   root: {
  minHeight: '100vh',
  background: 'transparent',
  color: '#e8e8f0',
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  position: 'relative',
  zIndex: 1,
  overflowX: 'hidden',
}
  },
  canvas: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: 0,
  },
  scanline: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
  },
  demoToggle: {
    position: 'fixed', top: 20, right: 20, zIndex: 100,
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(0,0,0,0.8)', border: '1px solid #222',
    borderRadius: 8, padding: '8px 14px',
  },
  demoLabel: { color: '#555', fontSize: 11, letterSpacing: 2, fontFamily: "'Courier New', monospace" },
  toggle: {
    border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
    fontSize: 11, fontWeight: 700, color: '#000', letterSpacing: 1, transition: 'background 0.3s',
  },
  hero: {
    position: 'relative', zIndex: 2,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', padding: '80px 24px 80px',
    maxWidth: 960, margin: '0 auto',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)',
    borderRadius: 100, padding: '7px 18px', marginBottom: 44,
  },
  badgeDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#00ff88', boxShadow: '0 0 8px #00ff88',
  },
  badgeText: {
    fontFamily: "'Courier New', monospace",
    fontSize: 12, color: '#00ff88', letterSpacing: 3,
  },
  headline: { margin: '0 0 28px', lineHeight: 1.05 },
  hl1: {
    display: 'block',
    fontSize: 'clamp(48px, 8vw, 88px)',
    fontWeight: 700, color: '#e8e8f0',
    letterSpacing: '-0.03em',
  },
  hl2: {
    display: 'block',
    fontSize: 'clamp(48px, 8vw, 88px)',
    fontWeight: 700, letterSpacing: '-0.03em',
    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  sub: {
    color: '#ffffff', fontSize: 20, lineHeight: 1.7,
    maxWidth: 640, marginBottom: 48, fontWeight: 300,
  },
  actions: {
    display: 'flex', gap: 14, marginBottom: 28,
    flexWrap: 'wrap', justifyContent: 'center',
  },
  ctaPrimary: {
    background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
    color: '#000', border: 'none', padding: '15px 36px',
    fontSize: 15, fontWeight: 700, letterSpacing: '0.04em',
    cursor: 'pointer', borderRadius: 10,
    boxShadow: '0 0 24px rgba(0,255,136,0.3)',
    transition: 'opacity 0.2s',
  },
  ctaSecondary: {
    background: 'transparent',
    border: '1px solid rgba(0,255,136,0.25)',
    color: '#00ff88', padding: '15px 32px',
    fontSize: 15, fontWeight: 600, borderRadius: 10,
    cursor: 'pointer', textDecoration: 'none',
    display: 'inline-flex', alignItems: 'center',
    transition: 'border-color 0.2s',
  },
  counter: {
    fontFamily: "'Courier New', monospace",
    fontSize: 12, color: '#00ff88', opacity: 0.5,
    marginBottom: 80, letterSpacing: 1,
  },
  cards: {
    display: 'flex', gap: 20, flexWrap: 'wrap',
    justifyContent: 'center', marginBottom: 64, width: '100%',
    color: '#dc10f3',
  },
  card: {
    flex: '1 1 240px', maxWidth: 290,
    position: 'relative', borderRadius: 16, overflow: 'hidden',
    padding: '28px 24px', textAlign: 'left',
    background: 'linear-gradient(135deg, rgba(13,13,15,0.95), rgba(20,20,24,0.95))',
    border: '1px solid rgba(0,255,136,0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  cardTopEdge: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(0,255,136,0.4), transparent)',
  },
  cardTitle: {
    color: '#5161cd', fontSize: 14, fontWeight: 700,
    letterSpacing: '0.04em', marginBottom: 10,
  },
  cardDesc: { color: '#ffffff', fontSize: 13, lineHeight: 1.7, marginBottom: 16 },
  cardTag: { fontFamily: "'Courier New', monospace", fontSize: 11, opacity: 0.85 },
  statsBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexWrap: 'wrap',
    background: 'rgba(13,13,15,0.85)',
    border: '1px solid rgba(0,255,136,0.08)',
    borderRadius: 16, padding: '32px 40px', width: '100%',
  },
  stat: { textAlign: 'center', padding: '0 44px' },
  statNum: {
    fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6,
    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  statLabel: { color: '#4a4a5a', fontSize: 13 },
  statDivider: { width: 1, height: 40, background: 'rgba(0,255,136,0.1)', margin: '0' },
};