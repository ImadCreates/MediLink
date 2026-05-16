import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

// ── Module-level wheel handler ─────────────────────────────────────────────────
// One variable at module scope guarantees only ONE handler is ever registered at
// a time. React StrictMode's double-invoke calls cleanup → re-mount in sequence;
// the first cleanup sets this to null, the remount assigns a fresh one.
// On navigation the cleanup fires, sets it to null, and the Responder page never
// sees the listener at all.
let carouselWheelHandler = null;

// ── Card definitions ───────────────────────────────────────────────────────────
const CARD_DATA = [
  {
    key         : 'dispatch',
    dot         : '#f43f5e',
    shineAccent : 'rgba(244,63,94,0.2)',
    gradTop     : 'rgba(244,63,94,0.22)',
    gradBottom  : 'rgba(20,5,15,0.88)',
    borderAccent: 'rgba(244,63,94,0.25)',
    title       : 'Real-time Dispatch',
    body        : 'Instant alert routing from dispatcher to responder',
  },
  {
    key         : 'mobile',
    dot         : '#22d3ee',
    shineAccent : 'rgba(34,211,238,0.2)',
    gradTop     : 'rgba(34,211,238,0.22)',
    gradBottom  : 'rgba(5,15,25,0.88)',
    borderAccent: 'rgba(34,211,238,0.25)',
    title       : 'Mobile Response',
    body        : 'Responders receive push alerts even when app is closed',
  },
  {
    key         : 'encrypted',
    dot         : '#00c853',
    shineAccent : 'rgba(0,200,83,0.2)',
    gradTop     : 'rgba(0,200,83,0.22)',
    gradBottom  : 'rgba(5,20,10,0.88)',
    borderAccent: 'rgba(0,200,83,0.25)',
    title       : 'Live GPS Tracking',
    body        : 'See every responder\'s location update in real time on a live map.',
  },
];

// ── Canvas helper: rounded-rect path ──────────────────────────────────────────
function rrPath(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);     ctx.quadraticCurveTo(x + w, y,      x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h,  x + w - r, y + h);
    ctx.lineTo(x + r,  y + h);    ctx.quadraticCurveTo(x,     y + h,  x, y + h - r);
    ctx.lineTo(x,      y + r);    ctx.quadraticCurveTo(x,     y,      x + r, y);
    ctx.closePath();
  }
}

// ── Canvas texture per card ────────────────────────────────────────────────────
function makeCardTexture(card) {
  const CW = 420, CH = 600;
  const canvas = document.createElement('canvas');
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, CW, CH);

  // 1 — gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, CH);
  grad.addColorStop(0, card.gradTop);
  grad.addColorStop(1, card.gradBottom);
  ctx.fillStyle = grad;
  rrPath(ctx, 0, 0, CW, CH, 24);
  ctx.fill();

  // 2a — accent border
  ctx.strokeStyle = card.borderAccent;
  ctx.lineWidth = 1.5;
  rrPath(ctx, 1, 1, CW - 2, CH - 2, 23);
  ctx.stroke();

  // 2b — glass border
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  rrPath(ctx, 3, 3, CW - 6, CH - 6, 22);
  ctx.stroke();

  // 3 — top shine line
  const shine = ctx.createLinearGradient(40, 0, 380, 0);
  shine.addColorStop(0,   'rgba(0,0,0,0)');
  shine.addColorStop(0.5, card.shineAccent);
  shine.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.strokeStyle = shine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 24); ctx.lineTo(380, 24);
  ctx.stroke();

  // 4 — radial glow + solid dot
  const glow = ctx.createRadialGradient(210, 120, 0, 210, 120, 50);
  glow.addColorStop(0, card.dot + '60');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(210, 120, 50, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = card.dot;
  ctx.beginPath();
  ctx.arc(210, 120, 14, 0, Math.PI * 2);
  ctx.fill();

  // 5 — title (word-wrapped so long titles like "End-to-end Encrypted" don't clip)
  ctx.fillStyle    = '#ffffff';
  ctx.font         = '700 34px Sora, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  {
    const words = card.title.split(' ');
    let titleLine = '';
    let titleY = 200;
    const titleMaxW = 360;
    words.forEach((word, i) => {
      const test = titleLine + word + ' ';
      if (ctx.measureText(test).width > titleMaxW && i > 0) {
        ctx.fillText(titleLine.trim(), 210, titleY);
        titleLine = word + ' ';
        titleY += 42;
      } else {
        titleLine = test;
      }
    });
    ctx.fillText(titleLine.trim(), 210, titleY);
  }

  // 6 — body (word-wrapped)
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font      = '400 22px Sora, sans-serif';
  ctx.textAlign = 'center';
  const maxLineW = 280, lineH = 34;
  let line = '', y = 290;
  for (const word of card.body.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxLineW && line) {
      ctx.fillText(line, 210, y); line = word; y += lineH;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, 210, y);

  return new THREE.CanvasTexture(canvas);
}

