import { useState, useRef, useCallback, useEffect } from 'react';

// The phrase — must match exactly what's used in Enroll/Auth
const PHRASE = 'Secure my account';

// ─── Keystroke DNA Hook ───────────────────────────────────────────────────────
export function useKeystrokeDNA() {
  const [events, setEvents] = useState([]);
  const keyDownTimes = useRef({});
  const lastKeyUpTime = useRef(null);
  const rawEvents = useRef([]);

  const onKeyDown = useCallback((e) => {
    keyDownTimes.current[e.key] = performance.now();
  }, []);

  const onKeyUp = useCallback((e) => {
    const now = performance.now();
    const holdTime = keyDownTimes.current[e.key]
      ? now - keyDownTimes.current[e.key]
      : 0;
    const flightTime = lastKeyUpTime.current
      ? keyDownTimes.current[e.key] - lastKeyUpTime.current
      : 0;

    const event = {
      key: e.key,
      holdTime,
      flightTime: Math.max(0, flightTime),
      timestamp: now,
    };

    rawEvents.current.push(event);
    lastKeyUpTime.current = now;
    setEvents([...rawEvents.current]);
  }, []);

  const reset = useCallback(() => {
    rawEvents.current = [];
    keyDownTimes.current = {};
    lastKeyUpTime.current = null;
    setEvents([]);
  }, []);

  const extractVector = useCallback((phrase) => {
    // Exclude backspace from timing analysis — only count real phrase keys
    const allEvts = rawEvents.current;
    let evts = allEvts.filter(e => e.key !== 'Backspace' && e.key !== 'Shift');
    if (evts.length < 5) return null;

    // If we know the target phrase, try to align events to the expected key sequence.
    // If alignment fails, fall back to using the first N keys (where N = phrase length)
    // so that we still return a usable vector rather than null.
    if (phrase) {
      const expected = phrase.split('');
      const matched = [];
      let idx = 0;
      for (const e of evts) {
        const key = e.key;
        if (idx < expected.length && key === expected[idx]) {
          matched.push(e);
          idx += 1;
        }
        if (idx >= expected.length) break;
      }

      if (matched.length === expected.length) {
        evts = matched;
      } else if (evts.length >= expected.length) {
        // Fallback: use first N events so we still get a vector even if the user made a small typo.
        evts = evts.slice(0, expected.length);
      }
      // if evts is shorter than phrase length, keep it (will early-return below if too short)
    }

    const holdTimes   = evts.map(e => e.holdTime);
    const flightTimes = evts.slice(1).map(e => e.flightTime).filter(f => f > 0 && f < 3000);

    const totalDuration = evts.length > 1
      ? evts[evts.length - 1].timestamp - evts[0].timestamp
      : 0;

    const errorCount = allEvts.filter(e => e.key === 'Backspace').length;

    return {
      // Scalar summaries
      avgHoldTime:    mean(holdTimes),
      stdHoldTime:    std(holdTimes),
      avgFlightTime:  mean(flightTimes),
      stdFlightTime:  std(flightTimes),
      totalDuration,
      rhythmVariance: variance(flightTimes),
      errorRate:      errorCount / allEvts.length,

      // Raw arrays — these are the actual fingerprint
      holdTimes,
      flightTimes,

      // Z-score normalized arrays — shape of pattern, independent of speed
      holdTimesZ:   zNormalize(holdTimes),
      flightTimesZ: zNormalize(flightTimes),
    };
  }, []);

  return { events, onKeyDown, onKeyUp, reset, extractVector };
}

