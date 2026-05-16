import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const STARS = [
  { top: '5%',  left: '8%',  size: 1.5 }, { top: '12%', left: '23%', size: 1 },
  { top: '8%',  left: '67%', size: 2   }, { top: '18%', left: '85%', size: 1 },
  { top: '22%', left: '41%', size: 1.5 }, { top: '35%', left: '5%',  size: 1 },
  { top: '42%', left: '92%', size: 2   }, { top: '55%', left: '15%', size: 1 },
  { top: '60%', left: '78%', size: 1.5 }, { top: '70%', left: '33%', size: 1 },
  { top: '75%', left: '88%', size: 2   }, { top: '82%', left: '52%', size: 1 },
  { top: '3%',  left: '49%', size: 1   }, { top: '48%', left: '61%', size: 1.5 },
  { top: '30%', left: '73%', size: 1   }, { top: '65%', left: '45%', size: 2 },
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
          <linearGradient id="crossGradResponder" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect x="15" y="4" width="10" height="32" rx="5" fill="url(#crossGradResponder)" />
        <rect x="4"  y="15" width="32" height="10" rx="5" fill="url(#crossGradResponder)" />
      </svg>
    </div>
  </div>
);

const PHONES = [
  { src: '/screenshots/notification.jpg', alt: 'Push notification',    caption: 'Push Notification',   objectPosition: 'top',    width: 185, isMiddle: false },
  { src: '/screenshots/alert.jpg',        alt: 'Incoming alert',        caption: 'Incoming Alert',       objectPosition: 'center', width: 215, isMiddle: true  },
  { src: '/screenshots/map.jpg',          alt: 'Live map and response', caption: 'Live Map + Response',  objectPosition: 'center', width: 185, isMiddle: false },
];

