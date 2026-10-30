/* =====================================================================
   NIVEL 3: EL GATO COMANDANTE (JEFE FINAL)
   Te mueves y lanzas quesos automáticamente. Esquiva estambre y zarpazos.
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR, G = CR.g, I = CR.input;

  const MAX_HP = 45;
  const PHASE_HP = [45, 30, 15]; // vida al empezar cada fase
  const WARN = 1.0, ACT = 0.35;  // tiempos de los zarpazos láser

  CR.scene('nivel3', function () {
    const C = CR.CONFIG, T = C.textos, D = C.dificultad;
    const H = CR.state.hero, K = CR.state.captured;
    CR.save.set({ hero: H, level: 3, quesos: CR.state.quesos, oro: CR.state.oro });

    const fx = new CR.Particles(), dlg = new CR.Dialog();
    const room = CR.bgThrone();
    const yarnSpr = (() => {
      const pp = new CR.Painter(11, 11, 0, 0, 1);
      const r = CR.ramp('#f472b6', 4, 2, { step: 0.1 });
      pp.ell(5.5, 5.5, 4.6, 4.6, r);
      pp.line(2, 4, 8, 2.5, r.c[0]); pp.line(2, 6.5, 9, 4.5, r.c[0]); pp.line(3, 8.5, 9.5, 7, r.c[0]);
      pp.px(3.5, 3.0, '#fff0f8');
      return pp.render();
    })();
    const maxHearts = D.vidasJefe + (CR.state.oro || 0);
    let hearts = maxHearts;

    const p = { x: 110, y: 156, inv: 0, fire: 0.4, flip: false, anim: 0, moving: false };
    const boss = { x: 160, y: -40, hp: MAX_HP, phase: 0, flash: 0, bristle: 0, tt: 0, atk: 1.5, las: 2.5, crown: true, out: false, alpha: 1 };
    const shots = [], yarns = [], lasers = [];
    let crown = null;
    const cage = { x: 282, y: 36, vy: 0, fallen: false, open: 0 };
    const cap = { out: false, x: 282, flip: true, anim: 0 };
    let state = 'intro', st = 0, t = 0, banner = 0, bossB = null, capB = null, capT = 4, cheer = 0;
    let introSaid = false, drag = null, winFrom = null, hitSfxT = 0, dustT = 0, confettiDone = false;

    CR.audio.stopMusic();

    function yarn(a, s) {
      yarns.push({ x: boss.x, y: boss.y + 16, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 0 });
    }

    function damage() {
      if (p.inv > 0) return;
      hearts--;
      p.inv = 1.3;
      CR.shake(3, 0.3);
      CR.audio.sfx.hit();
      fx.burst(p.x, p.y, 12, { color: ['#ff4d6d', '#ffc2d1', '#ffffff'], max: 60 });
      if (hearts <= 0) {
        state = 'down';
        st = 0;
        yarns.length = 0;
        lasers.length = 0;
        CR.audio.sfx.sad();
      }
    }

    function win() {
      state = 'win';
      st = 0;
      winFrom = { x: boss.x, y: boss.y };
      yarns.length = 0;
      lasers.length = 0;
      bossB = null;
      CR.audio.stopMusic();
      CR.audio.sfx.boom();
      CR.shake(4, 1.0);
    }

    function hitBoss(s) {
      boss.hp--;
      boss.flash = 0.08;
      boss.bristle = 0.25;
      cheer = 0.9;
      fx.burst(s.x, s.y, 5, { color: ['#ffd23f', '#fff1a8'], max: 40 });
      if (hitSfxT <= 0) { CR.audio.sfx.bossHit(); hitSfxT = 0.08; }
      if (boss.hp <= 0) return win();
      if (boss.phase < 2 && boss.hp <= PHASE_HP[boss.phase + 1]) {
        boss.phase++;
        bossB = { text: T.jefeFases[boss.phase - 1], t: 2.6 };
        boss.atk = 1.8;
        boss.las = 2.6;
        yarns.length = 0;
        CR.shake(3, 0.4);
        CR.audio.sfx.meow();
        if (boss.phase === 2) {
          crown = { x: boss.x, y: boss.y - 24, vx: CR.rand(-40, 40), vy: -80, rest: false };
          boss.crown = false;
        }
      }
    }

    function updPlayer(dt) {
      const ax = I.axis();
      let vx = ax.x * 120, vy = ax.y * 90;
      const ptr = I.lastPointer;
      if (I.held(ptr)) {
        if (!drag || drag.id !== ptr.id) drag = { id: ptr.id, px: p.x, py: p.y, sx: ptr.x, sy: ptr.y };
        const tx = drag.px + (ptr.x - drag.sx) * 1.3, ty = drag.py + (ptr.y - drag.sy) * 1.3;
        vx = CR.clamp((tx - p.x) * 9, -180, 180);
        vy = CR.clamp((ty - p.y) * 9, -140, 140);
        drag.px += CR.clamp(tx, 10, 310) - tx;
        drag.py += CR.clamp(ty, 112, 164) - ty;
      } else drag = null;
      p.x = CR.clamp(p.x + vx * dt, 10, 310);
      p.y = CR.clamp(p.y + vy * dt, 112, 164);
      p.moving = Math.abs(vx) > 5 || Math.abs(vy) > 5;
      dustT -= dt;
      if (p.moving && dustT <= 0 && Math.abs(vx) > 30) { dustT = 0.14; CR.dust(fx, p.x - Math.sign(vx) * 5, p.y + 5, Math.sign(vx)); }
      if (vx < -5) p.flip = true;
      else if (vx > 5) p.flip = false;
      if (p.moving) p.anim += dt;
    }

    function resetPhase() {
      hearts = maxHearts;
      boss.hp = PHASE_HP[boss.phase];
      yarns.length = 0;
      lasers.length = 0;
      p.inv = 1.5;
      boss.atk = 1.5;
      boss.las = 2.5;
      state = 'fight';
      CR.audio.music('boss');
    }

    /* ---------- Dibujo ---------- */
    function drawTorch(ctx, x, y) {
      const f = Math.sin(t * 13 + x) * 0.5 + Math.sin(t * 7.3 + x * 2) * 0.5;
      CR.glow(ctx, x, y, 22 + f * 2, '#ff9b3f', 0.13);
      G.rect(x - 2, y - 1, 5, 3, '#ff7b00');
      G.rect(x - 1, y - 4 - Math.round(f), 3, 4, '#ffb347');
      G.rect(x, y - 6 - Math.round(f * 1.5), 1, 3, '#fff1a8');
      G.rect(x - 1, y + 1, 3, 1, '#c2410c');
    }

    function drawBoss(ctx) {
      if (boss.out) return;
      if (boss.bristle > 0) {
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          G.line(boss.x + Math.cos(a) * 18, boss.y - 7 + Math.sin(a) * 14, boss.x + Math.cos(a) * 23, boss.y - 7 + Math.sin(a) * 18, '#4f4174');
        }
      }
      const windup = state === 'fight' && boss.atk < 0.35;
      const by = boss.y - (windup ? 2 : 0);
      CR.drawBoss(ctx, boss.x, by, { white: boss.flash > 0, alpha: boss.alpha });
      if (windup) {
        CR.glow(ctx, boss.x - 8, by - 7, 6, '#ffd23f', 0.25);
        CR.glow(ctx, boss.x + 7, by - 7, 6, '#ffd23f', 0.25);
      }
      if (boss.crown) CR.drawSprite(ctx, CR.SPR.crown, boss.x - 6, boss.y - 27, { alpha: boss.alpha });
    }

    function drawCage(ctx) {
      const shakeX = boss.phase === 2 && state === 'fight' ? Math.round(CR.rand(-1, 1)) : 0;
      const x = Math.round(cage.x + shakeX), y = Math.round(cage.y);
      if (!cage.fallen) {
        for (let cy = 0; cy < y - 15; cy += 3) { G.rect(x - 1, cy, 3, 2, '#3a3352'); G.rect(x, cy, 1, 2, '#9b94c4'); }
      }
      G.rect(x - 16, y + 12, 32, 3, '#6b4a00');
      G.rect(x - 16, y + 12, 32, 1, '#ffcc33');
      if (!cap.out) {
        const happy = cheer > 0;
        const hop = happy ? -Math.round(Math.abs(Math.sin(t * 14)) * 3) : 0;
        const r = CR.drawRat(ctx, K, x, y + 12 + hop, { flip: true, frame: happy ? Math.floor(t * 10) % 2 : 0, eye: happy ? 'happy' : 'sad' });
        if (!happy) {
          const k = Math.floor(t * 8) % 4;
          G.rect(r.ex, r.ey + 1 + k, 1, 1, '#7dd3fc');
          G.rect(r.ex - 1, r.ey + 1 + ((k + 2) % 4), 1, 1, '#7dd3fc');
        }
      }
      const lift = Math.round(cage.open * 24);
      for (let i = 0; i < 6; i++) {
        G.rect(x - 15 + i * 6, y - 13 - lift, 1, 25, '#ffcc33');
        G.rect(x - 14 + i * 6, y - 13 - lift, 1, 25, '#8a6200');
      }
      G.rect(x + 15, y - 13 - lift, 1, 25, '#ffcc33');
      G.rect(x - 16, y - 15 - lift, 32, 3, '#6b4a00');
      G.rect(x - 16, y - 15 - lift, 32, 1, '#fff3b0');
      G.rect(x - 2, y - 19 - lift, 5, 4, '#6b4a00');
      G.rect(x - 1, y - 18 - lift, 3, 2, '#ffcc33');
    }

    return {
      pausable: true,

      update(dt) {
        t += dt;
        st += dt;
        fx.update(dt);
        if (bossB) { bossB.t -= dt; if (bossB.t <= 0) bossB = null; }
        if (capB) { capB.t -= dt; if (capB.t <= 0) capB = null; }
        if (boss.flash > 0) boss.flash -= dt;
        if (boss.bristle > 0) boss.bristle -= dt;
        if (cheer > 0) {
          cheer -= dt;
          if (!cap.out && Math.random() < dt * 4) fx.add({ type: 'star', x: cage.x + CR.rand(-10, 10), y: cage.y + CR.rand(-8, 4), vy: -12, life: 0.6, color: '#ffd23f' });
        }
        if (banner > 0) banner -= dt;
        if (hitSfxT > 0) hitSfxT -= dt;
        // motas de polvo en los rayos de luz de las ventanas
        if (Math.random() < dt * 6) {
          const wdw = CR.pick([[24, 44, 38], [258, 94, 36]]), k = Math.random() * 60;
          fx.add({ type: 'firefly', x: wdw[0] + k * 0.5 + Math.random() * wdw[2], y: wdw[1] + k, vx: CR.rand(-2, 2), vy: CR.rand(-3, 3), wob: 4, wobF: 1.5, ph: Math.random() * 6, life: CR.rand(2, 4), color: '#d8ccff' });
        }

        if (crown) {
          if (!crown.rest) {
            crown.vy += 300 * dt;
            crown.x += crown.vx * dt;
            crown.y += crown.vy * dt;
            if (crown.y > 160) { crown.y = 160; crown.vy *= -0.4; crown.vx *= 0.6; if (Math.abs(crown.vy) < 20) crown.rest = true; }
          }
        }

        if (state === 'intro') {
          boss.y = CR.lerp(-40, 48, CR.ease.out(st / 1.6));
          boss.x = 160;
          if (!introSaid && st > 1.8) {
            introSaid = true;
            const col = CR.color(H), capCol = CR.color(K);
            dlg.say([
              { who: T.jefeNombre, color: '#ff6b6b', text: T.jefeIntro[0] },
              { who: '{heroe}', color: col, text: T.jefeIntro[1] },
              { who: '{capturado}', color: capCol, text: T.jefeIntro[2] },
              { who: T.jefeNombre, color: '#ff6b6b', text: T.jefeIntro[3] },
            ], () => {
              state = 'fight';
              st = 0;
              banner = 1.4;
              CR.audio.music('boss');
              CR.audio.sfx.alert();
            });
          }
          dlg.update(dt);
          return;
        }

        if (state === 'fight') {
          if (I.hit('F9')) { boss.phase = 2; boss.hp = 1; boss.crown = false; } // atajo de prueba
          updPlayer(dt);
          if (p.inv > 0) p.inv -= dt;

          // disparo automático de queso
          p.fire -= dt;
          if (p.fire <= 0) {
            p.fire = 0.22;
            shots.push({ x: p.x + (p.flip ? -3 : 3), y: p.y - 8 });
            CR.audio.sfx.shoot();
          }

          // movimiento del jefe
          const spd = [0.6, 0.85, 1.15][boss.phase] * D.jefe;
          boss.tt += dt * spd;
          boss.x = 160 + Math.sin(boss.tt) * 92;
          boss.y = 48 + Math.sin(boss.tt * 2.2) * 6;

          // ataques
          boss.atk -= dt;
          boss.las -= dt;
          if (boss.atk <= 0) {
            const a = Math.atan2(p.y - (boss.y + 16), p.x - boss.x), sp = D.jefe;
            if (boss.phase === 0) { yarn(a, 66 * sp); boss.atk = 1.45 / sp; }
            else if (boss.phase === 1) { yarn(a, 72 * sp); boss.atk = 1.7 / sp; }
            else { yarn(a - 0.28, 78 * sp); yarn(a, 78 * sp); yarn(a + 0.28, 78 * sp); boss.atk = 1.6 / sp; }
            CR.audio.sfx.throw();
          }
          if (boss.phase >= 1 && boss.las <= 0) {
            lasers.push({ x: CR.clamp(p.x, 12, 308), t: 0, fired: false });
            if (boss.phase === 2) lasers.push({ x: CR.clamp(p.x + CR.pick([-1, 1]) * CR.rand(40, 90), 12, 308), t: 0, fired: false });
            boss.las = (boss.phase === 2 ? 2.5 : 2.9) / D.jefe;
            CR.audio.sfx.laserWarn();
          }

          for (const s of shots) {
            s.y -= 210 * dt;
            if (!s.dead && Math.abs(s.x - boss.x) < 24 && s.y < boss.y + 22 && s.y > boss.y - 24) {
              s.dead = true;
              hitBoss(s);
              if (state !== 'fight') break;
            }
          }
          for (let i = shots.length - 1; i >= 0; i--) if (shots[i].dead || shots[i].y < -10) shots.splice(i, 1);

          for (const y of yarns) {
            y.x += y.vx * dt;
            y.y += y.vy * dt;
            y.r += dt * 8;
            if (Math.hypot(y.x - p.x, y.y - (p.y - 1)) < 8) { y.dead = true; damage(); }
          }
          for (let i = yarns.length - 1; i >= 0; i--) {
            const y = yarns[i];
            if (y.dead || y.y > 190 || y.x < -10 || y.x > 330) yarns.splice(i, 1);
          }

          for (const l of lasers) {
            l.t += dt;
            if (l.t >= WARN && !l.fired) { l.fired = true; CR.audio.sfx.laser(); CR.shake(1, 0.2); }
            if (l.t >= WARN && l.t < WARN + ACT && Math.abs(p.x - l.x) < 8) damage();
          }
          for (let i = lasers.length - 1; i >= 0; i--) if (lasers[i].t > WARN + ACT) lasers.splice(i, 1);

          capT -= dt;
          if (capT <= 0) {
            capT = CR.rand(5, 8);
            capB = { text: CR.fmt(CR.pick(cheer > 0 ? T.capturadoAnima : T.capturadoLlora)), t: 2 };
          }
        } else if (state === 'down') {
          if (st > 3 || (st > 1 && I.confirm())) resetPhase();
        } else if (state === 'win') {
          if (st > 1.3 && !confettiDone) { confettiDone = true; CR.confetti(fx, 160, 120, 60); CR.audio.sfx.fanfare(); }
          if (st < 1.3) {
            boss.flash = Math.floor(st * 12) % 2 ? 0.05 : 0;
            if (Math.random() < dt * 30) fx.burst(boss.x + CR.rand(-20, 20), boss.y + CR.rand(-18, 18), 6, { color: ['#ffd23f', '#ff7b00', '#ffffff'], max: 60 });
          } else if (!boss.out) {
            if (!bossB) { bossB = { text: T.jefeDerrota, t: 2.4, follow: true }; CR.audio.sfx.meow(); CR.audio.sfx.whoosh(); }
            const k = Math.min(1, (st - 1.3) / 1.4);
            boss.x = CR.lerp(winFrom.x, 40, k * k);
            boss.y = CR.lerp(winFrom.y, -60, k);
            boss.alpha = 1 - k * 0.6;
            if (k >= 1) boss.out = true;
          }
          if (st > 2.8 && !cage.fallen) {
            cage.vy += 420 * dt;
            cage.y += cage.vy * dt;
            if (cage.y >= 153) {
              cage.y = 153;
              cage.fallen = true;
              CR.audio.sfx.hit();
              CR.shake(2, 0.25);
              fx.burst(cage.x, 166, 12, { color: ['#8b84b0', '#c9a227'], max: 50 });
            }
          }
          if (cage.fallen) cage.open = Math.min(1, cage.open + dt * 1.4);
          if (cage.open >= 1 && !cap.out) { cap.out = true; cap.x = cage.x; CR.audio.sfx.squeak(); CR.confetti(fx, cage.x, 150, 30); }
          if (cap.out) {
            const target = p.x + 14;
            cap.flip = target < cap.x;
            cap.x += CR.clamp(target - cap.x, -70 * dt, 70 * dt);
            cap.anim += dt;
            p.flip = cap.x < p.x;
            if (Math.random() < dt * 5) fx.add({ type: 'heart', x: (cap.x + p.x) / 2, y: p.y - 10, vy: -16, vx: CR.rand(-6, 6), life: 1.4 });
          }
          if (st > 6.6) CR.engine.go('recompensa', { n: 3, next: 'regreso' });
        }
      },

      draw(ctx) {
        ctx.drawImage(room, 0, 0);
        drawTorch(ctx, 80, 66);
        drawTorch(ctx, 242, 66);
        if (crown) CR.drawSprite(ctx, CR.SPR.crown, crown.x - 6, crown.y - 4);

        // zarpazos láser
        for (const l of lasers) {
          if (l.t < WARN) {
            if (Math.floor(l.t * 12) % 2 === 0) G.line(l.x, 70, l.x, 168, '#ff4d6d', 3);
            ctx.globalAlpha = 0.15;
            G.rect(l.x - 7, 70, 14, 98, '#ff4d6d');
            ctx.globalAlpha = 1;
          } else {
            G.rect(l.x - 7, 60, 14, 108, '#ff4d6d');
            G.rect(l.x - 4, 60, 8, 108, '#ffb3c1');
            G.rect(l.x - 1, 60, 2, 108, '#ffffff');
            for (const dx of [-5, 0, 5]) G.rect(l.x + dx, 164, 1, 4, '#ffffff');
          }
        }

        drawBoss(ctx);
        drawCage(ctx);

        // estambres
        for (const y of yarns) CR.drawSprite(ctx, yarnSpr, y.x - 5, y.y - 5);
        // quesos disparados
        for (const s2 of shots) {
          G.rect(s2.x - 3, s2.y - 3, 6, 5, '#5a3208');
          G.rect(s2.x - 2, s2.y - 2, 4, 3, '#ffd23f');
          G.rect(s2.x - 2, s2.y - 2, 2, 1, '#fff3a0');
          G.rect(s2.x, s2.y, 1, 1, '#c98a0a');
        }

        // jugador
        const blink = p.inv > 0 && Math.floor(p.inv * 10) % 2 === 0;
        if (!blink && state !== 'down') {
          ctx.globalAlpha = 0.4;
          G.ellipse(p.x, p.y + 6, 7, 1, '#000000');
          ctx.globalAlpha = 1;
          CR.drawRat(ctx, H, p.x, p.y + 5, { flip: p.flip, frame: p.moving ? Math.floor(p.anim * 8) % 2 : 0, eye: p.inv > 0.9 ? 'closed' : CR.blink(t, 4) });
        }
        if (cap.out) CR.drawRat(ctx, K, cap.x, 166, { flip: cap.flip, frame: Math.floor(cap.anim * 8) % 2, eye: 'happy' });

        fx.draw(ctx);

        if (bossB) {
          if (bossB.follow) G.bubble(bossB.text, boss.x, boss.y + 28, { below: true, color: '#7a1530' });
          else G.bubble(bossB.text, boss.x, boss.y - 30, { color: '#7a1530' });
        }
        if (capB && !cap.out) G.bubble(capB.text, cage.x - 10, cage.y + 16, { below: true, color: '#1d4a7a', maxW: 90 });

        // HUD
        for (let i = 0; i < maxHearts; i++) CR.drawSprite(ctx, i < hearts ? CR.SPR.heart : CR.SPR.heartEmpty, 6 + i * 9, 6);
        if (state !== 'intro' && !boss.out) {
          G.text(T.jefeNombre, 160, 3, { size: 6, align: 'center', color: '#ff9fc0', outline: '#2a0614' });
          G.box(98, 12, 124, 7, { fill: '#1d0f3a', border: '#6b5884' });
          const w = Math.round(120 * Math.max(0, boss.hp) / MAX_HP);
          if (w > 0) G.rect(100, 14, w, 3, '#ff4d6d');
          G.rect(100 + 40, 13, 1, 5, '#6b5884');
          G.rect(100 + 80, 13, 1, 5, '#6b5884');
        }

        if (banner > 0) {
          ctx.globalAlpha = Math.min(1, banner * 2);
          G.text('¡A PELEAR!', 160, 86, { size: 16, align: 'center', color: '#ffd23f', outline: '#3a1a00' });
          G.text(I.isTouch ? 'Arrastra el dedo para moverte' : 'Muévete con flechas o WASD', 160, 106, { size: 6, align: 'center' });
          G.text('Los quesos se lanzan solos', 160, 116, { size: 6, align: 'center', color: '#ffd23f' });
          ctx.globalAlpha = 1;
        }
        if (state === 'intro' && !introSaid) {
          G.box(60, 92, 200, 40, { fill: 'rgba(18,8,38,0.9)', border: '#ff4d6d' });
          G.text('NIVEL 3', 160, 98, { size: 16, align: 'center', color: '#ffd23f' });
          G.text(T.nivel3Titulo, 160, 118, { size: 8, align: 'center', color: '#ff9fc0' });
        }
        if (state === 'down') {
          G.box(50, 70, 220, 44, { border: '#ff5fa2' });
          G.text(T.jefeReintento, 160, 80, { size: 6, align: 'center', color: '#ffffff' });
          G.text(I.isTouch ? 'Toca para reintentar' : 'ENTER para reintentar', 160, 96, { size: 6, align: 'center', color: '#c4b5fd', alpha: st > 1 ? 1 : 0 });
        }
        dlg.draw();
      },
    };
  });
})();