// ─── Mouse DNA Hook ───────────────────────────────────────────────────────────
export function useMouseDNA() {
  const [active, setActive] = useState(false);
  const [motionSupported, setMotionSupported] = useState(false);
  const points = useRef([]);
  const lastPoint = useRef(null);
  const mouseDownTime = useRef(null);
  const clickHolds = useRef([]);

  // Mobile / device motion capture
  const motionData = useRef({ acc: [], gyro: [] });
  const motionHandlerRef = useRef(null);
  const orientationHandlerRef = useRef(null);
  const lastMotionTime = useRef(0);
  const lastOrientationTime = useRef(0);
  const lastMotionGyroAt = useRef(0);
  const prevOrientationSample = useRef(null);
  const filteredGyro = useRef(null);
  const filteredAcc = useRef(null);
  const diagnosticsRef = useRef({
    platform: 'unknown',
    browser: 'unknown',
    hasDeviceMotion: false,
    hasDeviceOrientation: false,
    isSecureContext: false,
    motionPermission: 'unknown',
    orientationPermission: 'unknown',
    motionEvents: 0,
    orientationEvents: 0,
    touchEvents: 0,
    lastMotionEventAt: null,
    lastOrientationEventAt: null,
    lastTouchEventAt: null,
    captureStartedAt: null,
  });

  const detectPlatformInfo = useCallback(() => {
    if (typeof navigator === 'undefined') {
      return { platform: 'unknown', browser: 'unknown' };
    }
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Edg|OPR/i.test(ua);
    const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg|OPR/i.test(ua);

    return {
      platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
      browser: isSafari ? 'safari' : isChrome ? 'chrome' : 'other',
    };
  }, []);

  const addPoint = useCallback((x, y, pressure = 0, isTouch = false) => {
    const now = performance.now();
    const point = { x, y, t: now, pressure, isTouch };
    if (lastPoint.current) {
      const dx = point.x - lastPoint.current.x;
      const dy = point.y - lastPoint.current.y;
      const dt = point.t - lastPoint.current.t;

      // Ignore ultra-dense events that mostly add noise and cost CPU
      if (dt < 5) {
        lastPoint.current = point;
        return;
      }

      const dist = Math.sqrt(dx * dx + dy * dy);
      let velocity = dt > 0 ? dist / dt : 0;
      // Clamp extreme spikes to reduce outlier impact
      if (velocity > 5) velocity = 5;
      const angle = Math.atan2(dy, dx);
      points.current.push({ velocity, angle, dt, pressure });
      // Keep a bounded history so long sessions don't explode in size
      if (points.current.length > 512) {
        points.current.shift();
      }
    }
    lastPoint.current = point;
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!active) return;
    addPoint(e.clientX, e.clientY, 0, false);
  }, [active, addPoint]);

  const onTouchMove = useCallback((e) => {
    if (!active) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const pressure = typeof touch.force === 'number' ? touch.force : 0;
    diagnosticsRef.current.touchEvents += 1;
    diagnosticsRef.current.lastTouchEventAt = Date.now();
    addPoint(touch.clientX, touch.clientY, pressure, true);
  }, [active, addPoint]);

  const onMouseDown = useCallback(() => {
    mouseDownTime.current = performance.now();
  }, []);

  const onTouchStart = useCallback((e) => {
    mouseDownTime.current = performance.now();
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const pressure = typeof touch.force === 'number' ? touch.force : 0;
    diagnosticsRef.current.touchEvents += 1;
    diagnosticsRef.current.lastTouchEventAt = Date.now();
    // Capture first touch point as part of mobile movement signature
    addPoint(touch.clientX, touch.clientY, pressure, true);
  }, [addPoint]);

  const onMouseUp = useCallback(() => {
    if (mouseDownTime.current) {
      clickHolds.current.push(performance.now() - mouseDownTime.current);
      mouseDownTime.current = null;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (mouseDownTime.current) {
      clickHolds.current.push(performance.now() - mouseDownTime.current);
      mouseDownTime.current = null;
    }
  }, []);

  const cleanupMotionListeners = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (motionHandlerRef.current) {
      window.removeEventListener('devicemotion', motionHandlerRef.current);
      motionHandlerRef.current = null;
    }
    if (orientationHandlerRef.current) {
      window.removeEventListener('deviceorientation', orientationHandlerRef.current);
      orientationHandlerRef.current = null;
    }
  }, []);

  const registerMotionListener = useCallback(() => {
    if (typeof window === 'undefined' || !window.DeviceMotionEvent || motionHandlerRef.current) return;
    diagnosticsRef.current.motionPermission = 'granted';

    const nextMotionHandler = (e) => {
      const now = performance.now();
      // Sample motion data at ~20Hz (every 50ms) to reduce noise and improve consistency
      if (now - lastMotionTime.current < 50) return;
      lastMotionTime.current = now;
      diagnosticsRef.current.motionEvents += 1;
      diagnosticsRef.current.lastMotionEventAt = Date.now();

      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (acc) {
        // Clamp and low-pass acceleration to stabilize cross-device jitter
        const accRaw = {
          x: clampFinite(acc.x || 0, -80, 80),
          y: clampFinite(acc.y || 0, -80, 80),
          z: clampFinite(acc.z || 0, -80, 80),
        };
        const prev = filteredAcc.current || accRaw;
        const smooth = 0.3;
        const accFiltered = {
          x: prev.x + (accRaw.x - prev.x) * smooth,
          y: prev.y + (accRaw.y - prev.y) * smooth,
          z: prev.z + (accRaw.z - prev.z) * smooth,
        };
        filteredAcc.current = accFiltered;
        motionData.current.acc.push({
          x: accFiltered.x,
          y: accFiltered.y,
          z: accFiltered.z,
          t: now,
        });
        if (motionData.current.acc.length > 512) motionData.current.acc.shift();
        setMotionSupported(true); // Mark as available when data is received
      }
      const rot = e.rotationRate;
      if (rot) {
        // rotationRate is already rate-like (deg/s). Smooth + clamp for consistency.
        const rotRaw = {
          alpha: clampFinite(rot.alpha || 0, -2000, 2000),
          beta: clampFinite(rot.beta || 0, -2000, 2000),
          gamma: clampFinite(rot.gamma || 0, -2000, 2000),
        };
        const prev = filteredGyro.current || rotRaw;
        const smooth = 0.35;
        const rotFiltered = {
          alpha: prev.alpha + (rotRaw.alpha - prev.alpha) * smooth,
          beta: prev.beta + (rotRaw.beta - prev.beta) * smooth,
          gamma: prev.gamma + (rotRaw.gamma - prev.gamma) * smooth,
        };
        filteredGyro.current = rotFiltered;
        lastMotionGyroAt.current = now;
        motionData.current.gyro.push({
          alpha: rotFiltered.alpha,
          beta: rotFiltered.beta,
          gamma: rotFiltered.gamma,
          t: now,
        });
        if (motionData.current.gyro.length > 512) motionData.current.gyro.shift();
        setMotionSupported(true); // Mark as available when data is received
      }
    };

    window.addEventListener('devicemotion', nextMotionHandler);
    motionHandlerRef.current = nextMotionHandler;
  }, []);

  const registerOrientationListener = useCallback(() => {
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent || orientationHandlerRef.current) return;
    diagnosticsRef.current.orientationPermission = 'granted';

    const nextOrientationHandler = (e) => {
      const now = performance.now();
      // Sample orientation data at ~20Hz independently from devicemotion sampling
      if (now - lastOrientationTime.current < 50) return;
      lastOrientationTime.current = now;
      diagnosticsRef.current.orientationEvents += 1;
      diagnosticsRef.current.lastOrientationEventAt = Date.now();

      // If devicemotion is already feeding real rotationRate, don't mix in orientation units.
      if (now - lastMotionGyroAt.current < 500) {
        return;
      }

      // Fallback path: convert orientation deltas (deg) into rate-like values (deg/s).
      const sample = {
        alpha: e.alpha || 0,
        beta: e.beta || 0,
        gamma: e.gamma || 0,
        t: now,
      };
      const prev = prevOrientationSample.current;
      prevOrientationSample.current = sample;
      if (!prev) return;

      const dt = sample.t - prev.t;
      if (dt <= 0 || dt > 500) return;

      const rateRaw = {
        alpha: clampFinite(wrapAngleDeg(sample.alpha - prev.alpha) * 1000 / dt, -1000, 1000),
        beta: clampFinite(wrapAngleDeg(sample.beta - prev.beta) * 1000 / dt, -1000, 1000),
        gamma: clampFinite(wrapAngleDeg(sample.gamma - prev.gamma) * 1000 / dt, -1000, 1000),
      };
      const prevFiltered = filteredGyro.current || rateRaw;
      const smooth = 0.35;
      const rateFiltered = {
        alpha: prevFiltered.alpha + (rateRaw.alpha - prevFiltered.alpha) * smooth,
        beta: prevFiltered.beta + (rateRaw.beta - prevFiltered.beta) * smooth,
        gamma: prevFiltered.gamma + (rateRaw.gamma - prevFiltered.gamma) * smooth,
      };
      filteredGyro.current = rateFiltered;
      motionData.current.gyro.push({
        alpha: rateFiltered.alpha,
        beta: rateFiltered.beta,
        gamma: rateFiltered.gamma,
        t: now,
      });
      if (motionData.current.gyro.length > 512) motionData.current.gyro.shift();
      setMotionSupported(true); // Mark as available when data is received
    };

    window.addEventListener('deviceorientation', nextOrientationHandler);
    orientationHandlerRef.current = nextOrientationHandler;
  }, []);

  const startCapture = useCallback(() => {
    const platformInfo = detectPlatformInfo();
    const prevMotionGranted = diagnosticsRef.current.motionPermission === 'granted';
    const prevOrientationGranted = diagnosticsRef.current.orientationPermission === 'granted';

    points.current = [];
    lastPoint.current = null;
    clickHolds.current = [];
    motionData.current = { acc: [], gyro: [] };
    lastMotionTime.current = 0;
    lastOrientationTime.current = 0;
    lastMotionGyroAt.current = 0;
    prevOrientationSample.current = null;
    filteredGyro.current = null;
    filteredAcc.current = null;
    setMotionSupported(false); // Reset until data is received
    diagnosticsRef.current = {
      platform: platformInfo.platform,
      browser: platformInfo.browser,
      hasDeviceMotion: typeof window !== 'undefined' && !!window.DeviceMotionEvent,
      hasDeviceOrientation: typeof window !== 'undefined' && !!window.DeviceOrientationEvent,
      isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
      motionPermission: 'unknown',
      orientationPermission: 'unknown',
      motionEvents: 0,
      orientationEvents: 0,
      touchEvents: 0,
      lastMotionEventAt: null,
      lastOrientationEventAt: null,
      lastTouchEventAt: null,
      captureStartedAt: Date.now(),
    };

    // Remove stale listeners before re-registering (important across retries/samples)
    cleanupMotionListeners();

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      diagnosticsRef.current.motionPermission = 'insecure-context';
      diagnosticsRef.current.orientationPermission = 'insecure-context';
      setActive(true);
      return;
    }

    // Safari/iOS requires a tap gesture for requestPermission().
    // Do not auto-request here; UI should call requestSensorAccess() from a button.
    if (typeof window === 'undefined' || !window.DeviceMotionEvent) {
      diagnosticsRef.current.motionPermission = 'unsupported';
    } else if (prevMotionGranted) {
      diagnosticsRef.current.motionPermission = 'granted';
      registerMotionListener();
    } else if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      diagnosticsRef.current.motionPermission = 'requires-user-gesture';
    } else {
      registerMotionListener();
    }

    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
      diagnosticsRef.current.orientationPermission = 'unsupported';
    } else if (prevOrientationGranted) {
      diagnosticsRef.current.orientationPermission = 'granted';
      registerOrientationListener();
    } else if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      diagnosticsRef.current.orientationPermission = 'requires-user-gesture';
    } else {
      registerOrientationListener();
    }

    setActive(true);
  }, [cleanupMotionListeners, detectPlatformInfo, registerMotionListener, registerOrientationListener]);

  const requestSensorAccess = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    if (!window.isSecureContext) {
      diagnosticsRef.current.motionPermission = 'insecure-context';
      diagnosticsRef.current.orientationPermission = 'insecure-context';
      return false;
    }

    let grantedAny = false;

    if (window.DeviceMotionEvent) {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        diagnosticsRef.current.motionPermission = 'pending';
        try {
          const state = await DeviceMotionEvent.requestPermission();
          if (state === 'granted') {
            diagnosticsRef.current.motionPermission = 'granted';
            registerMotionListener();
            grantedAny = true;
          } else {
            diagnosticsRef.current.motionPermission = 'denied';
          }
        } catch {
          diagnosticsRef.current.motionPermission = 'error';
        }
      } else {
        diagnosticsRef.current.motionPermission = 'granted';
        registerMotionListener();
        grantedAny = true;
      }
    } else {
      diagnosticsRef.current.motionPermission = 'unsupported';
    }

    if (window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        diagnosticsRef.current.orientationPermission = 'pending';
        try {
          const state = await DeviceOrientationEvent.requestPermission();
          if (state === 'granted') {
            diagnosticsRef.current.orientationPermission = 'granted';
            registerOrientationListener();
            grantedAny = true;
          } else {
            diagnosticsRef.current.orientationPermission = 'denied';
          }
        } catch {
          diagnosticsRef.current.orientationPermission = 'error';
        }
      } else {
        diagnosticsRef.current.orientationPermission = 'granted';
        registerOrientationListener();
        grantedAny = true;
      }
    } else {
      diagnosticsRef.current.orientationPermission = 'unsupported';
    }

    return grantedAny;
  }, [registerMotionListener, registerOrientationListener]);

  const reset = useCallback(() => {
    points.current = [];
    lastPoint.current = null;
    clickHolds.current = [];
    motionData.current = { acc: [], gyro: [] };
    lastMotionTime.current = 0;
    lastOrientationTime.current = 0;
    lastMotionGyroAt.current = 0;
    prevOrientationSample.current = null;
    filteredGyro.current = null;
    filteredAcc.current = null;

    cleanupMotionListeners();

    setActive(false);
  }, [cleanupMotionListeners]);

  const extractVector = useCallback(() => {
    const pts = points.current;
    if (pts.length < 5) return null;
    const velocities = pts.map(p => p.velocity);
    const dts = pts.map(p => p.dt);
    const angles = pts.map(p => p.angle);

    const angleDiffs = [];
    let dirChanges = 0;
    for (let i = 1; i < angles.length; i++) {
      let diff = angles[i] - angles[i - 1];
      // Wrap into [-π, π] so left vs right turns are measured correctly
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      angleDiffs.push(diff);
      if (Math.abs(diff) > 0.5) dirChanges++;
    }
    const directionChangeRate = dirChanges / Math.max(angleDiffs.length, 1);

    const absAngleDiffs = angleDiffs.map(a => Math.abs(a));

    // Touch-specific metrics
    const touchPoints = pts.filter(p => p.isTouch);
    const touchPressures = touchPoints.map(p => p.pressure || 0);
    const avgTouchPressure = mean(touchPressures);
    const stdTouchPressure = std(touchPressures);

    // Device motion metrics (gyroscope / accelerometer)
    const accMags = motionData.current.acc.map(a => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z));
    const gyroMags = motionData.current.gyro.map(g => Math.sqrt(g.alpha * g.alpha + g.beta * g.beta + g.gamma * g.gamma));
    // Robust stats reduce spikes and improve score stability across repeated attempts.
    const { mean: avgAccelMag, std: stdAccelMag } = robustMeanStd(accMags, 0.1);
    const { mean: avgGyroMag, std: stdGyroMag } = robustMeanStd(gyroMags, 0.1);

    return {
      // Scalar summaries
      avgVelocity:       mean(velocities),
      // Kept name for backwards compatibility; now truly a std-based measure
      velocityVariance:  std(velocities),
      avgAcceleration:   meanAcceleration(velocities),
      directionChanges:  directionChangeRate,
      avgAngleChange:    mean(absAngleDiffs),
      angleChangeStd:    std(absAngleDiffs),
      avgClickHold:      mean(clickHolds.current),

      // Touch and motion
      avgTouchPressure,
      stdTouchPressure,
      touchPointCount: touchPoints.length,
      avgAccelMag,
      stdAccelMag,
      avgGyroMag,
      stdGyroMag,

      // Raw arrays – richer Gesture DNA for future use
      velocities,
      angleDiffs,
      dts,

      // Normalized patterns – shape of movement independent of speed
      velocitiesZ:  zNormalize(velocities),
      angleDiffsZ:  zNormalize(angleDiffs),
    };
  }, []);

  // Cleanup when the component using this hook unmounts
  useEffect(() => {
    return () => reset();
  }, [reset]);

  const getMotionData = useCallback(() => motionData.current, []);
  const getPoints = useCallback(() => points.current, []);
  const getDiagnostics = useCallback(() => diagnosticsRef.current, []);

  return { onMouseMove, onMouseDown, onMouseUp, onTouchMove, onTouchStart, onTouchEnd, startCapture, requestSensorAccess, reset, extractVector, getMotionData, getPoints, getDiagnostics, motionSupported };
}