const ResponderPage = () => {
  const navigate = useNavigate();
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [joined, setJoined]               = useState(false);

  const phonesRef = useRef(null);
  const cardRef   = useRef(null);

  // ── Phone entrance ────────────────────────────────────────────────────────
  useEffect(() => {
    const phones = Array.from(phonesRef.current?.children || []);
    if (!phones.length) return;

    gsap.fromTo(
      phones,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out', delay: 0.3 }
    );
  }, []);

  const handleWaitlist = async (e) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    try {
      await addDoc(collection(db, 'waitlist'), {
        email    : waitlistEmail.trim(),
        joinedAt : serverTimestamp(),
        source   : 'responder-page',
      });
      setJoined(true);
    } catch (err) {
      console.error('Waitlist error:', err);
      // Still show success to user even if save fails
      setJoined(true);
    }
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 10%, #1a0533 0%, #0d0820 45%, #020008 100%)',
      position: 'relative',
    }}>

      {/* ── Aurora orbs ── */}
      <div style={{
        position: 'fixed', top: '-80px', left: '-80px', zIndex: 0,
        width: 420, height: 420, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(124,58,237,0.52) 0%, transparent 70%)',
        animation: 'auroraOrb1 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', bottom: '-60px', left: '-40px', zIndex: 0,
        width: 320, height: 320, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(6,182,212,0.30) 0%, transparent 70%)',
        animation: 'auroraOrb2 11s ease-in-out infinite reverse',
      }} />
      <div style={{
        position: 'fixed', top: '30%', right: '-60px', zIndex: 0,
        width: 360, height: 360, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(59,130,246,0.34) 0%, transparent 70%)',
        animation: 'auroraOrb3 9s ease-in-out infinite',
      }} />

      {/* ── Stars ── */}
      {STARS.map((s, i) => (
        <div key={i} style={{
          position: 'fixed', top: s.top, left: s.left, zIndex: 0,
          width: s.size, height: s.size, borderRadius: '50%',
          background: 'white', pointerEvents: 'none',
          animation: `starPulse ${2.5 + (i % 4) * 0.5}s ease-in-out infinite`,
          animationDelay: `${(i * 0.3) % 2}s`,
        }} />
      ))}

      {/* ── Full-viewport split hero ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', height: '100vh',
        display: 'flex', flexDirection: 'row',
        overflow: 'hidden',
      }}>

        {/* ── Nav brand (absolute, top-left) ── */}
        <div style={{
          position: 'absolute', top: 28, left: '8vw', zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <MediLinkLogo size={32} />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 16, fontFamily: 'inherit' }}>MediLink</span>
          </button>
        </div>

        {/* ── Nav action (absolute, top-right) ── */}
        <div style={{ position: 'absolute', top: 28, right: '4vw', zIndex: 20 }}>
          <button
            onClick={() => navigate('/dispatcher')}
            style={{
              padding: '8px 20px', borderRadius: 10,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Dispatcher Sign In
          </button>
        </div>

        {/* ── Left panel ── */}
        <div style={{
          width: '50%', height: '100%',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: '8vw', paddingRight: '4vw',
          position: 'relative',
        }}>
          <MediLinkLogo size={80} />

          <p style={{
            marginTop: 20, color: 'rgba(255,255,255,0.45)',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}>
            Responder App
          </p>

          <h1 style={{
            marginTop: 16,
            fontSize: 'clamp(32px, 4vw, 52px)',
            fontWeight: 800, color: 'white', letterSpacing: '-0.03em',
            lineHeight: 1.1, maxWidth: 480,
          }}>
            Receive. <br />Accept. <br />Go.
          </h1>

          {/* Glass card */}
          <div ref={cardRef} style={{
            marginTop: 32,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 20, padding: '28px 28px',
            backdropFilter: 'blur(16px)',
            maxWidth: 460,
          }}>
            {/* Google Play badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
              padding: '14px 18px', borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, #00c853, #00e5ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 20,
              }}>
                ▶
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}>
                  COMING SOON TO
                </div>
                <div style={{ color: 'white', fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                  Google Play
                </div>
              </div>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.7, marginBottom: 22 }}>
              Accept assignments, update your status, and navigate to any location — all from your phone.
            </p>

            {/* Waitlist form */}
            {joined ? (
              <div style={{
                padding: '16px 18px', borderRadius: 12,
                background: 'rgba(0,200,83,0.12)',
                border: '1px solid rgba(0,200,83,0.3)',
                color: '#00e5a0', fontSize: 14, fontWeight: 600, textAlign: 'center',
              }}>
                ✓ You&apos;re on the list! We&apos;ll reach out when access opens.
              </div>
            ) : (
              <form onSubmit={handleWaitlist} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{
                    flex: 1, padding: '11px 14px',
                    borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.07)',
                    color: 'white', fontSize: 13, outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '11px 20px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #00c853, #00e5ff)',
                    color: '#000', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                  }}
                >
                  Join Waitlist
                </button>
              </form>
            )}

            <p style={{ marginTop: 12, color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center' }}>
              Currently available via invite only
            </p>
          </div>
        </div>

        {/* ── Right panel: three phones side by side ── */}
        <div style={{
          position      : 'relative',
          width         : '50%',
          height        : '100vh',
          display       : 'flex',
          alignItems    : 'center',
          justifyContent: 'center',
        }}>
          {/* Phone row */}
          <div ref={phonesRef} style={{
            display       : 'flex',
            alignItems    : 'flex-end',
            justifyContent: 'center',
            gap           : 16,
          }}>
            {PHONES.map((phone) => (
              <div key={phone.caption} style={{
                display      : 'flex',
                flexDirection: 'column',
                alignItems   : 'center',
                flexShrink   : 0,
              }}>
                {/* Phone frame — position relative for gradient overlay */}
                <div style={{
                  position    : 'relative',
                  width       : phone.width,
                  aspectRatio : '9 / 19.5',
                  borderRadius: 32,
                  border      : phone.isMiddle
                    ? '1.5px solid rgba(255,255,255,0.22)'
                    : '1.5px solid rgba(255,255,255,0.12)',
                  overflow    : 'hidden',
                  background  : '#0d0820',
                  boxShadow   : phone.isMiddle
                    ? '0 0 48px rgba(120,60,220,0.35), 0 24px 72px rgba(0,0,0,0.65)'
                    : '0 8px 40px rgba(0,0,0,0.45)',
                }}>
                  <img
                    src={phone.src}
                    alt={phone.alt}
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      objectPosition: phone.objectPosition,
                      display: 'block',
                    }}
                  />
                  {/* Bottom gradient overlay */}
                  <div style={{
                    position  : 'absolute',
                    bottom    : 0, left: 0, right: 0,
                    height    : 80,
                    background: 'linear-gradient(to bottom, transparent, rgba(8,0,16,0.6))',
                    pointerEvents: 'none',
                  }} />
                </div>

                {/* Caption */}
                <p style={{
                  marginTop    : 12,
                  fontSize     : 11,
                  color        : 'rgba(255,255,255,0.4)',
                  textAlign    : 'center',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily   : 'inherit',
                }}>
                  {phone.caption}
                </p>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* ── Back to home — fixed, outside scroll flow ── */}
      <button
        onClick={() => navigate('/')}
        style={{
          position           : 'fixed',
          bottom             : 28,
          left               : '50%',
          transform          : 'translateX(-50%)',
          fontSize           : 12,
          color              : 'rgba(255,255,255,0.4)',
          letterSpacing      : '0.05em',
          cursor             : 'pointer',
          zIndex             : 100,
          background         : 'none',
          border             : 'none',
          fontFamily         : 'inherit',
          textDecoration     : 'underline',
          textUnderlineOffset: 3,
        }}
      >
        ← Back to home
      </button>
    </div>
  );
};

export default ResponderPage;
