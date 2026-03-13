// ============================================================
// FILE: src/pages/Enroll.jsx
// ============================================================
import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell.jsx'
import DataStream from '../components/DataStream.jsx'
import { useVaultless } from '../lib/VaultlessContext.jsx'
import { useKeystrokeDNA, useMouseDNA, combinedVector, vectorToHash } from '../hooks/behaviouralEngine.js'
import { registerIdentity, getEtherscanLink } from '../lib/ethereum.js'

const PHRASE = 'Secure my account'
const TOTAL_SAMPLES = 3

export default function Enroll() {
  const navigate = useNavigate()
  const { connectWallet, setEnrollmentData, addTxEvent } = useVaultless()

  const [phase, setPhase] = useState('idle') // idle | capturing | done | committing | committed
  const [currentSample, setCurrentSample] = useState(0)
  const [inputVal, setInputVal] = useState('')
  const [txHash, setTxHash] = useState(null)
  const [samples, setSamples] = useState([])

  const keystroke = useKeystrokeDNA()
  const mouse = useMouseDNA()

  const handleStartCapture = useCallback(() => {
    setInputVal('')
    setPhase('capturing')
    keystroke.startCapture()
    mouse.startCapture()
  }, [])

  const handleInput = useCallback((e) => {
    setInputVal(e.target.value)
    if (e.target.value === PHRASE) {
      // Sample complete
      const ksData = keystroke.stopCapture()
      const mData = mouse.stopCapture()
      const vec = combinedVector(ksData, mData)
      const newSamples = [...samples, { ks: ksData, mouse: mData, vec }]
      setSamples(newSamples)
      setPhase(newSamples.length >= TOTAL_SAMPLES ? 'done' : 'sampleComplete')
      setCurrentSample(newSamples.length)
      toast.success(`Sample ${newSamples.length} captured!`)
    }
  }, [samples, keystroke, mouse])

  const handleNextSample = useCallback(() => {
    setInputVal('')
    setPhase('capturing')
    keystroke.startCapture()
    mouse.startCapture()
  }, [])

  const handleCommit = useCallback(async () => {
    setPhase('committing')
    try {
      // Average the three vectors
      const avgVec = new Float32Array(64)
      for (let i = 0; i < 64; i++) {
        avgVec[i] = samples.reduce((sum, s) => sum + s.vec[i], 0) / samples.length
      }
      const avgRhythmVariance = samples.reduce((sum, s) => sum + (s.ks.rhythmVariance || 0), 0) / samples.length

      const hash = vectorToHash(avgVec)
      await connectWallet()
      const tx = await registerIdentity(hash)
      const receipt = await tx.wait()
      const finalHash = receipt.transactionHash || tx.hash

      setTxHash(finalHash)
      setEnrollmentData({ vector: avgVec, hash, rhythmVariance: avgRhythmVariance })
      addTxEvent({ event: 'Registered', txHash: finalHash })
      setPhase('committed')
      console.log('[VAULTLESS] Identity committed on-chain:', finalHash)
    } catch (err) {
      console.error('[VAULTLESS] Enrollment failed:', err)
      toast.error('Enrollment failed: ' + err.message)
      setPhase('done')
    }
  }, [samples, connectWallet, setEnrollmentData, addTxEvent])

  const progressPct = inputVal.length / PHRASE.length

  return (
    <PageShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="min-h-screen flex flex-col lg:flex-row"
        onMouseMove={mouse.onMouseMove}
        onMouseDown={mouse.onMouseDown}
        onMouseUp={mouse.onMouseUp}
      >
        {/* ── LEFT COLUMN ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-16 max-w-xl mx-auto lg:mx-0">
          <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#00ff88] mb-3 opacity-70">
            // IDENTITY ENROLLMENT
          </p>
          <h1 className="font-['Space_Grotesk'] font-bold text-3xl text-[#e8e8f0] mb-3" style={{ letterSpacing: '-0.02em' }}>
            Enroll Your Behavioural DNA
          </h1>
          <p className="text-[#6a6a7a] text-sm mb-10 font-['Inter'] leading-relaxed">
            Type the phrase three times naturally. Do not try to be consistent — your natural variance is the feature.
          </p>

          {/* Phase stepper */}
          <div className="flex flex-col gap-4 mb-10">
            {[1, 2, 3].map(step => {
              const completed = currentSample >= step
              const active = currentSample === step - 1 && phase === 'capturing'
              return (
                <motion.div key={step} layout className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-['JetBrains_Mono'] flex-shrink-0"
                    style={{
                      background: completed ? '#00ff88' : 'transparent',
                      border: completed ? '2px solid #00ff88' : active ? '2px solid #00ff88' : '2px solid rgba(74,74,90,0.5)',
                      color: completed ? '#000' : active ? '#00ff88' : '#4a4a5a',
                      boxShadow: active ? '0 0 12px rgba(0,255,136,0.4)' : 'none',
                    }}
                  >
                    {completed ? '✓' : step}
                  </div>
                  <span className="font-['Inter'] text-sm" style={{ color: completed ? '#e8e8f0' : active ? '#00ff88' : '#4a4a5a' }}>
                    Sample {step}
                    {active && <span className="ml-2 text-xs text-[#00ff88] animate-pulse">● Recording</span>}
                  </span>
                  {/* Step line */}
                  {step < 3 && (
                    <div className="absolute mt-10 ml-3.5 w-0.5 h-6" style={{ background: completed ? '#00ff88' : 'rgba(74,74,90,0.3)' }} />
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Phrase card */}
          <div
            className="relative rounded-xl overflow-hidden p-5 mb-6 glow-pulse"
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(0,255,136,0.2)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,255,136,0.4), transparent)' }} />
            <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#00ff88] mb-2 opacity-70">// TYPE THIS PHRASE</p>
            <p className="font-['JetBrains_Mono'] text-2xl text-[#00ff88]" style={{ letterSpacing: '0.05em' }}>{PHRASE}</p>
          </div>

          {/* Input */}
          <input
            type="text"
            value={inputVal}
            onChange={handleInput}
            onKeyDown={keystroke.onKeyDown}
            onKeyUp={keystroke.onKeyUp}
            placeholder={phase === 'capturing' ? 'Start typing...' : 'Press Start Capture first'}
            disabled={phase !== 'capturing'}
            className="w-full mb-2 font-['JetBrains_Mono'] text-sm transition-all focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${phase === 'capturing' ? 'rgba(0,255,136,0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '8px',
              color: '#e8e8f0',
              padding: '14px 16px',
              letterSpacing: '0.08em',
            }}
          />

          {/* Progress bar */}
          <div className="w-full h-0.5 rounded-full mb-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: '#00ff88', originX: 0 }}
              animate={{ width: `${progressPct * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Action button */}
          <AnimatePresence mode="wait">
            {phase === 'committed' ? (
              <motion.button
                key="continue"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
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
                  width: '100%',
                }}
              >
                Authenticate Now →
              </motion.button>
            ) : phase === 'done' ? (
              <motion.button
                key="commit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,255,136,0.4)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCommit}
                className="glow-pulse"
                style={{
                  background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
                  color: '#000',
                  fontFamily: 'Space Grotesk',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  borderRadius: '10px',
                  padding: '16px 32px',
                  fontSize: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Commit Identity to Ethereum →
              </motion.button>
            ) : phase === 'sampleComplete' ? (
              <motion.button
                key="next"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,255,136,0.4)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNextSample}
                style={{
                  background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
                  color: '#000',
                  fontFamily: 'Space Grotesk',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  borderRadius: '10px',
                  padding: '14px 32px',
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Next Sample →
              </motion.button>
            ) : phase === 'capturing' ? (
              <button
                key="capturing"
                disabled
                style={{
                  background: 'rgba(0,255,136,0.1)',
                  border: '1px solid rgba(0,255,136,0.2)',
                  color: '#00ff88',
                  fontFamily: 'Space Grotesk',
                  fontWeight: 600,
                  borderRadius: '10px',
                  padding: '14px 32px',
                  fontSize: '15px',
                  cursor: 'not-allowed',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span className="dot-pulse">●</span> Capturing...
              </button>
            ) : phase === 'committing' ? (
              <button
                key="committing"
                disabled
                style={{
                  background: 'rgba(0,255,136,0.1)',
                  border: '1px solid rgba(0,255,136,0.2)',
                  color: '#00ff88',
                  fontFamily: 'Space Grotesk',
                  fontWeight: 600,
                  borderRadius: '10px',
                  padding: '14px 32px',
                  fontSize: '15px',
                  cursor: 'not-allowed',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span className="dot-pulse">●</span> Writing to Ethereum Sepolia...
              </button>
            ) : (
              <motion.button
                key="start"
                whileHover={{ borderColor: 'rgba(0,255,136,0.5)', boxShadow: '0 0 20px rgba(0,255,136,0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartCapture}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(0,255,136,0.25)',
                  color: '#00ff88',
                  fontFamily: 'Space Grotesk',
                  fontWeight: 600,
                  borderRadius: '10px',
                  padding: '14px 32px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Start Capture
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────── */}
        <div className="flex-1 lg:sticky lg:top-0 lg:h-screen flex flex-col justify-center px-8 lg:px-12 py-16 gap-6">
          <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#00ff88] mb-2 opacity-70">
            // LIVE BIOMETRIC SIGNAL
          </p>

          {/* Keystroke EKG */}
          <div
            className="relative rounded-2xl overflow-hidden p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(13,13,15,0.9) 0%, rgba(20,20,24,0.9) 100%)',
              border: '1px solid rgba(0,255,136,0.12)',
              boxShadow: '0 0 0 1px rgba(0,255,136,0.05), 0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,255,136,0.4), transparent)' }} />
            <p className="font-['JetBrains_Mono'] text-xs text-[#00ff88] mb-3 opacity-60">Keystroke EKG</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={keystroke.graphData.length > 0 ? keystroke.graphData : [{ v: 0 }]} animationDuration={300}>
                <defs>
                  <linearGradient id="ekgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#00ff88" strokeWidth={2} fill="url(#ekgGrad)" dot={false} isAnimationActive={true} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="font-['JetBrains_Mono'] text-xs text-right text-[#4a4a5a] mt-1">HOLD TIMES · ms</p>
          </div>

          {/* Mouse dynamics */}
          <div
            className="relative rounded-2xl overflow-hidden p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(13,13,15,0.9) 0%, rgba(20,20,24,0.9) 100%)',
              border: '1px solid rgba(0,212,255,0.12)',
              boxShadow: '0 0 0 1px rgba(0,212,255,0.05), 0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)' }} />
            <p className="font-['JetBrains_Mono'] text-xs text-[#00d4ff] mb-3 opacity-60">Mouse Dynamics</p>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={mouse.mouseGraphData.length > 0 ? mouse.mouseGraphData : [{ v: 0 }]} animationDuration={300}>
                <defs>
                  <linearGradient id="mouseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#00d4ff" strokeWidth={2} fill="url(#mouseGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="font-['JetBrains_Mono'] text-xs text-right text-[#4a4a5a] mt-1">VELOCITY · px/ms</p>
          </div>

          {/* DataStream */}
          <DataStream active={phase === 'capturing' || phase === 'committing'} />

          {/* Committed overlay */}
          <AnimatePresence>
            {phase === 'committed' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-2xl overflow-hidden p-6 text-center"
                style={{
                  background: 'rgba(0,255,136,0.05)',
                  border: '1px solid rgba(0,255,136,0.3)',
                  boxShadow: '0 0 40px rgba(0,255,136,0.1)',
                }}
              >
                <div className="text-[#00ff88] text-3xl mb-2">⬡</div>
                <div className="font-['Space_Grotesk'] font-bold text-xl text-[#00ff88] mb-2">Identity Committed</div>
                <div className="text-[#6a6a7a] text-xs font-['Inter'] mb-3">Your Behavioural DNA is now permanent on Ethereum</div>
                {txHash && (
                  <a
                    href={getEtherscanLink(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-['JetBrains_Mono'] text-xs text-[#00d4ff] hover:opacity-80 transition-opacity"
                  >
                    View transaction ↗
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </PageShell>
  )
}
