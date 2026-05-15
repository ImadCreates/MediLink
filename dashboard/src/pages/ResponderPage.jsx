import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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
        <rect x="4" y="15" width="32" height="10" rx="5" fill="url(#crossGradResponder)" />
      </svg>
    </div>
  </div>
);

const PHONES = [
  {
    src: '/screenshots/notification.jpg',
    alt: 'Push notification',
    caption: 'Push notification',
    width: 200,
    transform: 'rotate(-4deg)',
    border: '1.5px solid rgba(255,255,255,0.18)',
    shadow: '0 16px 48px rgba(0,0,0,0.5)',
    objectPosition: 'top',
  },
  {
    src: '/screenshots/alert.jpg',
    alt: 'Incoming alert',
    caption: 'Incoming alert',
    width: 260,
    transform: 'translateY(-24px)',
    border: '1.5px solid rgba(255,255,255,0.22)',
    shadow: '0 0 40px rgba(100,60,200,0.3), 0 24px 64px rgba(0,0,0,0.6)',
    objectPosition: 'center',
  },
  {
    src: '/screenshots/map.jpg',
    alt: 'Live map and response',
    caption: 'Live map + response',
    width: 200,
    transform: 'rotate(4deg)',
    border: '1.5px solid rgba(255,255,255,0.18)',
    shadow: '0 16px 48px rgba(0,0,0,0.5)',
    objectPosition: 'center',
  },
];

const ResponderPage = () => {
  const navigate = useNavigate();
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [joined, setJoined] = useState(false);

  const cardRef   = useRef(null);
  const phonesRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Glass card: fade in + scale from 0.97 on scroll
      if (cardRef.current) {
        gsap.from(cardRef.current, {
          opacity: 0, scale: 0.97, duration: 0.7, ease: 'power2.out',
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 85%',
          },
        });
      }

      // Phones: staggered y + opacity on scroll
      if (phonesRef.current) {
        gsap.from(Array.from(phonesRef.current.children), {
          opacity: 0, y: 60, duration: 0.7, ease: 'power2.out',
          stagger: 0.2,
          scrollTrigger: {
            trigger: phonesRef.current,
            start: 'top 85%',
          },
        });
      }
    });

    return () => ctx.revert();
  }, []);

  const handleWaitlist = (e) => {
    e.preventDefault();
    if (waitlistEmail.trim()) setJoined(true);
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100%', overflow: 'auto',
      background: 'radial-gradient(ellipse at 20% 10%, #1a0533 0%, #0d0820 45%, #020008 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', position: 'relative',
    }}>

      {/* Aurora orbs */}
      <div style={{
        position: 'fixed', top: '-80px', left: '-80px',
        width: 400, height: 400, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(124,58,237,0.52) 0%, transparent 70%)',
        animation: 'auroraOrb1 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', bottom: '-60px', left: '-40px',
        width: 300, height: 300, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(6,182,212,0.30) 0%, transparent 70%)',
        animation: 'auroraOrb2 11s ease-in-out infinite reverse',
      }} />
      <div style={{
        position: 'fixed', top: '30%', right: '-60px',
        width: 340, height: 340, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(59,130,246,0.34) 0%, transparent 70%)',
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

      {/* Nav */}
      <div style={{
        position: 'relative', zIndex: 10, width: '100%', maxWidth: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 32px',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <MediLinkLogo size={34} />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16, fontFamily: 'inherit' }}>
            MediLink
          </span>
        </button>
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

      {/* Hero */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '32px 32px 16px',
        animation: 'fadeInUp 0.7s ease both',
      }}>
        <MediLinkLogo size={80} />
        <p style={{
          marginTop: 16, color: 'rgba(255,255,255,0.4)',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}>
          Responder App
        </p>
        <h1 style={{
          marginTop: 12, fontSize: 'clamp(28px, 4vw, 44px)',
          fontWeight: 800, color: 'white', letterSpacing: '-0.03em',
          lineHeight: 1.15,
        }}>
          Emergency response<br />in your pocket.
        </h1>
      </div>

      {/* Main card */}
      <div ref={cardRef} style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 600,
        margin: '32px 24px',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 24, padding: '36px 36px',
        backdropFilter: 'blur(16px)',
      }}>

        {/* Google Play badge area */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24,
          padding: '16px 20px', borderRadius: 14,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #00c853, #00e5ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: 22,
          }}>
            ▶
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}>
              COMING SOON TO
            </div>
            <div style={{ color: 'white', fontSize: 16, fontWeight: 700, marginTop: 2 }}>
              Google Play
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          Accept alerts, update your status, and respond faster — all from your phone.
        </p>

        {/* Waitlist form */}
        {joined ? (
          <div style={{
            padding: '18px 20px', borderRadius: 14,
            background: 'rgba(0,200,83,0.12)',
            border: '1px solid rgba(0,200,83,0.3)',
            color: '#00e5a0', fontSize: 14, fontWeight: 600,
            textAlign: 'center',
          }}>
            ✓ You&apos;re on the list! We&apos;ll reach out when access opens.
          </div>
        ) : (
          <form onSubmit={handleWaitlist} style={{ display: 'flex', gap: 10 }}>
            <input
              type="email"
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                flex: 1, padding: '13px 16px',
                borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.07)',
                color: 'white', fontSize: 14, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '13px 22px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #00c853, #00e5ff)',
                color: '#000', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              Join Waitlist
            </button>
          </form>
        )}

        <p style={{
          marginTop: 14, color: 'rgba(255,255,255,0.25)',
          fontSize: 12, textAlign: 'center',
        }}>
          Currently available via invite only
        </p>
      </div>

      {/* Screenshot section */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 900,
        padding: '0 32px 16px',
      }}>
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          marginBottom: 48,
        }} />

        {/* 3-phone row */}
        <div ref={phonesRef} style={{
          display: 'flex', gap: 24, alignItems: 'flex-end',
          justifyContent: 'center', flexWrap: 'wrap',
        }}>
          {PHONES.map((phone) => (
            <div key={phone.caption} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 0, transform: phone.transform,
            }}>
              <div style={{
                width: phone.width,
                aspectRatio: '9 / 19.5',
                borderRadius: 36,
                border: phone.border,
                overflow: 'hidden',
                background: '#0d0820',
                boxShadow: phone.shadow,
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
              </div>
              <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 13, fontWeight: 500,
                margin: '12px 0 0', textAlign: 'center',
              }}>
                {phone.caption}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Back link */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'relative', zIndex: 10, margin: '40px 0 48px',
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

export default ResponderPage;