// ── Component ──────────────────────────────────────────────────────────────────
const CylinderCarousel = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    // ── StrictMode guard ─────────────────────────────────────────────────────
    // React StrictMode double-invokes useEffect (mount → cleanup → mount).
    // init() is async, so cleanup fires while the first init() is still awaiting
    // fonts. Without this flag, BOTH inits complete and push into the shared
    // arrays, giving 6 cardGroups instead of 3. The wheel handler animates
    // indices 0-2 (from the disposed first renderer) while the visible canvas
    // shows indices 3-5 — GSAP moves things but nothing updates on screen.
    let cancelled = false;

    let el, renderer, animFrameId, resizeObserver;
    const cardGroups    = [];
    const cardMaterials = [];
    const textures      = [];

    const init = async () => {
      try {
        await Promise.all([
          document.fonts.load('400 22px Sora'),
          document.fonts.load('700 38px Sora'),
        ]);
      } catch (_) { /* fall through — canvas will use sans-serif fallback */ }

      // If cleanup already ran, bail before touching the DOM or pushing arrays
      if (cancelled) return;

      el = mountRef.current;
      if (!el) return;

      const W = el.clientWidth;
      const H = el.clientHeight;

      // ── Renderer ─────────────────────────────────────────────────────────────
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W, H);
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);

      // ── Scene / Camera ────────────────────────────────────────────────────────
      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
      camera.position.set(0, 0, 4.5);
      camera.lookAt(0, 0, 0);

      // ── Slot definitions ──────────────────────────────────────────────────────
      const RADIUS = 1.8;
      const S85    = Math.sin(1.483);
      const C85    = Math.cos(1.483);

      const SLOTS = [
        { x: 0,           z: RADIUS,     rotY: 0,      opacity: 1.0,  scale: 1.0  }, // FRONT
        { x: -RADIUS*S85, z: RADIUS*C85, rotY: 1.483,  opacity: 0.38, scale: 0.78 }, // LEFT
        { x:  RADIUS*S85, z: RADIUS*C85, rotY: -1.483, opacity: 0.38, scale: 0.78 }, // RIGHT
      ];

      let slots = [1, 0, 2]; // Mobile front, Dispatch left, Encrypted right

      const sceneGroup = new THREE.Group();
      scene.add(sceneGroup);

      // ── Build card meshes ─────────────────────────────────────────────────────
      CARD_DATA.forEach((card, cardIdx) => {
        const tex = makeCardTexture(card);
        textures.push(tex);

        const initSlotIdx = slots.indexOf(cardIdx);
        const initSlot    = SLOTS[initSlotIdx];

        const mat = new THREE.MeshBasicMaterial({
          map        : tex,
          transparent: true,
          opacity    : initSlot.opacity,
          side       : THREE.FrontSide,
          depthWrite : false,
        });
        cardMaterials.push(mat);

        const group = new THREE.Group();
        group.position.set(initSlot.x, 0, initSlot.z);
        group.rotation.y = initSlot.rotY;
        group.scale.setScalar(initSlot.scale);
        group.add(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.6), mat));

        sceneGroup.add(group);
        cardGroups.push(group);
      });

      // ── Entrance spring ───────────────────────────────────────────────────────
      cardGroups.forEach((group, i) => {
        const target = group.scale.x;
        group.scale.setScalar(0.01);
        gsap.to(group.scale, {
          x: target, y: target, z: target,
          duration: 1.1, ease: 'back.out(1.5)',
          delay: 0.6 + i * 0.06,
        });
      });

      // ── Slot animation ────────────────────────────────────────────────────────
      // onComplete fires only on the FRONT slot's position tween (slotIdx === 0).
      // All tweens share the same 0.85s duration, so this fires when the batch
      // is done. Putting onComplete on multiple parallel tweens would fire it
      // multiple times and risk resetting isAnimating too early.
      const animateToSlots = (onDone) => {
        slots.forEach((cardIdx, slotIdx) => {
          const slot  = SLOTS[slotIdx];
          const group = cardGroups[cardIdx];
          const mat   = cardMaterials[cardIdx];

          // Position — onComplete on slot 0 only
          gsap.to(group.position, {
            x: slot.x, z: slot.z,
            duration: 0.85, ease: 'power2.inOut', overwrite: true,
            ...(slotIdx === 0 && onDone ? { onComplete: onDone } : {}),
          });

          // Rotation — no onComplete
          gsap.to(group.rotation, {
            y: slot.rotY,
            duration: 0.85, ease: 'power2.inOut', overwrite: true,
          });

          // Scale — no onComplete
          gsap.to(group.scale, {
            x: slot.scale, y: slot.scale, z: slot.scale,
            duration: 0.85, ease: 'power2.inOut', overwrite: true,
          });

          // Opacity — no onComplete
          gsap.to(mat, {
            opacity: slot.opacity,
            duration: 0.85, ease: 'power2.inOut', overwrite: true,
          });
        });
      };

      // ── Wheel handler — module-level variable ensures exactly one registration ─
      if (carouselWheelHandler) {
        window.removeEventListener('wheel', carouselWheelHandler);
      }
      let isAnimating = false;
      carouselWheelHandler = (e) => {
        e.preventDefault();
        if (isAnimating) return;
        isAnimating = true;

        // Safety fallback — resets the gate even if onComplete never fires
        // (e.g. Three.js disposal race or GSAP ticker pause)
        const safetyTimer = setTimeout(() => {
          isAnimating = false;
        }, 1000);

        if (e.deltaY > 0) {
          slots = [slots[2], slots[0], slots[1]];
        } else {
          slots = [slots[1], slots[2], slots[0]];
        }

        animateToSlots(() => {
          clearTimeout(safetyTimer);
          isAnimating = false;
        });
      };
      window.addEventListener('wheel', carouselWheelHandler, { passive: false });

      // ── Render loop ───────────────────────────────────────────────────────────
      const animate = () => {
        animFrameId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();

      // ── ResizeObserver ────────────────────────────────────────────────────────
      resizeObserver = new ResizeObserver(() => {
        const w = el.clientWidth, h = el.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });
      resizeObserver.observe(el);
    };

    init();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelled = true;   // stop any in-flight async init from proceeding
      if (animFrameId)   cancelAnimationFrame(animFrameId);
      if (carouselWheelHandler) {
        window.removeEventListener('wheel', carouselWheelHandler);
        carouselWheelHandler = null;
      }
      if (resizeObserver) resizeObserver.disconnect();
      cardGroups.forEach((g) => g.children.forEach((m) => m.geometry.dispose()));
      cardMaterials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      if (renderer) {
        renderer.forceContextLoss();
        renderer.dispose();
        if (el && el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', background: 'transparent' }} />;
};

export default CylinderCarousel;