// ─── Vector builder (for on-chain hashing only) ───────────────────────────────
export function buildCombinedVector(keystroke, mouse) {
  const kFeatures = [
    norm(keystroke.avgHoldTime, 0, 500),
    norm(keystroke.stdHoldTime, 0, 200),
    norm(keystroke.avgFlightTime, 0, 800),
    norm(keystroke.stdFlightTime, 0, 400),
    norm(keystroke.totalDuration, 0, 15000),
    norm(Math.sqrt(keystroke.rhythmVariance || 0), 0, 100),
    norm(keystroke.errorRate, 0, 0.5),
    0, 0, 0,
    ...padOrTrim((keystroke.holdTimes || []).map(h => norm(h, 0, 500)), 20),
  ];
  const mFeatures = mouse ? [
    norm(mouse.avgVelocity, 0, 5),
    norm(mouse.velocityVariance, 0, 3),
    norm(mouse.avgAcceleration, 0, 2),
    norm(mouse.directionChanges, 0, 1),
    norm(mouse.avgClickHold, 0, 1000),
    norm(mouse.avgTouchPressure || 0, 0, 1),
    norm(mouse.stdTouchPressure || 0, 0, 0.5),
    norm(mouse.touchPointCount || 0, 0, 100),
    norm(mouse.avgAccelMag || 0, 0, 20),
    norm(mouse.stdAccelMag || 0, 0, 10),
    norm(mouse.avgGyroMag || 0, 0, 10),
    norm(mouse.stdGyroMag || 0, 0, 5),
    ...new Array(22).fill(0),
  ] : new Array(34).fill(0);
  return new Float32Array([...kFeatures, ...mFeatures]);
}

