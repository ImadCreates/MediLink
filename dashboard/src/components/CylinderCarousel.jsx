import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

// ── Card definitions (brand accent colours per card) ──────────────────────────
const CARD_DATA = [
  {
    key        : 'dispatch',
    dot        : '#f43f5e',
    shineAccent: 'rgba(244,63,94,0.2)',
    gradTop    : 'rgba(244,63,94,0.22)',
    gradBottom : 'rgba(20,5,15,0.88)',
    borderAccent: 'rgba(244,63,94,0.25)',
    title      : 'Real-time Dispatch',
    body       : 'Instant alert routing from dispatcher to responder',
  },
  {
    key        : 'mobile',
    dot        : '#22d3ee',
    shineAccent: 'rgba(34,211,238,0.2)',
    gradTop    : 'rgba(34,211,238,0.22)',
    gradBottom : 'rgba(5,15,25,0.88)',
    borderAccent: 'rgba(34,211,238,0.25)',
    title      : 'Mobile Response',
    body       : 'Responders receive push alerts even when app is closed',
  },
  {
    key        : 'encrypted',
    dot        : '#00c853',
    shineAccent: 'rgba(0,200,83,0.2)',
    gradTop    : 'rgba(0,200,83,0.22)',
    gradBottom : 'rgba(5,20,10,0.88)',
    borderAccent: 'rgba(0,200,83,0.25)',
    title      : 'End-to-end Encrypted',
    body       : 'Firebase Auth + Firestore security rules protect every token',
  },
];

