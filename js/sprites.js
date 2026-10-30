/* =====================================================================
   COSMORAT - SPRITES (PIXEL ART TÉCNICO)
   Los personajes se "pintan" con formas que reciben luz desde arriba
   a la izquierda. Cada material tiene una rampa de 4-5 tonos con
   cambio de matiz (sombras moradas, luces cálidas), tramado Bayer
   entre tonos y contorno de color automático.
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR;

  /* ===================== Color ===================== */
  const rgbCache = {};
  function hexToRgb(h) {
    if (rgbCache[h]) return rgbCache[h];
    let s = h.replace('#', '');
    if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    const n = parseInt(s, 16);
    return (rgbCache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => Math.round(CR.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h;
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslToRgb(h, s, l) {
    h = ((((h % 360) + 360) % 360)) / 360;
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  const mixHue = (a, b, t) => a + ((((b - a + 540) % 360) - 180) * t);

  CR.hexToRgb = hexToRgb;
  CR.rgbToHex = rgbToHex;
  CR.mix = (a, b, t) => {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  };

  // Rampa de tonos a partir de un color base (sombras hacia morado, luces hacia amarillo)
  CR.ramp = function (hex, n, center, o) {
    n = n || 5;
    o = o || {};
    const [h, s, l] = rgbToHsl(...hexToRgb(hex));
    if (center == null) center = l > 0.82 ? n - 2 : Math.floor(n / 2);
    const step = o.step || 0.11, gray = s < 0.1;
    const c = [];
    for (let i = 0; i < n; i++) {
      const k = i - center;
      let H = h, S = s;
      const L = CR.clamp(l + k * step, 0.05, 0.98);
      if (k < 0) {
        H = gray ? 258 : mixHue(h, 258, Math.min(0.45, -k * 0.13));
        S = CR.clamp(s + -k * 0.06 + (gray ? 0.07 : 0), 0, 1);
      } else if (k > 0) {
        H = gray ? 45 : mixHue(h, 48, Math.min(0.35, k * 0.1));
        S = CR.clamp(s - k * 0.02 + (gray ? 0.04 : 0), 0, 1);
      }
      c.push(rgbToHex(...hslToRgb(H, S, L)));
    }
    const [oh, os, ol] = rgbToHsl(...hexToRgb(c[0]));
    return { c, out: o.out || rgbToHex(...hslToRgb(gray ? 262 : mixHue(oh, 262, 0.4), CR.clamp(os + 0.18, 0, 1), Math.max(0.06, ol * 0.42))) };
  };

  /* ===================== Tramado ===================== */
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  CR.bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47;
  CR.pickD = (pal, v, x, y, amt) => pal[CR.clamp(Math.round(CR.clamp(v, 0, 1) * (pal.length - 1) + CR.bayer(x, y) * (amt == null ? 0.9 : amt)), 0, pal.length - 1)];

  function bumpAt(b, a) {
    const n = b.length, f = ((a + Math.PI) / (Math.PI * 2)) * n, i0 = Math.floor(f) % n, i1 = (i0 + 1) % n, k = f - Math.floor(f);
    return b[i0] * (1 - k) + b[i1] * k;
  }

  /* ===================== Pintor ===================== */
  CR.Painter = class {
    constructor(w, h, ox, oy, s) {
      this.w = w; this.h = h;
      this.ox = ox == null ? 1 : ox; this.oy = oy == null ? 1 : oy; this.s = s || 1;
      this.R = new Array(w * h).fill(null);
      this.L = new Float32Array(w * h);
      this.F = new Array(w * h).fill(null);
    }
    tx(v) { return this.ox + v * this.s; }
    ty(v) { return this.oy + v * this.s; }
    _put(x, y, ramp, l, flat) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x;
      if (flat) { this.F[i] = flat; this.R[i] = null; }
      else { this.R[i] = ramp; this.L[i] = l; this.F[i] = null; }
    }
    // Elipse con volumen (o color plano si ramp es un string)
    ell(cx, cy, rx, ry, ramp, o) {
      o = o || {};
      const flat = typeof ramp === 'string' ? ramp : null, b = o.bias || 0;
      cx = this.tx(cx); cy = this.ty(cy);
      rx = Math.max(0.55, rx * this.s); ry = Math.max(0.55, ry * this.s);
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          let d = dx * dx + dy * dy;
          if (o.bumps) d /= Math.pow(bumpAt(o.bumps, Math.atan2(dy, dx)), 2);
          if (d > 1) continue;
          if (o.clip && !o.clip((x + 0.5 - this.ox) / this.s, (y + 0.5 - this.oy) / this.s)) continue;
          const nz = Math.sqrt(Math.max(0, 1 - d));
          this._put(x, y, ramp, -0.45 * dx - 0.55 * dy + 0.5 * nz - 0.2 + b, flat);
        }
      }
    }
    tri(ax, ay, bx, by, cx, cy, ramp, o) {
      o = o || {};
      const flat = typeof ramp === 'string' ? ramp : null;
      const P = [[this.tx(ax), this.ty(ay)], [this.tx(bx), this.ty(by)], [this.tx(cx), this.ty(cy)]];
      const minX = Math.floor(Math.min(P[0][0], P[1][0], P[2][0])), maxX = Math.ceil(Math.max(P[0][0], P[1][0], P[2][0]));
      const minY = Math.floor(Math.min(P[0][1], P[1][1], P[2][1])), maxY = Math.ceil(Math.max(P[0][1], P[1][1], P[2][1]));
      const area = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
      if (!area) return;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5, py = y + 0.5;
          const w0 = ((P[1][0] - px) * (P[2][1] - py) - (P[2][0] - px) * (P[1][1] - py)) / area;
          const w1 = ((P[2][0] - px) * (P[0][1] - py) - (P[0][0] - px) * (P[2][1] - py)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const ky = (py - minY) / Math.max(1, maxY - minY), kx = (px - minX) / Math.max(1, maxX - minX);
          this._put(x, y, ramp, 0.5 - ky * 0.9 - kx * 0.3 + (o.bias || 0), flat);
        }
      }
    }
    line(x0, y0, x1, y1, col, thick) {
      x0 = this.tx(x0); y0 = this.ty(y0); x1 = this.tx(x1); y1 = this.ty(y1);
      const d = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= Math.ceil(d); i++) {
        const k = d ? i / d : 0;
        const x = Math.floor(x0 + (x1 - x0) * k), y = Math.floor(y0 + (y1 - y0) * k);
        this._put(x, y, null, 0, col);
        if (thick) this._put(x, y + 1, null, 0, col);
      }
    }
    px(x, y, col) { this._put(Math.floor(this.tx(x)), Math.floor(this.ty(y)), null, 0, col); }
    chain(points, r, ramp, o) {
      for (let i = 0; i < points.length - 1; i++) {
        const [ax, ay] = points[i], [bx, by] = points[i + 1];
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.35));
        for (let k = 0; k <= n; k++) {
          const rr = typeof r === 'function' ? r((i + k / n) / (points.length - 1)) : r;
          this.ell(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, rr, rr, ramp, o);
        }
      }
    }
    render(o) {
      o = o || {};
      const w = this.w, h = this.h;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
      const dith = o.dither == null ? 0.55 : o.dither;
      const col = new Array(w * h).fill(null);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (this.F[i]) col[i] = this.F[i];
          else if (this.R[i]) {
            const r = this.R[i], n = r.c.length;
            const v = CR.clamp(this.L[i] * 0.5 + 0.5, 0, 1) * (n - 1) + CR.bayer(x, y) * dith;
            col[i] = r.c[CR.clamp(Math.round(v), 0, n - 1)];
          }
        }
      }
      const out = col.slice();
      if (o.outline !== false) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (col[i]) continue;
            const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
            for (const [nx, ny] of nb) {
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              const j = ny * w + nx;
              if (col[j]) { out[i] = (this.R[j] && this.R[j].out) || o.outline || '#1c1030'; break; }
            }
          }
        }
      }
      for (let i = 0; i < w * h; i++) {
        if (!out[i]) continue;
        const rgb = hexToRgb(out[i]);
        d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2]; d[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      return c;
    }
  };

  /* ===================== Utilidades de sprites ===================== */
  const cache = {};
  const cached = (key, fn) => cache[key] || (cache[key] = fn());

  CR.makeSprite = function (rows, pal) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const col = pal[rows[j][i]];
        if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
      }
    }
    return c;
  };

  CR.silhouette = function (spr, color) {
    const c = document.createElement('canvas');
    c.width = spr.width; c.height = spr.height;
    const x = c.getContext('2d');
    x.drawImage(spr, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color || '#ffffff';
    x.fillRect(0, 0, c.width, c.height);
    return c;
  };
  const whiteCache = new Map();
  CR.whiteOf = (spr) => { if (!whiteCache.has(spr)) whiteCache.set(spr, CR.silhouette(spr, '#ffffff')); return whiteCache.get(spr); };

  CR.drawSprite = function (ctx, spr, x, y, o) {
    o = o || {};
    const s = o.scale || 1, w = spr.width * s, h = spr.height * s;
    x = Math.round(x); y = Math.round(y);
    const pa = ctx.globalAlpha;
    if (o.alpha != null) ctx.globalAlpha = pa * o.alpha;
    if (o.flip) {
      ctx.save();
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(spr, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(spr, x, y, w, h);
    }
    ctx.globalAlpha = pa;
  };

  // Parpadeo: devuelve 'closed' durante un instante cada pocos segundos
  CR.blink = (t, seed) => ((t + (seed || 0) * 1.37) % 3.7 < 0.13 ? 'closed' : 'open');

  /* ===================== RATAS (mirando a la derecha) =====================
     Caja base 20x16 unidades. s = escala de detalle (1 = juego, 2.4 = menú) */
  function lightness(hex) { return rgbToHsl(...hexToRgb(hex))[2]; }

  function paintRat(k, s, frame, eye) {
    const P = CR.CONFIG.personajes[k].rata;
    const light = lightness(P.pelo) > 0.82;
    const fur = CR.ramp(P.pelo, 5, light ? 3 : 2, { step: light ? 0.1 : 0.12 });
    const belly = CR.ramp(P.panza, 4, lightness(P.panza) > 0.85 ? 2 : 1, { step: 0.08 });
    const pink = CR.ramp(P.rosa, 4, 2, { step: 0.11 });
    const acc = CR.ramp(P.accesorio, 4, 1, { step: 0.13 });
    const bufanda = P.tipoAccesorio === 'bufanda';
    const W = Math.ceil(20 * s) + 2, H = Math.ceil(16 * s) + 2;
    const p = new CR.Painter(W, H, 1, 1, s);

    // cola curvita
    const tail = frame
      ? [[4.6, 12.6], [3.1, 12.5], [1.9, 11.7], [1.1, 10.3], [0.9, 8.9], [1.5, 7.8]]
      : [[4.6, 12.6], [3.1, 12.9], [1.7, 12.4], [0.8, 11.1], [0.6, 9.7], [1.0, 8.4]];
    p.chain(tail, (f) => 0.85 - f * 0.25, pink, { bias: -0.1 });
    // oreja de atrás
    p.ell(15.5, 2.9, 2.2, 2.4, fur, { bias: -0.4 });
    p.ell(15.6, 3.1, 1.2, 1.4, pink, { bias: -0.35 });
    // pata trasera
    p.ell(frame ? 5.7 : 4.4, 15.1, 1.9, 1.0, pink, { bias: -0.2 });
    // cuerpo y panza
    p.ell(7.6, 11.2, 6.1, 4.6, fur);
    p.ell(9.6, 12.9, 3.5, 2.4, belly, { bias: 0.05 });
    // cabeza, hocico y mejillas claras
    p.ell(13.2, 8.0, 5.7, 5.1, fur, { bias: 0.05 });
    p.ell(17.4, 9.3, 2.5, 1.9, fur, { bias: 0.08 });
    p.ell(16.1, 10.5, 2.7, 1.5, belly, { bias: 0.18 });
    // oreja grande del frente
    p.ell(10.2, 3.3, 3.1, 3.2, fur, { bias: 0.08 });
    p.ell(10.4, 3.6, 1.9, 2.1, pink, { bias: 0.05 });
    // accesorio
    if (bufanda) {
      p.ell(11.0, 12.3, 2.9, 1.55, acc, { bias: -0.3 });
      p.ell(9.2, 14.1, 1.05, 1.9, acc, { bias: -0.45 });
      p.ell(9.0, 15.6, 1.0, 0.5, acc.c[2]);
      if (s >= 1.4) p.line(8.6, 12.4, 13.4, 12.0, acc.c[2]);
    } else {
      p.ell(11.9, 2.3, 1.7, 1.25, acc, { bias: 0.15 });
      p.ell(14.6, 2.0, 1.7, 1.25, acc, { bias: 0.05 });
      p.ell(13.25, 2.35, 0.85, 0.85, acc.c[0]);
      if (s >= 1.4) { p.px(11.3, 1.6, acc.c[3]); p.px(14.0, 1.3, acc.c[3]); }
    }
    // patitas delanteras
    p.ell(frame ? 13.6 : 12.8, 15.0, 1.4, 1.0, pink, { bias: 0.05 });
    p.ell(frame ? 15.9 : 15.4, 14.8, 1.3, 0.95, pink, { bias: 0.15 });
    // ojo grande y brillante
    const EYE = '#1b1233';
    if (eye === 'closed') {
      p.line(13.7, 8.3, 15.7, 8.5, EYE);
      if (s >= 1.4) p.line(13.6, 8.0, 13.9, 8.3, EYE);
    } else if (eye === 'happy') {
      p.line(13.6, 8.6, 14.6, 7.4, EYE);
      p.line(14.6, 7.4, 15.7, 8.6, EYE);
    } else {
      p.ell(14.75, 7.75, 1.3, 1.8, EYE);
      p.ell(14.9, 8.75, 0.95, 0.7, '#4f3d96');
      p.px(14.1, 6.55, '#ffffff');
      if (s >= 1.4) { p.px(14.6, 6.55, '#ffffff'); p.px(14.1, 7.0, '#ffffff'); p.px(15.4, 9.0, '#cfc8ff'); }
      if (eye === 'sad') { p.line(13.4, 5.5, 15.2, 6.1, fur.c[0]); }
    }
    // naricita, chapitas y boquita
    p.ell(19.35, 8.75, 0.75, 0.6, '#d2557a');
    if (s >= 2) p.px(19.1, 8.4, '#ffc2d4');
    p.ell(15.9, 10.7, 1.05, 0.6, '#ff8fb3');
    if (s >= 1.4) {
      p.px(18.3, 10.5, '#7a3a52');
      p.px(18.9, 10.6, '#7a3a52');
      p.line(17.2, 9.8, 15.4, 9.5, fur.c[light ? 1 : 4]);
    }
    return p.render();
  }

  CR.ratSprite = (k, s, frame, eye) => cached('rat_' + k + '_' + s + '_' + (frame || 0) + '_' + (eye || 'open'), () => paintRat(k, s, frame || 0, eye || 'open'));
  CR.ratSize = (s) => ({ w: Math.ceil(20 * s) + 2, h: Math.ceil(16 * s) + 2 });

  // Dibuja una rata centrada en x con las patitas en footY. Devuelve la posición del ojo.
  CR.drawRat = function (ctx, k, cx, footY, o) {
    o = o || {};
    const s = o.s || 1;
    const spr = CR.ratSprite(k, s, o.frame, o.eye);
    const x = Math.round(cx - spr.width / 2), y = Math.round(footY - spr.height + 1);
    CR.drawSprite(ctx, o.white ? CR.whiteOf(spr) : spr, x, y, { flip: o.flip, alpha: o.alpha });
    const ex = 1 + 14.75 * s;
    return { x, y, w: spr.width, h: spr.height, ex: x + (o.flip ? spr.width - ex : ex), ey: y + 1 + 8.6 * s };
  };

  /* ===================== HUMANOS chibi (mirando a la derecha) ===================== */
  function paintHuman(k, s) {
    const h = CR.CONFIG.personajes[k].humano;
    const isY = k === 'yazeth';
    const hair = CR.ramp(h.pelo, 5, 2, { step: 0.1 });
    const skin = CR.ramp(h.piel, 4, 2, { step: 0.07 });
    const cloth = CR.ramp(h.ropa, 4, lightness(h.ropa) > 0.8 ? 2 : 1, { step: 0.09 });
    const accent = CR.ramp(h.ropaSombra, 4, 2, { step: 0.1 });
    const legs = CR.ramp(h.pantalon, 4, lightness(h.pantalon) > 0.7 ? 2 : 1, { step: 0.09 });
    const shoes = CR.ramp(h.zapatos, 3, 1, { step: 0.12 });
    const W = Math.ceil(22 * s) + 2, H = Math.ceil(33 * s) + 2;
    const p = new CR.Painter(W, H, 1, 1, s);

    if (isY) p.ell(9.0, 15.0, 4.8, 8.8, hair, { bias: -0.35 });
    // pierna y brazo de atrás
    p.ell(10.0, 28.2, 1.5, 3.0, legs, { bias: -0.35 });
    p.ell(10.3, 31.3, 2.0, 1.05, shoes, { bias: -0.3 });
    p.ell(8.7, 21.6, 1.45, 3.1, cloth, { bias: -0.4 });
    p.ell(8.8, 24.7, 1.15, 1.05, skin, { bias: -0.25 });
    // cuerpo
    if (isY) {
      p.ell(11.6, 21.4, 4.3, 4.4, cloth);
      p.ell(11.6, 25.7, 6.4, 2.9, cloth, { bias: 0.05 });
      for (let x = 5.6; x < 17.8; x += 1 / s) p.px(x, 28.1, accent.c[2]);
      p.ell(11.6, 23.1, 4.3, 0.6, accent.c[2]);
      p.ell(14.6, 23.0, 0.9, 0.9, accent, { bias: 0.2 });
    } else {
      p.ell(11.6, 22.0, 4.4, 5.0, cloth);
      p.ell(13.2, 17.8, 1.7, 0.7, cloth, { bias: 0.4 });
      p.line(13.6, 19.2, 13.6, 25.6, cloth.c[0]);
    }
    // pierna de adelante
    p.ell(13.3, 28.3, 1.5, 3.0, legs);
    p.ell(14.0, 31.3, 2.1, 1.05, shoes);
    // cuello y cabeza
    p.ell(12.2, 16.9, 1.4, 1.4, skin, { bias: -0.4 });
    p.ell(12.4, 10.6, 6.4, 6.2, skin, { bias: 0.05 });
    p.ell(18.7, 12.3, 0.85, 0.85, skin, { bias: 0.1 });
    p.ell(9.7, 11.7, 1.2, 1.5, skin, { bias: -0.15 });
    // brazo de adelante
    p.ell(14.0, 21.8, 1.45, 3.1, cloth, { bias: 0.05 });
    p.ell(14.4, 24.9, 1.15, 1.05, skin, { bias: 0.05 });
    // cabello
    if (isY) {
      p.ell(11.4, 7.3, 7.1, 5.0, hair, { clip: (x, y) => y < 9.3 || x < 9.4, bias: 0.05 });
      p.ell(15.8, 7.6, 3.4, 2.4, hair, { bias: 0.1 });
      p.ell(8.2, 12.0, 2.2, 4.2, hair, { bias: -0.05 });
      p.ell(8.4, 5.4, 1.6, 1.15, accent, { bias: 0.15 });
      p.ell(10.6, 4.6, 1.6, 1.15, accent, { bias: 0.15 });
      p.ell(9.5, 5.0, 0.7, 0.7, accent.c[0]);
      for (let i = 0; i < 4; i++) p.px(6.4 + i * 0.9, 18 + (i % 2), hair.c[1]);
    } else {
      p.ell(11.4, 7.2, 7.0, 4.9, hair, { clip: (x, y) => y < 9.0 || x < 9.0, bias: 0.05 });
      p.ell(15.6, 7.6, 3.2, 2.2, hair, { bias: 0.1 });
      p.ell(8.2, 9.6, 2.0, 3.0, hair, { bias: -0.1 });
      p.ell(9.2, 3.6, 1.4, 1.0, hair, { bias: 0.15 });
      p.ell(12.8, 2.7, 1.5, 1.0, hair, { bias: 0.2 });
      p.ell(17.6, 6.0, 1.3, 0.9, hair, { bias: 0.1 });
    }
    // brillo del cabello
    p.line(10.5, 4.6, 13.5, 4.0, hair.c[4]);
    // cara
    const EYE = '#1f1430';
    p.ell(15.7, 11.3, 1.0, 1.45, EYE);
    p.px(15.3, 10.4, '#ffffff');
    if (s >= 1.2) p.px(16.1, 12.2, '#9c8fd6');
    if (isY) { p.px(16.6, 9.9, EYE); p.px(17.1, 10.4, EYE); }
    else p.line(14.8, 9.3, 16.6, 9.1, hair.c[0]);
    p.ell(16.3, 13.7, 1.2, 0.6, '#ff8fab');
    p.px(17.6, 14.6, '#b5525f');
    return p.render();
  }

  CR.humanSprite = (k, s) => cached('hum_' + k + '_' + s, () => paintHuman(k, s));
  CR.drawHuman = function (ctx, k, leftX, footY, o) {
    o = o || {};
    const s = o.s || 1.3;
    const spr = CR.humanSprite(k, s);
    CR.drawSprite(ctx, spr, leftX, footY - spr.height + 1, { flip: o.flip });
    return { w: spr.width, h: spr.height, noseX: Math.floor(1 + 19.4 * s) };
  };

  /* ===================== GATO GUARDIA (mirando a la derecha) ===================== */
  function paintGuard(frame, sleep) {
    const orange = CR.ramp('#f39c34', 5, 2, { step: 0.1 });
    const cream = CR.ramp('#ffe2b8', 3, 1, { step: 0.08 });
    const vest = CR.ramp('#7c3aed', 4, 1, { step: 0.11 });
    const pink = CR.ramp('#ff8fb3', 3, 1, { step: 0.1 });
    const p = new CR.Painter(24, 22, 1, 1, 1);
    p.chain([[6.4, 14.8], [3.6, 13.6], [2.0, 11.0], [2.2, 7.6], [3.6, 5.4]], (f) => 1.15 - f * 0.25, orange, { bias: -0.05 });
    p.ell(3.7, 5.2, 0.9, 0.9, cream, { bias: 0.2 });
    p.ell(frame ? 7.4 : 6.2, 18.6, 1.6, 1.3, orange, { bias: -0.35 });
    p.ell(frame ? 12.4 : 13.4, 18.6, 1.6, 1.3, orange, { bias: -0.35 });
    p.ell(10.0, 14.6, 5.4, 3.9, orange);
    p.ell(10.9, 14.5, 3.8, 3.3, vest, { clip: (x) => x > 7.6 });
    p.ell(12.7, 13.5, 0.75, 0.75, '#ffd23f');
    p.ell(frame ? 8.6 : 9.6, 18.8, 1.5, 1.2, cream);
    p.ell(frame ? 14.4 : 13.6, 18.8, 1.5, 1.2, cream);
    p.tri(17.0, 4.8, 19.6, -0.2, 21.0, 5.4, orange, { bias: -0.35 });
    p.ell(14.6, 8.4, 6.2, 5.4, orange, { bias: 0.05 });
    p.tri(9.4, 5.4, 11.0, -0.3, 14.4, 3.7, orange, { bias: 0.1 });
    p.tri(10.7, 4.7, 11.4, 1.5, 13.3, 3.9, pink);
    p.line(13.6, 3.4, 13.6, 5.0, orange.c[0]);
    p.line(15.3, 3.2, 15.3, 4.6, orange.c[0]);
    p.line(9.4, 8.4, 10.6, 8.6, orange.c[0]);
    p.ell(17.9, 10.6, 2.8, 1.9, cream, { bias: 0.1 });
    if (sleep) {
      p.line(15.5, 8.4, 17.4, 8.9, '#5a2e0e');
      p.line(15.5, 8.4, 15.5, 8.0, '#5a2e0e');
    } else {
      p.ell(16.4, 8.0, 1.25, 1.65, '#1a1030');
      p.ell(16.5, 8.85, 0.9, 0.7, '#5fd35a');
      p.px(15.8, 7.0, '#ffffff');
    }
    p.ell(20.5, 9.6, 0.65, 0.5, '#e05a84');
    p.ell(17.4, 11.3, 0.95, 0.5, '#ff9db8');
    p.px(19.5, 11.5, '#7a3a2a');
    return p.render();
  }
  CR.drawGuard = function (ctx, cx, footY, o) {
    o = o || {};
    const spr = cached('guard_' + (o.frame || 0) + '_' + (o.sleep ? 1 : 0), () => paintGuard(o.frame || 0, o.sleep));
    CR.drawSprite(ctx, spr, cx - 12, footY - 21, { flip: o.flip });
  };

  /* ===================== CARITA DE GATO (ventanas) ===================== */
  function paintCatFace(s) {
    const orange = CR.ramp('#f39c34', 4, 2, { step: 0.1 });
    const p = new CR.Painter(Math.ceil(14 * s) + 2, Math.ceil(12 * s) + 2, 1, 1, s);
    p.tri(1.0, 5.0, 2.6, -0.2, 6.0, 2.6, orange);
    p.tri(13.0, 5.0, 11.4, -0.2, 8.0, 2.6, orange, { bias: -0.2 });
    p.ell(7, 7, 6, 4.8, orange);
    p.line(3.6, 6.2, 4.6, 5.4, '#1a1030');
    p.line(4.6, 5.4, 5.6, 6.2, '#1a1030');
    p.line(8.4, 6.2, 9.4, 5.4, '#1a1030');
    p.line(9.4, 5.4, 10.4, 6.2, '#1a1030');
    p.ell(7, 9.0, 1.8, 1.4, '#5a1020');
    p.ell(7, 9.6, 1.0, 0.6, '#ff7aa8');
    p.ell(3.4, 8.2, 0.9, 0.5, '#ff9db8');
    p.ell(10.6, 8.2, 0.9, 0.5, '#ff9db8');
    return p.render();
  }
  // Retratos para los diálogos
  CR.faceFor = function (who) {
    if (!who) return null;
    if (who === '{heroe}') return { kind: 'rat', key: CR.state.hero };
    if (who === '{capturado}') return { kind: 'rat', key: CR.state.captured };
    if (who === CR.CONFIG.textos.jefeNombre) return { kind: 'boss', noCrown: CR.engine.current === 'postcreditos' };
    if (who === 'GUARDIA') return { kind: 'guard' };
    return null;
  };
  CR.drawFace = function (ctx, face, cx, cy, talking, t) {
    const bob = talking ? Math.floor(t * 9) % 2 : 0;
    if (face.kind === 'rat') {
      const spr = CR.ratSprite(face.key, 2.4, 0, talking && Math.floor(t * 6) % 5 === 0 ? 'happy' : CR.blink(t, 7));
      CR.drawSprite(ctx, spr, cx - 34, cy - 22 - bob);
    } else if (face.kind === 'guard') {
      ctx.save();
      ctx.translate(cx, cy - bob);
      ctx.scale(2, 2);
      CR.drawGuard(ctx, -4, 10, {});
      ctx.restore();
    } else {
      CR.drawSprite(ctx, CR.bossSprite(), cx - 28, cy - 16 - bob);
      if (!face.noCrown) CR.drawSprite(ctx, CR.SPR.crown, cx - 6, cy - 18 - bob);
    }
  };

  CR.drawCatFace = function (ctx, cx, cy, s) {
    s = s || 1;
    const spr = cached('catface_' + s, () => paintCatFace(s));
    CR.drawSprite(ctx, spr, cx - spr.width / 2, cy - spr.height / 2);
  };

  /* ===================== GATO COMANDANTE (de frente) ===================== */
  function paintBoss() {
    const fur = { c: ['#0e0918', '#1a1229', '#271c3d', '#382b55', '#4f4174'], out: '#05020a' };
    const chest = CR.ramp('#b9acd9', 4, 2, { step: 0.1 });
    const cape = CR.ramp('#c0263b', 5, 2, { step: 0.1 });
    const gold = CR.ramp('#ffcc33', 4, 2, { step: 0.12 });
    const eyeR = CR.ramp('#ffd23f', 4, 2, { step: 0.12 });
    const pink = CR.ramp('#ff7aa8', 3, 1, { step: 0.1 });
    const p = new CR.Painter(56, 50, 1, 1, 1);
    p.ell(27, 40, 25, 10, cape, { clip: (x, y) => y > 30 });
    p.ell(27, 35, 21, 9, cape, { bias: -0.25 });
    for (let x = 3; x < 52; x += 1) p.px(x, 48.6 - Math.abs(Math.sin(x * 0.5)) * 1.4, cape.c[0]);
    p.ell(27, 38, 13, 9.5, fur);
    p.ell(27, 39, 6.5, 6.8, chest, { bias: 0.1 });
    p.ell(27, 29.6, 13.5, 2.7, gold);
    p.ell(27, 30.0, 1.8, 1.8, CR.ramp('#ff3355', 3, 1));
    p.px(26.4, 29.2, '#ffd0da');
    p.ell(19.5, 46.2, 4.3, 2.3, fur, { bias: 0.25 });
    p.ell(34.5, 46.2, 4.3, 2.3, fur, { bias: 0.25 });
    [18, 20.5, 33, 35.5].forEach((x) => p.line(x, 45.4, x, 47.2, fur.c[0]));
    p.tri(10, 12, 13, -0.5, 22, 6, fur, { bias: 0.15 });
    p.tri(44, 12, 41, -0.5, 32, 6, fur, { bias: -0.15 });
    p.tri(12.6, 9.6, 13.8, 2.6, 19.0, 6.6, pink);
    p.tri(41.4, 9.6, 40.2, 2.6, 35.0, 6.6, pink, { bias: -0.2 });
    p.ell(27, 18, 17, 13.2, fur, { bias: 0.05 });
    p.ell(12.4, 23.6, 4.4, 3.4, fur);
    p.ell(41.6, 23.6, 4.4, 3.4, fur, { bias: -0.25 });
    p.ell(27, 25.2, 6.2, 3.7, chest, { bias: -0.15 });
    for (const cx of [19.5, 34.5]) {
      p.ell(cx, 17.6, 4.5, 4.3, eyeR, { bias: 0.25 });
      p.ell(cx + 0.4, 17.9, 1.05, 3.5, '#0a0612');
      p.ell(cx - 1.7, 15.4, 1.0, 1.0, '#ffffff');
      p.px(cx + 2.1, 20.0, '#fff6c4');
    }
    for (let k = 0; k < 2; k++) {
      p.line(13.5, 10.8 + k, 23.5, 14.0 + k, '#05020a');
      p.line(40.5, 10.8 + k, 30.5, 14.0 + k, '#05020a');
    }
    p.tri(25.0, 22.2, 29.0, 22.2, 27.0, 24.4, pink);
    p.line(27, 24.6, 25.0, 26.4, '#05020a');
    p.line(27, 24.6, 29.0, 26.4, '#05020a');
    p.line(25.4, 26.8, 25.4, 28.0, '#ffffff');
    p.line(28.6, 26.8, 28.6, 28.0, '#ffffff');
    p.line(21.0, 24.6, 9.0, 23.0, '#cfc6e6');
    p.line(21.0, 26.0, 9.0, 27.2, '#cfc6e6');
    p.line(33.0, 24.6, 45.0, 23.0, '#cfc6e6');
    p.line(33.0, 26.0, 45.0, 27.2, '#cfc6e6');
    return p.render();
  }
  CR.bossSprite = () => cached('boss', paintBoss);
  CR.drawBoss = function (ctx, cx, cy, o) {
    o = o || {};
    const spr = CR.bossSprite();
    CR.drawSprite(ctx, o.white ? CR.whiteOf(spr) : spr, cx - 28, cy - 25, { alpha: o.alpha });
  };

  /* ===================== NAVE DEL IMPERIO GATUNO ===================== */
  function paintShip(s) {
    const purple = CR.ramp('#7c3aed', 5, 2, { step: 0.1 });
    const lilac = CR.ramp('#a78bfa', 4, 2, { step: 0.09 });
    const pink = CR.ramp('#ff7aa8', 4, 2, { step: 0.1 });
    const glass = CR.ramp('#7dd3fc', 4, 2, { step: 0.1 });
    const metal = CR.ramp('#8b84b0', 4, 2, { step: 0.11 });
    const W = Math.ceil(60 * s) + 2, H = Math.ceil(30 * s) + 2;
    const p = new CR.Painter(W, H, 1, 1, s);
    p.chain([[6, 17], [3.6, 14.6], [2.4, 11.2], [3.0, 7.6], [4.8, 5.2]], (f) => 1.3 - f * 0.4, purple);
    p.ell(5.0, 4.8, 1.2, 1.2, pink, { bias: 0.2 });
    p.tri(14, 13, 17.4, 2.6, 23.4, 12, purple, { bias: 0.1 });
    p.tri(16.2, 11.6, 17.5, 6.0, 21.2, 11.6, pink);
    p.tri(37.6, 12, 43.6, 2.6, 46.6, 13, purple, { bias: -0.15 });
    p.tri(39.6, 11.6, 43.0, 6.0, 44.6, 11.6, pink, { bias: -0.2 });
    p.ell(30.5, 11.2, 7.6, 6.6, glass, { clip: (x, y) => y < 13.5, bias: 0.15 });
    p.ell(30, 19.2, 28, 8.4, purple);
    p.ell(31, 15.4, 20, 4, lilac, { clip: (x, y) => y < 17.2, bias: 0.1 });
    p.ell(30, 25.0, 15, 2.6, purple, { bias: -0.4 });
    for (let x = 4; x < 57; x += 1 / s) p.px(x, 20.0, lilac.c[3]);
    p.ell(2.9, 19.2, 2.4, 3.0, metal);
    p.ell(14.2, 19.2, 5.8, 5.8, metal, { bias: 0.15 });
    p.ell(14.2, 19.2, 4.5, 4.5, '#140b26');
    p.line(27.2, 7.4, 28.6, 6.2, '#e0f7ff');
    return p.render();
  }
  CR.drawShip = function (ctx, x, y, t, o) {
    o = o || {};
    const s = o.s || 1, G = CR.g;
    const spr = cached('ship_' + s, () => paintShip(s));
    const ox = Math.round(x - (1 + 30 * s)), oy = Math.round(y - (1 + 19.2 * s));
    if (o.flame !== false) {
      const fl = Math.round((4 + Math.random() * 4 + (o.bigFlame ? 6 : 0)) * s);
      const fy = oy + Math.round(1 + 19.2 * s);
      G.rect(ox - fl + 1, fy - Math.round(2 * s), fl, Math.round(4 * s), '#ff7b00');
      G.rect(ox - Math.floor(fl * 0.6) + 1, fy - Math.round(1 * s), Math.floor(fl * 0.6), Math.max(1, Math.round(2 * s)), '#ffd23f');
    }
    CR.drawSprite(ctx, spr, ox, oy);
    if (o.catPeek) CR.drawCatFace(ctx, ox + 1 + 30.5 * s, oy + 1 + 9.5 * s, s);
    // ventana trasera con la rata capturada
    const wx = ox + 1 + 14.2 * s, wy = oy + 1 + 19.2 * s, wr = 4.5 * s;
    if (o.captured) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(wx, wy, wr, 0, Math.PI * 2);
      ctx.clip();
      const bob = o.happy ? -Math.round(Math.abs(Math.sin(t * 10)) * 2 * s) : 0;
      const rs = s;
      const sz = CR.ratSize(rs);
      // la rata mira hacia atrás (izquierda), con el ojo cerca del centro de la ventana
      const eyeLocalX = sz.w - (1 + 14.75 * rs), eyeLocalY = 1 + 8.6 * rs;
      const rx = Math.round(wx - eyeLocalX - 0.5 * s), ry = Math.round(wy - eyeLocalY + bob);
      CR.drawSprite(ctx, CR.ratSprite(o.captured, rs, 0, o.happy ? 'happy' : 'open'), rx, ry, { flip: true });
      if (o.crying) {
        const k = Math.floor(t * 8) % 4;
        G.rect(wx - 1, wy + Math.round(1 * s) + k, 1, Math.max(1, Math.round(s)), '#7dd3fc');
        G.rect(wx - Math.round(2 * s), wy + Math.round(1 * s) + ((k + 2) % 4), 1, Math.max(1, Math.round(s)), '#7dd3fc');
      }
      ctx.restore();
    }
    ctx.globalAlpha = 0.35;
    G.rect(wx - Math.round(2.8 * s), wy - Math.round(3 * s), Math.round(2 * s), Math.max(1, Math.round(s)), '#ffffff');
    ctx.globalAlpha = 1;
    const on = Math.floor(t * 4) % 2;
    [22, 30, 38].forEach((lx, i) => G.rect(ox + 1 + lx * s, oy + 1 + 23.4 * s, Math.max(2, Math.round(1.6 * s)), Math.max(1, Math.round(1.2 * s)), (i + on) % 2 ? '#ff4d6d' : '#ffd23f'));
  };

  /* ===================== COHETE ===================== */
  function paintRocket(s) {
    const white = CR.ramp('#e5e7eb', 4, 2, { step: 0.11 });
    const red = CR.ramp('#ef4444', 4, 2, { step: 0.11 });
    const glass = CR.ramp('#38bdf8', 3, 1, { step: 0.12 });
    const metal = CR.ramp('#8b84b0', 3, 1, { step: 0.12 });
    const W = Math.ceil(30 * s) + 2, H = Math.ceil(16 * s) + 2;
    const p = new CR.Painter(W, H, 1, 1, s);
    p.tri(2.0, 2.4, 10.0, 6.6, 5.4, 7.2, red, { bias: 0.1 });
    p.tri(2.0, 13.6, 10.0, 9.4, 5.4, 8.8, red, { bias: -0.3 });
    p.ell(3.4, 8, 1.7, 2.3, metal);
    p.ell(14, 8, 10.6, 4.1, white);
    p.ell(9.2, 8, 1.4, 4.0, red);
    p.ell(24.4, 8, 4.6, 3.5, red, { clip: (x) => x > 22.6 });
    p.ell(17.4, 7.6, 2.2, 2.2, metal);
    p.ell(17.4, 7.6, 1.6, 1.6, glass, { bias: 0.2 });
    p.px(16.8, 6.8, '#ffffff');
    return p.render();
  }
  CR.drawRocket = function (ctx, x, y, t, o) {
    o = o || {};
    const s = o.s || 1, G = CR.g;
    const spr = cached('rocket_' + s, () => paintRocket(s));
    const ox = Math.round(x - (1 + 14 * s)), oy = Math.round(y - (1 + 8 * s));
    if (o.flame !== false) {
      const fl = Math.round(((o.boost ? 11 : 5) + Math.random() * 4) * s);
      const fy = oy + Math.round(1 + 8 * s);
      G.rect(ox - fl + 2, fy - Math.round(2 * s), fl, Math.round(4 * s), '#ff7b00');
      G.rect(ox - Math.floor(fl * 0.6) + 2, fy - Math.round(s), Math.floor(fl * 0.6), Math.max(1, Math.round(2 * s)), '#ffd23f');
      if (o.boost) G.rect(ox - Math.floor(fl * 0.3) + 2, fy, Math.floor(fl * 0.3), 1, '#ffffff');
    }
    if (o.rider) CR.drawRat(ctx, o.rider, ox + 1 + 12.5 * s, oy + 1 + 6.2 * s, { s, frame: o.riderFrame || 0, eye: o.riderEye });
    CR.drawSprite(ctx, spr, ox, oy);
  };

  /* ===================== QUESO CORAZÓN (entero o en mitades) ===================== */
  function paintHeartCheese(part, s) {
    const cheese = CR.ramp('#ffd23f', 4, 2, { step: 0.11 });
    const p = new CR.Painter(Math.ceil(14 * s) + 2, Math.ceil(13 * s) + 2, 1, 1, s);
    const clip = (x, y) => (part === 'L' ? x < 7 + (Math.floor(y) % 2 ? 0.7 : -0.5) : part === 'R' ? x >= 7 + (Math.floor(y) % 2 ? 0.7 : -0.5) : true);
    p.ell(4, 4.2, 3.7, 3.7, cheese, { clip, bias: 0.1 });
    p.ell(10, 4.2, 3.7, 3.7, cheese, { clip, bias: -0.05 });
    p.tri(0.5, 5, 13.5, 5, 7, 12.6, cheese, { clip });
    for (const [hx, hy, hr] of [[3.6, 4.2, 1.0], [9.8, 6.6, 1.1], [6.2, 8.8, 0.8], [11, 3.4, 0.7]]) p.ell(hx, hy, hr, hr, cheese, { clip, bias: -0.75 });
    p.px(2.6, 2.4, '#fff8c8');
    return p.render();
  }
  CR.heartCheese = (part, s) => cached('hc_' + part + '_' + (s || 1), () => paintHeartCheese(part, s || 1));

  /* ===================== OBJETOS (mapas a mano) ===================== */
  const CHEESE = [
    '.......oo..',
    '.....ooHHo.',
    '...ooHHYYo.',
    '.ooHHYYYYyo',
    'oHHYYhYYYyo',
    'oYYYYYYhYyo',
    'oYhYYYYYYyo',
    'oyyyyyyyyyo',
    '.ooooooooo.',
  ];
  const HEART = [
    '.ooo.ooo.',
    'oHWHoHHHo',
    'oWHHHHHho',
    'oHHHHHHho',
    '.oHHHHho.',
    '..oHHho..',
    '...oho...',
    '....o....',
  ];
  const MINI_HEART = ['.H.H.', 'HWHHH', 'HHHHh', '.HHh.', '..h..'];
  const CROWN = [
    '.o...oo...o.',
    'oGo.oGGo.oGo',
    'oGGooGGooGGo',
    'oGHGGGGGGGgo',
    'oHJHGBGGJGgo',
    'oGHGGGGGGggo',
    'oggggggggggo',
    '.oooooooooo.',
  ];

  CR.buildSprites = function () {
    const S = (CR.SPR = {});
    S.cheese = CR.makeSprite(CHEESE, { H: '#fff3a0', Y: '#ffd23f', y: '#d9940a', h: '#c98a0a', o: '#5a3208' });
    S.gold = CR.makeSprite(CHEESE, { H: '#ffffff', Y: '#fff1a8', y: '#ffb800', h: '#e6a800', o: '#6a4a00' });
    S.heart = CR.makeSprite(HEART, { H: '#ff4d6d', h: '#c9184a', W: '#ffd0da', o: '#5a0f26' });
    S.heartEmpty = CR.makeSprite(HEART, { H: '#3a2350', h: '#2a1840', W: '#4d3366', o: '#140a22' });
    S.miniHeart = CR.makeSprite(MINI_HEART, { H: '#ff5fa2', W: '#ffd0e6', h: '#c23a7a' });
    S.crown = CR.makeSprite(CROWN, { G: '#ffcc33', g: '#c98f00', H: '#fff3b0', J: '#ff3355', B: '#38bdf8', o: '#4a2e00' });
    // pre-pintar lo más usado para que no haya tirones al jugar
    for (const k of ['jero', 'yazeth']) for (const f of [0, 1]) CR.ratSprite(k, 1, f);
    CR.bossSprite();
  };

  /* ===================== ASTEROIDES ===================== */
  CR.makeAsteroid = function (r, seed, rot) {
    rot = rot || 0;
    let sd = seed * 9301 + 49297;
    const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
    const stone = CR.ramp(['#9a8a8f', '#a08470', '#8a8ea6'][seed % 3], 5, 2, { step: 0.13 });
    const size = Math.ceil(r * 2) + 4;
    const p = new CR.Painter(size, size, 0, 0, 1);
    const bumps = [];
    for (let i = 0; i < 10; i++) bumps.push(0.8 + rnd() * 0.22);
    const rb = bumps.map((_, i) => bumps[(i + Math.round((rot / 6.283) * bumps.length)) % bumps.length]);
    p.ell(size / 2, size / 2, r * 0.96, r * 0.96, stone, { bumps: rb });
    for (let i = 0; i < Math.max(1, Math.floor(r / 3.5)); i++) {
      const a = rnd() * 6.28 + rot, d = rnd() * r * 0.5, cr = 0.8 + rnd() * r * 0.22;
      const cx = size / 2 + Math.cos(a) * d, cy = size / 2 + Math.sin(a) * d;
      p.ell(cx + 0.4, cy + 0.4, cr, cr, stone, { bias: 0.25 });
      p.ell(cx, cy, cr * 0.8, cr * 0.8, stone, { bias: -0.6 });
    }
    return p.render();
  };

  /* ===================== FLORES ESPACIALES ===================== */
  const FLOWER_COLORS = [
    { a: '#ff4fd8', b: '#ffb3f0', c: '#b0249a', glow: '#ff4fd8' },
    { a: '#38e1ff', b: '#b8f6ff', c: '#1678a8', glow: '#38e1ff' },
    { a: '#b388ff', b: '#e6d6ff', c: '#6a3fc2', glow: '#9d6bff' },
    { a: '#ffd23f', b: '#fff1a8', c: '#c98a0a', glow: '#ffb800' },
  ];

  CR.Flower = class {
    constructor(x, baseY, h, delay, col, dir) {
      Object.assign(this, { x, by: baseY, h, delay, col, dir: dir || 1, t: 0, g: 0, bloom: 0, ph: Math.random() * 6 });
      this.leaves = [];
      for (let i = 12; i < h - 8; i += 11 + Math.floor(Math.random() * 6)) this.leaves.push({ at: i, side: this.leaves.length % 2 ? 1 : -1 });
      this.buds = Math.random() < 0.7 ? [{ at: Math.floor(h * 0.55), side: Math.random() < 0.5 ? -1 : 1 }] : [];
    }
    skip() { this.t = Math.max(this.t, this.delay); this.g = 1; this.bloom = 1; }
    px(i) {
      const sway = Math.sin(this.t * 1.5 + this.ph + i * 0.05) * (i / this.h) * 3;
      return Math.round(this.x + Math.sin(i * 0.07 + this.ph) * 2 * this.dir + sway);
    }
    head() {
      const n = Math.max(1, Math.floor(this.h * this.g));
      return { x: this.px(n - 1), y: this.by - n + 1 };
    }
    update(dt, fx) {
      this.t += dt;
      if (this.t < this.delay) return;
      if (this.g < 1) this.g = Math.min(1, this.g + dt / 1.5);
      else if (this.bloom < 1) this.bloom = Math.min(1, this.bloom + dt / 0.7);
      if (this.bloom >= 1 && fx && Math.random() < dt * 0.9) {
        const p = this.head();
        fx.add({ x: p.x, y: p.y, vx: CR.rand(-6, 6), vy: CR.rand(-14, -5), life: CR.rand(1.5, 3), color: CR.pick([this.col.a, this.col.b, '#fff8c0']) });
      }
    }
    draw(ctx) {
      if (this.t < this.delay) return;
      const G = CR.g, n = Math.floor(this.h * this.g);
      for (let i = 0; i < n; i++) {
        const x = this.px(i), y = this.by - i;
        if (i < this.h * 0.4) { G.rect(x - 1, y, 1, 1, '#0b3b3a'); G.rect(x, y, 1, 1, '#2dd4bf'); G.rect(x + 1, y, 1, 1, '#0f766e'); }
        else { G.rect(x, y, 1, 1, i % 6 === 0 ? '#5eead4' : '#14b8a6'); G.rect(x + 1, y, 1, 1, '#0b3b3a'); }
      }
      for (const l of this.leaves) {
        if (n <= l.at) continue;
        const x = this.px(l.at), y = this.by - l.at;
        const len = Math.round(5 * Math.min(1, (n - l.at) / 6));
        for (let k = 1; k <= len; k++) {
          G.rect(x + l.side * k, y - Math.floor(k / 2), 1, 1, k === len ? '#99f6e4' : '#2dd4bf');
          G.rect(x + l.side * k, y - Math.floor(k / 2) + 1, 1, 1, '#0f766e');
        }
        if (len >= 3) G.rect(x + l.side * 2, y - 2, 1, 1, '#5eead4');
      }
      for (const b of this.buds) {
        if (n <= b.at + 4) continue;
        const x = this.px(b.at) + b.side * 3, y = this.by - b.at - 2;
        ctx.globalAlpha = 0.3 + 0.25 * Math.sin(this.t * 3);
        G.circle(x, y, 3, this.col.glow);
        ctx.globalAlpha = 1;
        G.rect(x - 1, y - 1, 2, 2, this.col.a);
        G.rect(x - 1, y - 1, 1, 1, this.col.b);
        G.rect(x - b.side, y + 1, 1, 1, '#2dd4bf');
        G.rect(x - b.side * 2, y + 2, 1, 1, '#2dd4bf');
      }
      if (this.bloom > 0 && n > 0) {
        const p = this.head(), b = CR.ease.back(this.bloom), pulse = Math.sin(this.t * 2.5) * 0.6;
        ctx.globalAlpha = 0.14 * this.bloom;
        G.circle(p.x, p.y, 10 * b + pulse, this.col.glow);
        ctx.globalAlpha = 0.24 * this.bloom;
        G.circle(p.x, p.y, 6.5 * b, this.col.glow);
        ctx.globalAlpha = 1;
        const rad = 3.8 * b, rot = this.t * 0.4;
        for (let k = 0; k < 6; k++) {
          const a = rot + (k * Math.PI) / 3;
          const px = Math.round(p.x + Math.cos(a) * rad - 1), py = Math.round(p.y + Math.sin(a) * rad - 1);
          G.rect(px, py, 3, 2, this.col.c);
          G.rect(px, py, 2, 2, k % 2 ? this.col.a : this.col.b);
          G.rect(px, py, 1, 1, '#ffffff');
        }
        G.rect(p.x - 1, p.y - 1, 3, 3, '#c98a0a');
        G.rect(p.x - 1, p.y - 1, 2, 2, '#fff8c0');
        G.rect(p.x - 1, p.y - 1, 1, 1, '#ffffff');
      }
    }
  };

  CR.makeFlowerSet = function (delay0, baseY) {
    baseY = baseY == null ? 180 : baseY;
    delay0 = delay0 || 0;
    const L = [[12, 62], [28, 96], [44, 50], [58, 30]];
    const R = [[308, 58], [292, 92], [276, 48], [262, 28]];
    const out = [];
    L.forEach(([x, h], i) => out.push(new CR.Flower(x, baseY, h, delay0 + i * 0.35, FLOWER_COLORS[i % 4], 1)));
    R.forEach(([x, h], i) => out.push(new CR.Flower(x, baseY, h, delay0 + 0.15 + i * 0.35, FLOWER_COLORS[(i + 2) % 4], -1)));
    return out;
  };
})();
