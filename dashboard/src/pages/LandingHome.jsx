import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CylinderCarousel from '../components/CylinderCarousel';

gsap.registerPlugin(ScrollTrigger);

const STARS = [
  { top: '5%',  left: '8%',  size: 1.5 }, { top: '12%', left: '23%', size: 1 },
  { top: '8%',  left: '67%', size: 2   }, { top: '18%', left: '85%', size: 1 },
  { top: '22%', left: '41%', size: 1.5 }, { top: '35%', left: '5%',  size: 1 },
  { top: '42%', left: '92%', size: 2   }, { top: '55%', left: '15%', size: 1 },
  { top: '60%', left: '78%', size: 1.5 }, { top: '70%', left: '33%', size: 1 },
  { top: '75%', left: '88%', size: 2   }, { top: '82%', left: '52%', size: 1 },
  { top: '88%', left: '7%',  size: 1.5 }, { top: '92%', left: '70%', size: 1 },
  { top: '3%',  left: '49%', size: 1   }, { top: '48%', left: '61%', size: 1.5 },
  { top: '30%', left: '73%', size: 1   }, { top: '65%', left: '45%', size: 2 },
  { top: '15%', left: '95%', size: 1   }, { top: '90%', left: '30%', size: 1.5 },
];

// Full-size logo used in hero (left panel)
const MediLinkLogo = ({ size = 88, forwardedRef }) => (
  <div ref={forwardedRef} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
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
          <linearGradient id="crossGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect x="15" y="4" width="10" height="32" rx="5" fill="url(#crossGrad)" />
        <rect x="4" y="15" width="32" height="10" rx="5" fill="url(#crossGrad)" />
      </svg>
    </div>
  </div>
);

// Mini logo used in the nav brand mark
const NavLogo = () => (
  <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
    <div style={{
      position: 'absolute', inset: -1, borderRadius: '50%',
      background: 'conic-gradient(from 0deg, #f43f5e, #22d3ee, #a855f7, #f43f5e)',
      animation: 'ringRotate 3s linear infinite',
    }} />
    <div style={{
      position: 'absolute', inset: 2, borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 35%, #1a0533, #080010)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width={13} height={13} viewBox="0 0 40 40">
        <defs>
          <linearGradient id="crossGradNav" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect x="15" y="4" width="10" height="32" rx="5" fill="url(#crossGradNav)" />
        <rect x="4" y="15" width="32" height="10" rx="5" fill="url(#crossGradNav)" />
      </svg>
    </div>
  </div>
);

const LandingHome = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const heroRef           = useRef(null);
  const scrollIndicatorRef = useRef(null);

  // GSAP refs — hero elements
  const logoRef     = useRef(null);
  const taglineRef  = useRef(null);
  const headlineRef = useRef(null);
  const subtextRef  = useRef(null);
  const buttonsRef  = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // ── Hero entrance stagger (unchanged) ─────────────────────────
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

      tl.from(logoRef.current,     { opacity: 0, scale: 0.8, duration: 0.8 })
        .from(taglineRef.current,  { opacity: 0, duration: 0.5 }, 0.2)
        .from(headlineRef.current, { opacity: 0, y: 30, duration: 0.6 }, 0.4)
        .from(subtextRef.current,  { opacity: 0, duration: 0.5 }, 0.6)
        .from(buttonsRef.current,  { opacity: 0, y: 20, duration: 0.5 }, 0.8);

      // Scroll indicator fades in after hero stagger completes
      gsap.to(scrollIndicatorRef.current, {
        opacity: 1, duration: 0.8, delay: 1.5, ease: 'power2.out',
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div style={{
      width: '100%',
      background: 'radial-gradient(ellipse at 20% 10%, #1a0533 0%, #0d0820 45%, #020008 100%)',
      position: 'relative',
    }}>

      {/* ── Aurora orbs (fixed, behind everything) ── */}
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

      {/* ── Full-viewport split hero — pinned by CylinderCarousel ScrollTrigger ── */}
      <div ref={heroRef} style={{
        position: 'relative', zIndex: 10,
        width: '100%', height: '100vh',
        display: 'flex', flexDirection: 'row',
        overflow: 'hidden',
      }}>

        {/* ── Left panel: nav brand + hero content ── */}
        <div style={{
          width: '50%', height: '100%',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: '8vw', paddingRight: '4vw',
          position: 'relative',
        }}>

          {/* Brand mark — pinned top-left */}
          <div style={{
            position: 'absolute', top: 28, left: '8vw',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <NavLogo />
            <span style={{
              color: 'white', fontWeight: 700, fontSize: 16,
              letterSpacing: '-0.01em',
            }}>
              MediLink
            </span>
          </div>

          {/* Hero content — vertically centered */}
          <MediLinkLogo size={88} forwardedRef={logoRef} />

          <p ref={taglineRef} style={{
            marginTop: 20, color: 'rgba(255,255,255,0.45)',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}>
            Dispatch Intelligence
          </p>

          <h1 ref={headlineRef} style={{
            marginTop: 16, fontSize: 'clamp(30px, 3.5vw, 52px)',
            fontWeight: 800, color: 'white', letterSpacing: '-0.03em',
            lineHeight: 1.1, maxWidth: 520,
          }}>
            Dispatch smarter.<br />Respond faster.
          </h1>

          <p ref={subtextRef} style={{
            marginTop: 16, fontSize: 16, color: 'rgba(255,255,255,0.5)',
            maxWidth: 420, lineHeight: 1.6,
          }}>
            Real-time coordination for any team that needs the right person at the right place.
          </p>

          {/* CTA buttons */}
          <div ref={buttonsRef} style={{
            display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap',
          }}>
            <button
              onClick={() => navigate('/dispatcher')}
              style={{
                padding: '14px 32px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #00c853, #00e5ff)',
                color: '#000', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 24px rgba(0,200,83,0.3)',
                letterSpacing: '0.01em',
              }}
            >
              Dispatcher Login
            </button>
            <button
              onClick={() => navigate('/responder')}
              style={{
                padding: '14px 32px', borderRadius: 12,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: 'white', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Responder App
            </button>
          </div>

        </div>

        {/* ── Right panel: Three.js cylinder carousel ── */}
        <div
          id="cylinder-canvas-container"
          style={{
            width: '50%', height: '100vh',
            background: 'transparent',
            position: 'relative',
            overflow: 'visible',
          }}
        >
          <CylinderCarousel key={location.key} />
        </div>

        {/* ── Scroll indicator — bottom-centre of hero ── */}
        <div
          ref={scrollIndicatorRef}
          onClick={() => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}
          style={{
            position: 'absolute', bottom: 32,
            left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 2,
            opacity: 0,           // GSAP animates this to 1 after 1.5s
            cursor: 'pointer',
            zIndex: 20,
          }}
        >
          {/* First chevron */}
          <svg
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"
            style={{ animation: 'chevronBounce 1.8s ease-in-out infinite' }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          {/* Second chevron — staggered, dimmer */}
          <svg
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"
            style={{ animation: 'chevronBounce 1.8s ease-in-out infinite', animationDelay: '0.2s' }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span style={{
            marginTop: 6,
            color: 'rgba(255,255,255,0.45)',
            fontSize: 10, fontWeight: 500,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontFamily: 'inherit',
          }}>
            Scroll to Explore
          </span>
        </div>
      </div>

      {/* Any content below the hero lives here, outside the split */}
    </div>
  );
};

export default LandingHome;
