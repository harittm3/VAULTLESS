// ============================================================
// FILE: src/pages/Dashboard.jsx
// ============================================================
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageShell from '../components/PageShell.jsx'
import DataStream from '../components/DataStream.jsx'
import { useVaultless } from '../lib/VaultlessContext.jsx'
import { listenToEvents, getEtherscanLink } from '../lib/ethereum.js'

// ── Fake emails ───────────────────────────────────────────────
const EMAILS = [
  { id: 1, sender: 'Google', subject: 'Security alert: new sign-in', preview: 'A new sign-in to vaultless@gmail.com was detected from a secured biometric session...', time: '2:31 PM', unread: true },
  { id: 2, sender: 'Ethereum Foundation', subject: 'Devcon 2026 registration open', preview: 'We are pleased to announce that early registration for Devcon 2026 is now available...', time: '11:14 AM', unread: true },
  { id: 3, sender: 'Alchemy', subject: 'Your API usage report', preview: 'This week you made 1,247 RPC calls to Ethereum Sepolia. View your full usage dashboard...', time: 'Yesterday', unread: false },
  { id: 4, sender: 'GitHub', subject: 'Action required: verify your identity', preview: 'Someone attempted to access your account from an unfamiliar device. Please verify...', time: 'Mon', unread: false },
  { id: 5, sender: 'MetaMask', subject: 'You received 0.05 ETH', preview: 'Transaction confirmed on Sepolia. Your new balance is 1.337 ETH. View on Etherscan...', time: 'Sun', unread: false },
]

// ── Sidebar icons ─────────────────────────────────────────────
function SidebarIcon({ label, children, active }) {
  const [hover, setHover] = useState(false)
  return (
    <div className="relative group">
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all"
        style={{
          background: active ? 'rgba(0,255,136,0.15)' : hover ? 'rgba(0,255,136,0.08)' : 'transparent',
          color: active || hover ? '#00ff88' : '#4a4a5a',
        }}
      >
        {children}
      </div>
      {hover && (
        <div
          className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs whitespace-nowrap z-50 font-['Inter']"
          style={{ background: '#141418', border: '1px solid rgba(0,255,136,0.2)', color: '#e8e8f0' }}
        >
          {label}
        </div>
      )}
    </div>
  )
}

// ── Event dot color ───────────────────────────────────────────
function eventColor(event) {
  if (event === 'AuthSuccess' || event === 'Registered') return '#00ff88'
  if (event === 'DuressActivated') return '#ff6b35'
  if (event === 'AuthFailed') return '#ff2d55'
  return '#4a4a5a'
}

function timeAgo(ts) {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
}

