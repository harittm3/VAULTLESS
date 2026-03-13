// ============================================================
// FILE: src/pages/Landing.jsx
// ============================================================
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import PageShell from '../components/PageShell.jsx'

// ── Particle Canvas ─────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    const particles = []
    const COUNT = 100
    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    for (let i = 0; i < COUNT; i++) {
      const isCyan = Math.random() < 0.1
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: 1.5,
        color: isCyan ? 'rgba(0,212,255,0.5)' : 'rgba(0,255,136,0.6)',
      })
    }
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x, dy = p.y - q.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 140) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = `rgba(0,255,136,${0.08 * (1 - dist / 140)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
}

// ── Waveform SVG animation ──────────────────────────────────
function WaveformIcon() {
  return (
    <svg viewBox="0 0 80 40" className="w-16 h-8">
      {[0, 1, 2, 3].map(i => (
        <path
          key={i}
          d={`M0 20 Q10 ${5 + i * 4} 20 20 Q30 ${35 - i * 4} 40 20 Q50 ${5 + i * 4} 60 20 Q70 ${35 - i * 4} 80 20`}
          fill="none"
          stroke="#00ff88"
          strokeWidth="1"
          opacity={0.3 + i * 0.2}
          style={{ animation: `scan ${1.5 + i * 0.3}s linear infinite alternate` }}
        />
      ))}
    </svg>
  )
}

// ── Blockchain blocks SVG ───────────────────────────────────
function BlockchainIcon() {
  return (
    <svg viewBox="0 0 80 28" className="w-16 h-7">
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x={i * 28} y="4" width="20" height="20" rx="3" fill="none" stroke="#00ff88" strokeWidth="1.5" opacity={0.6 + i * 0.2} />
          {i < 2 && <line x1={i * 28 + 20} y1="14" x2={i * 28 + 28} y2="14" stroke="#00ff88" strokeWidth="1" opacity="0.5" markerEnd="url(#arr)" />}
        </g>
      ))}
      <defs>
        <marker id="arr" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4" fill="none" stroke="#00ff88" strokeWidth="1" />
        </marker>
      </defs>
    </svg>
  )
}

// ── Lock + wave SVG ─────────────────────────────────────────
function LockIcon() {
  return (
    <svg viewBox="0 0 80 40" className="w-16 h-8">
      <rect x="25" y="18" width="30" height="18" rx="3" fill="none" stroke="#ff6b35" strokeWidth="1.5" opacity="0.8" />
      <path d="M33 18 V14 A7 7 0 0 1 47 14 V18" fill="none" stroke="#ff6b35" strokeWidth="1.5" opacity="0.8" />
      <path d="M0 25 Q20 10 40 25 Q60 40 80 25" fill="none" stroke="#ff6b35" strokeWidth="1" opacity="0.4"
        style={{ animation: 'scan 2s linear infinite alternate' }} />
    </svg>
  )
}

// ── Stats counter ───────────────────────────────────────────
function StatCounter({ value, label, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const spring = useSpring(0, { stiffness: 60, damping: 20 })
  const display = useTransform(spring, v => {
    if (value === '∞') return '∞'
    if (value === '0') return '0'
    return Math.round(v).toLocaleString() + suffix
  })
  useEffect(() => {
    if (inView && typeof value === 'string' && value !== '∞' && value !== '0') {
      spring.set(parseFloat(value.replace(/[^0-9.]/g, '')))
    }
  }, [inView])

  return (
    <div ref={ref} className="text-center px-8">
      <motion.div className="text-4xl font-['Space_Grotesk'] font-bold text-gradient-green mb-1">
        {value === '∞' || value === '0' ? value : <motion.span>{display}</motion.span>}
        {value !== '∞' && suffix && <span>{suffix}</span>}
      </motion.div>
      <div className="text-sm text-[#4a4a5a] font-['Inter']">{label}</div>
    </div>
  )
}

// ── Feature Card ─────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

function FeatureCard({ icon, title, body, footerTag, footerColor = '#00d4ff', delay = 0 }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,255,136,0.15)' }}
      className="relative rounded-2xl overflow-hidden p-6"
      style={{
        background: 'linear-gradient(135deg, rgba(13,13,15,0.9) 0%, rgba(20,20,24,0.9) 100%)',
        border: '1px solid rgba(0,255,136,0.12)',
        boxShadow: '0 0 0 1px rgba(0,255,136,0.05), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,255,136,0.4), transparent)' }} />
      <div className="mb-4">{icon}</div>
      <h3 className="font-['Space_Grotesk'] font-bold text-lg text-[#e8e8f0] mb-2">{title}</h3>
      <p className="font-['Inter'] text-sm text-[#6a6a7a] leading-relaxed mb-4">{body}</p>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: footerColor, opacity: 0.8 }}>{footerTag}</div>
    </motion.div>
  )
}

// ── Landing Page ─────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const featuresRef = useRef(null)
  const featuresInView = useInView(featuresRef, { once: true, margin: '-100px' })

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  }

  return (
    <PageShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 overflow-hidden">
          <ParticleCanvas />
          <div className="relative z-10 flex flex-col items-center">
            {/* Status badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
              style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}
            >
              <span className="w-2 h-2 rounded-full bg-[#00ff88] dot-pulse" />
              <span className="font-['JetBrains_Mono'] text-xs text-[#00ff88] tracking-wider">LIVE ON ETHEREUM SEPOLIA</span>
            </motion.div>

            {/* Main headline */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="mb-6"
            >
              <motion.h1
                variants={cardVariants}
                className="font-['Space_Grotesk'] font-bold text-7xl md:text-8xl text-[#e8e8f0] leading-tight"
                style={{ letterSpacing: '-0.03em' }}
              >
                Your password
              </motion.h1>
              <motion.h1
                variants={cardVariants}
                className="font-['Space_Grotesk'] font-bold text-7xl md:text-8xl text-gradient-green leading-tight glitch"
                data-text="is how you move."
                style={{ letterSpacing: '-0.03em' }}
              >
                is how you move.
              </motion.h1>
            </motion.div>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[#9898a8] text-xl max-w-2xl leading-relaxed mb-10 font-['Inter']"
            >
              It can't be stolen. It can't be copied. And if someone forces you to use it — they've already lost.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex gap-4 mb-8 flex-wrap justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,255,136,0.4)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/gmail')}
                style={{
                  background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
                  color: '#000',
                  fontFamily: 'Space Grotesk',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  borderRadius: '10px',
                  padding: '14px 32px',
                  fontSize: '15px',
                  boxShadow: '0 0 20px rgba(0,255,136,0.25)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Get Started →
              </motion.button>
              <motion.a
                href="https://sepolia.etherscan.io"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ borderColor: 'rgba(0,255,136,0.5)', boxShadow: '0 0 20px rgba(0,255,136,0.1)' }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(0,255,136,0.25)',
                  color: '#00ff88',
                  borderRadius: '10px',
                  padding: '14px 28px',
                  fontFamily: 'Space Grotesk',
                  fontWeight: 600,
                  fontSize: '15px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                View on Etherscan ↗
              </motion.a>
            </motion.div>

            {/* Live counter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#00ff88', opacity: 0.6 }}
            >
              ⬡ 0 identities enrolled on-chain
            </motion.div>
          </div>
        </section>

        {/* ── FEATURE CARDS ────────────────────────────────── */}
        <section className="px-6 py-24 max-w-6xl mx-auto" ref={featuresRef}>
          <motion.p
            initial={{ opacity: 0 }}
            animate={featuresInView ? { opacity: 1 } : {}}
            className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#00ff88] mb-3 opacity-70 text-center"
          >
            // CORE PROTOCOL LAYERS
          </motion.p>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={featuresInView ? 'show' : 'hidden'}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8"
          >
            <FeatureCard
              icon={<WaveformIcon />}
              title="Behavioural DNA"
              body="Every keystroke hold time, every flight gap, every mouse tremor forms a 64-dimensional vector unique to you. Reconstructed fresh. Never stored."
              footerTag="Float32Array[64]"
              footerColor="#00d4ff"
            />
            <FeatureCard
              icon={<BlockchainIcon />}
              title="Ethereum Trust Layer"
              body="Every auth event, failed attempt, and duress trigger is logged permanently on Sepolia. Immutable. Public. Forever."
              footerTag="keccak256 · Sepolia"
              footerColor="#00d4ff"
            />
            <FeatureCard
              icon={<LockIcon />}
              title="Anti-Coercion Protocol"
              body="Stress detected in rhythm automatically. Ghost session loads. Real account locks. Blockchain records the attack. You do nothing."
              footerTag="DuressActivated · on-chain"
              footerColor="#ff6b35"
            />
          </motion.div>
        </section>

        {/* ── STATS BAR ────────────────────────────────────── */}
        <section
          className="py-16 px-6"
          style={{ background: 'rgba(13,13,15,0.8)', borderTop: '1px solid rgba(0,255,136,0.08)', borderBottom: '1px solid rgba(0,255,136,0.08)' }}
        >
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-around gap-8">
            <StatCounter value="1.8B" label="passwords stolen last year" suffix="" />
            <div className="hidden md:block w-px h-12" style={{ background: 'rgba(0,255,136,0.15)' }} />
            <StatCounter value="0" label="databases in VAULTLESS" />
            <div className="hidden md:block w-px h-12" style={{ background: 'rgba(0,255,136,0.15)' }} />
            <StatCounter value="∞" label="auth records on Ethereum" />
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────── */}
        <footer className="text-center py-12 text-[#4a4a5a] text-xs font-['JetBrains_Mono']">
          VAULTLESS · Ethereum Sepolia · March 2026 · Behavioural DNA Authentication
        </footer>
      </motion.div>
    </PageShell>
  )
}
