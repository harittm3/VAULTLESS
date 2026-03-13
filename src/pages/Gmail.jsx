import { useNavigate } from 'react-router-dom';
import { useVaultless } from '../lib/VaultlessContext';

export default function Gmail() {
  const navigate = useNavigate();
  const { isEnrolled } = useVaultless();

  return (
    <div style={s.root}>

      <div style={s.header}>
        <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico" width="32" height="32" style={{ marginRight: 8, borderRadius: '50%' }} alt="Gmail" />
        <span style={s.wordmark}>
          <span style={{ color: '#4285F4' }}>G</span>
          <span style={{ color: '#EA4335' }}>m</span>
          <span style={{ color: '#FBBC05' }}>a</span>
          <span style={{ color: '#4285F4' }}>i</span>
          <span style={{ color: '#34A853' }}>l</span>
        </span>
      </div>

      <div style={s.card}>
        <div style={s.logoWrap}>
          <div style={s.logoCircle}>
            <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico" width="40" height="40" alt="Gmail" />
          </div>
        </div>

        <h2 style={s.title}>Sign in</h2>
        <p style={s.subtitle}>to continue to Gmail</p>

        <input style={s.input} placeholder="Email or phone" readOnly />

        <div style={s.divider}>
          <div style={s.line} />
          <span style={s.dividerText}>or sign in with</span>
          <div style={s.line} />
        </div>

        <button
          style={s.btn}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          onClick={() => navigate(isEnrolled ? '/auth' : '/enroll')}
        >
          <span style={s.hex}>⬡</span>
          Sign in with VAULTLESS
        </button>

        <p style={s.tagline}>Passwordless · Unstealable · Anti-Coercion</p>

        <div style={s.footer}>
          <a href="#" style={s.link}>Help</a>
          <a href="#" style={s.link}>Privacy</a>
          <a href="#" style={s.link}>Terms</a>
        </div>
      </div>

      <style>{`
        input::placeholder { color: #bec0c4; }
        input:focus { border-color: #1a73e8 !important; outline: none; box-shadow: 0 0 0 2px rgba(26,115,232,0.15); }
      `}</style>
    </div>
  );
}

const s = {
  root: {
    minHeight: '100vh', background: '#fff',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
  },
  header: {
    width: '100%', padding: '16px 24px',
    display: 'flex', alignItems: 'center',
  },
  wordmark: {
    fontSize: 22, fontWeight: 400, color: '#5f6368',
    fontFamily: "Arial, sans-serif", letterSpacing: 0.3,
  },
  card: {
    marginTop: 60, width: '100%', maxWidth: 440,
    border: '1px solid #dadce0', borderRadius: 12,
    padding: '48px 44px 36px', textAlign: 'center',
    boxShadow: '0 4px 6px rgba(32,33,36,0.1), 0 1px 3px rgba(32,33,36,0.08), 0 8px 24px rgba(32,33,36,0.06)',
  },
  logoWrap: { display: 'flex', justifyContent: 'center', marginBottom: 24 },
  logoCircle: {
    width: 72, height: 72, borderRadius: '50%',
    background: '#f1f3f4',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: 400, color: '#202124', margin: '0 0 10px' },
  subtitle: { fontSize: 16, color: '#5f6368', margin: '0 0 32px', fontWeight: 400 },
  input: {
    width: '100%', padding: '14px 16px',
    border: '1px solid #dadce0', borderRadius: 6,
    fontSize: 16, color: '#202124',
    boxSizing: 'border-box', background: '#fff',
    fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
    marginBottom: 28, transition: 'border-color 0.2s',
  },
  divider: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  line: { flex: 1, height: 1, background: '#e8eaed' },
  dividerText: { color: '#5f6368', fontSize: 13, whiteSpace: 'nowrap' },
  btn: {
    width: '100%', padding: '13px 16px',
    background: '#0d0d0d', color: '#00ff88',
    border: 'none', borderRadius: 6,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, letterSpacing: '0.06em', marginBottom: 14,
    fontFamily: "'Courier New', monospace",
    transition: 'opacity 0.2s', textTransform: 'uppercase',
  },
  hex: { fontSize: 18, color: '#00ff88', lineHeight: 1 },
  tagline: { color: '#9aa0a6', fontSize: 12, margin: '0 0 28px', letterSpacing: '0.02em' },
  footer: {
    borderTop: '1px solid #e8eaed', paddingTop: 18,
    display: 'flex', justifyContent: 'center', gap: 28,
  },
  link: { color: '#5f6368', fontSize: 12, textDecoration: 'none' },
};