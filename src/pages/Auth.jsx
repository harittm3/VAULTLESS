// ============================================================
// FILE: src/pages/Auth.jsx
// ============================================================
import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell.jsx'
import DataStream from '../components/DataStream.jsx'
import { useVaultless } from '../lib/VaultlessContext.jsx'
import {
  useKeystrokeDNA, useMouseDNA,
  combinedVector, cosineSimilarity, stressDetector,
  vectorToHash, generateNullifier,
} from '../hooks/behaviouralEngine.js'
import {
  connectWallet, authenticateIdentity, triggerDuressOnChain,
  recordAuthFailed, getEtherscanLink,
} from '../lib/ethereum.js'
import { sendDuressAlert } from '../lib/duressAlert.js'

const PHRASE = 'Secure my account'
const THRESHOLDS = { AUTH: 0.85, DURESS_LOW: 0.55 }

// ── Score ring SVG ────────────────────────────────────────────
function ScoreRing({ score, status }) {
  const radius = 120, cx = 140, cy = 140
  const circumference = 2 * Math.PI * radius
  const dash = circumference * Math.max(0, Math.min(1, score))
  const color = status === 'authenticated' ? '#00ff88' : status === 'duress' ? '#ff6b35' : status === 'rejected' ? '#ff2d55' : '#4a4a5a'
  const glow = status === 'authenticated' ? '0 0 20px #00ff88' : status === 'duress' ? '0 0 20px #ff6b35' : status === 'rejected' ? '0 0 20px #ff2d55' : 'none'

  const springScore = useSpring(0, { stiffness: 80, damping: 18 })
  const displayScore = useTransform(springScore, v => (v * 100).toFixed(1))
  useEffect(() => { springScore.set(score) }, [score])

  return (
    <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
      <svg width="280" height="280" style={{ position: 'absolute' }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        {/* Animated fill */}
        <motion.circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: circumference - dash, filter: `drop-shadow(${glow})` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ transformOrigin: `${cx}px ${cy}px`, transform: 'rotate(-90deg)' }}
        />
      </svg>
      <div className="relative z-10 text-center">
        <motion.div
          className="font-['JetBrains_Mono'] font-bold"
          style={{ fontSize: '64px', color, lineHeight: 1, filter: `drop-shadow(${glow})` }}
        >
          <motion.span>{displayScore}</motion.span>
        </motion.div>
        <div className="font-['JetBrains_Mono'] text-xs tracking-widest mt-1" style={{ color: '#4a4a5a' }}>% MATCH</div>
      </div>
    </div>
  )
}

