/* =====================================================================
   ESCENA: DE REGRESO A CASA (después del jefe)
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR, G = CR.g;

  CR.scene('regreso', function () {
    const T = CR.CONFIG.textos;
    const H = CR.state.hero, K = CR.state.captured;
    CR.save.set({ hero: H, level: 0 });

    const bg = CR.bgSpace(640, 2);
    const ringed = CR.paintPlanet(14, '#7dd3fc', { ring: '#e0f7ff', bands: true });
    const home = CR.paintPlanet(70, '#4a3a8f', { craters: 6 });
    const stars = new CR.Starfield(90), fx = new CR.Particles(), dlg = new CR.Dialog();
    const RS = 1.5;
    const rk = { x: -60, y: 92 };
    const boss = { x: 380, y: 46, show: false };
    let t = 0, banner = 0, planetK = 0, heartT = 0;

    CR.audio.music('final');

    function drawRockets(ctx) {
      // rata de atrás (la rescatada) abrazando
      const ox = Math.round(rk.x - (1 + 14 * RS)), oy = Math.round(rk.y - (1 + 8 * RS));
      const seatX = ox + 1 + 12.5 * RS, seatY = oy + 1 + 6.2 * RS;
      CR.drawRat(ctx, K, seatX - 12, seatY + 1, { s: RS, eye: 'happy', frame: Math.floor(t * 4) % 2 });
      CR.drawRocket(ctx, rk.x, rk.y, t, { s: RS, rider: H, riderEye: CR.blink(t, 2), boost: false });
    }

    const seq = new CR.Seq([
      { name: 'entra', d: 3.0, enter() { banner = 1; }, tick(k) { rk.x = CR.lerp(-60, 120, CR.ease.out(k)); } },
      { name: 'vuela', d: 2.2 },
      { name: 'jefe', d: 5.0, enter() { boss.show = true; CR.audio.sfx.meow(); },
        tick(k) { boss.x = CR.lerp(380, -60, k); boss.y = 46 + Math.sin(k * 9) * 6; } },
      { name: 'charla', say: CR.lines(T.regreso) },
      { name: 'llegada', d: 4.2, tick(k) {
          planetK = CR.ease.inOut(k);
          rk.x = CR.lerp(120, 250, CR.ease.inOut(k));
          rk.y = CR.lerp(92, 150, k * k);
        }, exit() { CR.engine.go('final'); } },
    ], dlg);

    return {
      get stage() { return seq.name + (dlg.active ? '*' : ''); },

      update(dt0) {
        const dt = dt0 * CR.CONFIG.dificultad.ritmo;
        t += dt0;
        stars.update(dt, 40, 0);
        fx.update(dt);
        if (banner > 0 && seq.name !== 'entra') banner = Math.max(0, banner - dt * 0.5);
        heartT -= dt;
        if (heartT <= 0) {
          heartT = 0.25;
          fx.add({ type: 'heart', x: rk.x - 26, y: rk.y - 10 + CR.rand(-4, 4), vx: -CR.rand(30, 50), vy: CR.rand(-8, 4), life: 1.4 });
        }
        if (Math.random() < dt * 20) fx.add({ type: 'star', x: rk.x - 28, y: rk.y + CR.rand(-3, 3), vx: -CR.rand(50, 90), vy: CR.rand(-5, 5), life: 0.5, color: CR.pick(['#ffd23f', '#ff9fc0', '#ffffff']) });
        if (dlg.active) { dlg.update(dt0); return; }
        seq.update(dt);
      },

      draw(ctx) {
        const off = Math.floor(t * 14) % 640;
        ctx.drawImage(bg, -off, 0);
        ctx.drawImage(bg, 640 - off, 0);
        ctx.globalAlpha = 0.35;
        G.rect(0, 0, 320, 180, '#05030c');
        ctx.globalAlpha = 1;
        ctx.drawImage(ringed, Math.round(380 - ((t * 7) % 520)), 120);
        stars.draw(ctx, 1, 3);

        if (planetK > 0) {
          const s = CR.lerp(0.35, 1, planetK);
          const w = Math.round(home.width * s), h = Math.round(home.height * s);
          CR.glow(ctx, 270, 200 - planetK * 40, 90 * s, '#7fe8c4', 0.1);
          ctx.drawImage(home, Math.round(270 - w / 2), Math.round(200 - planetK * 40 - h / 2), w, h);
        }

        if (boss.show && boss.x > -60 && boss.x < 400) {
          CR.glow(ctx, boss.x, boss.y, 30, '#b9a3ff', 0.08);
          CR.drawBoss(ctx, boss.x, boss.y, { alpha: 0.95 });
          ctx.globalAlpha = 0.35;
          G.circle(boss.x, boss.y, 30, '#c4b5fd');
          ctx.globalAlpha = 1;
          ctx.globalAlpha = 0.6;
          for (let a = 0; a < 6.28; a += 0.04) G.rect(boss.x + Math.cos(a) * 30, boss.y + Math.sin(a) * 30, 1, 1, '#e9ddff');
          ctx.globalAlpha = 1;
          G.rect(boss.x - 18, boss.y - 20, 4, 2, '#ffffff');
          G.rect(boss.x - 20, boss.y - 17, 2, 2, '#ffffff');
          G.bubble(T.regresoJefe, boss.x, boss.y + 36, { below: true, color: '#7a1530' });
        }

        fx.draw(ctx);
        drawRockets(ctx);

        if (banner > 0) {
          G.text(T.regresoTitulo, 160, 16, { size: 8, align: 'center', color: '#ffd23f', alpha: Math.min(1, banner * 2), outline: '#3a1a00' });
        }
        dlg.draw();
      },
    };
  });
})();
