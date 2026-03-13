// ============================================================
// FILE: src/hooks/behaviouralEngine.js
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'

// ── Keystroke capture hook ──────────────────────────────────
export function useKeystrokeDNA() {
  const [isCapturing, setIsCapturing] = useState(false)
  const [graphData, setGraphData] = useState([])
  const keyDownTimes = useRef({})
  const holdTimes = useRef([])
  const flightTimes = useRef([])
  const lastKeyUpTime = useRef(null)
  const startTime = useRef(null)
  const backspaceCount = useRef(0)
  const captureBuffer = useRef([])

  const startCapture = useCallback(() => {
    keyDownTimes.current = {}
    holdTimes.current = []
    flightTimes.current = []
    lastKeyUpTime.current = null
    startTime.current = Date.now()
    backspaceCount.current = 0
    captureBuffer.current = []
    setGraphData([])
    setIsCapturing(true)
    console.log('[VAULTLESS] Keystroke capture started')
  }, [])

  const onKeyDown = useCallback((e) => {
    if (!isCapturing) return
    const key = e.key
    const now = performance.now()
    if (!keyDownTimes.current[key]) {
      keyDownTimes.current[key] = now
    }
    if (key === 'Backspace') backspaceCount.current++
    if (lastKeyUpTime.current !== null) {
      const flight = now - lastKeyUpTime.current
      if (flight > 0 && flight < 2000) {
        flightTimes.current.push(flight)
        // Update graph data live
        setGraphData(prev => [...prev.slice(-40), { t: Date.now(), v: Math.min(flight, 500) }])
      }
    }
  }, [isCapturing])

  const onKeyUp = useCallback((e) => {
    if (!isCapturing) return
    const key = e.key
    const now = performance.now()
    if (keyDownTimes.current[key]) {
      const hold = now - keyDownTimes.current[key]
      if (hold > 0 && hold < 1000) {
        holdTimes.current.push({ key, duration: hold })
      }
      delete keyDownTimes.current[key]
    }
    lastKeyUpTime.current = now
    captureBuffer.current.push({ key, timestamp: now })
  }, [isCapturing])

  const stopCapture = useCallback(() => {
    setIsCapturing(false)
    const totalDuration = startTime.current ? Date.now() - startTime.current : 0
    const holds = holdTimes.current.map(h => h.duration)
    const flights = flightTimes.current

    const result = {
      holdTimes: holdTimes.current,
      flightTimes: flights,
      totalDuration,
      errorRate: backspaceCount.current / Math.max(captureBuffer.current.length, 1),
      avgHold: mean(holds),
      stdHold: std(holds),
      avgFlight: mean(flights),
      stdFlight: std(flights),
      rhythmVariance: variance(flights),
    }
    console.log('[VAULTLESS] Keystroke capture result:', result)
    return result
  }, [])

  const getLiveGraphData = useCallback(() => graphData, [graphData])

  return { isCapturing, onKeyDown, onKeyUp, startCapture, stopCapture, getLiveGraphData, graphData }
}

// ── Mouse capture hook ──────────────────────────────────────
export function useMouseDNA() {
  const [isCapturing, setIsCapturing] = useState(false)
  const [mouseGraphData, setMouseGraphData] = useState([])
  const positions = useRef([])
  const clickStart = useRef(null)
  const clickHolds = useRef([])
  const lastPos = useRef(null)
  const lastTime = useRef(null)
  const velocities = useRef([])
  const accelerations = useRef([])
  const directionChanges = useRef(0)
  const lastDirection = useRef(null)

  const startCapture = useCallback(() => {
    positions.current = []
    clickStart.current = null
    clickHolds.current = []
    lastPos.current = null
    lastTime.current = null
    velocities.current = []
    accelerations.current = []
    directionChanges.current = 0
    lastDirection.current = null
    setMouseGraphData([])
    setIsCapturing(true)
  }, [])

  const onMouseMove = useCallback((e) => {
    if (!isCapturing) return
    const now = performance.now()
    const x = e.clientX, y = e.clientY
    if (lastPos.current && lastTime.current) {
      const dx = x - lastPos.current.x
      const dy = y - lastPos.current.y
      const dt = now - lastTime.current
      if (dt > 0) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        const vel = dist / dt
        velocities.current.push(vel)
        if (velocities.current.length > 1) {
          const prevVel = velocities.current[velocities.current.length - 2]
          accelerations.current.push(Math.abs(vel - prevVel) / dt)
        }
        // Direction change detection
        const angle = Math.atan2(dy, dx)
        if (lastDirection.current !== null) {
          const angleDiff = Math.abs(angle - lastDirection.current)
          if (angleDiff > 0.5) directionChanges.current++
        }
        lastDirection.current = angle
        setMouseGraphData(prev => [...prev.slice(-40), { t: Date.now(), v: Math.min(vel * 100, 500) }])
      }
    }
    lastPos.current = { x, y }
    lastTime.current = now
  }, [isCapturing])

  const onMouseDown = useCallback(() => {
    if (!isCapturing) return
    clickStart.current = performance.now()
  }, [isCapturing])

  const onMouseUp = useCallback(() => {
    if (!isCapturing || !clickStart.current) return
    const hold = performance.now() - clickStart.current
    clickHolds.current.push(hold)
    clickStart.current = null
  }, [isCapturing])

  const stopCapture = useCallback(() => {
    setIsCapturing(false)
    const vels = velocities.current
    const accels = accelerations.current
    const result = {
      avgVelocity: mean(vels),
      velocityVariance: variance(vels),
      avgAcceleration: mean(accels),
      directionChanges: directionChanges.current,
      clickHoldDuration: mean(clickHolds.current) || 0,
    }
    console.log('[VAULTLESS] Mouse capture result:', result)
    return result
  }, [])

  return { isCapturing, onMouseMove, onMouseDown, onMouseUp, startCapture, stopCapture, mouseGraphData }
}