export default function Dashboard({ isGhost = false }) {
  const { walletAddress, enrollmentHash, lastScore, txHistory, addTxEvent } = useVaultless()
  const [selectedEmail, setSelectedEmail] = useState(null)

  useEffect(() => {
    const cleanup = listenToEvents((event) => {
      addTxEvent(event)
    })
    return cleanup
  }, [addTxEvent])

  const truncate = (str, len = 8) => str ? `${str.slice(0, len + 2)}...${str.slice(-4)}` : '—'
  const scoreColor = !lastScore ? '#4a4a5a' : lastScore > 0.85 ? '#00ff88' : lastScore > 0.55 ? '#ff6b35' : '#ff2d55'

  return (
    <PageShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex h-screen overflow-hidden"
      >
        {/* ── SIDEBAR ───────────────────────────────────────── */}
        <div
          className="w-16 flex flex-col items-center py-4 gap-2 flex-shrink-0"
          style={{ background: 'rgba(5,5,8,0.95)', borderRight: '1px solid rgba(0,255,136,0.06)' }}
        >
          <SidebarIcon label="Compose">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 5H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-7" /><path d="M17 3l4 4-9.5 9.5H8v-3.5L17 3z" />
            </svg>
          </SidebarIcon>
          <SidebarIcon label="Inbox" active>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /><path d="M4 10h16" />
            </svg>
          </SidebarIcon>
          <SidebarIcon label="Starred">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </SidebarIcon>
          <SidebarIcon label="Sent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </SidebarIcon>
          <SidebarIcon label="Drafts">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M12 18v-6M9 15h6" />
            </svg>
          </SidebarIcon>
          <SidebarIcon label="Trash">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            </svg>
          </SidebarIcon>

          <div className="flex-1" />
          {/* Wallet avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-['JetBrains_Mono'] text-xs font-bold cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.8)', border: '2px solid #00ff88', color: '#00ff88', boxShadow: '0 0 12px rgba(0,255,136,0.3)' }}
            title={walletAddress || 'No wallet'}
          >
            {walletAddress ? walletAddress.slice(2, 6).toUpperCase() : 'V'}
          </div>
        </div>

        {/* ── EMAIL LIST ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'rgba(8,8,10,0.95)' }}>
          {/* Search bar */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(0,255,136,0.06)' }}
          >
            <div
              className="flex-1 mr-4 flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a4a5a" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <span className="text-[#4a4a5a] text-sm font-['Inter']">Search in mail</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ color: '#4a4a5a' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ color: '#4a4a5a' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-['JetBrains_Mono'] text-xs font-bold"
                style={{ background: '#00ff88', color: '#000' }}
              >
                V
              </div>
            </div>
          </div>

          {/* Email rows */}
          <div className="flex-1 overflow-y-auto">
            {EMAILS.map(email => (
              <motion.div
                key={email.id}
                whileHover={{ background: 'rgba(0,255,136,0.02)' }}
                onClick={() => setSelectedEmail(selectedEmail?.id === email.id ? null : email)}
                className="flex items-start gap-4 px-4 py-3 cursor-pointer transition-colors"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: email.unread ? 'rgba(255,255,255,0.01)' : 'transparent',
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: `rgba(${email.unread ? '0,255,136' : '74,74,90'},0.15)`, color: email.unread ? '#00ff88' : '#4a4a5a', fontFamily: 'Space Grotesk' }}
                >
                  {email.sender[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className="text-sm font-['Inter'] truncate"
                      style={{ color: email.unread ? '#e8e8f0' : '#6a6a7a', fontWeight: email.unread ? 600 : 400 }}
                    >
                      {email.sender}
                    </span>
                    <span className="font-['JetBrains_Mono'] text-xs flex-shrink-0 ml-2" style={{ color: '#4a4a5a' }}>{email.time}</span>
                  </div>
                  <div className="text-xs font-['Inter'] mb-0.5 truncate" style={{ color: email.unread ? '#e8e8f0' : '#6a6a7a', fontWeight: email.unread ? 500 : 400 }}>
                    {email.subject}
                  </div>
                  <div className="text-xs font-['Inter'] truncate" style={{ color: '#4a4a5a' }}>{email.preview}</div>
                </div>
              </motion.div>
            ))}

            {/* Email expanded */}
            <AnimatePresence>
              {selectedEmail && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-4 my-2 rounded-xl p-5 overflow-hidden"
                  style={{ background: 'rgba(13,13,15,0.8)', border: '1px solid rgba(0,255,136,0.1)' }}
                >
                  <div className="font-['Space_Grotesk'] font-semibold text-[#e8e8f0] mb-2">{selectedEmail.subject}</div>
                  <div className="text-xs text-[#4a4a5a] font-['Inter'] mb-4">From: {selectedEmail.sender} · {selectedEmail.time}</div>
                  <p className="text-sm text-[#9898a8] font-['Inter'] leading-relaxed">{selectedEmail.preview} This is a demo email generated for the VAULTLESS hackathon demonstration. Your real account is secured with Behavioural DNA authentication.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── RIGHT PANEL ───────────────────────────────────── */}
        <div
          className="w-72 flex-shrink-0 flex flex-col overflow-y-auto"
          style={{ background: 'rgba(5,5,8,0.98)', borderLeft: '2px solid #00ff88', borderLeftColor: 'rgba(0,255,136,0.3)' }}
        >
          {/* Header */}
          <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(0,255,136,0.1)' }}>
            <div className="font-['Space_Grotesk'] font-bold text-lg text-[#00ff88] mb-3">⬡ VAULTLESS</div>

            {/* Status badge */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}
            >
              <span className="w-2 h-2 rounded-full bg-[#00ff88] dot-pulse flex-shrink-0" />
              <span className="font-['Space_Grotesk'] font-bold text-sm text-[#00ff88] tracking-widest">PROTECTED</span>
            </div>
          </div>

          {/* Auth score */}
          <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(0,255,136,0.06)' }}>
            <p className="font-['JetBrains_Mono'] text-xs text-[#4a4a5a] mb-2">Last auth score</p>
            <div className="font-['JetBrains_Mono'] font-bold text-5xl" style={{ color: scoreColor }}>
              {lastScore != null ? (lastScore * 100).toFixed(1) : '--'}
            </div>
            <div className="font-['JetBrains_Mono'] text-xs text-[#4a4a5a] mt-1">% match</div>
          </div>

          {/* Identity */}
          <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(0,255,136,0.06)' }}>
            <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.15em] text-[#00ff88] mb-3 opacity-70">// IDENTITY</p>
            <div className="flex items-center justify-between mb-2">
              <span className="font-['JetBrains_Mono'] text-xs text-[#00ff88]">{truncate(walletAddress, 6)}</span>
              <button className="text-[#4a4a5a] hover:text-[#9898a8] transition-colors bg-transparent border-none cursor-pointer text-xs">⎘</button>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-['JetBrains_Mono'] text-xs text-[#4a4a5a]">{truncate(enrollmentHash, 6)}</span>
              <button className="text-[#4a4a5a] hover:text-[#9898a8] transition-colors bg-transparent border-none cursor-pointer text-xs">⎘</button>
            </div>
          </div>

          {/* Chain events */}
          <div className="px-5 py-4 flex-1">
            <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.15em] text-[#00ff88] mb-3 opacity-70">// CHAIN EVENTS</p>

            {txHistory.length === 0 ? (
              <p className="text-xs text-[#4a4a5a] font-['Inter']">No events yet</p>
            ) : (
              <AnimatePresence>
                {txHistory.slice(0, 5).map(ev => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    className="flex items-center gap-2 mb-2"
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: eventColor(ev.event) }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-['JetBrains_Mono'] text-xs text-[#e8e8f0] truncate">{ev.event}</div>
                      {ev.txHash && (
                        <a
                          href={getEtherscanLink(ev.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-['JetBrains_Mono'] text-xs text-[#00d4ff] truncate block hover:opacity-80 transition-opacity"
                          style={{ fontSize: '10px' }}
                        >
                          {truncate(ev.txHash, 6)} ↗
                        </a>
                      )}
                    </div>
                    <span className="font-['JetBrains_Mono'] text-xs text-[#4a4a5a] flex-shrink-0" style={{ fontSize: '10px' }}>
                      {timeAgo(ev.timestamp || ev.id)}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* DataStream */}
          <div className="px-3 pb-4 flex-shrink-0">
            <DataStream active={true} />
          </div>
        </div>
      </motion.div>
    </PageShell>
  )
}