// ─── Main similarity function ─────────────────────────────────────────────────
// Takes the rich keystroke objects — not just the flat vectors.
// Returns 0.0–1.0 where 1.0 = identical pattern.
export function cosineSimilarity(
  _liveVec, _enrollVec,          // kept for API compat, not used
  liveK, enrollK,                // keystroke objects — the real input
  liveM, enrollM                 // mouse objects — now actively used when available
) {
  // Fallback to scalar-only comparison if arrays missing (shouldn't happen after fix)
  if (!liveK || !enrollK) {
    console.warn('[VAULTLESS] Missing keystroke objects — falling back to scalar comparison');
    return 0.3; // force fail so it's obvious something is wrong
  }

  const liveHZ   = liveK.holdTimesZ   || zNormalize(liveK.holdTimes   || []);
  const enrollHZ = enrollK.holdTimesZ || zNormalize(enrollK.holdTimes  || []);
  const liveFZ   = liveK.flightTimesZ || zNormalize(liveK.flightTimes  || []);
  const enrollFZ = enrollK.flightTimesZ || zNormalize(enrollK.flightTimes || []);

  // --- Score 1: Z-score pattern match on hold times (WHO you are — key identity) ---
  // Two different people will have different shaped hold-time profiles even at same speed
  const holdPatternScore = pearsonCorrelation(liveHZ, enrollHZ);

  // --- Score 2: Z-score pattern match on flight times (RHYTHM between keys) ---
  const flightPatternScore = pearsonCorrelation(liveFZ, enrollFZ);

  // --- Score 3: Hold time ratio consistency (speed-normalized key-by-key match) ---
  // Checks if each individual key hold time is proportionally similar
  const holdRatioScore = ratioSimilarity(liveK.holdTimes || [], enrollK.holdTimes || []);

  // --- Score 4: Total duration ratio (overall speed similarity) ---
  const durScore = safeDivRatio(liveK.totalDuration, enrollK.totalDuration);

  // Convert correlations from [-1, 1] to [0, 1]
  const hpNorm  = (holdPatternScore   + 1) / 2;
  const fpNorm  = (flightPatternScore + 1) / 2;

  // Keystroke-only base score
  let keyScore = (
    hpNorm        * 0.40 +  // shape of hold pattern
    fpNorm        * 0.30 +  // shape of flight/rhythm pattern
    holdRatioScore * 0.20 + // per-key hold ratio consistency
    durScore      * 0.10    // overall speed match
  );

  // Mouse / gesture component — only if we have enrollment data for it
  let mouseScore = null;
  if (liveM && enrollM) {
    const liveVelZ   = liveM.velocitiesZ   || zNormalize(liveM.velocities   || []);
    const enrollVelZ = enrollM.velocitiesZ || zNormalize(enrollM.velocities || []);
    const liveAngZ   = liveM.angleDiffsZ   || zNormalize(liveM.angleDiffs   || []);
    const enrollAngZ = enrollM.angleDiffsZ || zNormalize(enrollM.angleDiffs || []);

    const velPattern   = pearsonCorrelation(liveVelZ, enrollVelZ);
    const anglePattern = pearsonCorrelation(liveAngZ, enrollAngZ);

    const clickRatio   = ratioSimilarity(
      [liveM.avgClickHold || 0],
      [enrollM.avgClickHold || 0]
    );

    const velNorm   = (velPattern + 1) / 2;
    const angleNorm = (anglePattern + 1) / 2;

    mouseScore = (
      velNorm     * 0.45 + // speed profile
      angleNorm   * 0.35 + // turning / direction habits
      clickRatio  * 0.20   // click-down behaviour
    );
    // Add mobile/touch-specific features if both enrollment and live data have them.
    const hasTouchData = (liveM.touchPointCount || 0) > 5 && (enrollM.touchPointCount || 0) > 5;
    const hasMotionData = (liveM.avgGyroMag || 0) > 0 && (enrollM.avgGyroMag || 0) > 0;
    if (hasTouchData || hasMotionData) {
      const touchPressureScore = ratioSimilarity(
        [liveM.avgTouchPressure || 0],
        [enrollM.avgTouchPressure || 0]
      );
      const gyroScore = ratioSimilarity(
        [liveM.stdGyroMag || 0],
        [enrollM.stdGyroMag || 0]
      );

      const extraScore = (touchPressureScore * 0.5) + (gyroScore * 0.5);
      mouseScore = mouseScore * 0.90 + extraScore * 0.10;
    }
  }

  // Mix in mouse/gesture (including mobile touch + motion) behavior when available.
  // Keystrokes remain the dominant signal, keeping scoring stable for existing enrollments.
  const score = mouseScore != null
    ? keyScore * 0.85 + mouseScore * 0.15
    : keyScore;

  console.log('[VAULTLESS AUTH DEBUG]');
  console.log('  Hold pattern (Pearson):', holdPatternScore.toFixed(3), '→ normalized:', hpNorm.toFixed(3));
  console.log('  Flight pattern (Pearson):', flightPatternScore.toFixed(3), '→ normalized:', fpNorm.toFixed(3));
  console.log('  Hold ratio score:', holdRatioScore.toFixed(3));
  console.log('  Duration score:', durScore.toFixed(3));
  if (mouseScore != null) {
    console.log('  Mouse score:', mouseScore.toFixed(3));
  }
  console.log('  FINAL SCORE:', score.toFixed(3), '→ CLASSIFICATION:', classifyScore(score));
  console.log('  Live holdTimes:', liveK.holdTimes?.slice(0,5).map(n=>n.toFixed(0)));
  console.log('  Enroll holdTimes:', enrollK.holdTimes?.slice(0,5).map(n=>n.toFixed(0)));
  console.log('  Live flightTimes:', liveK.flightTimes?.slice(0,5).map(n=>n.toFixed(0)));
  console.log('  Enroll flightTimes:', enrollK.flightTimes?.slice(0,5).map(n=>n.toFixed(0)));

  return Math.max(0, Math.min(1, score));
}

