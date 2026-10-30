/* =====================================================================
   COSMORAT - FONDOS PINTADOS
   Se generan una sola vez al entrar a cada escena: degradados con
   tramado, nebulosas con ruido, montañas por capas, ladrillos, etc.
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR;

  /* ---------------- Ruido ---------------- */
  function hash(x, y, seed) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 982451653);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, seed, oct) {
    oct = oct || 4;
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, seed + i * 31); n += a; f *= 2; a *= 0.5; }
    return s / n;
  }
  const smooth = (a, b, x) => { const t = CR.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  CR.hash = hash;
  CR.fbm = fbm;

  /* ---------------- Lienzo de pixeles ---------------- */
  class Pix {
    constructor(w, h) {
      this.w = w; this.h = h;
      this.c = document.createElement('canvas');
      this.c.width = w; this.c.height = h;
      this.ctx = this.c.getContext('2d');
      this.img = this.ctx.createImageData(w, h);
      this.d = this.img.data;
    }
    set(x, y, hex, a) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const [r, g, b] = CR.hexToRgb(hex), i = (y * this.w + x) * 4, d = this.d;
      if (a == null || a >= 1) { d[i] = r; d[i + 1] = g; d[i + 2] = b; }
      else { d[i] += (r - d[i]) * a; d[i + 1] += (g - d[i + 1]) * a; d[i + 2] += (b - d[i + 2]) * a; }
      d[i + 3] = 255;
    }
    done() { this.ctx.putImageData(this.img, 0, 0); this.ctx.imageSmoothingEnabled = false; return this.c; }
  }
  CR.Pix = Pix;

  // Brillo suave (círculos semitransparentes) sobre un contexto
  function glow(ctx, x, y, r, color, a) {
    ctx.fillStyle = color;
    for (let k = 3; k >= 1; k--) {
      ctx.globalAlpha = (a || 0.12) * (4 - k) / 3;
      const rr = Math.round((r * k) / 3);
      for (let dy = -rr; dy <= rr; dy++) {
        const dx = Math.floor(Math.sqrt(rr * rr - dy * dy));
        ctx.fillRect(Math.round(x) - dx, Math.round(y) + dy, dx * 2 + 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }
  CR.glow = glow;

  /* ---------------- Planetas y luna ---------------- */
  function paintPlanet(r, base, o) {
    o = o || {};
    const ramp = CR.ramp(base, 5, 2, { step: 0.11 });
    const size = Math.ceil(r * 2) + (o.ring ? Math.ceil(r * 1.4) : 0) + 4;
    const p = new CR.Painter(size, size, 0, 0, 1);
    const cx = size / 2, cy = size / 2;
    if (o.ring) p.ell(cx, cy, r * 1.65, r * 0.32, CR.ramp(o.ring, 3, 1), { clip: (x, y) => y < cy });
    p.ell(cx, cy, r, r, ramp);
    if (o.bands) for (let i = -2; i <= 2; i++) p.ell(cx, cy + i * r * 0.36, r * 0.98, r * 0.12, ramp, { bias: -0.3 + (i % 2) * 0.2, clip: (x, y) => Math.hypot(x - cx, y - cy) < r - 0.5 });
    if (o.craters) {
      for (let i = 0; i < o.craters; i++) {
        const a = hash(i, 3, r) * 6.28, d = hash(i, 7, r) * r * 0.6, cr = 1 + hash(i, 9, r) * r * 0.22;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        p.ell(x + 0.5, y + 0.5, cr, cr, ramp, { bias: 0.3 });
        p.ell(x, y, cr * 0.8, cr * 0.8, ramp, { bias: -0.55 });
      }
    }
    if (o.ring) p.ell(cx, cy, r * 1.65, r * 0.32, CR.ramp(o.ring, 3, 1), { clip: (x, y) => y >= cy });
    return p.render({ dither: 0.7 });
  }
  CR.paintPlanet = paintPlanet;

  /* ---------------- Fondo: espacio profundo (nivel 1, menú) ---------------- */
  CR.bgSpace = function (w, seed) {
    w = w || 320;
    seed = seed || 1;
    const H = 180, P = new Pix(w, H);
    const base = ['#05030f', '#080518', '#0c0722', '#110a2c', '#160c35'];
    const pinkN = ['#160c35', '#2a1150', '#43165f', '#64206e', '#8c2f7c', '#bb4c8e'];
    const blueN = ['#160c35', '#152358', '#1b3876', '#285698', '#3f7fc4'];
    const n = (x, y, s, sx, sy) => {
      const a = fbm(x / sx, y / sy, s);
      if (x < w - 70) return a;
      const b = fbm((x - w) / sx, y / sy, s), k = (x - (w - 70)) / 70;
      return a + (b - a) * k;
    };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < w; x++) {
        const t = y / H;
        let col = CR.pickD(base, t * 0.7 + n(x, y, seed + 50, 60, 60) * 0.35, x, y);
        const c1 = smooth(0.5, 0.82, n(x, y, seed, 75, 48)) * (0.7 + 0.5 * n(x, y, seed + 9, 18, 14));
        const c2 = smooth(0.54, 0.84, n(x, y, seed + 20, 55, 40)) * (0.7 + 0.5 * n(x, y, seed + 13, 16, 12));
        if (c1 > 0.06 && c1 >= c2) col = CR.pickD(pinkN, c1, x, y);
        else if (c2 > 0.06) col = CR.pickD(blueN, c2, x, y);
        P.set(x, y, col);
        const hs = hash(x, y, seed + 99);
        if (hs < 0.0035) P.set(x, y, hs < 0.0012 ? '#ffffff' : '#9d8ccf');
      }
    }
    return P.done();
  };

  /* ---------------- Fondo: planeta de origen (cinemática y final) ---------------- */
  CR.bgHome = function (groundY, seed) {
    seed = seed || 3;
    const W = 320, H = 180, P = new Pix(W, H);
    const sky = ['#07041a', '#0d0726', '#150a34', '#1f0e42', '#2c1350', '#3c185c', '#511f66', '#69296c'];
    const far = (x) => groundY - 34 + (fbm(x / 46, 3.1, seed) - 0.5) * 46;
    const mid = (x) => groundY - 18 + (fbm(x / 30, 7.7, seed) - 0.5) * 26;
    const near = (x) => groundY - 6 + (fbm(x / 18, 11.3, seed) - 0.5) * 10;
    for (let x = 0; x < W; x++) {
      const fy = Math.round(far(x)), my = Math.round(mid(x)), ny = Math.round(near(x));
      const gy = groundY + Math.round((fbm(x / 16, 2.2, seed) - 0.5) * 3);
      for (let y = 0; y < H; y++) {
        let col;
        if (y < fy) {
          const t = Math.pow(y / groundY, 1.15);
          col = CR.pickD(sky, t + (fbm(x / 70, y / 40, seed) - 0.5) * 0.22, x, y);
          const au = smooth(0.55, 0.85, fbm(x / 55, y / 18, seed + 5)) * (1 - t) * 0.9;
          if (au > 0.05) col = CR.mix(col, CR.pickD(['#2a1b6b', '#2f4f9a', '#3fa0b8', '#7fe0d0'], au, x, y), 0.45 * au + 0.1);
          if (hash(x, y, seed + 7) < 0.004 && y < groundY - 40) col = hash(x, y, 2) < 0.5 ? '#ffffff' : '#ffd6f0';
        } else if (y < my) {
          col = y === fy ? '#7a58b8' : y === fy + 1 ? '#5c3f96' : CR.pickD(['#432878', '#3a216a', '#311b5c', '#2a1750'], (y - fy) / 30, x, y);
        } else if (y < ny) {
          col = y === my ? '#5c3f96' : CR.pickD(['#2c1858', '#26134c', '#201042'], (y - my) / 20, x, y);
        } else if (y < gy) {
          col = y === ny ? '#3a2468' : CR.pickD(['#1a0c34', '#160a2e'], (y - ny) / 8, x, y);
        } else {
          const dpt = y - gy;
          if (dpt === 0) col = '#7fe8c4';
          else if (dpt === 1) col = hash(x, 1, seed) < 0.5 ? '#3fa892' : '#5fd3b0';
          else if (dpt === 2) col = '#2b6e6a';
          else col = CR.pickD(['#2e1d5c', '#28184f', '#211444', '#1a1038', '#140c2e'], dpt / 26 + (fbm(x / 10, y / 6, seed + 3) - 0.5) * 0.3, x, y);
          if (dpt > 4 && hash(x >> 1, y >> 1, seed + 11) < 0.025) col = '#4a3a78';
        }
        P.set(x, y, col);
      }
      // briznas de pasto
      if (hash(x, 5, seed) < 0.35) {
        const hgt = 1 + Math.floor(hash(x, 6, seed) * 3);
        for (let k = 1; k <= hgt; k++) P.set(x, gy - k, k === hgt ? '#a7f5dc' : '#5fd3b0');
      }
    }
    const c = P.done(), ctx = c.getContext('2d');
    // luna y planeta
    glow(ctx, 62, 40, 30, '#e9ddff', 0.1);
    ctx.drawImage(paintPlanet(15, '#d9ccf2', { craters: 6 }), 62 - 17, 40 - 17);
    ctx.drawImage(paintPlanet(7, '#ff9fc0', { ring: '#ffd6e6', bands: true }), 262 - 12, 30 - 12);
    // cristales brillantes sobre las colinas
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(30 + hash(i, 1, seed) * 260), y = Math.round(mid(x)) + 2;
      const colr = hash(i, 2, seed) < 0.5 ? '#38e1ff' : '#ff6fd8';
      glow(ctx, x, y - 4, 10, colr, 0.12);
      const p = new CR.Painter(9, 12, 0, 0, 1);
      const r = CR.ramp(colr, 4, 2, { step: 0.13 });
      p.tri(4.5, 0, 1.5, 11, 7.5, 11, r);
      p.tri(1.5, 4, 0, 11, 3, 11, r, { bias: -0.2 });
      p.line(4.2, 2, 3.4, 9, r.c[3]);
      ctx.drawImage(p.render(), x - 4, y - 11);
    }
    // hongos luminosos en el suelo
    for (let i = 0; i < 7; i++) {
      const x = Math.floor(8 + hash(i, 4, seed) * 304), y = groundY + 2 + Math.floor(hash(i, 5, seed) * 10);
      if (x > 120 && x < 200) continue;
      glow(ctx, x, y - 2, 6, '#ff6fd8', 0.14);
      const p = new CR.Painter(7, 6, 0, 0, 1);
      p.ell(3.5, 2.2, 3, 1.8, CR.ramp('#ff6fd8', 4, 2), { clip: (xx, yy) => yy < 3 });
      p.line(3, 3, 3, 5, '#e9ddff');
      p.px(2, 1, '#ffd6f0');
      ctx.drawImage(p.render(), x - 3, y - 5);
    }
    return c;
  };

  /* ---------------- Fondo: salón del trono (nivel 3) ---------------- */
  CR.bgThrone = function () {
    const W = 320, H = 180, P = new Pix(W, H), FLOOR = 168;
    const brick = ['#1d1331', '#22173a', '#271b42', '#2c1f49'];
    for (let y = 0; y < FLOOR; y++) {
      const row = Math.floor(y / 8), off = (row % 2) * 8, ly = y % 8;
      for (let x = 0; x < W; x++) {
        const lx = (x + off) % 16, bx = Math.floor((x + off) / 16);
        let col;
        if (lx === 0 || ly === 0) col = '#120a20';
        else {
          const id = hash(bx, row, 9);
          col = brick[Math.floor(id * brick.length)];
          if (ly === 1) col = CR.mix(col, '#4a3a70', 0.35);
          else if (lx === 1) col = CR.mix(col, '#4a3a70', 0.18);
          else if (ly === 7 || lx === 15) col = CR.mix(col, '#0c0616', 0.4);
          if (hash(x, y, 4) < 0.05) col = CR.mix(col, '#0c0616', 0.3);
        }
        const vig = Math.max(0, (36 - y) / 36) * 0.9 + Math.abs(x - 160) / 400;
        if (CR.bayer(x, y) + 0.47 < vig * 0.6) col = CR.mix(col, '#07040f', 0.45);
        P.set(x, y, col);
      }
    }
    // piso
    for (let y = FLOOR; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tx = Math.floor(x / 16), ty = Math.floor((y - FLOOR) / 6);
        let col = (tx + ty) % 2 ? '#2a1a48' : '#33205a';
        if ((y - FLOOR) % 6 === 0) col = CR.mix(col, '#6d4fc2', 0.35);
        if (x % 16 === 0) col = CR.mix(col, '#0c0616', 0.35);
        col = CR.mix(col, '#0c0616', CR.clamp((y - FLOOR) / 20, 0, 0.5) * (CR.bayer(x, y) + 0.6));
        if (x >= 128 && x < 192) {
          col = CR.pickD(['#5c0f1f', '#7d1426', '#9b1c30'], 0.7 - (y - FLOOR) / 24, x, y);
          if (x === 130 || x === 189) col = '#ffcc33';
          if (((x - 128) + (y - FLOOR) * 2) % 10 === 0 && x > 132 && x < 188) col = '#c98f00';
        }
        P.set(x, y, col);
      }
    }
    for (let x = 0; x < W; x++) P.set(x, FLOOR, '#7d62d0');
    const c = P.done(), ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };

    // ventanas con nebulosa
    const drawWindow = (x, y, w, h) => {
      const neb = CR.bgSpace(w, 7 + x);
      ctx.drawImage(neb, 0, 20, w, h, x, y, w, h);
      R(x - 3, y - 3, w + 6, 3, '#4d4570'); R(x - 3, y + h, w + 6, 3, '#2c2640');
      R(x - 3, y, 3, h, '#5a5180'); R(x + w, y, 3, h, '#2c2640');
      R(x - 3, y - 3, w + 6, 1, '#7d74b0');
      R(x + Math.floor(w / 2) - 1, y, 2, h, '#3a3352');
      R(x, y + Math.floor(h / 2) - 1, w, 2, '#3a3352');
      R(x + Math.floor(w / 2) - 1, y, 1, h, '#5a5180');
      // rayos de luz
      ctx.fillStyle = '#b9a3ff';
      for (let k = 0; k < 60; k++) {
        const yy = y + h + k;
        if (yy >= FLOOR) break;
        ctx.globalAlpha = 0.07 * (1 - k / 60);
        ctx.fillRect(Math.floor(x + k * 0.5), yy, w, 1);
      }
      ctx.globalAlpha = 1;
    };
    drawWindow(24, 14, 38, 30);
    drawWindow(258, 66, 36, 28);

    // columnas
    const pil = ['#1a1230', '#241a3d', '#3b2b5e', '#4d3a75', '#5d4888', '#4d3a75', '#3b2b5e', '#2a1d45', '#1a1230'];
    for (const x0 of [2, 74, 236, 306]) {
      const w = 12;
      for (let x = 0; x < w; x++) R(x0 + x, 0, 1, FLOOR, pil[Math.floor((x / w) * pil.length)]);
      for (let y = 18; y < FLOOR; y += 26) R(x0, y, w, 1, '#120a20');
      R(x0 - 2, FLOOR - 8, w + 4, 8, '#3b2b5e'); R(x0 - 2, FLOOR - 8, w + 4, 1, '#6d5aa0');
      R(x0 - 2, 6, w + 4, 6, '#3b2b5e'); R(x0 - 2, 6, w + 4, 1, '#6d5aa0'); R(x0 - 2, 11, w + 4, 1, '#1a1230');
    }
    // soportes de antorcha
    for (const x of [80, 242]) { R(x - 2, 74, 5, 2, '#8b84b0'); R(x - 1, 76, 3, 6, '#5a5180'); R(x - 2, 70, 5, 4, '#3a3352'); }

    // estandartes con pliegues
    const fold = ['#6b0f20', '#8f1a2d', '#b0223a', '#c9354b', '#b0223a', '#8f1a2d'];
    for (const x0 of [94, 210]) {
      for (let x = 0; x < 16; x++) {
        const col = fold[Math.floor((Math.sin((x / 16) * Math.PI * 2) * 0.5 + 0.5) * (fold.length - 1))];
        const bottom = 44 - (x < 8 ? x % 8 : 15 - x) * 0.6;
        for (let y = 10; y < bottom; y++) R(x0 + x, y, 1, 1, CR.bayer(x, y) > 0.3 ? CR.mix(col, '#2a0610', 0.25) : col);
      }
      R(x0 - 1, 8, 18, 3, '#ffcc33'); R(x0 - 1, 8, 18, 1, '#fff3b0'); R(x0 - 1, 10, 18, 1, '#c98f00');
      // huella dorada
      R(x0 + 6, 24, 4, 3, '#ffcc33'); R(x0 + 4, 20, 2, 2, '#ffcc33'); R(x0 + 7, 19, 2, 2, '#ffcc33'); R(x0 + 10, 20, 2, 2, '#ffcc33');
      R(x0 + 6, 24, 4, 1, '#fff3b0');
    }

    // trono
    const thr = new CR.Painter(44, 56, 0, 0, 1);
    const pur = CR.ramp('#5b21b6', 5, 2, { step: 0.1 }), gold = CR.ramp('#ffcc33', 4, 2, { step: 0.12 });
    thr.ell(22, 26, 16, 24, pur, { clip: (x, y) => y < 40 });
    thr.ell(22, 26, 12, 20, CR.ramp('#3b1270', 4, 2), { clip: (x, y) => y < 40, bias: -0.2 });
    thr.ell(22, 44, 19, 7, pur);
    thr.ell(22, 41, 14, 4, CR.ramp('#c0263b', 4, 2), { bias: 0.1 });
    thr.ell(22, 4, 3.5, 3.5, gold);
    thr.ell(22, 4, 1.6, 1.6, CR.ramp('#ff3355', 3, 1));
    thr.ell(4, 40, 3, 6, gold, { bias: -0.1 });
    thr.ell(40, 40, 3, 6, gold, { bias: -0.3 });
    ctx.drawImage(thr.render(), 138, 6);
    return c;
  };

  /* ---------------- Mapa del nivel 2 ---------------- */
  CR.renderLevel2 = function (MAP, TS, tileAt) {
    const MH = MAP.length, MW = MAP[0].length, WW = MW * TS, WH = MH * TS;
    const P = new Pix(WW, WH);
    const ground = ['#150a28', '#1b0e32', '#21123c', '#271646', '#2e1a50', '#351e5a'];
    for (let y = 0; y < WH; y++) {
      for (let x = 0; x < WW; x++) {
        const v = fbm(x / 46, y / 46, 5) * 0.75 + fbm(x / 8, y / 8, 9) * 0.35 - 0.1;
        let col = CR.pickD(ground, v, x, y);
        if (hash(x, y, 21) < 0.012) col = '#3d2566';
        P.set(x, y, col);
      }
    }
    const base = P.done(), b = base.getContext('2d');
    const over = document.createElement('canvas');
    over.width = WW; over.height = WH;
    const o = over.getContext('2d');
    o.imageSmoothingEnabled = false;
    const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

    // piezas pintadas
    const stone = CR.ramp('#5d4d78', 5, 2, { step: 0.1 });
    const rocks = [0, 1, 2].map((i) => {
      const p = new CR.Painter(16, 16, 0, 0, 1);
      const bumps = [];
      for (let k = 0; k < 11; k++) bumps.push(0.74 + hash(k, i, 3) * 0.3);
      p.ell(8, 9.0, 7.6, 6.6, stone, { bumps });
      p.ell(7, 6.4, 4.6, 2.6, stone, { bumps, bias: 0.35 });
      if (i !== 1) p.ell(10.5, 10.5, 3, 2.6, stone, { bumps, bias: -0.2 });
      p.line(5, 7, 7, 10, stone.c[0]);
      p.line(10, 4, 11, 6, stone.c[0]);
      if (i === 2) p.ell(6, 3.6, 3, 1.4, CR.ramp('#2dd4bf', 3, 1), { clip: (x, y) => y < 4.4 });
      return p.render();
    });
    const leaf = CR.ramp('#14b8a6', 5, 2, { step: 0.1 });
    const bushes = [0, 1].map((i) => {
      const p = new CR.Painter(18, 18, 1, 1, 1);
      p.ell(4.5, 10, 4.4, 4, leaf, { bias: -0.15 });
      p.ell(11.5, 10, 4.4, 4.2, leaf, { bias: -0.1 });
      p.ell(8, 6.2, 4.8, 4.2, leaf, { bias: 0.1 });
      p.ell(8, 11.5, 6.4, 3.4, leaf);
      p.px(4 + i * 3, 9, '#ff9fe8'); p.px(11 - i * 2, 7, '#ff9fe8'); p.px(8, 12, '#f0abfc');
      return p.render();
    });
    const crate = (() => {
      const wood = ['#3e2210', '#5e3a17', '#8a5a2b', '#b07a42', '#d39a5e'];
      const c = document.createElement('canvas');
      c.width = 16; c.height = 16;
      const x = c.getContext('2d');
      R(x, 0, 1, 16, 15, '#24120a');
      R(x, 1, 1, 14, 13, wood[2]);
      for (let k = 0; k < 4; k++) { R(x, 1, 1 + k * 3.5, 14, 1, wood[3]); R(x, 1, 3 + k * 3.5, 14, 1, wood[1]); }
      R(x, 1, 1, 14, 1, wood[4]);
      R(x, 1, 1, 2, 13, wood[1]); R(x, 13, 1, 2, 13, wood[1]);
      for (let k = 0; k < 10; k++) R(x, 3 + k, 3 + k, 1, 1, wood[0]);
      R(x, 2, 2, 1, 1, '#c9c2e0'); R(x, 13, 2, 1, 1, '#c9c2e0'); R(x, 2, 12, 1, 1, '#c9c2e0'); R(x, 13, 12, 1, 1, '#c9c2e0');
      R(x, 10, 9, 2, 2, wood[0]); R(x, 9, 7, 1, 1, wood[0]); R(x, 11, 7, 1, 1, wood[0]); R(x, 12, 8, 1, 1, wood[0]);
      return c;
    })();
    const crystal = (col) => {
      const p = new CR.Painter(8, 10, 0, 0, 1);
      const r = CR.ramp(col, 4, 2, { step: 0.13 });
      p.tri(3.5, 0, 1, 9, 6, 9, r);
      p.tri(6.5, 3, 5, 9, 8, 9, r, { bias: -0.3 });
      p.line(3.2, 2, 2.6, 7, r.c[3]);
      return p.render();
    };
    const crystals = [crystal('#38e1ff'), crystal('#ff6fd8'), crystal('#b388ff')];
    const sparks = [];

    for (let ty = 0; ty < MH; ty++) {
      for (let tx = 0; tx < MW; tx++) {
        const ch = MAP[ty][tx], x = tx * TS, y = ty * TS, hs = hash(tx, ty, 77);
        if (ch === '#') {
          b.globalAlpha = 0.45; R(b, x + 1, y + 12, 15, 4, '#07030f'); b.globalAlpha = 1;
          b.drawImage(rocks[Math.floor(hs * 3)], x, y);
        } else if (ch === 'W' || ch === 'D') {
          R(b, x, y, TS, TS, '#3a3352');
          R(b, x, y, TS, 1, '#5a5180'); R(b, x, y, 1, TS, '#4d4570');
          R(b, x, y + 15, TS, 1, '#231d38'); R(b, x + 15, y, 1, TS, '#231d38');
          R(b, x + 2, y + 2, 12, 12, '#342d4a');
          R(b, x + 2, y + 2, 12, 1, '#463e66');
          [[2, 2], [13, 2], [2, 13], [13, 13]].forEach(([a, c2]) => { R(b, x + a, y + c2, 1, 1, '#9b94c4'); });
          if (hs < 0.18) { R(b, x + 5, y + 5, 6, 3, '#0c2a3a'); R(b, x + 6, y + 6, 4, 1, '#38e1ff'); }
          else if (hs < 0.3) { for (let k = 0; k < 3; k++) R(b, x + 4, y + 5 + k * 2, 8, 1, '#231d38'); }
          const below = tileAt(tx, ty + 1);
          if (below !== 'W' && below !== 'D') {
            for (let k = 0; k < 16; k += 4) { R(b, x + k, y + 12, 2, 4, '#ffd23f'); R(b, x + k + 2, y + 12, 2, 4, '#1a1a1a'); }
            R(b, x, y + 11, TS, 1, '#231d38');
          }
          if (tileAt(tx, ty - 1) !== 'W' && tileAt(tx, ty - 1) !== 'D') R(b, x, y, TS, 2, '#6d64a0');
        } else if (ch === 'C') {
          b.globalAlpha = 0.45; R(b, x + 2, y + 13, 14, 3, '#07030f'); b.globalAlpha = 1;
          b.drawImage(crate, x, y);
        } else if (ch === 'b') {
          const bs = bushes[Math.floor(hs * 2)];
          b.globalAlpha = 0.5; R(b, x + 1, y + 12, 15, 4, '#07030f'); b.globalAlpha = 1;
          b.drawImage(bs, x - 1, y - 2);
          o.globalAlpha = 0.82;
          o.drawImage(bs, x - 1, y - 2);
          o.globalAlpha = 1;
        } else {
          // decoración del suelo
          if (hs < 0.07) { const cr = crystals[Math.floor(hash(tx, ty, 5) * 3)]; glow(b, x + 8, y + 9, 7, '#9d6bff', 0.08); b.drawImage(cr, x + 4, y + 3); sparks.push({ x: x + 8, y: y + 6 }); }
          else if (hs < 0.22) {
            for (let k = 0; k < 3; k++) {
              const px = x + 2 + Math.floor(hash(tx, ty, k) * 12), py = y + 3 + Math.floor(hash(ty, tx, k) * 11);
              R(b, px, py, 2, 1, '#4a3a78'); R(b, px, py + 1, 2, 1, '#1a0f30'); R(b, px, py, 1, 1, '#6d5aa0');
            }
          } else if (hs < 0.36) {
            for (let k = 0; k < 4; k++) {
              const px = x + 3 + k * 3, hh = 1 + Math.floor(hash(tx + k, ty, 8) * 3);
              for (let j = 0; j < hh; j++) R(b, px, y + 12 - j, 1, 1, j === hh - 1 ? '#7fe8c4' : '#2b8a7a');
            }
          } else if (hs < 0.41) {
            b.globalAlpha = 0.6;
            R(b, x + 4, y + 7, 8, 1, '#120822'); R(b, x + 3, y + 8, 10, 2, '#170b2b'); R(b, x + 4, y + 10, 8, 1, '#3b2468');
            b.globalAlpha = 1;
          }
        }
      }
    }
    return { base, over, sparks };
  };
})();