// ── Canvas helper: draw rounded-rect path ─────────────────────────────────────
function rrPath(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);      ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// ── Canvas texture per card ───────────────────────────────────────────────────
function makeCardTexture(card) {
  const CW = 420, CH = 600;
  const canvas = document.createElement('canvas');
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, CW, CH);

  // 1 — accent gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, CH);
  grad.addColorStop(0, card.gradTop);
  grad.addColorStop(1, card.gradBottom);
  ctx.fillStyle = grad;
  rrPath(ctx, 0, 0, CW, CH, 24);
  ctx.fill();

  // 2a — accent border (outer, coloured)
  ctx.strokeStyle = card.borderAccent;
  ctx.lineWidth = 1.5;
  rrPath(ctx, 1, 1, CW - 2, CH - 2, 23);
  ctx.stroke();

  // 2b — glass border (inner, white subtle)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  rrPath(ctx, 3, 3, CW - 6, CH - 6, 22);
  ctx.stroke();

  // 3 — top accent shine line
  const shine = ctx.createLinearGradient(40, 0, 380, 0);
  shine.addColorStop(0,   'rgba(0,0,0,0)');
  shine.addColorStop(0.5, card.shineAccent);
  shine.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.strokeStyle = shine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 24); ctx.lineTo(380, 24);
  ctx.stroke();

  // 4 — radial glow behind dot, then solid dot on top
  const glow = ctx.createRadialGradient(210, 120, 0, 210, 120, 50);
  glow.addColorStop(0, card.dot + '60');   // 8-char hex: accent @ 38% opacity
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(210, 120, 50, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = card.dot;
  ctx.beginPath();
  ctx.arc(210, 120, 14, 0, Math.PI * 2);
  ctx.fill();

  // 5 — title
  ctx.fillStyle    = '#ffffff';
  ctx.font         = '700 38px Sora, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(card.title, 210, 220);

  // 6 — body with word-wrap (max 280 px wide, 34 px leading)
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

// ── Component ─────────────────────────────────────────────────────────────────
const CylinderCarousel = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth;
    const H = el.clientHeight;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // ── Scene / Camera ────────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    camera.position.set(0, 0, 4.5);
    camera.lookAt(0, 0, 0);

    // ── Fixed slot definitions ────────────────────────────────────────────────
    // Cards are always animated TO these world-space positions, so rotY is
    // always absolute — no accumulation, no back-face surprises.
    // Maths: card at x=sin(85°)*R, z=cos(85°)*R with rotY=−85° has its
    // front-face normal dot-producting positively with the camera direction. ✓
    const RADIUS = 1.8;
    const S85    = Math.sin(1.483);  // sin 85° ≈ 0.9998
    const C85    = Math.cos(1.483);  // cos 85° ≈ 0.0872

    const SLOTS = [
      { x: 0,            z: RADIUS,       rotY: 0,      opacity: 1.0,  scale: 1.0  }, // 0: FRONT
      { x: -RADIUS*S85,  z: RADIUS*C85,   rotY: 1.483,  opacity: 0.38, scale: 0.75 }, // 1: LEFT
      { x:  RADIUS*S85,  z: RADIUS*C85,   rotY: -1.483, opacity: 0.38, scale: 0.75 }, // 2: RIGHT
    ];

    // ── Slot assignment ───────────────────────────────────────────────────────
    // slots[slotIdx] = cardIdx.  Initial: Mobile(1) front, Dispatch(0) left, Encrypted(2) right.
    let slots = [1, 0, 2];

    // ── Build card meshes ─────────────────────────────────────────────────────
    const cardGroups    = [];   // Three.Group per card, added directly to scene
    const cardMaterials = [];
    const textures      = [];

    CARD_DATA.forEach((card, cardIdx) => {
      const tex  = makeCardTexture(card);
      textures.push(tex);

      const initSlotIdx = slots.indexOf(cardIdx);
      const initSlot    = SLOTS[initSlotIdx];

      const mat = new THREE.MeshBasicMaterial({
        map       : tex,
        transparent: true,
        opacity   : initSlot.opacity,
        side      : THREE.FrontSide,    // FIX 1 — FrontSide prevents mirror artefact
        depthWrite: false,
      });
      cardMaterials.push(mat);

      const group = new THREE.Group();
      group.position.set(initSlot.x, 0, initSlot.z);
      group.rotation.y = initSlot.rotY;
      group.scale.setScalar(initSlot.scale);
      group.add(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.6), mat));

      scene.add(group);
      cardGroups.push(group);
    });

    // ── Entrance spring (staggered) ───────────────────────────────────────────
    cardGroups.forEach((group, i) => {
      const target = group.scale.x;          // remember real target scale
      group.scale.setScalar(0.01);
      gsap.to(group.scale, {
        x: target, y: target, z: target,
        duration: 1.1, ease: 'back.out(1.5)',
        delay: 0.6 + i * 0.06,
      });
    });

    // ── Animate every card to its current slot ────────────────────────────────
    const animateToSlots = () => {
      slots.forEach((cardIdx, slotIdx) => {
        const slot  = SLOTS[slotIdx];
        const group = cardGroups[cardIdx];
        const mat   = cardMaterials[cardIdx];

        gsap.to(group.position, {
          x: slot.x, z: slot.z,
          duration: 0.85, ease: 'power2.inOut', overwrite: true,
        });
        gsap.to(group.rotation, {
          y: slot.rotY,
          duration: 0.85, ease: 'power2.inOut', overwrite: true,
        });
        gsap.to(group.scale, {
          x: slot.scale, y: slot.scale, z: slot.scale,
          duration: 0.85, ease: 'power2.inOut', overwrite: true,
        });
        gsap.to(mat, {
          opacity: slot.opacity,
          duration: 0.85, ease: 'power2.inOut', overwrite: true,
        });
      });
    };

    // ── Wheel handler — infinite, bidirectional ───────────────────────────────
    // Scroll DOWN: RIGHT card → FRONT, FRONT → LEFT,  LEFT  → RIGHT
    // Scroll UP:   LEFT  card → FRONT, FRONT → RIGHT, RIGHT → LEFT
    let isAnimating = false;

    const handleWheel = (e) => {
      e.preventDefault();
      if (isAnimating) return;
      isAnimating = true;

      if (e.deltaY > 0) {
        slots = [slots[2], slots[0], slots[1]];   // rotate forward
      } else {
        slots = [slots[1], slots[2], slots[0]];   // rotate backward
      }

      animateToSlots();
      gsap.delayedCall(0.87, () => { isAnimating = false; });
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    // ── Render loop ───────────────────────────────────────────────────────────
    let raf;
    const tick = () => { raf = requestAnimationFrame(tick); renderer.render(scene, camera); };
    raf = requestAnimationFrame(tick);

    // ── ResizeObserver ────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(el);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('wheel', handleWheel);
      ro.disconnect();
      cardGroups.forEach((g) => g.children.forEach((m) => m.geometry.dispose()));
      cardMaterials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.forceContextLoss();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', background: 'transparent' }} />;
};

export default CylinderCarousel;
