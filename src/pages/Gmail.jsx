// ============================================================
// FILE: src/pages/Gmail.jsx
// ============================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageShell from '../components/PageShell.jsx'
import { useVaultless } from '../lib/VaultlessContext.jsx'

const GoogleG = () => (
  <svg viewBox="0 0 48 48" className="w-12 h-12 mx-auto mb-6">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
)

export default function Gmail() {
  const navigate = useNavigate()
  const { isEnrolled } = useVaultless()
  const [email, setEmail] = useState('')

  return (
    <PageShell className="flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-sm px-4"
      >
        {/* Card */}
        <div
          className="relative rounded-2xl overflow-hidden p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(13,13,15,0.95) 0%, rgba(20,20,24,0.95) 100%)',
            border: '1px solid rgba(0,255,136,0.12)',
            boxShadow: '0 0 0 1px rgba(0,255,136,0.05), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,255,136,0.4), transparent)' }} />

          <GoogleG />

          <h2 className="font-['Space_Grotesk'] font-semibold text-2xl text-[#e8e8f0] text-center mb-1">Sign in</h2>
          <p className="text-[#6a6a7a] text-sm text-center mb-6 font-['Inter']">to continue to Gmail</p>

          {/* Email input */}
          <input
            type="email"
            placeholder="Email or phone"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full mb-4 font-['Inter'] text-sm transition-all focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              padding: '12px 16px',
            }}
            onFocus={e => {
              e.target.style.borderColor = '#00ff88'
              e.target.style.boxShadow = '0 0 0 3px rgba(0,255,136,0.1)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgba(255,255,255,0.1)'
              e.target.style.boxShadow = 'none'
            }}
          />

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs text-[#4a4a5a] font-['Inter']">or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* VAULTLESS button */}
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,255,136,0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(isEnrolled ? '/auth' : '/enroll')}
            className="w-full glow-pulse font-['Space_Grotesk'] font-bold text-sm flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
              color: '#000',
              borderRadius: '10px',
              padding: '14px 20px',
              letterSpacing: '0.05em',
              boxShadow: '0 0 20px rgba(0,255,136,0.25)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '16px' }}>⬡</span>
            Sign in with VAULTLESS
          </motion.button>

          {/* Sub-links */}
          <div className="flex justify-between mt-5">
            <button className="text-xs text-[#4a4a5a] font-['Inter'] hover:text-[#9898a8] transition-colors bg-transparent border-none cursor-pointer">
              Create account
            </button>
            <button className="text-xs text-[#4a4a5a] font-['Inter'] hover:text-[#9898a8] transition-colors bg-transparent border-none cursor-pointer">
              Forgot email?
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-[#4a4a5a] font-['Inter']">
          English · Help · Privacy · Terms
        </div>
      </motion.div>
    </PageShell>
  )
}
