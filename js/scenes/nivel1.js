/* =====================================================================
   NIVEL 1: LA PERSECUCIÓN
   Alcanza la nave esquivando asteroides. Los quesos dan turbo.
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR, G = CR.g, I = CR.input;

  CR.scene('nivel1', function () {
    const C = CR.CONFIG, D = C.dificultad, T = C.textos;
    const H = CR.state.hero, K = CR.state.captured;
    CR.save.set({ hero: H, level: 1, quesos: 0, oro: 0 });

    const bg = CR.bgSpace(640, 1);
    const ringed = CR.paintPlanet(16, '#ff9fc0', { ring: '#ffd6e6', bands: true });
    const moonlet = CR.paintPlanet(9, '#7dd3fc', { craters: 4 });
    let bigPlanet = null;
    const stars = new CR.Starfield(110), fx = new CR.Particles();
    const rocks = [], cheeses = [];
    const rockImgs = [];
    // cada asteroide tiene 8 cuadros de giro
    const spin = (r, seed) => Array.from({ length: 8 }, (_, k) => CR.makeAsteroid(r, seed, (k * Math.PI) / 4));
    [5, 7, 9, 12].forEach((r, i) => {
      rockImgs.push({ r, frames: spin(r, i * 7 + 1) });
      rockImgs.push({ r, frames: spin(r, i * 13 + 5) });
    });
    let hitFlash = 0;

    const p = { x: 56, y: 92, inv: 0, dizzy: 0 };
    const ship = { x: 318, y: 90 };
    let t = 0, phase = 'intro', pt = 0, prog = 0, boost = 0, hits = 0;
    let rockT = 0.6, cheeseT = 2.5, lineT = 5, lineB = null, capB = null, saidAlmost = false, smokeT = 0;
    let drag = null;

    CR.audio.music('chase');

    function hit(r) {
      p.inv = 1.5;
      p.dizzy = 1.0;
      hits++;
      prog = Math.max(0, prog - D.penalizacionChoque);
      CR.shake(3, 0.3);
      CR.audio.sfx.hit();
      fx.burst(p.x, p.y, 12, { color: ['#9682ad', '#6b5884', '#ffd23f'], max: 70 });
      r.vx *= 0.5;
      hitFlash = 0.18;
    }

    function movePlayer(dt) {
      const m = p.dizzy > 0 ? 0.45 : 1;
      const ax = I.axis();
      let mx = ax.x * 115 * m, my = ax.y * 115 * m;
      const ptr = I.lastPointer;
      if (I.held(ptr)) {
        // arrastre relativo: el dedo no tapa el cohete
        if (!drag || drag.id !== ptr.id) drag = { id: ptr.id, px: p.x, py: p.y, sx: ptr.x, sy: ptr.y };
        const tx = drag.px + (ptr.x - drag.sx) * 1.3, ty = drag.py + (ptr.y - drag.sy) * 1.3;
        mx = CR.clamp((tx - p.x) * 9, -170 * m, 170 * m);
        my = CR.clamp((ty - p.y) * 9, -170 * m, 170 * m);
      } else drag = null;
      p.x = CR.clamp(p.x + mx * dt, 20, 200);
      p.y = CR.clamp(p.y + my * dt, 22, 170);
      if (drag) {
        // si el dedo empuja el cohete más allá del borde, se reajusta el arrastre
        const tx = drag.px + (ptr.x - drag.sx) * 1.3, ty = drag.py + (ptr.y - drag.sy) * 1.3;
        drag.px += CR.clamp(tx, 20, 200) - tx;
        drag.py += CR.clamp(ty, 22, 170) - ty;
      }
    }

    function drawPlanet(cy) {
      if (!bigPlanet) bigPlanet = CR.paintPlanet(150, '#3f3275', { bands: true, craters: 10 });
      ctx0.drawImage(bigPlanet, 220 - bigPlanet.width / 2, cy - bigPlanet.height / 2);
    }
    let ctx0 = null;

    return {
      pausable: true,

      update(dt) {
        t += dt;
        pt += dt;
        stars.update(dt, phase === 'catch' ? 25 : 70 * (boost > 0 ? 2 : 1), 0);
        fx.update(dt);
        if (p.inv > 0) p.inv -= dt;
        if (p.dizzy > 0) p.dizzy -= dt;
        if (boost > 0) {
          boost -= dt;
          if (Math.random() < dt * 25) fx.add({ type: 'star', x: p.x - 16, y: p.y + CR.rand(-5, 5), vx: -CR.rand(60, 110), vy: CR.rand(-8, 8), life: 0.5, color: CR.pick(['#ffd23f', '#ff9fc0', '#ffffff']) });
        }
        if (hitFlash > 0) hitFlash -= dt;
        if (lineB) { lineB.t -= dt; if (lineB.t <= 0) lineB = null; }
        if (capB) { capB.t -= dt; if (capB.t <= 0) capB = null; }

        // nave enemiga: se acerca conforme avanzas
        ship.x += (CR.lerp(318, 246, Math.min(1, prog)) - ship.x) * Math.min(1, dt * 3);
        if (phase !== 'catch') ship.y = 92 + Math.sin(t * 0.8) * 38 + Math.sin(t * 2.3) * 4;

        // humo de bolas de estambre
        smokeT -= dt;
        if (smokeT <= 0) {
          smokeT = 0.09;
          fx.add({ x: ship.x - 30, y: ship.y + CR.rand(-3, 3), vx: CR.rand(-50, -30), vy: CR.rand(-6, 6), life: CR.rand(0.6, 1.1), size: CR.pick([2, 3]), color: CR.pick(['#f472b6', '#c084fc', '#f9a8d4']) });
        }

        if (phase === 'intro' || phase === 'play') movePlayer(dt);

        if (phase === 'intro') {
          if (pt > 2.8 || (pt > 0.6 && I.confirm())) { phase = 'play'; pt = 0; }
        } else if (phase === 'play') {
          if (I.hit('F9')) prog = 0.97; // atajo de prueba
          prog += dt * D.velocidadPersecucion * (boost > 0 ? 2.4 : 1);

          rockT -= dt;
          if (rockT <= 0) {
            const easy = hits >= 6 ? 1.5 : 1;
            rockT = (CR.rand(0.55, 0.9) * D.asteroides * easy) / (1 + prog * 0.3);
            const ri = CR.pick(rockImgs);
            rocks.push({ x: 344, y: CR.rand(16, 172), vx: -CR.rand(55, 105) * (1 + prog * 0.25), vy: CR.rand(-10, 10), r: ri.r, frames: ri.frames, spin: CR.rand(-7, 7), a: Math.random() * 8 });
          }
          cheeseT -= dt;
          if (cheeseT <= 0) {
            cheeseT = CR.rand(2.8, 4.2);
            cheeses.push({ x: 336, y: CR.rand(26, 160), vx: -58, ph: Math.random() * 6 });
          }
          lineT -= dt;
          if (lineT <= 0) {
            lineT = CR.rand(7, 10);
            lineB = { text: CR.fmt(CR.pick(T.nave)), t: 2.8 };
            CR.audio.sfx.meow();
          }
          if (prog > 0.78 && !saidAlmost) { saidAlmost = true; capB = { text: CR.fmt(T.capturadoCasi), t: 2.8 }; CR.audio.sfx.squeak(); }
          if (prog >= 1) {
            prog = 1;
            phase = 'catch';
            pt = 0;
            CR.audio.sfx.fanfare();
            lineB = { text: CR.fmt(T.naveAlcanzada), t: 2.4 };
          }
        } else if (phase === 'catch') {
          const tx = ship.x - 48, ty = ship.y + 2;
          p.x += (tx - p.x) * Math.min(1, dt * 3);
          p.y += (ty - p.y) * Math.min(1, dt * 3);
          if (pt > 1.8) {
            ship.y += dt * 45 * (pt - 1.8);
            p.y = ship.y + 2;
          }
          if (pt > 4.4) CR.engine.go('recompensa', { n: 1, next: 'nivel2' });
        }

        for (const r of rocks) {
          r.x += r.vx * dt;
          r.y += r.vy * dt;
          r.a += r.spin * dt;
          if (phase === 'play' && p.inv <= 0 && Math.hypot(r.x - p.x, r.y - p.y) < r.r + 6) hit(r);
        }
        for (let i = rocks.length - 1; i >= 0; i--) if (rocks[i].x < -30) rocks.splice(i, 1);

        for (const c of cheeses) {
          c.x += c.vx * dt;
          c.y += Math.sin(t * 3 + c.ph) * 10 * dt;
          if (!c.taken && phase === 'play' && Math.hypot(c.x - p.x, c.y - (p.y - 4)) < 13) {
            c.taken = true;
            boost = 1.6;
            CR.audio.sfx.nam();
            CR.audio.sfx.turbo();
            fx.burst(c.x, c.y, 14, { color: ['#ffd23f', '#fff1a8', '#ffffff'], max: 50 });
            fx.add({ type: 'text', text: 'TURBO!', x: c.x, y: c.y - 8, vy: -18, life: 1, color: '#ffd23f' });
          }
        }
        for (let i = cheeses.length - 1; i >= 0; i--) if (cheeses[i].taken || cheeses[i].x < -20) cheeses.splice(i, 1);

        if (Math.random() < dt * (boost > 0 ? 40 : 18)) {
          fx.add({ x: p.x - 14, y: p.y + CR.rand(-1, 1), vx: -CR.rand(40, 80), vy: CR.rand(-5, 5), life: 0.35, color: CR.pick(['#ffd23f', '#ff7b00', '#ffffff']) });
        }
      },

      draw(ctx) {
        ctx0 = ctx;
        const off = Math.floor(t * 9) % 640;
        ctx.drawImage(bg, -off, 0);
        ctx.drawImage(bg, 640 - off, 0);
        ctx.globalAlpha = 0.42;
        G.rect(0, 0, 320, 180, '#05030c');
        ctx.globalAlpha = 1;
        ctx.drawImage(ringed, Math.round(360 - ((t * 5) % 460)), 24);
        ctx.drawImage(moonlet, Math.round(420 - ((t * 11 + 200) % 520)), 132);
        stars.draw(ctx, 1, boost > 0 ? 4 : 2);

        if (phase === 'catch' && pt > 1.8) drawPlanet(Math.round(CR.lerp(340, 250, CR.ease.out((pt - 1.8) / 2.6))));

        for (const c of cheeses) {
          CR.glow(ctx, c.x, c.y, 9, '#ffd23f', 0.12 + 0.05 * Math.sin(t * 6));
          CR.drawSprite(ctx, CR.SPR.cheese, c.x - 5, c.y - 5);
        }
        for (const r of rocks) {
          const img = r.frames[((Math.floor(r.a) % 8) + 8) % 8];
          CR.drawSprite(ctx, img, r.x - img.width / 2, r.y - img.height / 2);
        }
        fx.draw(ctx);

        CR.drawShip(ctx, ship.x, ship.y, t, { captured: K, crying: prog < 0.78, happy: prog >= 0.78 });

        if (phase === 'catch' && pt > 0.8) G.line(p.x + 15, p.y, ship.x - 28, ship.y, '#e5e7eb', 2);

        const blink = p.inv > 0 && Math.floor(p.inv * 10) % 2 === 0;
        if (!blink) CR.drawRocket(ctx, p.x, p.y, t, { rider: H, riderFrame: Math.floor(t * 8) % 2, riderEye: p.dizzy > 0 ? 'closed' : CR.blink(t, 1), boost: boost > 0 });
        if (p.dizzy > 0) {
          for (let i = 0; i < 3; i++) {
            const a = t * 7 + i * 2.1;
            const sx = p.x + 2 + Math.cos(a) * 7, sy = p.y - 20 + Math.sin(a) * 2;
            G.rect(sx - 1, sy, 3, 1, '#ffd23f');
            G.rect(sx, sy - 1, 1, 3, '#ffd23f');
          }
        }

        if (lineB) G.bubble(lineB.text, ship.x + 4, ship.y - 18, { color: '#7a1530' });
        if (capB) G.bubble(capB.text, ship.x - 16, ship.y + 10, { below: true, color: '#1d4a7a' });

        if (hitFlash > 0) {
          ctx.globalAlpha = hitFlash * 1.4;
          G.rect(0, 0, 320, 180, '#ff4d6d');
          ctx.globalAlpha = 1;
        }

        // HUD: barra de distancia
        G.text('NAVE', 8, 7, { size: 6, color: '#e0d4ff', outline: '#120826' });
        G.box(36, 6, 232, 8, { fill: '#1d0f3a', border: '#6b5884' });
        const fw = Math.round(228 * prog);
        if (fw > 0) {
          G.rect(38, 8, fw, 4, boost > 0 ? '#ffd23f' : '#ff5fa2');
          G.rect(38, 8, fw, 1, '#ffd6e8');
        }
        G.rect(36 + 2 + fw - 2, 5, 4, 10, CR.color(H));
        G.rect(262, 5, 6, 10, '#7c3aed');
        G.rect(262, 4, 1, 1, '#7c3aed');
        G.rect(267, 4, 1, 1, '#7c3aed');
        if (boost > 0 && Math.floor(t * 8) % 2) G.text('TURBO', 8, 17, { size: 6, color: '#ffd23f' });

        if (phase === 'intro') {
          const a = Math.min(1, pt * 2.5);
          ctx.globalAlpha = a;
          G.box(60, 50, 200, 76, { fill: 'rgba(18,8,38,0.9)', border: '#ff5fa2' });
          G.text('NIVEL 1', 160, 58, { size: 16, align: 'center', color: '#ffd23f' });
          G.text(T.nivel1Titulo, 160, 80, { size: 8, align: 'center', color: '#ff9fc0' });
          G.text(I.isTouch ? 'Arrastra el dedo para mover' : 'Muévete con flechas o WASD', 160, 98, { size: 6, align: 'center' });
          G.text('Esquiva asteroides. Queso = turbo', 160, 110, { size: 6, align: 'center', color: '#ffd23f' });
          ctx.globalAlpha = 1;
        }
        if (phase === 'catch' && pt > 0.6 && pt < 3.5) {
          G.text('¡TE ALCANCÉ!', 160, 150, { size: 8, align: 'center', color: '#ffd23f', outline: '#3a1a00' });
        }
      },
    };
  });
})();
