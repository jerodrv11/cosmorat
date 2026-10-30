/* =====================================================================
   ESCENA: PANTALLA DE INICIO Y SELECCIÓN DE PERSONAJE
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR, G = CR.g, I = CR.input;

  CR.scene('inicio', function () {
    const C = CR.CONFIG, T = C.textos;
    const bg = CR.bgSpace(320, 4);
    const planet = CR.paintPlanet(9, '#ff9fc0', { ring: '#ffd6e6', bands: true });
    const stars = new CR.Starfield(70);
    const fx = new CR.Particles();
    const flowers = CR.makeFlowerSet(0.4);
    const save = CR.save.get();
    const canContinue = !!(save && save.level >= 1 && save.level <= 3);

    let t = 0, ready = false, leaving = false, idle = 0, idleBubble = null;
    let sel = (save && save.hero) || 'yazeth';
    const hop = { jero: 0, yazeth: 0 };
    const posX = { jero: 118, yazeth: 202 };
    const FOOT = 121, RS = 2.4;
    const BTN = { x: 100, y: 140, w: 120, h: 16 };
    const CONT = { x: 4, y: 4, w: 96, h: 14 };
    const MEM = { x: 246, y: 20, w: 70, h: 13 };
    const hasMem = CR.premios.any();
    const TITLE_COLORS = ['#ff5fa2', '#ffd23f', '#38e1ff', '#b388ff'];

    CR.audio.music('menu');

    function select(k) {
      idle = 0;
      hop[k] = 0.35;
      CR.audio.sfx.squeak();
      if (k !== sel) {
        sel = k;
        fx.add({ type: 'heart', x: posX[CR.other(k)], y: 80, vy: -14, vx: k === 'jero' ? 6 : -6, life: 1.3 });
      }
    }

    function begin(level) {
      leaving = true;
      CR.audio.sfx.confirm();
      CR.confetti(fx, posX[sel], 90, 40);
      if (level > 0) {
        CR.state.hero = save.hero;
        CR.state.captured = CR.other(save.hero);
        CR.state.quesos = save.quesos || 0;
        CR.state.oro = save.oro || 0;
        CR.engine.go('nivel' + level);
      } else {
        CR.state.hero = sel;
        CR.state.captured = CR.other(sel);
        CR.state.quesos = 0;
        CR.state.oro = 0;
        CR.engine.go('captura');
      }
    }

    function drawRat(ctx, k) {
      const appear = CR.clamp((t - 2.0) / 0.5, 0, 1);
      if (appear <= 0) return;
      const isSel = k === sel;
      const hp = hop[k] > 0 ? Math.sin((1 - hop[k] / 0.35) * Math.PI) * 9 : 0;
      const breathe = Math.round(Math.sin(t * 2 + (k === 'jero' ? 0 : 1.5)) * 0.8);
      const y = FOOT + (1 - CR.ease.back(appear)) * 30 - hp + breathe;
      ctx.globalAlpha = (isSel ? 0.45 + 0.15 * Math.sin(t * 4) : 0.35) * appear;
      G.ellipse(posX[k], FOOT + 2, isSel ? 24 : 18, 3, isSel ? CR.color(k) : '#000000');
      ctx.globalAlpha = 1;
      if (isSel) G.arrowDown(posX[k], 68 + Math.round(Math.sin(t * 6) * 2), '#ffd23f');
      const eye = hop[k] > 0 && isSel ? 'happy' : CR.blink(t, k === 'jero' ? 0 : 1);
      CR.drawRat(ctx, k, posX[k], y, { s: RS, frame: isSel ? Math.floor(t * 3) % 2 : 0, flip: k === 'yazeth', eye, alpha: appear * (isSel ? 1 : 0.8) });
      G.text(CR.name(k).toUpperCase(), posX[k], 127, { size: 8, align: 'center', color: isSel ? CR.color(k) : '#8a7aa6', alpha: appear, outline: '#120826' });
    }

    return {
      update(dt) {
        t += dt;
        stars.update(dt, 3, 0);
        fx.update(dt);
        for (const f of flowers) f.update(dt, fx);
        hop.jero = Math.max(0, hop.jero - dt);
        hop.yazeth = Math.max(0, hop.yazeth - dt);
        if (idleBubble) { idleBubble.t -= dt; if (idleBubble.t <= 0) idleBubble = null; }
        if (leaving) return;

        if (!ready) {
          if (t > 3) ready = true;
          else if (I.confirm()) { t = 3; ready = true; flowers.forEach((f) => f.skip()); }
          return;
        }

        idle += dt;
        if (idle > 6 && !idleBubble) {
          idleBubble = { who: CR.pick(['jero', 'yazeth']), text: CR.pick(T.inicioIdle), t: 2.2 };
          idle = 0;
        }

        if (I.hit('ArrowLeft', 'KeyA')) select('jero');
        if (I.hit('ArrowRight', 'KeyD')) select('yazeth');
        if (I.tapIn(posX.jero - 30, 64, 60, 70)) select('jero');
        else if (I.tapIn(posX.yazeth - 30, 64, 60, 70)) select('yazeth');

        if (canContinue && (I.hit('KeyC') || I.tapIn(CONT.x, CONT.y, CONT.w, CONT.h))) return begin(save.level);
        if (hasMem && (I.hit('KeyR') || I.tapIn(MEM.x, MEM.y, MEM.w, MEM.h))) { leaving = true; CR.audio.sfx.confirm(); CR.engine.go('recuerdos'); return; }
        if (I.hit('Enter', 'Space', 'NumpadEnter') || I.tapIn(BTN.x, BTN.y, BTN.w, BTN.h)) begin(0);
      },

      draw(ctx) {
        ctx.globalAlpha = Math.min(1, t * 1.5);
        ctx.drawImage(bg, 0, 0);
        ctx.globalAlpha = 0.3;
        G.rect(0, 0, 320, 180, '#07040f');
        ctx.globalAlpha = 1;
        stars.draw(ctx, Math.min(1, t));
        if (t > 0.5) {
          ctx.globalAlpha = Math.min(1, t - 0.5);
          ctx.drawImage(planet, 286 - planet.width / 2, 30 - planet.height / 2);
          ctx.globalAlpha = 1;
        }

        for (const f of flowers) f.draw(ctx);
        fx.draw(ctx);

        // título
        if (t > 1) {
          const k = CR.ease.bounce((t - 1) / 0.8);
          const ty = CR.lerp(-24, 12, k);
          const title = C.titulo;
          const sx = 160 - (title.length * 16) / 2;
          for (let i = 0; i < title.length; i++) {
            const wy = ty + Math.round(Math.sin(t * 3 + i * 0.6) * 1.5);
            G.text(title[i], sx + i * 16, wy, { size: 16, color: TITLE_COLORS[(i + Math.floor(t * 2)) % 4], outline: '#2a0f4a' });
          }
          G.text(C.subtitulo, 160, ty + 22, { size: 6, align: 'center', color: '#e0d4ff', alpha: CR.clamp((t - 1.6) * 2, 0, 1), outline: '#1a0b33' });
        }
        if (t > 2.2) G.text(T.inicioElige, 160, 50, { size: 8, align: 'center', color: '#ffffff', alpha: CR.clamp((t - 2.2) * 2, 0, 1), outline: '#1a0b33' });

        drawRat(ctx, 'jero');
        drawRat(ctx, 'yazeth');

        if (idleBubble) G.bubble(idleBubble.text, posX[idleBubble.who], 80);

        if (ready) {
          G.button(BTN.x, BTN.y, BTN.w, BTN.h, 'COMENZAR');
          const hint = I.isTouch ? 'Toca una rata para elegirla' : '< > para elegir   ENTER para jugar';
          G.text(hint, 160, 162, { size: 6, align: 'center', color: '#e0d4ff', outline: '#120826' });
          if (hasMem) {
            G.box(MEM.x, MEM.y, MEM.w, MEM.h, { fill: '#1d0f3a', border: '#ff9fc0' });
            G.text('RECUERDOS', MEM.x + MEM.w / 2, MEM.y + 3, { size: 6, align: 'center', color: '#ff9fc0' });
          }
          if (canContinue) {
            G.box(CONT.x, CONT.y, CONT.w, CONT.h, { fill: '#1d0f3a', border: '#5eead4' });
            G.text('SEGUIR NIVEL ' + save.level, CONT.x + CONT.w / 2, CONT.y + 4, { size: 6, align: 'center', color: '#5eead4' });
          }
        }
      },
    };
  });
})();
