/* =====================================================================
   COSMORAT - MOTOR
   Escalado pixel art, cambio de escenas, dibujo, textos, diálogos,
   partículas, estrellas y guardado de progreso.
   ===================================================================== */
(function () {
  'use strict';
  const CR = (window.CR = window.CR || {});

  CR.W = 320; // resolución interna (pixeles del juego)
  CR.H = 180;

  /* ---------------- Utilidades ---------------- */
  CR.rand = (a, b) => a + Math.random() * (b - a);
  CR.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  CR.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  CR.lerp = (a, b, t) => a + (b - a) * t;
  CR.ease = {
    out: (t) => 1 - Math.pow(1 - CR.clamp(t, 0, 1), 3),
    inOut: (t) => {
      t = CR.clamp(t, 0, 1);
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    back: (t) => {
      t = CR.clamp(t, 0, 1);
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    bounce: (t) => {
      t = CR.clamp(t, 0, 1);
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
  };

  /* ---------------- Estado y guardado ---------------- */
  CR.state = { hero: 'yazeth', captured: 'jero', quesos: 0, oro: 0 };
  CR.other = (k) => (k === 'jero' ? 'yazeth' : 'jero');
  CR.name = (k) => CR.CONFIG.personajes[k].nombre;
  CR.color = (k) => CR.CONFIG.personajes[k].rata.accesorio;
  CR.fmt = (s) =>
    String(s)
      .replace(/\{heroe\}/g, CR.name(CR.state.hero))
      .replace(/\{capturado\}/g, CR.name(CR.state.captured))
      .replace(/\{quesos\}/g, CR.CONFIG.quesosNecesarios);

  CR.save = {
    key: 'cosmorat_progreso_v1',
    get() {
      try { return JSON.parse(localStorage.getItem(this.key)) || null; } catch (e) { return null; }
    },
    set(o) {
      try { localStorage.setItem(this.key, JSON.stringify(o)); } catch (e) { /* sin guardado */ }
    },
  };

  // Premios desbloqueados (carta, foto, vale)
  CR.premios = {
    key: 'cosmorat_premios_v1',
    get() { try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { return {}; } },
    add(n) { const p = this.get(); p[n] = true; try { localStorage.setItem(this.key, JSON.stringify(p)); } catch (e) { /* nada */ } },
    any() { const p = this.get(); return !!(p[1] || p[2] || p[3]); },
  };

  // Triángulo relleno por líneas (bordes pixel art)
  CR.tri = function (x0, y0, x1, y1, x2, y2, c) {
    const pts = [[x0, y0], [x1, y1], [x2, y2]].sort((a, b) => a[1] - b[1]);
    const [A, B, C] = pts;
    const edge = (P, Q, y) => (Q[1] === P[1] ? P[0] : P[0] + ((Q[0] - P[0]) * (y - P[1])) / (Q[1] - P[1]));
    for (let y = Math.ceil(A[1]); y <= Math.floor(C[1]); y++) {
      const xa = edge(A, C, y), xb = y < B[1] ? edge(A, B, y) : edge(B, C, y);
      const l = Math.round(Math.min(xa, xb)), r = Math.round(Math.max(xa, xb));
      if (r >= l) CR.g.rect(l, y, r - l + 1, 1, c);
    }
  };

  /* ---------------- Motor ---------------- */
  const E = (CR.engine = {
    scenes: {}, scene: null, current: '', t: 0, last: 0, S: 4,
    fadeA: 1, next: null, shakeT: 0, shakeA: 0, flashA: 0, paused: false,
  });

  CR.scene = (name, factory) => { E.scenes[name] = factory; };
  CR.shake = (a, d) => { E.shakeA = Math.max(E.shakeT > 0 ? E.shakeA : 0, a); E.shakeT = Math.max(E.shakeT, d); };
  CR.flash = (a) => { E.flashA = a == null ? 1 : a; };

  E.init = function (canvas) {
    E.canvas = canvas;
    E.ctx = canvas.getContext('2d');
    window.addEventListener('resize', E.resize);
    window.addEventListener('orientationchange', () => setTimeout(E.resize, 250));
    E.resize();
  };

  E.resize = function () {
    const vw = window.innerWidth, vh = window.innerHeight;
    const fit = Math.min(vw / CR.W, vh / CR.H);
    const dpr = window.devicePixelRatio || 1;
    E.S = CR.clamp(Math.ceil(fit * dpr), 2, 8);
    E.canvas.width = CR.W * E.S;
    E.canvas.height = CR.H * E.S;
    E.canvas.style.width = Math.floor(CR.W * fit) + 'px';
    E.canvas.style.height = Math.floor(CR.H * fit) + 'px';
    E.ctx.imageSmoothingEnabled = false;
    const rot = document.getElementById('rotate');
    if (rot) rot.style.display = CR.input.isTouch && vh > vw * 1.05 ? 'flex' : 'none';
  };

  E.start = function (name, params) {
    E._enter(name, params);
    E.fadeA = 1;
    requestAnimationFrame(E.loop);
  };

  E._enter = function (name, params) {
    E.current = name;
    E.paused = false;
    E.shakeT = 0;
    E.scene = E.scenes[name](params || {});
  };

  E.go = function (name, params) {
    if (E.next) return;
    E.next = { name, params };
  };

  E.loop = function (ts) {
    const dt = E.last ? Math.min(0.05, (ts - E.last) / 1000) : 1 / 60;
    E.last = ts;
    E.t += dt;
    E.handleUI();
    if (!E.paused && E.scene && E.scene.update) E.scene.update(dt);

    if (E.next) {
      E.fadeA += dt * 2.3;
      if (E.fadeA >= 1) {
        E.fadeA = 1;
        const n = E.next;
        E.next = null;
        E._enter(n.name, n.params);
      }
    } else if (E.fadeA > 0) {
      E.fadeA = Math.max(0, E.fadeA - dt * 1.8);
    }
    if (E.shakeT > 0) E.shakeT -= dt;
    if (E.flashA > 0) E.flashA = Math.max(0, E.flashA - dt * 1.1);

    E.render();
    CR.input.endFrame();
    requestAnimationFrame(E.loop);
  };

  const BTN_MUTE = { x: 302, y: 3, w: 15, h: 13 };
  const BTN_PAUSE = { x: 285, y: 3, w: 15, h: 13 };

  E.handleUI = function () {
    const I = CR.input;
    if (I.hit('KeyM') || I.tapIn(BTN_MUTE.x - 2, BTN_MUTE.y - 2, BTN_MUTE.w + 4, BTN_MUTE.h + 4)) CR.audio.toggleMute();
    const canPause = E.scene && E.scene.pausable && !E.next;
    if (canPause && (I.hit('KeyP', 'Escape') || I.tapIn(BTN_PAUSE.x - 2, BTN_PAUSE.y - 2, BTN_PAUSE.w + 4, BTN_PAUSE.h + 4))) {
      E.paused = !E.paused;
      CR.audio.sfx.select();
      return;
    }
    if (E.paused && I.confirm()) E.paused = false;
  };

  E.render = function () {
    const ctx = E.ctx, S = E.S;
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#07040f';
    ctx.fillRect(0, 0, CR.W, CR.H);

    ctx.save();
    if (E.shakeT > 0 && !E.paused) {
      ctx.translate(Math.round(CR.rand(-E.shakeA, E.shakeA)), Math.round(CR.rand(-E.shakeA, E.shakeA)));
    }
    if (E.scene && E.scene.draw) E.scene.draw(ctx);
    ctx.restore();

    if (E.flashA > 0) {
      ctx.globalAlpha = Math.min(1, E.flashA);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CR.W, CR.H);
      ctx.globalAlpha = 1;
    }
    if (E.paused) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#07040f';
      ctx.fillRect(0, 0, CR.W, CR.H);
      ctx.globalAlpha = 1;
      G.text('PAUSA', 160, 74, { size: 16, align: 'center', color: '#ffd23f' });
      G.text(CR.input.isTouch ? 'Toca para seguir' : 'P o ENTER para seguir', 160, 100, { size: 8, align: 'center' });
    }
    E.drawButtons(ctx);
    if (E.fadeA > 0) E.drawTransition(ctx, E.fadeA);
  };

  // Transición pixel art: rombos que crecen en diagonal
  E.drawTransition = function (ctx, a) {
    if (a >= 0.999) { ctx.fillStyle = '#07040f'; ctx.fillRect(0, 0, CR.W, CR.H); return; }
    ctx.fillStyle = '#07040f';
    const C = 16;
    for (let cy = 0; cy <= CR.H / C; cy++) {
      for (let cx = 0; cx <= CR.W / C; cx++) {
        const k = CR.clamp(a * 1.8 - ((cx + cy) / (CR.W / C + CR.H / C)) * 0.8, 0, 1);
        const r = Math.round(k * C);
        if (r <= 0) continue;
        const x0 = cx * C, y0 = cy * C;
        for (let dy = -r; dy <= r; dy++) {
          const w = r - Math.abs(dy);
          ctx.fillRect(x0 - w, y0 + dy, w * 2 + 1, 1);
        }
      }
    }
  };

  E.drawButtons = function (ctx) {
    const m = BTN_MUTE;
    ctx.globalAlpha = 0.85;
    G.box(m.x, m.y, m.w, m.h, { fill: 'rgba(18,8,38,0.75)', border: '#6b5884' });
    G.rect(m.x + 3, m.y + 5, 2, 3, '#e9ddff');
    G.rect(m.x + 5, m.y + 4, 1, 5, '#e9ddff');
    G.rect(m.x + 6, m.y + 3, 1, 7, '#e9ddff');
    if (CR.audio.isMuted()) {
      for (let i = 0; i < 4; i++) {
        G.rect(m.x + 8 + i, m.y + 4 + i, 1, 1, '#ff4d6d');
        G.rect(m.x + 11 - i, m.y + 4 + i, 1, 1, '#ff4d6d');
      }
    } else {
      G.rect(m.x + 9, m.y + 5, 1, 3, '#e9ddff');
      G.rect(m.x + 11, m.y + 4, 1, 5, '#e9ddff');
    }
    if (E.scene && E.scene.pausable) {
      const p = BTN_PAUSE;
      G.box(p.x, p.y, p.w, p.h, { fill: 'rgba(18,8,38,0.75)', border: '#6b5884' });
      G.rect(p.x + 4, p.y + 3, 2, 7, '#e9ddff');
      G.rect(p.x + 9, p.y + 3, 2, 7, '#e9ddff');
    }
    ctx.globalAlpha = 1;
  };

  /* ---------------- Dibujo ---------------- */
  const G = (CR.g = {});

  G.rect = (x, y, w, h, c) => {
    const ctx = E.ctx;
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  G.font = (size) => size + 'px "Press Start 2P", monospace';

  G.text = function (str, x, y, o) {
    o = o || {};
    const ctx = E.ctx, size = o.size || 8;
    // la fuente pixel no trae mayúsculas acentuadas: se usan sin acento
    str = String(str).replace(/[ÁÉÍÓÚ]/g, (m) => ({ Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U' })[m]);
    ctx.font = G.font(size);
    ctx.textBaseline = 'top';
    ctx.textAlign = o.align || 'left';
    x = Math.round(x);
    y = Math.round(y);
    const prevA = ctx.globalAlpha;
    if (o.alpha != null) ctx.globalAlpha = prevA * o.alpha;
    if (o.outline) {
      ctx.fillStyle = o.outline;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, 2], [1, 2]]) ctx.fillText(str, x + dx, y + dy);
    } else if (o.shadow !== false) {
      ctx.fillStyle = o.shadowColor || '#120826';
      ctx.fillText(str, x + 1, y + 1);
    }
    ctx.fillStyle = o.color || '#ffffff';
    ctx.fillText(str, x, y);
    ctx.globalAlpha = prevA;
  };

  // Corta un texto en líneas de máximo maxChars caracteres (la fuente es monoespaciada)
  G.wrap = function (str, maxChars) {
    const out = [];
    String(str).split('\n').forEach((par) => {
      let line = '';
      par.split(' ').forEach((w) => {
        while (w.length > maxChars) {
          if (line) { out.push(line); line = ''; }
          out.push(w.slice(0, maxChars));
          w = w.slice(maxChars);
        }
        if (!line) line = w;
        else if ((line + ' ' + w).length <= maxChars) line += ' ' + w;
        else { out.push(line); line = w; }
      });
      out.push(line);
    });
    return out;
  };

  G.circle = function (cx, cy, r, c) {
    const ctx = E.ctx;
    ctx.fillStyle = c;
    cx = Math.round(cx);
    cy = Math.round(cy);
    r = Math.max(0, Math.round(r));
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8));
      ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  };

  G.ellipse = function (cx, cy, rx, ry, c) {
    const ctx = E.ctx;
    ctx.fillStyle = c;
    cx = Math.round(cx);
    cy = Math.round(cy);
    for (let dy = -ry; dy <= ry; dy++) {
      const dx = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))));
      ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  };

  G.line = function (x0, y0, x1, y1, c, dash) {
    const d = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= d; i++) {
      if (dash && Math.floor(i / dash) % 2 === 1) continue;
      const k = d ? i / d : 0;
      G.rect(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 1, 1, c);
    }
  };

  // Panel pixel art con esquinas recortadas
  G.box = function (x, y, w, h, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const fill = o.fill || 'rgba(18,8,38,0.92)';
    const border = o.border || '#b388ff';
    G.rect(x + 1, y, w - 2, h, fill);
    G.rect(x, y + 1, 1, h - 2, fill);
    G.rect(x + w - 1, y + 1, 1, h - 2, fill);
    G.rect(x + 1, y, w - 2, 1, border);
    G.rect(x + 1, y + h - 1, w - 2, 1, border);
    G.rect(x, y + 1, 1, h - 2, border);
    G.rect(x + w - 1, y + 1, 1, h - 2, border);
  };

  G.button = function (x, y, w, h, label, o) {
    o = o || {};
    const pulse = 0.5 + 0.5 * Math.sin(E.t * 5);
    G.box(x, y, w, h, { fill: o.fill || '#2a1650', border: o.border || (pulse > 0.5 ? '#ff5fa2' : '#ffb3d6') });
    G.text(label, x + w / 2, y + Math.floor((h - (o.size || 8)) / 2) + 1, { size: o.size || 8, align: 'center', color: o.color || '#ffffff' });
  };

  G.arrowDown = function (x, y, c) {
    G.rect(x - 3, y, 7, 1, c);
    G.rect(x - 2, y + 1, 5, 1, c);
    G.rect(x - 1, y + 2, 3, 1, c);
    G.rect(x, y + 3, 1, 1, c);
  };

  // Globo de diálogo que apunta a (x, y)
  G.bubble = function (text, x, y, o) {
    o = o || {};
    const size = o.size || 6, maxW = o.maxW || 120;
    const lines = G.wrap(text, Math.floor(maxW / size));
    const w = Math.max.apply(null, lines.map((l) => l.length)) * size + 8;
    const h = lines.length * (size + 3) + 5;
    const below = !!o.below;
    let bx = Math.round(CR.clamp(x - w / 2, 2, CR.W - 2 - w));
    let by = Math.round(below ? y + 5 : y - h - 5);
    by = CR.clamp(by, 2, CR.H - 2 - h);
    const fill = o.fill || '#fdf6ff', border = o.border || '#2a1650';
    G.box(bx, by, w, h, { fill, border });
    const tx = Math.round(CR.clamp(x, bx + 4, bx + w - 5));
    if (below) {
      G.rect(tx - 1, by - 2, 3, 2, fill);
      G.rect(tx, by - 4, 1, 2, fill);
      G.rect(tx - 2, by - 2, 1, 1, border); G.rect(tx + 2, by - 2, 1, 1, border);
    } else {
      G.rect(tx - 1, by + h - 1, 3, 2, fill);
      G.rect(tx, by + h + 1, 1, 2, fill);
      G.rect(tx - 2, by + h, 1, 1, border); G.rect(tx + 2, by + h, 1, 1, border);
    }
    lines.forEach((l, i) => G.text(l, bx + 4, by + 3 + i * (size + 3), { size, color: o.color || '#2a1650', shadow: false }));
  };

  /* ---------------- Texto que se escribe letra por letra ---------------- */
  CR.Typer = class {
    constructor(text, o) {
      o = o || {};
      this.size = o.size || 8;
      this.lh = o.lh || this.size + 3;
      this.maxC = Math.floor((o.width || 280) / this.size);
      this.lines = G.wrap(text, this.maxC);
      this.total = this.lines.reduce((a, l) => a + l.length, 0);
      this.n = 0;
      this.cps = o.cps || 35;
      this.lastBlip = 0;
      this.silent = !!o.silent;
    }
    get done() { return this.n >= this.total; }
    get height() { return this.lines.length * this.lh; }
    finish() { this.n = this.total; }
    update(dt) {
      if (this.done) return;
      this.n = Math.min(this.total, this.n + dt * this.cps);
      const k = Math.floor(this.n / 2);
      if (!this.silent && k !== this.lastBlip) { this.lastBlip = k; CR.audio.sfx.blip(); }
    }
    draw(x, y, o) {
      o = o || {};
      let left = Math.floor(this.n);
      for (let i = 0; i < this.lines.length && left > 0; i++) {
        const full = this.lines[i];
        const s = full.slice(0, left);
        left -= full.length;
        const lx = o.center ? x - (full.length * this.size) / 2 : x;
        G.text(s, lx, y + i * this.lh, { size: this.size, color: o.color || '#ffffff', shadow: o.shadow });
      }
    }
  };

  /* ---------------- Diálogos estilo RPG ---------------- */
  CR.Dialog = class {
    constructor() { this.queue = []; this.cur = null; this.onDone = null; this.blink = 0; }
    say(lines, onDone) {
      lines.forEach((l) => this.queue.push(l));
      this.onDone = onDone || null;
      if (!this.cur) this._next();
    }
    get active() { return !!this.cur; }
    _next() {
      const l = this.queue.shift();
      if (!l) {
        this.cur = null;
        const f = this.onDone;
        this.onDone = null;
        if (f) f();
        return;
      }
      const face = CR.faceFor ? CR.faceFor(l.who) : null;
      this.cur = Object.assign({}, l, { face, pop: 0, typer: new CR.Typer(CR.fmt(l.text), { width: face ? 248 : 280, size: 8, lh: 11, cps: 31 }) });
    }
    update(dt) {
      if (!this.cur) return;
      this.blink += dt;
      this.cur.pop = Math.min(1, this.cur.pop + dt * 6);
      this.cur.typer.update(dt);
      if (CR.input.confirm()) {
        if (!this.cur.typer.done) this.cur.typer.finish();
        else { CR.audio.sfx.select(); this._next(); }
      }
    }
    draw() {
      if (!this.cur) return;
      const c = this.cur, col = c.color || '#b388ff';
      const yo = Math.round((1 - CR.ease.back(c.pop)) * (this.top ? -12 : 12));
      const by = this.top ? 8 : 130;
      E.ctx.save();
      E.ctx.translate(0, yo);
      G.box(6, by, 308, 46, { border: col });
      G.rect(7, by + 1, 306, 1, CR.mix(col, '#1d0f3a', 0.55));
      const tx = c.face ? 50 : 14;
      if (c.face) {
        G.box(10, by + 4, 36, 38, { fill: '#2a1650', border: col });
        E.ctx.save();
        E.ctx.beginPath();
        E.ctx.rect(11, by + 5, 34, 36);
        E.ctx.clip();
        G.rect(11, by + 5, 34, 36, CR.mix(col, '#140a26', 0.7));
        G.rect(11, by + 29, 34, 12, CR.mix(col, '#140a26', 0.82));
        CR.drawFace(E.ctx, c.face, 28, by + 23, !c.typer.done, E.t);
        E.ctx.restore();
      }
      if (c.who) {
        const name = CR.fmt(c.who).toUpperCase(), ny = this.top ? by + 44 : by - 7;
        G.box(tx - 2, ny, name.length * 6 + 10, 11, { fill: '#1d0f3a', border: col });
        G.text(name, tx + 3, ny + 3, { size: 6, color: col });
      }
      c.typer.draw(tx, by + 8);
      if (c.typer.done) G.arrowDown(304, by + 38 + (Math.floor(this.blink * 4) % 2), col);
      E.ctx.restore();
    }
  };

  // Polvito al correr
  CR.dust = function (fx, x, y, dir, color) {
    for (let i = 0; i < 2; i++) fx.add({ type: 'dust', x: x + CR.rand(-1, 1), y: y - CR.rand(0, 2), vx: -dir * CR.rand(8, 18), vy: -CR.rand(4, 10), drag: 3, life: CR.rand(0.35, 0.6), color: color || '#8b7fb0' });
  };
  // Confeti de colores
  CR.confetti = function (fx, x, y, n) {
    const cols = ['#ff5fa2', '#ffd23f', '#38e1ff', '#b388ff', '#5eead4', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const a = CR.rand(-Math.PI * 0.95, -Math.PI * 0.05), sp = CR.rand(40, 110);
      fx.add({ type: 'confetti', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 90, drag: 1.2, wob: 18, wobF: CR.rand(4, 8), ph: Math.random() * 6, life: CR.rand(1.6, 2.6), color: CR.pick(cols) });
    }
  };

  // Convierte [['{heroe}', 'texto'], ...] en líneas de diálogo con color
  CR.lines = function (arr) {
    return arr.map(([who, text]) => ({
      who, text,
      color: who === '{heroe}' ? CR.color(CR.state.hero) : who === '{capturado}' ? CR.color(CR.state.captured) : who === 'GUARDIA' ? '#f39c34' : '#ff6b6b',
    }));
  };

  /* ---------------- Secuenciador de cinemáticas ----------------
     Cada paso: { d: segundos, enter(), tick(k, dt, t), exit() }
     o { say: [líneas de diálogo] } que espera a que termine el diálogo. */
  CR.Seq = class {
    constructor(steps, dlg) { this.steps = steps; this.i = 0; this.t = 0; this.started = false; this.dlg = dlg; }
    get done() { return this.i >= this.steps.length; }
    get name() { const s = this.steps[this.i]; return s ? s.name || '' : 'fin'; }
    update(dt) {
      const s = this.steps[this.i];
      if (!s) return;
      if (!this.started) {
        this.started = true;
        this.t = 0;
        this.waiting = false;
        if (s.enter) s.enter();
        if (s.say) { this.waiting = true; this.dlg.say(s.say.map((l) => Object.assign({}, l)), () => { this.waiting = false; }); }
      }
      if (s.say) { if (!this.waiting) this._next(); return; }
      if (s.until) { if (s.tick) s.tick(0, dt, this.t); this.t += dt; if (s.until()) this._next(); return; }
      this.t += dt;
      const k = Math.min(1, this.t / s.d);
      if (s.tick) s.tick(k, dt, this.t);
      if (this.t >= s.d) this._next();
    }
    _next() { const s = this.steps[this.i]; if (s && s.exit) s.exit(); this.i++; this.started = false; }
  };

  /* ---------------- Fondo de estrellas ---------------- */
  CR.Starfield = class {
    constructor(n, shooting) {
      this.s = [];
      this.t = 0;
      this.shoot = [];
      this.shootOn = shooting !== false;
      for (let i = 0; i < (n || 100); i++) {
        this.s.push({
          x: CR.rand(0, CR.W), y: CR.rand(0, CR.H),
          z: CR.pick([1, 1, 1, 2, 2, 3]), ph: CR.rand(0, 6.28), sp: CR.rand(1, 4),
          c: CR.pick(['#ffffff', '#ffe9a8', '#a8d8ff', '#ffc2e8']),
        });
      }
    }
    update(dt, vx, vy) {
      this.t += dt;
      vx = vx || 0; vy = vy || 0;
      if (this.shootOn && Math.random() < dt * 0.22) {
        const a = CR.rand(2.4, 2.8);
        this.shoot.push({ x: CR.rand(60, 340), y: CR.rand(-5, 70), vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, life: CR.rand(0.5, 0.8), age: 0 });
      }
      for (const s of this.shoot) { s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt; }
      this.shoot = this.shoot.filter((s) => s.age < s.life);
      for (const s of this.s) {
        s.x -= vx * s.z * dt;
        s.y -= vy * s.z * dt;
        if (s.x < -4) { s.x += CR.W + 8; s.y = CR.rand(0, CR.H); }
        if (s.x > CR.W + 4) s.x -= CR.W + 8;
        if (s.y < -4) s.y += CR.H + 8;
        if (s.y > CR.H + 4) s.y -= CR.H + 8;
      }
    }
    draw(ctx, alpha, streak, maxY) {
      alpha = alpha == null ? 1 : alpha;
      for (const s of this.s) {
        if (maxY && s.y > maxY) continue;
        const b = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(this.t * s.sp + s.ph));
        ctx.globalAlpha = alpha * b * (s.z === 1 ? 0.6 : 1);
        ctx.fillStyle = s.c;
        const x = Math.round(s.x), y = Math.round(s.y);
        if (streak > 1 && s.z > 1) ctx.fillRect(x, y, Math.round(streak * s.z), 1);
        else ctx.fillRect(x, y, 1, 1);
        if (s.z === 3 && b > 0.85) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
      }
      for (const s of this.shoot) {
        if (maxY && s.y > maxY) continue;
        const k = 1 - s.age / s.life, len = 9;
        for (let i = 0; i < len; i++) {
          ctx.globalAlpha = alpha * k * (1 - i / len);
          ctx.fillStyle = i < 2 ? '#ffffff' : '#c4b5fd';
          ctx.fillRect(Math.round(s.x - (s.vx / 170) * i), Math.round(s.y - (s.vy / 170) * i), 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    }
  };

  /* ---------------- Partículas ---------------- */
  CR.Particles = class {
    constructor() { this.list = []; }
    add(p) {
      this.list.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 1, age: 0, size: 1, color: '#ffffff', type: 'px' }, p));
    }
    burst(x, y, n, o) {
      o = o || {};
      for (let i = 0; i < n; i++) {
        const a = CR.rand(0, Math.PI * 2), sp = CR.rand(o.min || 15, o.max || 55);
        this.add({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: CR.rand(0.35, o.life || 0.9),
          color: Array.isArray(o.color) ? CR.pick(o.color) : o.color || '#ffffff',
          size: o.size || 1, g: o.g || 0, type: o.type || 'px',
        });
      }
    }
    update(dt) {
      for (const p of this.list) {
        p.age += dt;
        p.vy += p.g * dt;
        if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
        p.x += p.vx * dt + (p.wob ? Math.sin(p.age * (p.wobF || 3) + (p.ph || 0)) * p.wob * dt : 0);
        p.y += p.vy * dt;
      }
      this.list = this.list.filter((p) => p.age < p.life);
    }
    draw(ctx) {
      for (const p of this.list) {
        const a = CR.clamp((1 - p.age / p.life) * 1.6, 0, 1);
        ctx.globalAlpha = a;
        if (p.type === 'px') G.rect(p.x, p.y, p.size, p.size, p.color);
        else if (p.type === 'tear') { G.rect(p.x, p.y, 1, 2, '#7dd3fc'); G.rect(p.x, p.y, 1, 1, '#e0f7ff'); }
        else if (p.type === 'confetti') {
          const f = Math.floor(p.age * 10 + (p.ph || 0) * 3) % 3;
          G.rect(p.x, p.y, f === 1 ? 1 : 2, f === 1 ? 2 : 1, p.color);
        } else if (p.type === 'firefly') {
          const on = 0.5 + 0.5 * Math.sin(p.age * 4 + (p.ph || 0));
          ctx.globalAlpha = a * 0.25 * on;
          G.rect(p.x - 1, p.y - 1, 3, 3, p.color);
          ctx.globalAlpha = a * (0.4 + 0.6 * on);
          G.rect(p.x, p.y, 1, 1, '#fffbe0');
        } else if (p.type === 'dust') {
          const sz = p.age / p.life < 0.5 ? 2 : 1;
          G.rect(p.x, p.y, sz, sz, p.color);
        }
        else if (p.type === 'star') {
          G.rect(p.x - 1, p.y, 3, 1, p.color);
          G.rect(p.x, p.y - 1, 1, 3, p.color);
        } else if (p.type === 'heart') CR.drawSprite(ctx, CR.SPR.miniHeart, p.x - 2, p.y - 2);
        else if (p.type === 'text') {
          ctx.globalAlpha = 1;
          G.text(p.text, p.x, p.y, { size: p.size > 1 ? p.size : 6, align: 'center', color: p.color, alpha: a });
        }
      }
      ctx.globalAlpha = 1;
    }
  };
})();
