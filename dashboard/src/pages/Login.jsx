import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

const STARS = [
  { top: '5%',  left: '8%',  size: 1.5 }, { top: '12%', left: '23%', size: 1 },
  { top: '8%',  left: '67%', size: 2   }, { top: '18%', left: '85%', size: 1 },
  { top: '22%', left: '41%', size: 1.5 }, { top: '35%', left: '5%',  size: 1 },
  { top: '42%', left: '92%', size: 2   }, { top: '55%', left: '15%', size: 1 },
  { top: '60%', left: '78%', size: 1.5 }, { top: '70%', left: '33%', size: 1 },
  { top: '75%', left: '88%', size: 2   }, { top: '82%', left: '52%', size: 1 },
  { top: '88%', left: '7%',  size: 1.5 }, { top: '3%',  left: '49%', size: 1 },
  { top: '48%', left: '61%', size: 1.5 }, { top: '30%', left: '73%', size: 1 },
];

const MediLinkLogo = ({ size = 72 }) => (
  <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
    <div style={{
      position: 'absolute', inset: -2, borderRadius: '50%',
      background: 'conic-gradient(from 0deg, #f43f5e, #22d3ee, #a855f7, #f43f5e)',
      animation: 'ringRotate 3s linear infinite',
    }} />
    <div style={{
      position: 'absolute', inset: 3, borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 35%, #1a0533, #080010)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 40 40">
        <defs>
          <linearGradient id="crossGradLogin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect x="15" y="4" width="10" height="32" rx="5" fill="url(#crossGradLogin)" />
        <rect x="4" y="15" width="32" height="10" rx="5" fill="url(#crossGradLogin)" />
      </svg>
    </div>
  </div>
);

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError('Invalid email or password. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    width: '100%', padding: '13px 16px',
    borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.07)',
    color: 'white', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: 'radial-gradient(ellipse at 20% 10%, #1a0533 0%, #0d0820 45%, #020008 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Aurora orbs */}
      <div style={{
        position: 'fixed', top: '-80px', left: '-80px',
        width: 440, height: 440, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(124,58,237,0.55) 0%, transparent 70%)',
        animation: 'auroraOrb1 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', bottom: '-60px', left: '-40px',
        width: 320, height: 320, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(6,182,212,0.32) 0%, transparent 70%)',
        animation: 'auroraOrb2 11s ease-in-out infinite reverse',
      }} />
      <div style={{
        position: 'fixed', top: '30%', right: '-60px',
        width: 360, height: 360, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(59,130,246,0.36) 0%, transparent 70%)',
        animation: 'auroraOrb3 9s ease-in-out infinite',
      }} />

      {/* Stars */}
      {STARS.map((s, i) => (
        <div key={i} style={{
          position: 'fixed', top: s.top, left: s.left,
          width: s.size, height: s.size, borderRadius: '50%',
          background: 'white', pointerEvents: 'none',
          animation: `starPulse ${2.5 + (i % 4) * 0.5}s ease-in-out infinite`,
          animationDelay: `${(i * 0.3) % 2}s`,
        }} />
      ))}

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 400, margin: '0 24px',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 24, padding: '48px 36px',
        backdropFilter: 'blur(16px)',
        animation: 'fadeInUp 0.6s ease both',
      }}>

        {/* Logo + title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <MediLinkLogo size={72} />
          <h1 style={{
            marginTop: 16, color: 'white', fontSize: 22, fontWeight: 700,
            letterSpacing: '-0.02em',
          }}>
            MediLink
          </h1>
          <p style={{
            marginTop: 4, color: 'rgba(255,255,255,0.4)',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            Dispatcher Access
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
            }}>
              Email
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dispatcher@hospital.com"
              required
              style={fieldStyle}
            />
          </div>

          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
            }}>
              Password
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={fieldStyle}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              color: '#f87171', fontSize: 13, padding: '10px 14px',
              borderRadius: 10, background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.25)',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8, padding: '14px',
              borderRadius: 12, border: 'none',
              background: loading
                ? 'rgba(255,255,255,0.1)'
                : 'linear-gradient(135deg, #00c853, #00e5ff)',
              color: loading ? 'rgba(255,255,255,0.4)' : '#000',
              fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.02em',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                border: '2px solid rgba(0,0,0,0.2)',
                borderTop: '2px solid rgba(0,0,0,0.7)',
                animation: 'ringRotate 0.7s linear infinite',
                display: 'inline-block',
              }} />
              Signing in…
            </span>
          ) : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          marginTop: 24, textAlign: 'center',
          color: 'rgba(255,255,255,0.25)', fontSize: 12,
        }}>
          🔒 End-to-end encrypted · Dispatcher accounts are admin-created
        </p>
      </div>

      {/* Back link */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'relative', zIndex: 10, marginTop: 24,
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
          fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          textDecoration: 'underline', textUnderlineOffset: 3,
        }}
      >
        ← Back to home
      </button>
    </div>
  );
};

export default Login;