// ── Combined vector & similarity ────────────────────────────
export function combinedVector(keystrokeData, mouseData) {
  const vec = new Float32Array(64)

  // [0–19] hold times per key (first 20 unique keys)
  const holdMap = {}
  for (const h of (keystrokeData.holdTimes || [])) {
    if (!holdMap[h.key]) holdMap[h.key] = []
    holdMap[h.key].push(h.duration)
  }
  const holdKeys = Object.keys(holdMap).slice(0, 20)
  holdKeys.forEach((k, i) => { vec[i] = mean(holdMap[k]) || 0 })

  // [20–39] flight times (first 20 flights)
  const flights = (keystrokeData.flightTimes || []).slice(0, 20)
  flights.forEach((f, i) => { vec[20 + i] = f })

  // [40–45] summary stats
  vec[40] = keystrokeData.avgHold || 0
  vec[41] = keystrokeData.stdHold || 0
  vec[42] = keystrokeData.avgFlight || 0
  vec[43] = keystrokeData.stdFlight || 0
  vec[44] = Math.min(keystrokeData.totalDuration || 0, 10000)
  vec[45] = keystrokeData.rhythmVariance || 0

  // [46–50] mouse dynamics
  vec[46] = (mouseData?.avgVelocity || 0) * 100
  vec[47] = (mouseData?.velocityVariance || 0) * 100
  vec[48] = (mouseData?.avgAcceleration || 0) * 1000
  vec[49] = Math.min(mouseData?.directionChanges || 0, 200)
  vec[50] = mouseData?.clickHoldDuration || 0

  // Normalize 0–1
  const maxVal = Math.max(...Array.from(vec), 1)
  for (let i = 0; i < 64; i++) vec[i] = vec[i] / maxVal

  console.log('[VAULTLESS] Combined vector created, non-zero elements:', Array.from(vec).filter(v => v > 0).length)
  return vec
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0

  // Weighted dot product: hold times [0-19] weight 3x, flight times [20-39] weight 2x, rest 1x
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    let w = 1
    if (i < 20) w = 3
    else if (i < 40) w = 2
    dot += w * a[i] * b[i]
    magA += w * a[i] * a[i]
    magB += w * b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  const similarity = dot / (Math.sqrt(magA) * Math.sqrt(magB))
  console.log('[VAULTLESS] Cosine similarity:', similarity.toFixed(4))
  return Math.max(0, Math.min(1, similarity))
}

export function stressDetector(liveRhythmVariance, enrollmentRhythmVariance) {
  if (!enrollmentRhythmVariance || enrollmentRhythmVariance === 0) return false
  const ratio = liveRhythmVariance / enrollmentRhythmVariance
  const isStressed = ratio > 2
  console.log('[VAULTLESS] Stress detection — ratio:', ratio.toFixed(2), 'stressed:', isStressed)
  return isStressed
}

export function vectorToHash(vector) {
  const bytes = new Uint8Array(vector.buffer)
  const hex = '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return ethers.keccak256(hex)
}

export function generateNullifier(vector, timestamp) {
  const data = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'uint256'],
    [vectorToHash(vector), BigInt(timestamp)]
  )
  return ethers.keccak256(data)
}

// ── Math helpers ─────────────────────────────────────────────
function mean(arr) {
  if (!arr || arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function variance(arr) {
  if (!arr || arr.length < 2) return 0
  const m = mean(arr)
  return mean(arr.map(x => (x - m) ** 2))
}

function std(arr) {
  return Math.sqrt(variance(arr))
}
