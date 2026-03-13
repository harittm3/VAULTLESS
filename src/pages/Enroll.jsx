import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useKeystrokeDNA, useMouseDNA, buildCombinedVector } from '../hooks/behaviouralEngine';
import { useVaultless } from '../lib/VaultlessContext';
import { getContract, getSigner, vectorToHash, CONTRACT_ADDRESS, DEMO_MODE } from '../lib/ethereum';
import { ethers } from 'ethers';

const PHRASE = 'Secure my account';
const REQUIRED_SAMPLES = 3;

export default function Enroll() {
  const navigate = useNavigate();
  const { setEnrollmentVector, setEnrollmentKeystroke, setEnrollmentMouse, setWalletAddress, setIsEnrolled, addEtherscanLink, demoMode } = useVaultless();
  const showSensorDebug = import.meta.env.VITE_SHOW_SENSOR_DEBUG === 'true';

  const [phase, setPhase] = useState('intro'); // intro | capturing | processing | done | error
  const [sampleCount, setSampleCount] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [samples, setSamples] = useState([]);
  const [graphData, setGraphData] = useState([]);
  const [gyroGraphData, setGyroGraphData] = useState([]);
  const [touchGraphData, setTouchGraphData] = useState([]);
  const [motionAvailable, setMotionAvailable] = useState(false);
  const [sensorDiag, setSensorDiag] = useState({
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
  const [sensorRequesting, setSensorRequesting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [walletAddr, setWalletAddr] = useState(null);
  const inputRef = useRef(null);

  const keystroke = useKeystrokeDNA();
  const mouse = useMouseDNA();

  useEffect(() => {
    if (phase === 'capturing') {
      inputRef.current?.focus();
      mouse.startCapture();
    }
  }, [phase, sampleCount, mouse.startCapture]);

  useEffect(() => {
    if (phase !== 'capturing') return;
    const onTouchStartWindow = (e) => mouse.onTouchStart(e);
    const onTouchMoveWindow = (e) => mouse.onTouchMove(e);
    const onTouchEndWindow = () => mouse.onTouchEnd();
    window.addEventListener('touchstart', onTouchStartWindow, { passive: true });
    window.addEventListener('touchmove', onTouchMoveWindow, { passive: true });
    window.addEventListener('touchend', onTouchEndWindow, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStartWindow);
      window.removeEventListener('touchmove', onTouchMoveWindow);
      window.removeEventListener('touchend', onTouchEndWindow);
    };
  }, [phase, mouse.onTouchStart, mouse.onTouchMove, mouse.onTouchEnd]);

  useEffect(() => {
    setMotionAvailable(mouse.motionSupported);
  }, [mouse.motionSupported]);

  useEffect(() => {
    if (phase !== 'capturing') return;
    const interval = setInterval(() => {
      setSensorDiag({ ...mouse.getDiagnostics() });
    }, 250);
    return () => clearInterval(interval);
  }, [phase, mouse.getDiagnostics]);

  // Build live graph from keystroke events
  useEffect(() => {
    if (keystroke.events.length > 0) {
      const data = keystroke.events.slice(-30).map((e, i) => ({
        i,
        hold: Math.min(e.holdTime, 500),
        flight: Math.min(e.flightTime, 800),
      }));
      setGraphData(data);
    }
  }, [keystroke.events]);

  // Build live gyro graph
  useEffect(() => {
    const interval = setInterval(() => {
      const motion = mouse.getMotionData();
      if (motion.gyro.length > 0) {
        const data = motion.gyro.slice(-30).map((g, i) => ({
          i,
          alpha: Math.abs(g.alpha),
          beta: Math.abs(g.beta),
          gamma: Math.abs(g.gamma),
          mag: Math.sqrt(g.alpha * g.alpha + g.beta * g.beta + g.gamma * g.gamma),
        }));
        setGyroGraphData(data);
      }
    }, 200); // Update every 200ms
    return () => clearInterval(interval);
  }, [mouse.getMotionData]);

  // Build live touch graph
  useEffect(() => {
    const interval = setInterval(() => {
      const pts = mouse.getPoints();
      const touchPts = pts.filter(p => p.isTouch).slice(-30);
      if (touchPts.length > 0) {
        const data = touchPts.map((p, i) => ({
          i,
          pressure: p.pressure || 0,
          velocity: p.velocity || 0,
        }));
        setTouchGraphData(data);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [mouse.getPoints]);

  const connectWallet = async () => {
    try {
      if (demoMode) {
        setWalletAddr('0xDEMO...1234');
        setWalletAddress('0xDEMO...1234');
        setPhase('capturing');
        return;
      }
      const signer = await getSigner();
      const addr = await signer.getAddress();
      setWalletAddr(addr);
      setWalletAddress(addr);
      setPhase('capturing');
    } catch (e) {
      setStatusMsg('MetaMask connection failed: ' + e.message);
    }
  };

  const handleTyping = (e) => {
    setCurrentInput(e.target.value);
  };

  const requestSensors = async () => {
    setSensorRequesting(true);
    try {
      const granted = await mouse.requestSensorAccess();
      if (!granted) {
        setStatusMsg('Could not enable motion sensors. You can continue, but mobile protection will be reduced.');
      } else {
        setStatusMsg('Motion sensors enabled.');
      }
    } finally {
      setSensorRequesting(false);
    }
  };

  const motionNeedsGesture = sensorDiag.motionPermission === 'requires-user-gesture';
  const orientationNeedsGesture = sensorDiag.orientationPermission === 'requires-user-gesture';
  const insecureContext =
    sensorDiag.motionPermission === 'insecure-context' ||
    sensorDiag.orientationPermission === 'insecure-context';
  const sensorDenied =
    sensorDiag.motionPermission === 'denied' ||
    sensorDiag.orientationPermission === 'denied' ||
    sensorDiag.motionPermission === 'error' ||
    sensorDiag.orientationPermission === 'error';
  const androidChromeNeedsManualEnable =
    sensorDiag.platform === 'android' &&
    sensorDiag.browser === 'chrome' &&
    sensorDiag.hasDeviceMotion &&
    !motionAvailable;
  const showEnableSensors = motionNeedsGesture || orientationNeedsGesture || androidChromeNeedsManualEnable;
  const sensorsEnabled = motionAvailable || sensorDiag.motionPermission === 'granted' || sensorDiag.orientationPermission === 'granted';
  const sensorActivityLive = (sensorDiag.motionEvents || 0) > 0 || (sensorDiag.orientationEvents || 0) > 0;
  const sensorHealthText = !sensorDiag.isSecureContext
    ? 'Secure connection required'
    : sensorsEnabled
      ? 'Connected'
      : 'Limited';

  const sensorBlockedHint = insecureContext
    ? 'Motion sensors need a secure connection. Open the app over HTTPS and try again.'
    : sensorDiag.platform === 'android' && sensorDiag.browser === 'chrome'
      ? 'Sensor access is blocked. In Chrome Android, allow Motion sensors in Site settings, then reload.'
      : 'Sensor access is blocked. Enable motion/orientation access in browser settings, then reload.';

  const handleKeyUp = (e) => {
    keystroke.onKeyUp(e);
    if (e.key === 'Enter' && currentInput.trim() === PHRASE) {
      captureComplete();
    }
  };

  const captureComplete = () => {
    const kData = keystroke.extractVector(PHRASE);
    const mData = mouse.extractVector();

    if (!kData) {
      setStatusMsg('Not enough data captured. Try typing more naturally.');
      return;
    }

    const vector = buildCombinedVector(kData, mData);
    const newSamples = [...samples, { vector, keystroke: kData, mouse: mData }];
    setSamples(newSamples);

    const newCount = sampleCount + 1;
    setSampleCount(newCount);

    if (newCount < REQUIRED_SAMPLES) {
      setCurrentInput('');
      keystroke.reset();
      mouse.reset();
      mouse.startCapture();
      setStatusMsg(`Sample ${newCount}/${REQUIRED_SAMPLES} captured. Type again.`);
      inputRef.current?.focus();
    } else {
      // Average all samples
      commitToChain(newSamples);
    }
  };

  const avgVector = (sampleList) => {
    const len = sampleList[0].vector.length;
    const avg = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      avg[i] = sampleList.reduce((sum, s) => sum + s.vector[i], 0) / sampleList.length;
    }
    return avg;
  };

  // Average all scalar fields AND array fields (holdTimes, flightTimes) across samples
  const averageKeystroke = (samples) => {
    const scalar = (key) => samples.reduce((sum, s) => sum + (s[key] || 0), 0) / samples.length;
    const avgArr = (key) => {
      const maxLen = Math.max(...samples.map(s => (s[key] || []).length));
      return Array.from({ length: maxLen }, (_, i) => {
        const vals = samples.map(s => (s[key] || [])[i]).filter(v => v !== undefined);
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      });
    };
    
    // Helper: Z-score normalize an array
    const zNormalize = (arr) => {
      if (!arr || arr.length < 2) return arr || [];
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / arr.length;
      const std = Math.sqrt(variance);
      if (std === 0) return arr.map(() => 0);
      return arr.map(v => (v - mean) / std);
    };
    
    const holdTimes = avgArr('holdTimes');
    const flightTimes = avgArr('flightTimes');
    
    return {
      avgHoldTime:    scalar('avgHoldTime'),
      stdHoldTime:    scalar('stdHoldTime'),
      avgFlightTime:  scalar('avgFlightTime'),
      stdFlightTime:  scalar('stdFlightTime'),
      totalDuration:  scalar('totalDuration'),
      rhythmVariance: scalar('rhythmVariance'),
      errorRate:      scalar('errorRate'),
      holdTimes:      holdTimes,
      flightTimes:    flightTimes,
      holdTimesZ:     zNormalize(holdTimes),
      flightTimesZ:   zNormalize(flightTimes),
    };
  };

  const averageMouse = (samples) => {
    if (!samples.length) return null;
    const scalar = (key) => samples.reduce((sum, s) => sum + (s?.[key] ?? 0), 0) / samples.length;
    const avgArr = (key) => {
      const maxLen = Math.max(...samples.map(s => (s?.[key] || []).length));
      if (maxLen === 0) return [];
      return Array.from({ length: maxLen }, (_, i) => {
        const vals = samples
          .map(s => (s?.[key] || [])[i])
          .filter(v => v !== undefined);
        if (!vals.length) return 0;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      });
    };

    const velocities   = avgArr('velocities');
    const angleDiffs   = avgArr('angleDiffs');
    const dts          = avgArr('dts');

    const zNormalize = (arr) => {
      if (!arr || arr.length < 2) return arr || [];
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / arr.length;
      const std = Math.sqrt(variance);
      if (std === 0) return arr.map(() => 0);
      return arr.map(v => (v - mean) / std);
    };

    return {
      avgVelocity:       scalar('avgVelocity'),
      velocityVariance:  scalar('velocityVariance'),
      avgAcceleration:   scalar('avgAcceleration'),
      directionChanges:  scalar('directionChanges'),
      avgAngleChange:    scalar('avgAngleChange'),
      angleChangeStd:    scalar('angleChangeStd'),
      avgClickHold:      scalar('avgClickHold'),
      avgTouchPressure:  scalar('avgTouchPressure'),
      stdTouchPressure:  scalar('stdTouchPressure'),
      touchPointCount:   scalar('touchPointCount'),
      avgAccelMag:       scalar('avgAccelMag'),
      stdAccelMag:       scalar('stdAccelMag'),
      avgGyroMag:        scalar('avgGyroMag'),
      stdGyroMag:        scalar('stdGyroMag'),
      velocities,
      angleDiffs,
      dts,
      velocitiesZ: zNormalize(velocities),
      angleDiffsZ: zNormalize(angleDiffs),
    };
  };

  const commitToChain = async (sampleList) => {
    setPhase('processing');
    setStatusMsg('Averaging 3 samples into Behavioural DNA...');

    const finalVector   = avgVector(sampleList);
    const avgKeystroke  = averageKeystroke(sampleList.map(s => s.keystroke));
    const avgMouse      = averageMouse(sampleList.map(s => s.mouse).filter(Boolean));
    const hash = vectorToHash(finalVector);

    setEnrollmentVector(finalVector);
    setEnrollmentKeystroke(avgKeystroke);
    setEnrollmentMouse(avgMouse || null);

    try {
      if (demoMode) {
        setStatusMsg('Committing hash to Ethereum (demo mode)...');
        await new Promise(r => setTimeout(r, 2000));
        const fakeTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setTxHash(fakeTx);
        addEtherscanLink('Registered', fakeTx);
        setIsEnrolled(true);
        setPhase('done');
        return;
      }

      setStatusMsg('Requesting MetaMask signature...');
      const signer = await getSigner();
      const contract = await getContract(signer);
      const tx = await contract.register(hash);
      setStatusMsg('Transaction submitted. Waiting for confirmation...');
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      addEtherscanLink('Registered', receipt.hash);
      setIsEnrolled(true);
      setPhase('done');
    } catch (e) {
      setStatusMsg('Error: ' + e.message);
      setPhase('error');
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate('/')}>← VAULTLESS</button>
        <div style={styles.step}>ENROLLMENT</div>
      </div>

      <div style={styles.container}>
        {phase === 'intro' && (
          <div style={styles.card}>
            <h2 style={styles.title}>Enroll Your Identity</h2>
            <p style={styles.desc}>
              You'll type <strong style={{ color: '#00ff88' }}>"{PHRASE}"</strong> three times.<br />
              Your keystroke rhythm becomes your cryptographic identity.
            </p>
            <ul style={styles.steps}>
              <li>Type naturally — don't try to be consistent</li>
              <li>Your behavioural DNA is captured, never stored</li>
              <li>The hash is committed permanently to Ethereum</li>
            </ul>
            <button style={styles.cta} onClick={connectWallet}>
              {demoMode ? 'Start Enrollment (Demo)' : 'Connect MetaMask & Begin'}
            </button>
          </div>
        )}

        {(phase === 'capturing') && (
          <div style={styles.card}>
            <div style={styles.sampleBadge}>
              Sample {sampleCount + 1} of {REQUIRED_SAMPLES}
            </div>
            <h2 style={styles.title}>Type the phrase</h2>
            <div style={styles.phrase}>"{PHRASE}"</div>
            <p style={styles.hint}>Press Enter when done</p>

            <div style={styles.sensorInfoCard}>
              <div style={styles.sensorInfoText}>
                Motion Sensors: <span style={{ color: sensorsEnabled ? '#00ff88' : '#ffb366' }}>{sensorsEnabled ? 'Enabled' : 'Optional'}</span>
              </div>
              {!sensorsEnabled && (
                <div style={styles.sensorInfoSubtext}>
                  Enable for stronger mobile protection.
                </div>
              )}
            </div>

            {showEnableSensors && (
              <div style={styles.sensorActionBox}>
                <div style={styles.sensorActionText}>
                  Tap to enable motion sensors on this device.
                </div>
                <button
                  style={styles.sensorEnableBtn}
                  onClick={requestSensors}
                  disabled={sensorRequesting}
                >
                  {sensorRequesting ? 'Enabling Sensors...' : 'Enable Sensors'}
                </button>
              </div>
            )}

            {sensorDenied && (
              <div style={styles.sensorWarning}>
                {sensorBlockedHint}
              </div>
            )}

            <input
              ref={inputRef}
              style={styles.typeInput}
              value={currentInput}
              onChange={handleTyping}
              onKeyDown={keystroke.onKeyDown}
              onKeyUp={handleKeyUp}
              onMouseMove={mouse.onMouseMove}
              onMouseDown={mouse.onMouseDown}
              onMouseUp={mouse.onMouseUp}
              onTouchStart={mouse.onTouchStart}
              onTouchMove={mouse.onTouchMove}
              onTouchEnd={mouse.onTouchEnd}
              placeholder="Start typing..."
              autoComplete="off"
              spellCheck={false}
            />

            {graphData.length > 2 && (
              <div style={styles.graphContainer}>
                <div style={styles.graphLabel}>KEYSTROKE EKG — LIVE</div>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={graphData}>
                    <Line type="monotone" dataKey="hold" stroke="#00ff88" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="flight" stroke="#0088ff" strokeWidth={1} dot={false} isAnimationActive={false} />
                    <XAxis hide />
                    <YAxis hide />
                  </LineChart>
                </ResponsiveContainer>
                <div style={styles.graphLegend}>
                  <span style={{ color: '#00ff88' }}>■ Hold Time</span>
                  <span style={{ color: '#0088ff' }}>■ Flight Time</span>
                </div>
              </div>
            )}

            {gyroGraphData.length > 0 && (
              <div style={styles.graphContainer}>
                <div style={styles.graphLabel}>GYROSCOPE ACTIVITY — LIVE</div>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={gyroGraphData}>
                    <Line type="monotone" dataKey="mag" stroke="#ff6600" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <XAxis hide />
                    <YAxis hide />
                  </LineChart>
                </ResponsiveContainer>
                <div style={styles.graphLegend}>
                  <span style={{ color: '#ff6600' }}>■ Gyro Magnitude</span>
                </div>
              </div>
            )}

            {!motionAvailable && gyroGraphData.length === 0 && (
              <div style={styles.graphContainer}>
                <div style={styles.graphLabel}>GYROSCOPE ACTIVITY — NOT AVAILABLE</div>
                <div style={{ color: '#666', fontSize: 12, padding: '20px' }}>
                  Motion sensors not accessible. Grant permission or use a compatible device for enhanced security.
                </div>
              </div>
            )}

            {showSensorDebug && touchGraphData.length > 0 && (
              <div style={styles.graphContainer}>
                <div style={styles.graphLabel}>TOUCH PRESSURE — LIVE</div>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={touchGraphData}>
                    <Line type="monotone" dataKey="pressure" stroke="#ff00ff" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <XAxis hide />
                    <YAxis hide />
                  </LineChart>
                </ResponsiveContainer>
                <div style={styles.graphLegend}>
                  <span style={{ color: '#ff00ff' }}>■ Touch Pressure</span>
                </div>
              </div>
            )}

            <div style={styles.sensorMiniCard}>
              <div style={styles.sensorMiniTitle}>SENSOR STATUS</div>
              <div style={styles.sensorMiniRow}>
                <span style={styles.sensorMiniKey}>Health</span>
                <span style={styles.sensorMiniVal}>{sensorHealthText}</span>
              </div>
              <div style={styles.sensorMiniRow}>
                <span style={styles.sensorMiniKey}>Permissions</span>
                <span style={styles.sensorMiniVal}>{sensorsEnabled ? 'Granted' : 'Not granted'}</span>
              </div>
              <div style={styles.sensorMiniRow}>
                <span style={styles.sensorMiniKey}>Gyro Activity</span>
                <span style={styles.sensorMiniVal}>{sensorActivityLive ? 'Live' : 'Waiting for movement'}</span>
              </div>
            </div>

            {statusMsg && <div style={styles.status}>{statusMsg}</div>}

            {currentInput === PHRASE && (
              <button style={styles.ctaSmall} onClick={captureComplete}>
                Capture Sample {sampleCount + 1} →
              </button>
            )}
          </div>
        )}

        {phase === 'processing' && (
          <div style={styles.card}>
            <div style={styles.spinner}>⬡</div>
            <h2 style={styles.title}>Committing to Ethereum</h2>
            <p style={styles.status}>{statusMsg}</p>
            {walletAddr && <div style={styles.addr}>{walletAddr}</div>}
          </div>
        )}

        {phase === 'done' && (
          <div style={styles.card}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.title}>Identity Enrolled</h2>
            <p style={styles.desc}>Your Behavioural DNA is now permanent on Ethereum.</p>
            {txHash && (
              <a
                style={styles.etherscanLink}
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View on Etherscan ↗
              </a>
            )}
            <div style={styles.actions}>
              <button style={styles.cta} onClick={() => navigate('/auth')}>
                Authenticate Now →
              </button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div style={styles.card}>
            <h2 style={{ ...styles.title, color: '#ff4444' }}>Something went wrong</h2>
            <p style={styles.status}>{statusMsg}</p>
            <button style={styles.cta} onClick={() => { setPhase('intro'); setSampleCount(0); setSamples([]); }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  root: { minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: "'Courier New', monospace" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', borderBottom: '1px solid #111' },
  back: { background: 'none', border: 'none', color: '#00ff88', cursor: 'pointer', fontSize: 13, letterSpacing: 1 },
  step: { color: '#444', fontSize: 11, letterSpacing: 3 },
  container: { display: 'flex', justifyContent: 'center', padding: '60px 24px' },
  card: { width: '100%', maxWidth: 560, background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 12, padding: '48px 40px', textAlign: 'center' },
  title: { fontSize: 28, fontWeight: 300, margin: '0 0 16px', fontFamily: 'Georgia, serif' },
  desc: { color: '#666', lineHeight: 1.8, marginBottom: 32 },
  phrase: { fontSize: 22, color: '#00ff88', margin: '24px 0', letterSpacing: 1 },
  hint: { color: '#444', fontSize: 12, marginBottom: 24 },
  steps: { textAlign: 'left', color: '#555', fontSize: 13, lineHeight: 2.2, marginBottom: 40, paddingLeft: 20 },
  cta: { background: '#00ff88', color: '#000', border: 'none', padding: '14px 32px', fontSize: 13, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', borderRadius: 4, fontFamily: "'Courier New', monospace" },
  ctaSmall: { background: '#00ff88', color: '#000', border: 'none', padding: '10px 24px', fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: 4, marginTop: 16, letterSpacing: 1, fontFamily: "'Courier New', monospace" },
  sensorInfoCard: { marginBottom: 16, background: '#0b0f0b', border: '1px solid #1e2a1e', borderRadius: 6, padding: '10px 12px', textAlign: 'left' },
  sensorInfoText: { color: '#9fb89f', fontSize: 12 },
  sensorInfoSubtext: { color: '#6f7f6f', fontSize: 11, marginTop: 4 },
  sensorActionBox: { marginBottom: 16, background: '#0f1a12', border: '1px solid #1f3d2a', borderRadius: 6, padding: '10px 12px' },
  sensorActionText: { color: '#8ed8ae', fontSize: 12, marginBottom: 8 },
  sensorEnableBtn: { background: '#00ff88', color: '#000', border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: "'Courier New', monospace" },
  sensorWarning: { marginBottom: 16, background: '#2a120f', border: '1px solid #5c2a23', borderRadius: 6, padding: '10px 12px', color: '#ffb09f', fontSize: 12, textAlign: 'left', lineHeight: 1.4 },
  typeInput: { width: '100%', padding: '16px', background: '#111', border: '1px solid #00ff8844', borderRadius: 6, color: '#00ff88', fontSize: 18, textAlign: 'center', outline: 'none', boxSizing: 'border-box', letterSpacing: 2, fontFamily: "'Courier New', monospace" },
  graphContainer: { marginTop: 32, background: '#060606', border: '1px solid #111', borderRadius: 8, padding: '16px' },
  graphLabel: { color: '#333', fontSize: 10, letterSpacing: 3, marginBottom: 8 },
  graphLegend: { display: 'flex', gap: 20, justifyContent: 'center', fontSize: 11, marginTop: 8 },
  sensorMiniCard: { marginTop: 20, background: '#090c09', border: '1px solid #1a2a1e', borderRadius: 8, padding: '12px 14px', textAlign: 'left' },
  sensorMiniTitle: { color: '#00ff88', fontSize: 10, letterSpacing: 2, marginBottom: 8, fontWeight: 700 },
  sensorMiniRow: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, marginBottom: 4 },
  sensorMiniKey: { color: '#6d7d6d' },
  sensorMiniVal: { color: '#c9ffde' },
  sampleBadge: { background: '#00ff8822', border: '1px solid #00ff8844', color: '#00ff88', display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 11, letterSpacing: 2, marginBottom: 24 },
  status: { color: '#666', fontSize: 13, margin: '16px 0' },
  addr: { color: '#333', fontSize: 11, marginTop: 8, wordBreak: 'break-all' },
  spinner: { fontSize: 48, color: '#00ff88', animation: 'spin 2s linear infinite', marginBottom: 24 },
  successIcon: { fontSize: 56, color: '#00ff88', marginBottom: 16 },
  etherscanLink: { color: '#00ff88', fontSize: 12, display: 'block', marginBottom: 32 },
  actions: { display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 },
};
