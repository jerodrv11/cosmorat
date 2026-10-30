/* =====================================================================
   ESCENA FINAL: aterrizaje, el queso corazón se une, el hechizo se
   rompe, beso, constelación, mensaje y créditos.
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR, G = CR.g, I = CR.input;

  CR.scene('final', function () {
    const C = CR.CONFIG, T = C.textos;
    const H = CR.state.hero, K = CR.state.captured;
    CR.save.set({ hero: H, level: 0, terminado: true });

    const GROUND = 160, RS = 2;
    const bg = CR.bgHome(GROUND, 5);
    const stars = new CR.Starfield(50), fx = new CR.Particles(), dlg = new CR.Dialog();
    const HS = 1.3, HW = Math.ceil(22 * HS) + 2, NOSE = Math.floor(1 + 19.4 * HS);
    const KISS_J = 159 - NOSE, KISS_Y = KISS_J + 2 * NOSE + 2 - HW;
    const hum = { jero: KISS_J - 26, yazeth: KISS_Y + 26 };
    const pages = C.mensajeFinal.map(CR.fmt);
    const BTN = { x: 85, y: 62, w: 128, h: 16 };
    const HALF = { jero: 'L', yazeth: 'R' }; // Jero queda a la izquierda, Yazeth a la derecha
    const rocket = { x: -50, y: 30, flame: true, riders: true };
    const rats = {
      jero: { x: 0, h: 0, flip: false, show: false, run: false },
      yazeth: { x: 0, h: 0, flip: false, show: false, run: false },
    };
    const END = { jero: 140, yazeth: 180 }, LAND = { jero: 98, yazeth: 120 };
    const half = { L: { x: 0, y: 0 }, R: { x: 0, y: 0 } };
    let halvesMode = 'none'; // hero | give | own | join | whole | none
    let flowers = null, humans = false, bigHeart = false, catT = -1, page = 0, typer = null;
    let heartGlow = 0, orbs = 0, consK = 0, consAlpha = 0, creditsY = 0, finBtn = false, t = 0, leaving = false;

    CR.audio.music('final');

    const holdPos = (k) => {
      const r = rats[k], dir = r.flip ? -1 : 1;
      return { x: r.x + dir * 15, y: GROUND - r.h - 6 };
    };

    // forma de corazón para la constelación
    const CONS = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      CONS.push({ x: 160 + 16 * Math.pow(Math.sin(a), 3) * 1.7, y: 46 - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 1.7 });
    }

    const seq = new CR.Seq([
      { name: 'aterriza', d: 3.0, tick(k) {
          rocket.x = CR.lerp(-50, 62, CR.ease.out(k));
          rocket.y = CR.lerp(30, GROUND - 17, CR.ease.inOut(k));
        }, exit() {
          rocket.flame = false;
          CR.shake(2, 0.3);
          CR.audio.sfx.hit();
          for (let i = 0; i < 16; i++) fx.add({ type: 'dust', x: rocket.x + CR.rand(-28, 28), y: GROUND, vx: CR.rand(-40, 40), vy: -CR.rand(5, 20), drag: 2, life: 1, color: CR.pick(['#c4b5fd', '#8b7fb0', '#7fe8c4']) });
        } },
      { name: 'salta', d: 1.3, enter() {
          rocket.riders = false;
          halvesMode = 'hero';
          for (const k of ['jero', 'yazeth']) { rats[k].show = true; rats[k].x = 62; rats[k].h = 20; }
          CR.audio.sfx.squeak();
        }, tick(k) {
          for (const kk of ['jero', 'yazeth']) {
            const r = rats[kk];
            const kk2 = CR.clamp(kk === H ? k * 1.3 : k * 1.3 - 0.3, 0, 1);
            r.x = CR.lerp(62, LAND[kk], kk2);
            r.h = Math.sin(kk2 * Math.PI) * 26 + (1 - kk2) * 20;
            if (kk2 >= 1 && !r.landed) { r.landed = true; CR.dust(fx, r.x, GROUND, 1); CR.dust(fx, r.x, GROUND, -1); }
          }
        } },
      { name: 'camina', d: 2.6, tick(k, dt) {
          for (const kk of ['jero', 'yazeth']) {
            const r = rats[kk];
            r.h = 0;
            const d = END[kk] - r.x;
            r.x += CR.clamp(d, -40 * dt, 40 * dt);
            r.run = Math.abs(d) > 0.5;
            r.flip = r.run ? d < 0 : kk === 'yazeth';
            if (r.run && Math.random() < 0.15) CR.dust(fx, r.x - Math.sign(d) * 12, GROUND, Math.sign(d));
          }
        }, exit() { for (const kk of ['jero', 'yazeth']) { rats[kk].x = END[kk]; rats[kk].run = false; rats[kk].flip = kk === 'yazeth'; } } },
      { name: 'charla', say: CR.lines(T.finalMitad) },
      { name: 'entrega', d: 1.6, enter() { halvesMode = 'give'; CR.audio.sfx.sparkle(); }, tick(k) {
          const a = holdPos(H), b = holdPos(K), o = half[HALF[K]];
          o.x = CR.lerp(a.x + 6, b.x, k);
          o.y = CR.lerp(a.y - 2, b.y, k) - Math.sin(k * Math.PI) * 18;
          if (Math.random() < 0.4) fx.add({ type: 'star', x: o.x, y: o.y, vy: -8, life: 0.6, color: '#fff1a8' });
        }, exit() { halvesMode = 'own'; rats[K].happy = 1.5; } },
      { name: 'pausa', d: 1.2 },
      { name: 'unir', d: 2.8, enter() { halvesMode = 'join'; CR.audio.sfx.sparkle(); }, tick(k) {
          const a = holdPos('jero'), b = holdPos('yazeth');
          const kk = CR.ease.inOut(CR.clamp(k / 0.75, 0, 1));
          half.L.x = CR.lerp(a.x, 156, kk); half.L.y = CR.lerp(a.y, GROUND - 46, kk);
          half.R.x = CR.lerp(b.x, 164, kk); half.R.y = CR.lerp(b.y, GROUND - 46, kk);
          heartGlow = kk;
          if (k > 0.75 && halvesMode !== 'whole') { halvesMode = 'whole'; CR.audio.sfx.kiss(); CR.flash(0.4); for (let i = 0; i < 20; i++) fx.add({ type: 'star', x: 160, y: GROUND - 46, vx: CR.rand(-50, 50), vy: CR.rand(-50, 30), life: 1, color: CR.pick(['#ffd23f', '#fff1a8', '#ffffff']) }); }
        } },
      { name: 'magia', d: 3.0, enter() { orbs = 0.001; }, tick(k) {
          orbs = k;
          heartGlow = 1 + k;
          if (Math.random() < 0.5) fx.add({ type: 'star', x: 160 + CR.rand(-50, 50), y: GROUND - 20 + CR.rand(-40, 10), vy: -10, life: 0.6, color: CR.pick(['#ffd23f', '#38bdf8', '#c08457', '#ffffff']) });
        }, exit() {
          orbs = 0; heartGlow = 0; halvesMode = 'none'; humans = true;
          for (const kk of ['jero', 'yazeth']) rats[kk].show = false;
          rocket.hide = true;
          CR.flash(1.4);
          CR.audio.sfx.boom();
          flowers = CR.makeFlowerSet(0.3, 180);
        } },
      { name: 'humanos', d: 2.0 },
      { name: 'acercan', d: 2.6, tick(k) {
          const e = CR.ease.inOut(k);
          hum.jero = CR.lerp(KISS_J - 26, KISS_J, e);
          hum.yazeth = CR.lerp(KISS_Y + 26, KISS_Y, e);
        }, exit() {
          bigHeart = true;
          CR.audio.sfx.kiss();
          for (let i = 0; i < 16; i++) fx.add({ type: 'heart', x: 160, y: 120, vy: -CR.rand(10, 40), vx: CR.rand(-30, 30), life: 2 });
          CR.confetti(fx, 160, 112, 50);
        } },
      { name: 'beso', d: 4.5, tick(k) { if (k > 0.3 && catT < 0) catT = 0; } },
      { name: 'constelacion', d: 6.5, enter() { CR.audio.sfx.sparkle(); }, tick(k) { consK = k; consAlpha = Math.min(1, k * 4); } },
      { name: 'mensaje', enter() { typer = new CR.Typer(pages[0], { width: 268, size: 8, lh: 11, cps: 24 }); },
        tick(k, dt) {
          consAlpha = Math.max(0, consAlpha - dt * 2);
          typer.update(dt);
        },
        until() {
          if (!I.confirm()) return false;
          if (!typer.done) { typer.finish(); return false; }
          if (page < pages.length - 1) { page++; CR.audio.sfx.select(); typer = new CR.Typer(pages[page], { width: 268, size: 8, lh: 11, cps: 24 }); return false; }
          typer = null;
          return true;
        } },
      { name: 'creditos', enter() { creditsY = 190; },
        tick(k, dt) { creditsY -= dt * 16; },
        until() { return creditsY + T.creditosLista.length * 13 < 60 || I.confirm(); } },
      { name: 'fin', enter() { CR.audio.sfx.fanfare(); CR.confetti(fx, 160, 60, 50); finBtn = true; }, until() { return false; } },
    ], dlg);

    function drawRat(ctx, k) {
      const r = rats[k];
      if (!r.show) return;
      const happy = r.happy > 0 || seq.name === 'unir' || seq.name === 'magia';
      const eye = happy ? 'happy' : CR.blink(t, k === 'jero' ? 0 : 2);
      CR.drawRat(ctx, k, r.x, GROUND - r.h, { s: RS, flip: r.flip, frame: r.run ? Math.floor(t * 10) % 2 : 0, eye });
    }

    return {
      get stage() { return seq.name + (dlg.active ? '*' : ''); },

      update(dt0) {
        const dt = dt0 * CR.CONFIG.dificultad.ritmo;
        t += dt0;
        stars.update(dt, 0, seq.name === 'creditos' || seq.name === 'fin' ? -3 : 0);
        fx.update(dt);
        if (flowers) for (const f of flowers) f.update(dt, fx);
        for (const kk of ['jero', 'yazeth']) if (rats[kk].happy > 0) rats[kk].happy -= dt;
        if (Math.random() < dt0 * 3) fx.add({ type: 'firefly', x: CR.rand(10, 310), y: CR.rand(110, 170), vx: CR.rand(-4, 4), vy: -CR.rand(2, 6), wob: 10, wobF: CR.rand(1, 2), ph: Math.random() * 6, life: CR.rand(3, 5), color: CR.pick(['#fff1a8', '#5eead4', '#ffb3f0']) });
        if ((seq.name === 'mensaje' || seq.name === 'creditos' || seq.name === 'fin') && Math.random() < dt * 10) {
          fx.add({ type: 'star', x: CR.rand(0, 360), y: -4, vx: -24, vy: CR.rand(40, 70), life: 3.5, color: CR.pick(['#ffffff', '#ffd23f', '#ff9fc0', '#a8d8ff']) });
        }
        if (catT >= 0) catT += dt0;
        if (halvesMode === 'hero' || halvesMode === 'give') {
          const a = holdPos(H), mine = half[HALF[H]], other = half[HALF[K]];
          mine.x = a.x; mine.y = a.y;
          if (halvesMode === 'hero') { other.x = a.x + 6; other.y = a.y - 2; }
        }
        if (halvesMode === 'own') {
          const a = holdPos('jero'), b = holdPos('yazeth');
          half.L.x = a.x; half.L.y = a.y; half.R.x = b.x; half.R.y = b.y;
        }

        if (finBtn && !leaving && (I.hit('Enter', 'Space') || I.tapIn(BTN.x, BTN.y, BTN.w, BTN.h))) {
          leaving = true;
          CR.audio.sfx.confirm();
          CR.engine.go('postcreditos');
        }
        if (dlg.active) { dlg.update(dt0); return; }
        seq.update(seq.name === 'mensaje' || seq.name === 'fin' ? dt0 : dt);
      },

      draw(ctx) {
        ctx.drawImage(bg, 0, 0);
        stars.draw(ctx, 1, 1, 110);

        // constelación de corazón
        if (consAlpha > 0) {
          const n = Math.floor(consK * CONS.length * 1.3);
          ctx.globalAlpha = consAlpha;
          for (let i = 0; i < Math.min(n, CONS.length); i++) {
            const a = CONS[i], b = CONS[(i + 1) % CONS.length];
            if (i + 1 < n || n > CONS.length) G.line(a.x, a.y, b.x, b.y, '#c4b5fd', 2);
          }
          for (let i = 0; i < Math.min(n + 1, CONS.length); i++) {
            const p = CONS[i], tw = 0.6 + 0.4 * Math.sin(t * 4 + i);
            CR.glow(ctx, p.x, p.y, 5, '#fff1a8', 0.2 * tw);
            G.rect(p.x - 1, p.y, 3, 1, '#ffffff');
            G.rect(p.x, p.y - 1, 1, 3, '#ffffff');
          }
          if (consK > 0.7) G.text(C.fechaInicio + '  -  ' + C.fecha, 160, 82, { size: 6, align: 'center', color: '#ffd6f0', alpha: consAlpha * CR.clamp((consK - 0.7) * 4, 0, 1), outline: '#1a0b33' });
          ctx.globalAlpha = 1;
        }

        if (flowers) for (const f of flowers) f.draw(ctx);

        // cohete
        if (!rocket.hide) {
          if (rocket.riders) {
            const ox = Math.round(rocket.x - (1 + 14 * RS)), oy = Math.round(rocket.y - (1 + 8 * RS));
            CR.drawRat(ctx, K, ox + 1 + 12.5 * RS - 14, oy + 1 + 6.2 * RS + 1, { s: RS, eye: 'happy' });
          }
          CR.drawRocket(ctx, rocket.x, rocket.y, t, { s: RS, rider: rocket.riders ? H : null, flame: rocket.flame });
        }

        drawRat(ctx, 'jero');
        drawRat(ctx, 'yazeth');

        // mitades del queso corazón
        if (heartGlow > 0) CR.glow(ctx, 160, GROUND - 46, 20 + heartGlow * 16, '#ffd23f', 0.12 + 0.05 * Math.sin(t * 8));
        if (halvesMode === 'hero' || halvesMode === 'give' || halvesMode === 'own' || halvesMode === 'join') {
          CR.drawSprite(ctx, CR.heartCheese('L', 1), half.L.x - 8, half.L.y - 7);
          CR.drawSprite(ctx, CR.heartCheese('R', 1), half.R.x - 8, half.R.y - 7);
        } else if (halvesMode === 'whole') {
          const bob = Math.round(Math.sin(t * 3) * 2);
          CR.drawSprite(ctx, CR.heartCheese('full', 2), 160 - 15, GROUND - 46 - 14 + bob);
        }
        if (orbs > 0) {
          const cols = ['#38bdf8', '#c08457', '#ffd23f'];
          const rad = 46 * (1 - orbs);
          for (let i = 0; i < 3; i++) {
            const a = orbs * 14 + (i * Math.PI * 2) / 3;
            const ox = 160 + Math.cos(a) * rad, oy = GROUND - 40 + Math.sin(a) * rad * 0.5;
            CR.glow(ctx, ox, oy, 7, cols[i], 0.3);
            G.circle(ox, oy, 2, cols[i]);
            G.rect(ox, oy - 1, 1, 1, '#ffffff');
          }
          for (let i = 0; i < 8; i++) {
            const a = t * 2 + (i * Math.PI) / 4;
            ctx.globalAlpha = 0.25 * orbs;
            G.line(160, GROUND - 46, 160 + Math.cos(a) * 60, GROUND - 46 + Math.sin(a) * 60, '#fff1a8', 3);
            ctx.globalAlpha = 1;
          }
        }

        if (humans) {
          CR.drawHuman(ctx, 'jero', hum.jero, GROUND, { s: HS });
          CR.drawHuman(ctx, 'yazeth', hum.yazeth, GROUND, { s: HS, flip: true });
          if (bigHeart) {
            const beat = Math.floor(t * 2.4) % 2 === 0 ? 3 : 4;
            CR.drawSprite(ctx, CR.SPR.heart, 160 - 4.5 * beat, 108 - 8 * beat, { scale: beat });
          }
        }

        // el Gato Comandante se asoma, conmovido
        if (catT >= 0 && catT < 6) {
          const up = catT < 0.6 ? catT / 0.6 : catT > 5.2 ? 1 - (catT - 5.2) / 0.8 : 1;
          const cy = Math.round(206 - up * 22);
          CR.drawBoss(ctx, 290, cy);
          G.rect(297, cy - 6 + (Math.floor(t * 6) % 4), 1, 2, '#7dd3fc');
          if (catT > 0.7 && catT < 4.6) G.bubble(T.finalGato, 284, cy - 26, { color: '#7a1530' });
        }

        fx.draw(ctx);

        if (seq.name === 'mensaje' && typer) {
          G.box(6, 6, 286, 80, { border: '#ff5fa2' });
          typer.draw(14, 16);
          G.text(page + 1 + '/' + pages.length, 286, 76, { size: 6, align: 'right', color: '#8a7aa6' });
          if (typer.done) G.arrowDown(149, 75 + (Math.floor(t * 4) % 2), '#ff9fc0');
        }

        if (seq.name === 'creditos') {
          ctx.globalAlpha = 0.6;
          G.rect(0, 0, 320, 180, '#07040f');
          ctx.globalAlpha = 1;
          const cols = ['#ff5fa2', '#ffd23f', '#38e1ff', '#b388ff'];
          T.creditosLista.forEach((line, i) => {
            const y = Math.round(creditsY + i * 13);
            if (y < -16 || y > 184 || !line) return;
            const fade = CR.clamp(Math.min(y - 4, 176 - y) / 20, 0, 1);
            if (i === 0) {
              const sx = 160 - (line.length * 16) / 2;
              for (let j = 0; j < line.length; j++) G.text(line[j], sx + j * 16, y - 4, { size: 16, color: cols[(j + Math.floor(t * 2)) % 4], outline: '#2a0f4a', alpha: fade });
            } else {
              const header = line === line.toUpperCase() && /[A-Z]/.test(line);
              G.text(CR.fmt(line), 160, y, { size: header ? 6 : 8, align: 'center', color: header ? '#ffd23f' : '#ffffff', outline: '#120826', alpha: fade });
            }
          });
          G.text(I.isTouch ? 'Toca para saltar' : 'ENTER para saltar', 314, 170, { size: 6, align: 'right', color: '#6b5884' });
        }

        if (seq.name === 'fin') {
          G.box(6, 6, 286, 80, { border: '#ffd23f' });
          const title = C.titulo, cols = ['#ff5fa2', '#ffd23f', '#38e1ff', '#b388ff'];
          const sx = 149 - (title.length * 16) / 2;
          for (let i = 0; i < title.length; i++) G.text(title[i], sx + i * 16, 12 + Math.round(Math.sin(t * 3 + i * 0.6)), { size: 16, color: cols[(i + Math.floor(t * 2)) % 4], outline: '#2a0f4a' });
          G.text(C.creditos, 149, 34, { size: 6, align: 'center', color: '#ffffff' });
          G.text(C.fecha + '  -  ' + C.aniversario, 149, 46, { size: 6, align: 'center', color: '#ff9fc0' });
          G.button(BTN.x, BTN.y, BTN.w, BTN.h, 'CONTINUAR');
        }
        dlg.draw();
      },
    };
  });
})();