// ── Confetti ──────────────────────────────────────────────────
function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {Array.from({ length: 25 }).map((_, i) => (
        <div
          key={i}
          className="confetti absolute w-2 h-2 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 40}%`,
            background: Math.random() > 0.5 ? '#00ff88' : '#00d4ff',
            animationDelay: `${Math.random() * 0.5}s`,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  )
}

export default function Auth() {
  const navigate = useNavigate()
  const { enrollmentVector, enrollmentRhythmVariance, setAuthResult, addTxEvent, walletAddress } = useVaultless()

  const [phase, setPhase] = useState('idle') // idle | capturing | authenticated | duress | rejected
  const [score, setScore] = useState(0)
  const [inputVal, setInputVal] = useState('')
  const [liveVariance, setLiveVariance] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [bgFlash, setBgFlash] = useState(null)

  const keystroke = useKeystrokeDNA()
  const mouse = useMouseDNA()
  const inputRef = useRef(null)

  const flashBg = (color) => {
    setBgFlash(color)
    setTimeout(() => setBgFlash(null), 400)
  }

  const handleStartCapture = useCallback(() => {
    setInputVal('')
    setPhase('capturing')
    keystroke.startCapture()
    mouse.startCapture()
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleInput = useCallback(async (e) => {
    const val = e.target.value
    setInputVal(val)

    // Update live variance display
    if (keystroke.graphData.length > 2) {
      const recent = keystroke.graphData.slice(-5).map(d => d.v)
      const mean = recent.reduce((a, b) => a + b, 0) / recent.length
      const variance = recent.reduce((sum, v) => sum + (v - mean) ** 2, 0) / recent.length
      setLiveVariance(Math.round(variance))
    }

    if (val !== PHRASE) return

    // Run analysis
    const ksData = keystroke.stopCapture()
    const mData = mouse.stopCapture()
    const liveVec = combinedVector(ksData, mData)

    let similarity = 0.3 + Math.random() * 0.2 // demo fallback

    if (enrollmentVector && enrollmentVector.length === 64) {
      similarity = cosineSimilarity(liveVec, enrollmentVector)
    }

    setScore(similarity)

    const stressed = stressDetector(ksData.rhythmVariance, enrollmentRhythmVariance)
    console.log('[VAULTLESS] Score:', similarity.toFixed(4), 'Stressed:', stressed)

    if (similarity > THRESHOLDS.AUTH && !stressed) {
      // AUTHENTICATED
      setPhase('authenticated')
      setAuthResult({ score: similarity, duress: false, authenticated: true })
      flashBg('rgba(0,255,136,0.05)')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)

      try {
        const nullifier = generateNullifier(liveVec, Date.now())
        const tx = await authenticateIdentity(nullifier)
        const receipt = await tx.wait()
        addTxEvent({ event: 'AuthSuccess', txHash: receipt.transactionHash || tx.hash })
      } catch (err) {
        console.warn('[VAULTLESS] On-chain auth failed (demo ok):', err.message)
      }

      setTimeout(() => navigate('/dashboard'), 2000)

    } else if (similarity >= THRESHOLDS.DURESS_LOW || stressed) {
      // DURESS
      setPhase('duress')
      setAuthResult({ score: similarity, duress: true, authenticated: false })
      flashBg('rgba(255,107,53,0.05)')
      toast.error('Stress signature detected', { icon: '⚠️' })

      try {
        const tx = await triggerDuressOnChain()
        const receipt = await tx.wait()
        const txHash = receipt.transactionHash || tx.hash
        addTxEvent({ event: 'DuressActivated', txHash })
        await sendDuressAlert({
          walletAddress: walletAddress || 'demo',
          timestamp: Date.now(),
          etherscanLink: getEtherscanLink(txHash),
        })
      } catch (err) {
        console.warn('[VAULTLESS] Duress chain call (demo ok):', err.message)
      }

      setTimeout(() => navigate('/ghost'), 2500)

    } else {
      // REJECTED
      setPhase('rejected')
      setAuthResult({ score: similarity, duress: false, authenticated: false })
      flashBg('rgba(255,45,85,0.05)')
      toast.error('Access denied')

      try {
        const tx = await recordAuthFailed()
        const receipt = await tx.wait()
        addTxEvent({ event: 'AuthFailed', txHash: receipt.transactionHash || tx.hash })
      } catch (err) {
        console.warn('[VAULTLESS] AuthFailed chain call (demo ok):', err.message)
      }
    }
  }, [enrollmentVector, enrollmentRhythmVariance, keystroke, mouse, navigate, setAuthResult, addTxEvent, walletAddress])

  const status = phase === 'authenticated' ? 'authenticated' : phase === 'duress' ? 'duress' : phase === 'rejected' ? 'rejected' : 'idle'
  const statusColor = { authenticated: '#00ff88', duress: '#ff6b35', rejected: '#ff2d55', idle: '#4a4a5a' }[status]

  const statusLabel = {
    authenticated: 'IDENTITY CONFIRMED',
    duress: 'STRESS SIGNATURE DETECTED',
    rejected: 'ACCESS DENIED',
    idle: 'AWAITING INPUT',
    capturing: 'SCANNING...',
  }[phase] || 'AWAITING INPUT'

  return (
    <PageShell>
      {/* Background flash */}
      <AnimatePresence>
        {bgFlash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-10"
            style={{ background: bgFlash }}
          />
        )}
      </AnimatePresence>

      {showConfetti && <Confetti />}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="min-h-screen flex flex-col items-center justify-between py-8 px-4"
        onMouseMove={mouse.onMouseMove}
        onMouseDown={mouse.onMouseDown}
        onMouseUp={mouse.onMouseUp}
      >
        {/* ── ZONE 1: SCORE RING ───────────────────────────── */}
        <div className="flex flex-col items-center pt-8 pb-4">
          <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#00ff88] mb-6 opacity-70">
            // IDENTITY VERIFICATION
          </p>

          <motion.div
            animate={phase === 'rejected' || phase === 'duress' ? {
              x: [-10, 10, -8, 8, -4, 4, 0],
              transition: { duration: 0.4 }
            } : {}}
          >
            <ScoreRing score={score} status={status} />
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="mt-4 font-['Space_Grotesk'] font-bold text-xl"
              style={{ color: statusColor }}
            >
              {statusLabel}
              {phase === 'idle' && <span className="cursor-blink ml-1">_</span>}
            </motion.div>
          </AnimatePresence>

          {phase === 'duress' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[#6a6a7a] text-sm mt-2 font-['Inter']"
            >
              Loading secure environment...
            </motion.p>
          )}
        </div>

        {/* ── ZONE 2: INPUT ─────────────────────────────────── */}
        <div className="w-full max-w-lg">
          {/* Phrase card */}
          <div
            className="relative rounded-xl overflow-hidden p-5 mb-4"
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(0,255,136,0.15)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,255,136,0.4), transparent)' }} />
            <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#00ff88] mb-2 opacity-70">// TYPE THIS PHRASE</p>
            <p className="font-['JetBrains_Mono'] text-xl text-[#00ff88]" style={{ letterSpacing: '0.05em' }}>{PHRASE}</p>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={handleInput}
            onKeyDown={keystroke.onKeyDown}
            onKeyUp={keystroke.onKeyUp}
            placeholder={phase === 'capturing' ? 'Start typing...' : 'Click Verify Identity to begin'}
            disabled={phase !== 'capturing'}
            className="w-full mb-4 font-['JetBrains_Mono'] text-sm transition-all focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${phase === 'capturing' ? 'rgba(0,255,136,0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '8px',
              color: '#e8e8f0',
              padding: '14px 16px',
              letterSpacing: '0.08em',
            }}
          />

          {/* Stress indicator */}
          <div className="mb-4">
            <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#ff6b35] mb-2 opacity-70">// STRESS INDICATOR</p>
            <div className="relative w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${Math.min(100, (liveVariance / 5000) * 100)}%` }}
                style={{ background: liveVariance > 2000 ? '#ff6b35' : '#4a4a5a' }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <div className="flex justify-end mt-1">
              <span className="font-['JetBrains_Mono'] text-xs" style={{ color: liveVariance > 2000 ? '#ff6b35' : '#4a4a5a' }}>
                σ² {liveVariance}
              </span>
            </div>
          </div>

          {/* Verify button or status */}
          {phase === 'idle' || phase === 'rejected' ? (
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,255,136,0.4)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartCapture}
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
                width: '100%',
              }}
            >
              {phase === 'rejected' ? 'Try Again' : 'Verify Identity'}
            </motion.button>
          ) : null}
        </div>

        {/* ── ZONE 3: LIVE SIGNALS ─────────────────────────── */}
        <div className="w-full max-w-lg">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Live EKG */}
            <div
              className="relative rounded-xl overflow-hidden p-4"
              style={{
                background: 'rgba(13,13,15,0.9)',
                border: '1px solid rgba(0,255,136,0.1)',
              }}
            >
              <p className="font-['JetBrains_Mono'] text-xs text-[#00ff88] mb-2 opacity-60">Live Signal</p>
              <ResponsiveContainer width="100%" height={70}>
                <AreaChart data={keystroke.graphData.length > 0 ? keystroke.graphData : [{ v: 0 }]} animationDuration={300}>
                  <defs>
                    <linearGradient id="liveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#00ff88" strokeWidth={1.5} fill="url(#liveGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Mouse dynamics */}
            <div
              className="relative rounded-xl overflow-hidden p-4"
              style={{
                background: 'rgba(13,13,15,0.9)',
                border: '1px solid rgba(0,212,255,0.1)',
              }}
            >
              <p className="font-['JetBrains_Mono'] text-xs text-[#00d4ff] mb-2 opacity-60">Mouse Dynamics</p>
              <ResponsiveContainer width="100%" height={70}>
                <AreaChart data={mouse.mouseGraphData.length > 0 ? mouse.mouseGraphData : [{ v: 0 }]} animationDuration={300}>
                  <defs>
                    <linearGradient id="mouseAuthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#00d4ff" strokeWidth={1.5} fill="url(#mouseAuthGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <DataStream active={phase === 'capturing'} />
        </div>
      </motion.div>
    </PageShell>
  )
}
