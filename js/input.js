/* =====================================================================
   COSMORAT - CONTROLES
   Teclado (compu) y toques / mouse (iPad y compu), más joystick virtual.
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR;

  const I = (CR.input = {
    keys: {},
    just: {},
    tap: null,
    pointers: new Map(),
    lastPointer: null,
    isTouch: (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window,
  });

  const PREVENT = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

  window.addEventListener('keydown', (e) => {
    if (PREVENT.includes(e.code)) e.preventDefault();
    if (!I.keys[e.code]) I.just[e.code] = true;
    I.keys[e.code] = true;
    CR.audio.unlock();
  });
  window.addEventListener('keyup', (e) => { I.keys[e.code] = false; });
  window.addEventListener('blur', () => { I.keys = {}; I.pointers.clear(); I.lastPointer = null; });

  // Convierte coordenadas de pantalla a pixeles del juego (320x180)
  I.toGame = function (cx, cy) {
    const r = CR.engine.canvas.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * CR.W, y: ((cy - r.top) / r.height) * CR.H };
  };

  function onDown(e) {
    if (e.cancelable) e.preventDefault();
    if (e.pointerType === 'touch' || e.pointerType === 'pen') I.isTouch = true;
    const p = I.toGame(e.clientX, e.clientY);
    const ptr = { id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y };
    I.pointers.set(e.pointerId, ptr);
    I.lastPointer = ptr;
    I.tap = { x: p.x, y: p.y, used: false };
    CR.audio.unlock();
  }
  function onMove(e) {
    const ptr = I.pointers.get(e.pointerId);
    if (!ptr) return;
    const p = I.toGame(e.clientX, e.clientY);
    ptr.x = p.x;
    ptr.y = p.y;
  }
  function onUp(e) {
    I.pointers.delete(e.pointerId);
    if (I.lastPointer && I.lastPointer.id === e.pointerId) {
      const rest = Array.from(I.pointers.values());
      I.lastPointer = rest.length ? rest[rest.length - 1] : null;
    }
  }

  window.addEventListener('pointerdown', onDown, { passive: false });
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  // Evita zoom y scroll accidentales en iPad
  document.addEventListener('touchmove', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  I.down = (...codes) => codes.some((c) => I.keys[c]);
  I.hit = (...codes) => codes.some((c) => I.just[c]);
  I.held = (ptr) => !!ptr && I.pointers.has(ptr.id);

  // "Aceptar": ENTER, ESPACIO o un toque en cualquier parte
  I.confirm = function () {
    if (I.hit('Enter', 'Space', 'NumpadEnter')) return true;
    if (I.tap && !I.tap.used) { I.tap.used = true; return true; }
    return false;
  };

  // Toque dentro de un rectángulo (botones)
  I.tapIn = function (x, y, w, h) {
    const t = I.tap;
    if (t && !t.used && t.x >= x && t.x <= x + w && t.y >= y && t.y <= y + h) { t.used = true; return true; }
    return false;
  };

  I.axis = function () {
    let x = 0, y = 0;
    if (I.down('ArrowLeft', 'KeyA')) x -= 1;
    if (I.down('ArrowRight', 'KeyD')) x += 1;
    if (I.down('ArrowUp', 'KeyW')) y -= 1;
    if (I.down('ArrowDown', 'KeyS')) y += 1;
    return { x, y };
  };

  I.endFrame = function () { I.just = {}; I.tap = null; };

  /* ---------------- Joystick virtual (iPad) ---------------- */
  CR.Joystick = class {
    constructor() { this.id = null; this.bx = 0; this.by = 0; this.kx = 0; this.ky = 0; this.vx = 0; this.vy = 0; }
    get active() { return this.id !== null; }
    update() {
      if (this.id !== null && !I.pointers.has(this.id)) { this.id = null; this.vx = this.vy = this.kx = this.ky = 0; }
      if (this.id === null) {
        for (const p of I.pointers.values()) {
          if (p.sx < 180 && p.sy > 30) { this.id = p.id; this.bx = p.sx; this.by = p.sy; break; }
        }
      }
      if (this.id !== null) {
        const p = I.pointers.get(this.id), R = 20;
        let dx = p.x - this.bx, dy = p.y - this.by;
        const d = Math.hypot(dx, dy);
        if (d > R) { dx *= R / d; dy *= R / d; }
        this.kx = dx; this.ky = dy;
        this.vx = d < 3 ? 0 : dx / R;
        this.vy = d < 3 ? 0 : dy / R;
      }
    }
    draw(ctx) {
      if (!I.isTouch) return;
      const G = CR.g;
      if (this.id === null) {
        ctx.globalAlpha = 0.22;
        G.circle(34, 146, 18, '#e9ddff');
        ctx.globalAlpha = 0.35;
        G.circle(34, 146, 7, '#ffffff');
        ctx.globalAlpha = 1;
        return;
      }
      ctx.globalAlpha = 0.25;
      G.circle(this.bx, this.by, 20, '#e9ddff');
      ctx.globalAlpha = 0.6;
      G.circle(this.bx + this.kx, this.by + this.ky, 8, '#ffffff');
      ctx.globalAlpha = 1;
    }
  };
})();