export function detectStress(liveK, enrollK) {
  if (!liveK || !enrollK) return false;
  const baseVariance = enrollK.rhythmVariance || 1;
  const liveVariance = liveK.rhythmVariance   || 0;
  return liveVariance > baseVariance * 2.5;
}

export function classifyScore(score, isStress = false) {
  // Match the visual thresholds and keep duress narrow:
  // - >= 0.70                    → authenticated
  // - 0.60–0.70 with stress true → duress
  // - everything else            → rejected
  if (score >= 0.70) return 'authenticated';
  if (score >= 0.60 && score < 0.70 && isStress) return 'duress';
  return 'rejected';
}

// ─── Statistical helpers ──────────────────────────────────────────────────────

// Pearson correlation: measures similarity of shape/pattern, ignores scale
// Returns -1 (opposite) to +1 (identical pattern)
function pearsonCorrelation(a, b) {
  const len = Math.min(a.length, b.length);
  if (len < 3) return 0;
  const as = a.slice(0, len);
  const bs = b.slice(0, len);
  const ma = mean(as), mb = mean(bs);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < len; i++) {
    const ai = as[i] - ma;
    const bi = bs[i] - mb;
    num += ai * bi;
    da  += ai * ai;
    db  += bi * bi;
  }
  if (da === 0 || db === 0) return 0;
  return num / Math.sqrt(da * db);
}

