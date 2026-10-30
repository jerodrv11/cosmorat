/* =====================================================================
   ESCENA: PREMIO AL TERMINAR CADA NIVEL
   n = 1 -> carta con sello de lacre
   n = 2 -> foto que se descubre rascando
   n = 3 -> vale por una cita romántica
   params.view = true -> se abre desde el menú RECUERDOS
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR, G = CR.g, I = CR.input;

  CR.scene('recompensa', function (params) {
    const C = CR.CONFIG, P = C.premios;
    const n = params.n || 1, view = !!params.view, next = params.next || 'nivel2';
    const bg = CR.bgSpace(320, 9);
    const stars = new CR.Starfield(60), fx = new CR.Particles();
    let t = 0, leaving = false;
    CR.premios.add(n);
    CR.audio.stopMusic();
    CR.audio.sfx.fanfare();
    if (view) CR.audio.music('final');

    function exit() {
      if (leaving) return;
      leaving = true;
      CR.audio.sfx.select();
      CR.engine.go(view ? 'recuerdos' : next);
    }

    function drawBg(ctx, dim) {
      ctx.drawImage(bg, 0, 0);
      ctx.globalAlpha = dim == null ? 0.4 : dim;
      G.rect(0, 0, 320, 180, '#07040f');
      ctx.globalAlpha = 1;
      stars.draw(ctx, 1);
    }

    function title(text, sub, y) {
      G.text(text, 160, y, { size: 8, align: 'center', color: '#ffd23f', outline: '#3a1a00' });
      if (sub) G.text(sub, 160, y + 11, { size: 6, align: 'center', color: '#ff9fc0', outline: '#2a0614' });
    }

    /* =========================== 1. CARTA =========================== */
    function carta() {
      const E = { x: 96, y: 62, w: 128, h: 80 };
      const L = { x: 30, y: 10, w: 260, h: 158 };
      const typer = new CR.Typer(CR.fmt(C.frases.nivel1 || ''), { width: 224, size: 8, lh: 13, cps: 22 });
      let st = 'drop', k = 0, ey = -100, flap = 1, rise = 0, unfold = 0, sealShake = 0;
      const shards = [];
      const R = (x, y, w, h, c) => G.rect(x, y, w, h, c);

      function drawSeal(cx, cy, pulse) {
        const r = 9 + pulse;
        CR.glow(CR.engine.ctx, cx, cy, r + 6, '#ff4d6d', 0.15);
        G.circle(cx, cy, r, '#7a0f22');
        G.circle(cx, cy, r - 1, '#c0263b');
        G.circle(cx - 1, cy - 1, r - 3, '#d9455a');
        CR.drawSprite(CR.engine.ctx, CR.SPR.heart, cx - 4, cy - 4, {});
        G.rect(cx - 5, cy - 6, 2, 1, '#ff9aa8');
      }

      function drawEnvelope(ctx) {
        const x = E.x, y = Math.round(ey), w = E.w, h = E.h;
        ctx.globalAlpha = 0.4;
        G.ellipse(x + w / 2, y + h + 6, w / 2 - 6, 3, '#000000');
        ctx.globalAlpha = 1;
        // cuerpo trasero
        R(x - 1, y - 1, w + 2, h + 2, '#5a3b1c');
        R(x, y, w, h, '#d9c29a');
        // carta que sale
        if (rise > 0 && unfold <= 0) {
          const ly = y + 8 - rise * 66;
          R(x + 9, ly - 1, w - 18, 72, '#8a6a3c');
          R(x + 10, ly, w - 20, 70, '#fff8ec');
          for (let i = 0; i < 4; i++) R(x + 18, ly + 10 + i * 8, w - 36, 1, '#c9d8f0');
          CR.drawSprite(ctx, CR.SPR.miniHeart, x + w / 2 - 2, ly + 46);
        }
        // solapa abierta (detrás)
        if (flap < 0) CR.tri(x, y, x + w, y, x + w / 2, y + flap * h * 0.55, '#c9ae80');
        // bolsillo frontal
        CR.tri(x, y + h, x, y + 6, x + w / 2, y + h * 0.58, '#ecdcb8');
        CR.tri(x + w, y + h, x + w, y + 6, x + w / 2, y + h * 0.58, '#e2cfa6');
        CR.tri(x, y + h, x + w, y + h, x + w / 2, y + h * 0.5, '#f3e6c8');
        G.line(x, y + h, x + w / 2, y + h * 0.5, '#b89a6a');
        G.line(x + w, y + h, x + w / 2, y + h * 0.5, '#b89a6a');
        // solapa cerrada (delante)
        if (flap > 0) {
          CR.tri(x, y, x + w, y, x + w / 2, y + flap * h * 0.55, '#e8d5b0');
          G.line(x, y, x + w / 2, y + flap * h * 0.55, '#b89a6a');
          G.line(x + w, y, x + w / 2, y + flap * h * 0.55, '#b89a6a');
        }
        // sello
        if (st === 'drop' || st === 'wait' || st === 'crack') {
          const sh = st === 'crack' ? Math.round(Math.sin(t * 60) * 2) : 0;
          drawSeal(x + w / 2 + sh, y + Math.round(h * 0.55), st === 'wait' ? Math.round(Math.abs(Math.sin(t * 4))) : 0);
        }
        // contorno
        G.rect(x - 1, y - 1, w + 2, 1, '#5a3b1c');
      }

      function drawLetter(ctx) {
        const e = CR.ease.back(unfold);
        const sx = E.x + 10, sy = E.y - 58, sw = E.w - 20, sh = 70;
        const x = Math.round(CR.lerp(sx, L.x, e)), y = Math.round(CR.lerp(sy, L.y, e));
        const w = Math.round(CR.lerp(sw, L.w, e)), h = Math.round(CR.lerp(sh, L.h, e));
        ctx.globalAlpha = 0.45;
        R(x + 3, y + 4, w, h, '#000000');
        ctx.globalAlpha = 1;
        R(x - 1, y - 1, w + 2, h + 2, '#8a6a3c');
        R(x, y, w, h, '#fff8ec');
        for (let yy = y + 26; yy < y + h - 8; yy += 13) R(x + 6, yy, w - 12, 1, '#d6e2f4');
        R(x + 20, y + 4, 1, h - 8, '#f2a0a8');
        // pliegues
        R(x, y + Math.round(h / 3), w, 1, '#efe4cf');
        R(x, y + Math.round((2 * h) / 3), w, 1, '#efe4cf');
        if (unfold >= 1) {
          G.text('Para ' + CR.name('yazeth') + ':', x + 26, y + 10, { size: 8, color: '#a0245e', shadow: false });
          typer.draw(x + 26, y + 26, { color: '#3b2a6b', shadow: false });
          if (typer.done) {
            G.text(P.firmaCarta, x + w - 12, y + h - 22, { size: 8, align: 'right', color: '#a0245e', shadow: false });
            CR.drawSprite(ctx, CR.SPR.heart, x + w - 30, y + h - 34, {});
          }
        }
      }

      return {
        update(dt) {
          k += dt;
          if (st === 'drop') { ey = CR.lerp(-100, E.y, CR.ease.bounce(k / 0.9)); if (k >= 0.9) { st = 'wait'; k = 0; } }
          else if (st === 'wait') {
            if (I.confirm()) { st = 'crack'; k = 0; CR.audio.sfx.squeak(); }
          } else if (st === 'crack') {
            if (k >= 0.45) {
              st = 'open'; k = 0;
              CR.audio.sfx.hit();
              const cx = E.x + E.w / 2, cy = E.y + E.h * 0.55;
              shards.push({ x: cx - 4, y: cy, vx: -30, vy: -40 }, { x: cx + 4, y: cy, vx: 30, vy: -35 });
              fx.burst(cx, cy, 14, { color: ['#c0263b', '#ff4d6d', '#ffd0da'], max: 50 });
            }
          } else if (st === 'open') {
            flap = CR.lerp(1, -0.8, CR.ease.inOut(k / 0.7));
            if (k >= 0.7) { st = 'rise'; k = 0; CR.audio.sfx.sparkle(); }
          } else if (st === 'rise') {
            rise = CR.ease.out(k / 1.1);
            if (k >= 1.1) { st = 'unfold'; k = 0; CR.audio.sfx.door(); }
          } else if (st === 'unfold') {
            unfold = Math.min(1, k / 0.7);
            ey += dt * 260;
            if (k >= 0.7) { st = 'read'; k = 0; for (let i = 0; i < 12; i++) fx.add({ type: 'heart', x: CR.rand(40, 280), y: 170, vy: -CR.rand(20, 40), vx: CR.rand(-8, 8), life: 2 }); }
          } else if (st === 'read') {
            typer.update(dt);
            if (I.confirm()) { if (!typer.done) typer.finish(); else exit(); }
          }
          for (const s of shards) { s.vy += 200 * dt; s.x += s.vx * dt; s.y += s.vy * dt; }
        },
        draw(ctx) {
          drawBg(ctx);
          if (st !== 'read') title('¡NIVEL 1 SUPERADO!', 'TIENES CORRESPONDENCIA', 10);
          if (unfold <= 0 || ey < 200) drawEnvelope(ctx);
          for (const s of shards) { G.circle(s.x, s.y, 4, '#c0263b'); G.rect(s.x - 2, s.y - 2, 2, 1, '#ff9aa8'); }
          if (unfold > 0) drawLetter(ctx);
          if (st === 'wait' && Math.floor(t * 2.5) % 2 === 0) G.text(I.isTouch ? 'Toca el sello' : 'ENTER o clic para abrir', 160, 156, { size: 6, align: 'center', color: '#ffffff', outline: '#120826' });
          if (st === 'read' && typer.done && Math.floor(t * 2.5) % 2 === 0) G.text(C.textos.continuar + ' >', 160, 171, { size: 6, align: 'center', color: '#e0d4ff', outline: '#120826' });
        },
      };
    }

    /* =========================== 2. FOTO (rasca) =========================== */
    function foto() {
      const PH = { x: 34, y: 20, w: 96, h: 128 };
      const CELL = 2, CW = PH.w / CELL, CHH = PH.h / CELL;
      const mask = new Uint8Array(CW * CHH);
      const typer = new CR.Typer(CR.fmt(C.frases.nivel2 || ''), { width: 144, size: 8, lh: 11, cps: 26 });
      let st = 'drop', k = 0, py = -170, cleared = 0, last = null, revealA = 0, hint = 0, autoA = 0, scratchSfx = 0;

      function scratch(gx, gy) {
        const r = 7;
        const cx0 = Math.floor((gx - PH.x) / CELL), cy0 = Math.floor((gy - PH.y) / CELL), rc = Math.ceil(r / CELL);
        let hit = false;
        for (let cy = cy0 - rc; cy <= cy0 + rc; cy++) {
          for (let cx = cx0 - rc; cx <= cx0 + rc; cx++) {
            if (cx < 0 || cy < 0 || cx >= CW || cy >= CHH) continue;
            const i = cy * CW + cx;
            if (mask[i]) continue;
            if (Math.hypot((cx - cx0) * CELL, (cy - cy0) * CELL) > r) continue;
            mask[i] = 1; cleared++; hit = true;
          }
        }
        if (hit) {
          if (Math.random() < 0.3) fx.add({ type: 'px', x: gx, y: gy, vx: CR.rand(-30, 30), vy: CR.rand(-10, 30), g: 120, life: 0.5, color: CR.pick(['#cfd3dc', '#9aa0ad', '#ffffff']) });
          scratchSfx -= 1;
          if (scratchSfx <= 0) { scratchSfx = 6; CR.audio.sfx.blip(); }
        }
      }
      function scratchLine(a, b) {
        const d = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
        for (let i = 0; i <= d; i++) scratch(a.x + ((b.x - a.x) * i) / d, a.y + ((b.y - a.y) * i) / d);
      }

      function drawPhoto(ctx, x, y, w, h) {
        if (CR.photo) {
          const im = CR.photo, ar = w / h, iar = im.width / im.height;
          let sw = im.width, sh = im.height, sx = 0, sy = 0;
          if (iar > ar) { sw = im.height * ar; sx = (im.width - sw) / 2; } else { sh = im.width / ar; sy = (im.height - sh) / 2; }
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
          ctx.imageSmoothingEnabled = false;
        } else {
          G.rect(x, y, w, h, '#2a1650');
          CR.drawSprite(ctx, CR.SPR.heart, x + w / 2 - 18, y + h / 2 - 16, { scale: 4 });
        }
      }

      return {
        update(dt) {
          k += dt;
          if (st === 'drop') { py = CR.lerp(-170, PH.y - 8, CR.ease.back(k / 0.9)); if (k >= 0.9) { st = 'scratch'; k = 0; } }
          else if (st === 'scratch') {
            hint += dt;
            const ptr = I.lastPointer;
            if (I.held(ptr)) {
              const pt = { x: ptr.x, y: ptr.y };
              if (last) scratchLine(last, pt); else scratch(pt.x, pt.y);
              last = pt;
              hint = 0;
            } else last = null;
            if (I.down('Space', 'Enter')) {
              autoA += dt * 5;
              const ax = PH.x + PH.w / 2 + Math.sin(autoA * 1.3) * 44, ay = PH.y + PH.h / 2 + Math.sin(autoA * 0.71) * 60;
              scratch(ax, ay);
            }
            if (cleared / mask.length > 0.55) { st = 'reveal'; k = 0; CR.audio.sfx.sparkle(); CR.confetti(fx, PH.x + PH.w / 2, PH.y + 30, 50); }
          } else if (st === 'reveal') {
            revealA = Math.min(1, k / 0.8);
            if (k > 0.8) { st = 'read'; k = 0; }
          } else if (st === 'read') {
            typer.update(dt);
            if (Math.random() < dt * 3) fx.add({ type: 'star', x: PH.x + CR.rand(0, PH.w), y: PH.y + CR.rand(0, PH.h), vy: -6, life: 0.7, color: '#ffffff' });
            if (I.confirm()) { if (!typer.done) typer.finish(); else exit(); }
          }
        },
        draw(ctx) {
          drawBg(ctx);
          const oy = Math.round(py - (PH.y - 8));
          const X = PH.x, Y = PH.y + oy;
          // polaroid
          ctx.globalAlpha = 0.45;
          G.rect(X - 5, Y - 5, PH.w + 16, PH.h + 34, '#000000');
          ctx.globalAlpha = 1;
          G.rect(X - 9, Y - 9, PH.w + 18, PH.h + 36, '#c9bfae');
          G.rect(X - 8, Y - 8, PH.w + 16, PH.h + 34, '#fbf7ef');
          G.rect(X - 8, Y + PH.h + 25, PH.w + 16, 1, '#e7dfd0');
          drawPhoto(ctx, X, Y, PH.w, PH.h);
          // capa plateada
          if (st !== 'read') {
            ctx.globalAlpha = st === 'reveal' ? 1 - revealA : 1;
            for (let cy = 0; cy < CHH; cy++) {
              for (let cx = 0; cx < CW; cx++) {
                if (mask[cy * CW + cx]) continue;
                const b = CR.bayer(cx, cy) + ((cx + cy) % 9 === 0 ? 0.5 : 0);
                ctx.fillStyle = b > 0.35 ? '#d5d9e2' : b > -0.2 ? '#b9bec9' : '#a3a9b6';
                ctx.fillRect(X + cx * CELL, Y + cy * CELL, CELL, CELL);
              }
            }
            const prog = cleared / mask.length;
            if (prog < 0.12 && st === 'scratch') {
              G.text('RASCA', X + PH.w / 2, Y + PH.h / 2 - 14, { size: 8, align: 'center', color: '#6b7080', shadow: false });
              G.text('AQUÍ', X + PH.w / 2, Y + PH.h / 2 - 2, { size: 8, align: 'center', color: '#6b7080', shadow: false });
              CR.drawSprite(ctx, CR.SPR.heart, X + PH.w / 2 - 4, Y + PH.h / 2 + 12);
            }
            const sp = Math.floor(t * 3) % 4;
            G.rect(X + 14 + sp * 18, Y + 10 + sp * 25, 1, 3, '#ffffff');
            G.rect(X + 13 + sp * 18, Y + 11 + sp * 25, 3, 1, '#ffffff');
            ctx.globalAlpha = 1;
          }
          // cintitas
          ctx.globalAlpha = 0.7;
          G.rect(X - 14, Y - 12, 22, 7, '#ffb3d6');
          G.rect(X + PH.w - 8, Y - 12, 22, 7, '#a8e6ff');
          ctx.globalAlpha = 1;
          // pie de foto
          G.text(P.pieFoto, X + PH.w / 2 - 4, Y + PH.h + 9, { size: 8, align: 'center', color: '#a0245e', shadow: false });
          CR.drawSprite(ctx, CR.SPR.miniHeart, X + PH.w / 2 + P.pieFoto.length * 4, Y + PH.h + 10);

          // panel derecho
          G.text('¡NIVEL 2', 233, 18, { size: 8, align: 'center', color: '#ffd23f', outline: '#3a1a00' });
          G.text('SUPERADO!', 233, 29, { size: 8, align: 'center', color: '#ffd23f', outline: '#3a1a00' });
          if (st === 'scratch') {
            G.box(150, 48, 164, 54, { border: '#c4b5fd' });
            G.text(I.isTouch ? 'Rasca la foto con' : 'Rasca la foto con', 232, 56, { size: 6, align: 'center', color: '#ffffff' });
            G.text(I.isTouch ? 'tu dedo para' : 'el mouse para', 232, 66, { size: 6, align: 'center', color: '#ffffff' });
            G.text('descubrirla', 232, 76, { size: 6, align: 'center', color: '#ffffff' });
            if (!I.isTouch) G.text('(o mantén ESPACIO)', 232, 88, { size: 6, align: 'center', color: '#8a7aa6' });
            const prog = Math.min(1, cleared / mask.length / 0.55);
            G.box(170, 110, 124, 8, { fill: '#1d0f3a', border: '#6b5884' });
            if (prog > 0) G.rect(172, 112, Math.round(120 * prog), 4, '#ff5fa2');
            if (hint > 3 && Math.floor(t * 2) % 2) {
              const hx = X + PH.w / 2 + Math.round(Math.sin(t * 3) * 20), hy = Y + PH.h / 2 + 30;
              G.rect(hx, hy, 3, 6, '#ffffff'); G.rect(hx - 1, hy + 5, 5, 4, '#ffffff');
            }
          }
          if (st === 'read' || st === 'reveal') {
            G.box(150, 42, 164, 122, { border: '#ff5fa2' });
            typer.draw(160, 52);
            if (typer.done && Math.floor(t * 2.5) % 2 === 0) G.text(C.textos.continuar + ' >', 232, 168, { size: 6, align: 'center', color: '#e0d4ff', outline: '#120826' });
          }
        },
      };
    }

    /* =========================== 3. VALE =========================== */
    function vale() {
      const V = P.vale;
      const T0 = { x: 30, y: 42, w: 260, h: 104 };
      let st = 'slide', k = 0, tx = 340, stampY = -60, stamped = false, fly = 0;
      // fondo dorado pre-pintado
      const goldBg = (() => {
        const c = document.createElement('canvas');
        c.width = T0.w; c.height = T0.h;
        const x = c.getContext('2d'), gold = ['#a86d00', '#c98f00', '#e6ac1e', '#ffcc33', '#ffe07a'];
        for (let yy = 0; yy < T0.h; yy++) for (let xx = 0; xx < T0.w; xx++) {
          const v = 0.6 + 0.3 * Math.sin((xx + yy * 1.6) / 24) - (yy / T0.h) * 0.35;
          x.fillStyle = CR.pickD(gold, v, xx, yy);
          x.fillRect(xx, yy, 1, 1);
        }
        return c;
      })();

      function drawTicket(ctx, x, y, s) {
        const w = Math.round(T0.w * s), h = Math.round(T0.h * s);
        if (s < 1) {
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(s, s);
          drawTicket(ctx, 0, 0, 1);
          ctx.restore();
          return;
        }
        ctx.globalAlpha = 0.45;
        G.rect(x + 4, y + 5, w, h, '#000000');
        ctx.globalAlpha = 1;
        G.rect(x - 1, y - 1, w + 2, h + 2, '#5a3a00');
        ctx.drawImage(goldBg, x, y);
        // marco punteado
        for (let xx = 4; xx < w - 4; xx += 4) { G.rect(x + xx, y + 4, 2, 1, '#7a4f00'); G.rect(x + xx, y + h - 5, 2, 1, '#7a4f00'); }
        for (let yy = 4; yy < h - 4; yy += 4) { G.rect(x + 4, y + yy, 1, 2, '#7a4f00'); G.rect(x + w - 5, y + yy, 1, 2, '#7a4f00'); }
        // talón
        const sx = x + 54;
        for (let yy = 6; yy < h - 6; yy += 4) G.rect(sx, y + yy, 1, 2, '#5a3a00');
        G.circle(sx, y - 1, 4, '#120826');
        G.circle(sx, y + h, 4, '#120826');
        G.text('Nº', x + 27, y + 18, { size: 6, align: 'center', color: '#5a3a00', shadow: false });
        G.text(V.numero, x + 27, y + 28, { size: 8, align: 'center', color: '#5a3a00', shadow: false });
        CR.drawSprite(ctx, CR.SPR.heart, x + 22, y + 46);
        CR.drawSprite(ctx, CR.SPR.miniHeart, x + 12, y + 60);
        CR.drawSprite(ctx, CR.SPR.miniHeart, x + 38, y + 64);
        // cuerpo
        const mx = sx + (w - 54) / 2;
        G.text(V.titulo, mx, y + 12, { size: 6, align: 'center', color: '#7a1530', shadow: false });
        G.text(V.premio, mx, y + 24, { size: 8, align: 'center', color: '#5a0f26', shadow: false });
        G.rect(sx + 14, y + 36, w - 54 - 28, 1, '#a86d00');
        V.detalles.forEach((d, i) => G.text(d, mx, y + 42 + i * 10, { size: 6, align: 'center', color: '#4a2e00', shadow: false }));
        G.wrap(V.nota, 32).forEach((l, i, arr) => G.text(l, mx, y + h - 10 - (arr.length - i) * 9, { size: 6, align: 'center', color: '#7a1530', shadow: false }));
        // brillo
        const shine = ((t * 70) % (w + 80)) - 40;
        ctx.globalAlpha = 0.35;
        for (let i = 0; i < 8; i++) G.rect(x + shine + i - (i > 3 ? 0 : 0), y + 2, 1, h - 4, '#ffffff');
        ctx.globalAlpha = 1;
        if (stamped) drawStamp(x + 3, y + h - 24, 1);
      }
      function drawStamp(x, y, a) {
        const E2 = CR.engine.ctx;
        E2.globalAlpha = 0.85 * a;
        G.rect(x, y, 52, 18, '#c0263b');
        G.rect(x + 2, y + 2, 48, 14, '#f6d26b');
        G.rect(x + 3, y + 3, 46, 12, '#c0263b');
        G.text('¡VÁLIDO!', x + 26, y + 6, { size: 6, align: 'center', color: '#fff3b0', shadow: false });
        E2.globalAlpha = 1;
      }

      return {
        update(dt) {
          k += dt;
          if (st === 'slide') {
            tx = CR.lerp(340, T0.x, CR.ease.back(Math.min(1, k / 0.9)));
            if (Math.random() < 0.4) fx.add({ type: 'star', x: tx + CR.rand(0, 240), y: T0.y + CR.rand(0, 100), vy: -10, life: 0.6, color: '#fff1a8' });
            if (k >= 1.3) { st = 'stamp'; k = 0; }
          } else if (st === 'stamp') {
            stampY = CR.lerp(-60, T0.y + T0.h - 24, Math.min(1, (k / 0.35) * (k / 0.35)));
            if (k >= 0.35 && !stamped) {
              stamped = true;
              CR.shake(3, 0.3);
              CR.audio.sfx.hit();
              CR.audio.sfx.fanfare();
              CR.confetti(fx, 160, 90, 60);
            }
            if (k >= 1.0) { st = 'wait'; k = 0; }
          } else if (st === 'wait') {
            if (I.confirm()) {
              if (view) exit();
              else { st = 'fly'; k = 0; CR.audio.sfx.gold(); }
            }
          } else if (st === 'fly') {
            fly = CR.ease.inOut(Math.min(1, k / 0.9));
            if (Math.random() < 0.6) fx.add({ type: 'star', x: CR.lerp(160, 290, fly), y: CR.lerp(94, 14, fly), vy: -4, life: 0.6, color: '#ffd23f' });
            if (k >= 2.2) exit();
          }
        },
        draw(ctx) {
          drawBg(ctx);
          title('¡NIVEL 3 SUPERADO!', 'PREMIO DESBLOQUEADO', 10);
          if (st === 'fly') {
            const s = CR.lerp(1, 0.12, fly);
            drawTicket(ctx, Math.round(CR.lerp(T0.x, 290 - (T0.w * s) / 2, fly)), Math.round(CR.lerp(T0.y, 14, fly)), s);
            if (k > 1) G.text('¡Guardado en RECUERDOS!', 160, 90, { size: 8, align: 'center', color: '#5eead4', outline: '#062a26' });
          } else {
            drawTicket(ctx, Math.round(tx), T0.y, 1);
            if (st === 'stamp' && !stamped) drawStamp(T0.x + 3, Math.round(stampY), 1);
          }
          if (st === 'wait') {
            G.text('Tómale captura: es válido en la vida real', 160, 154, { size: 6, align: 'center', color: '#ffd6f0', outline: '#120826' });
            if (Math.floor(t * 2.5) % 2 === 0) G.text(view ? C.textos.continuar + ' >' : 'Toca para guardar tu vale >', 160, 166, { size: 6, align: 'center', color: '#e0d4ff', outline: '#120826' });
          }
        },
      };
    }

    const mode = n === 1 ? carta() : n === 2 ? foto() : vale();

    return {
      update(dt) {
        t += dt;
        stars.update(dt, 0, 4);
        fx.update(dt);
        if (Math.random() < dt * 2) fx.add({ type: 'heart', x: CR.rand(10, 310), y: 184, vy: -CR.rand(12, 22), vx: CR.rand(-4, 4), life: 7 });
        if (leaving) return;
        mode.update(dt);
      },
      draw(ctx) {
        mode.draw(ctx);
        fx.draw(ctx);
      },
    };
  });

  /* =====================================================================
     ESCENA: RECUERDOS (menú de premios desbloqueados)
     ===================================================================== */
  CR.scene('recuerdos', function () {
    const bg = CR.bgSpace(320, 6);
    const stars = new CR.Starfield(60), fx = new CR.Particles();
    const got = CR.premios.get();
    const cards = [
      { n: 1, x: 28, label: 'CARTA' },
      { n: 2, x: 120, label: 'FOTO' },
      { n: 3, x: 212, label: 'VALE' },
    ];
    const BACK = { x: 4, y: 4, w: 64, h: 14 };
    let t = 0, leaving = false, sel = 0;
    CR.audio.music('menu');

    function open(c) {
      if (leaving) return;
      if (!got[c.n]) { CR.audio.sfx.hit(); return; }
      leaving = true;
      CR.audio.sfx.confirm();
      CR.engine.go('recompensa', { n: c.n, view: true });
    }

    function drawCard(ctx, c, i) {
      const y = 52 + (i === sel ? -3 : 0) + Math.round(Math.sin(t * 2 + i) * 1);
      const ok = got[c.n];
      G.box(c.x, y, 80, 92, { fill: ok ? '#2a1650' : '#140a26', border: i === sel ? '#ffd23f' : ok ? '#b388ff' : '#3a2350' });
      if (ok) {
        if (c.n === 1) {
          G.rect(c.x + 14, y + 22, 52, 34, '#d9c29a');
          CR.tri(c.x + 14, y + 22, c.x + 66, y + 22, c.x + 40, y + 42, '#e8d5b0');
          G.circle(c.x + 40, y + 42, 5, '#c0263b');
          CR.drawSprite(ctx, CR.SPR.miniHeart, c.x + 38, y + 40);
        } else if (c.n === 2) {
          G.rect(c.x + 18, y + 10, 44, 58, '#fbf7ef');
          if (CR.photo) {
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(CR.photo, 0, 0, CR.photo.width, CR.photo.height, c.x + 21, y + 13, 38, 46);
            ctx.imageSmoothingEnabled = false;
          }
        } else {
          G.rect(c.x + 8, y + 26, 64, 28, '#ffcc33');
          G.rect(c.x + 8, y + 26, 64, 2, '#ffe07a');
          G.rect(c.x + 22, y + 28, 1, 24, '#a86d00');
          CR.drawSprite(ctx, CR.SPR.heart, c.x + 11, y + 36);
          G.text('VALE', c.x + 47, y + 36, { size: 6, align: 'center', color: '#5a0f26', shadow: false });
        }
        G.text(c.label, c.x + 40, y + 76, { size: 8, align: 'center', color: '#ffffff', outline: '#120826' });
      } else {
        G.text('?', c.x + 40, y + 34, { size: 16, align: 'center', color: '#3a2350', shadow: false });
        G.text('NIVEL ' + c.n, c.x + 40, y + 76, { size: 6, align: 'center', color: '#5a4a78', shadow: false });
      }
    }

    return {
      update(dt) {
        t += dt;
        stars.update(dt, 2, 0);
        fx.update(dt);
        if (Math.random() < dt * 2) fx.add({ type: 'heart', x: CR.rand(10, 310), y: 184, vy: -CR.rand(12, 22), life: 7 });
        if (leaving) return;
        if (I.hit('ArrowLeft', 'KeyA')) { sel = (sel + 2) % 3; CR.audio.sfx.blip(); }
        if (I.hit('ArrowRight', 'KeyD')) { sel = (sel + 1) % 3; CR.audio.sfx.blip(); }
        if (I.hit('Digit1')) open(cards[0]);
        if (I.hit('Digit2')) open(cards[1]);
        if (I.hit('Digit3')) open(cards[2]);
        if (I.hit('Enter', 'Space')) open(cards[sel]);
        cards.forEach((c, i) => { if (I.tapIn(c.x, 48, 80, 98)) { sel = i; open(c); } });
        if (I.hit('Escape', 'Backspace') || I.tapIn(BACK.x, BACK.y, BACK.w, BACK.h)) { leaving = true; CR.audio.sfx.select(); CR.engine.go('inicio'); }
      },
      draw(ctx) {
        ctx.drawImage(bg, 0, 0);
        ctx.globalAlpha = 0.4;
        G.rect(0, 0, 320, 180, '#07040f');
        ctx.globalAlpha = 1;
        stars.draw(ctx, 1);
        fx.draw(ctx);
        G.text('RECUERDOS', 160, 18, { size: 16, align: 'center', color: '#ff9fc0', outline: '#2a0614' });
        cards.forEach((c, i) => drawCard(ctx, c, i));
        G.text(I.isTouch ? 'Toca un recuerdo para verlo' : '< > y ENTER para ver un recuerdo', 160, 162, { size: 6, align: 'center', color: '#e0d4ff', outline: '#120826' });
        G.box(BACK.x, BACK.y, BACK.w, BACK.h, { fill: 'rgba(18,8,38,0.8)', border: '#6b5884' });
        G.text('< VOLVER', BACK.x + BACK.w / 2, BACK.y + 4, { size: 6, align: 'center', color: '#c4b5fd' });
      },
    };
  });
})();
