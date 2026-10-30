/* =====================================================================
   ESCENA POST-CRÉDITOS: el Gato Comandante recibe un regalo
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR, G = CR.g, I = CR.input;

  CR.scene('postcreditos', function () {
    const T = CR.CONFIG.textos;
    const room = CR.bgThrone();
    const fx = new CR.Particles(), dlg = new CR.Dialog();
    dlg.top = true;
    const intro = new CR.Typer(T.postIntro, { width: 300, size: 8, cps: 22, silent: true });
    const boss = { x: 196, y: 136 };
    const guard = { x: -20, frame: 0, walking: false };
    let t = 0, introA = 0, sigh = false, hug = 0, fin = false, leaving = false;
    const BTN = { x: 96, y: 150, w: 128, h: 16 };

    CR.audio.stopMusic();

    function drawBandage(ctx) {
      G.rect(boss.x - 15, boss.y - 22, 9, 3, '#f5e6c8');
      G.rect(boss.x - 12, boss.y - 25, 3, 9, '#f5e6c8');
      G.rect(boss.x - 15, boss.y - 22, 9, 1, '#ffffff');
    }

    const seq = new CR.Seq([
      { name: 'intro', d: 4.4, tick(k, dt, tt) { intro.update(dt); introA = tt < 0.4 ? tt / 0.4 : tt > 3.8 ? Math.max(0, (4.4 - tt) / 0.6) : 1; } },
      { name: 'solo', d: 3.0, enter() { CR.audio.music('sneak'); sigh = true; CR.audio.sfx.sad(); } },
      { name: 'llega', d: 3.4, enter() { sigh = false; guard.walking = true; },
        tick(k, dt) { guard.x = CR.lerp(-20, 156, k); if (Math.random() < 0.2) CR.dust(fx, guard.x - 8, 162, 1); },
        exit() { guard.walking = false; } },
      { name: 'charla', say: CR.lines(T.post) },
      { name: 'abrazo', d: 3.0, enter() { CR.audio.sfx.kiss(); }, tick(k) {
          hug = k;
          guard.x = CR.lerp(156, 170, CR.ease.out(Math.min(1, k * 2)));
          if (Math.random() < 0.15) fx.add({ type: 'heart', x: 184 + CR.rand(-8, 8), y: 116, vy: -16, vx: CR.rand(-6, 6), life: 1.6 });
        } },
      { name: 'fin', enter() { fin = true; CR.audio.sfx.fanfare(); CR.confetti(fx, 160, 70, 50); }, until() { return false; } },
    ], dlg);

    return {
      get stage() { return seq.name + (dlg.active ? '*' : ''); },

      update(dt0) {
        const dt = dt0 * CR.CONFIG.dificultad.ritmo;
        t += dt0;
        fx.update(dt);
        if (fin && !leaving && (I.hit('Enter', 'Space') || I.tapIn(BTN.x, BTN.y, BTN.w, BTN.h))) {
          leaving = true;
          CR.audio.sfx.confirm();
          CR.engine.go('inicio');
        }
        if (dlg.active) { dlg.update(dt0); return; }
        seq.update(dt);
      },

      draw(ctx) {
        if (seq.name === 'intro') {
          G.rect(0, 0, 320, 180, '#05030c');
          ctx.globalAlpha = introA;
          intro.draw(160, 84, { center: true, color: '#ffb347' });
          ctx.globalAlpha = 1;
          return;
        }
        ctx.drawImage(room, 0, 0);
        ctx.globalAlpha = 0.35;
        G.rect(0, 0, 320, 180, '#07040f');
        ctx.globalAlpha = 1;
        CR.glow(ctx, boss.x, boss.y, 50, '#b9a3ff', 0.06);

        // jefe sentado y triste (sin corona)
        CR.drawBoss(ctx, boss.x, boss.y);
        drawBandage(ctx);
        if (hug < 0.5) {
          const k = Math.floor(t * 6) % 4;
          G.rect(boss.x - 9, boss.y - 2 + k, 1, 2, '#7dd3fc');
          G.rect(boss.x + 7, boss.y - 2 + ((k + 2) % 4), 1, 2, '#7dd3fc');
        }
        CR.drawSprite(ctx, CR.SPR.crown, 236, 158);

        // guardia con queso
        if (seq.i >= 2) {
          const frame = guard.walking ? Math.floor(t * 8) % 2 : 0;
          CR.drawGuard(ctx, guard.x, 166, { frame, sleep: hug > 0.2 });
          if (hug < 0.3) CR.drawSprite(ctx, CR.SPR.cheese, guard.x - 1, 136 + Math.round(Math.sin(t * 6)));
          else CR.drawSprite(ctx, CR.SPR.cheese, boss.x + 6, boss.y + 4);
        }
        if (sigh) G.bubble(T.postSuspiro, boss.x, boss.y - 28, { color: '#7a1530' });

        fx.draw(ctx);

        if (fin) {
          G.text('FIN', 160, 34, { size: 16, align: 'center', color: '#ffd23f', outline: '#3a1a00' });
          G.text('¿...o no?', 160, 56, { size: 6, align: 'center', color: '#ff9fc0', outline: '#2a0614' });
          G.button(BTN.x, BTN.y, BTN.w, BTN.h, 'JUGAR OTRA VEZ');
        }
        dlg.draw();
      },
    };
  });
})();