function zNormalize(arr) {
  if (!arr || arr.length < 2) return arr || [];
  const m = mean(arr);
  const s = std(arr);
  if (s === 0) return arr.map(() => 0);
  return arr.map(v => (v - m) / s);
}

// Ratio similarity: how close is each pair of values relative to each other
// [100, 200, 150] vs [110, 210, 160] → high (same proportions)
// [100, 200, 150] vs [200, 100, 150] → low (different per-key profile)
function ratioSimilarity(a, b) {
  const len = Math.min(a.length, b.length, 16);
  if (len === 0) return 0.5;
  let total = 0;
  for (let i = 0; i < len; i++) {
    const ai = Math.max(a[i], 1);
    const bi = Math.max(b[i], 1);
    total += Math.min(ai, bi) / Math.max(ai, bi);
  }
  return total / len;
}

function safeDivRatio(a, b) {
  if (!a || !b || a === 0 || b === 0) return 0.5;
  return Math.min(a, b) / Math.max(a, b);
}

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr) {
  if (!arr || arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length;
}

function std(arr) {
  return Math.sqrt(variance(arr));
}

function meanAcceleration(velocities) {
  if (velocities.length < 2) return 0;
  const accels = [];
  for (let i = 1; i < velocities.length; i++) {
    accels.push(Math.abs(velocities[i] - velocities[i - 1]));
  }
  return mean(accels);
}

function norm(val, min, max) {
  if (max === min) return 0;
  return Math.min(1, Math.max(0, (val - min) / (max - min)));
}

function padOrTrim(arr, len) {
  if (arr.length >= len) return arr.slice(0, len);
  return [...arr, ...new Array(len - arr.length).fill(0)];
}

function clampFinite(value, min, max) {
  if (!Number.isFinite(value)) return 0;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function wrapAngleDeg(diff) {
  let d = diff;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function robustMeanStd(arr, trimRatio = 0.1) {
  if (!arr || arr.length === 0) return { mean: 0, std: 0 };
  if (arr.length < 5) return { mean: mean(arr), std: std(arr) };

  const sorted = [...arr].sort((a, b) => a - b);
  const trim = Math.floor(sorted.length * trimRatio);
  const core = sorted.slice(trim, sorted.length - trim);
  const safe = core.length ? core : sorted;
  return { mean: mean(safe), std: std(safe) };
}
