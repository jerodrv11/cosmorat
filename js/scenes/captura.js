/* =====================================================================
   ESCENA: CINEMÁTICA DE INICIO
   Prólogo, queso corazón, estrella fugaz, deseo... y la captura.
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR, G = CR.g, I = CR.input;

  CR.scene('captura', function () {
    const T = CR.CONFIG.textos;
    const H = CR.state.hero, K = CR.state.captured;
    CR.save.set({ hero: H, level: 0 });

    const GROUND = 150, RS = 2, SKY = 130;
    const home = CR.bgHome(GROUND, 3);
    // cielo extra arriba para el paneo de cámara
    const tall = document.createElement('canvas');
    tall.width = 320; tall.height = 180 + SKY;
    (function () {
      const c = tall.getContext('2d');
      c.drawImage(CR.bgSpace(320, 11), 0, 0, 320, SKY + 10, 0, 0, 320, SKY + 10);
      c.drawImage(home, 0, SKY);
      for (let y = 0; y < 30; y++) {
        c.globalAlpha = (1 - y / 30) * 0.9;
        c.fillStyle = '#07041a';
        c.fillRect(0, SKY - 14 + y, 320, 1);
      }
      c.globalAlpha = 1;
    })();

    const stars = new CR.Starfield(45), fx = new CR.Particles(), dlg = new CR.Dialog();
    const hero = { x: 138, h: 0, visible: true, eye: null, mark: 0, hop: 0, run: false, flip: false };
    const cap = { x: 182, h: 0, visible: true, eye: null, mark: 0, flip: true, kick: false };
    const ship = { x: 180, y: -60, show: false, peek: false, inside: false, flame: false };
    const rocket = { x: -50, lift: 0, rider: false, show: false };
    const halves = {
      hero: { x: 160, y: GROUND - 6, held: false },
      cap: { x: 160, y: GROUND - 6, held: false, vy: 0, falling: false, onGround: false },
    };
    let camY = -SKY, dark = 0, beam = 0, whole = true, star = null, fakeStar = null, wishGlow = 0;
    let prologo = null, prologoA = 0, shipBubble = null, count = '', heroEye = null, skipped = false, heroHasBoth = false;

    const ritmo = () => CR.CONFIG.dificultad.ritmo;
    const sayL = (arr) => CR.lines(arr);

    function holdPos(who) {
      const r = who === 'hero' ? hero : cap;
      const dir = r.flip ? -1 : 1;
      return { x: r.x + dir * 15, y: GROUND - r.h - 6 };
    }

    const seq = new CR.Seq([
      { name: 'prologo', d: 5.2, enter() { prologo = [new CR.Typer(T.prologo[0], { width: 312, size: 8, lh: 12, cps: 22, silent: true }), new CR.Typer(T.prologo[1], { width: 312, size: 8, lh: 12, cps: 22, silent: true })]; },
        tick(k, dt, t) { prologoA = t < 0.4 ? t / 0.4 : t > 4.6 ? Math.max(0, (5.2 - t) / 0.6) : 1; prologo[0].update(dt); if (t > 2) prologo[1].update(dt); } },
      { name: 'paneo', d: 4.6, enter() { CR.audio.music('menu'); }, tick(k) { camY = CR.lerp(-SKY, 0, CR.ease.inOut(k)); } },
      { name: 'calma', d: 1.4, tick() { if (Math.random() < 0.05) fx.add({ type: 'heart', x: 160 + CR.rand(-4, 4), y: GROUND - 30, vy: -12, vx: CR.rand(-5, 5), life: 1.5 }); } },
      { name: 'partir', d: 1.6, tick(k) {
          if (k > 0.35 && whole) {
            whole = false;
            CR.audio.sfx.nam();
            fx.burst(160, GROUND - 6, 10, { color: ['#ffd23f', '#fff1a8'], max: 30 });
          }
          if (!whole) {
            const kk = CR.ease.out((k - 0.35) / 0.65);
            const a = holdPos('hero'), b = holdPos('cap');
            halves.hero.x = CR.lerp(155, a.x, kk); halves.hero.y = CR.lerp(GROUND - 6, a.y, kk) - Math.sin(kk * Math.PI) * 8;
            halves.cap.x = CR.lerp(161, b.x, kk); halves.cap.y = CR.lerp(GROUND - 6, b.y, kk) - Math.sin(kk * Math.PI) * 8;
          }
        }, exit() { halves.hero.held = true; halves.cap.held = true; } },
      { name: 'compartir', say: sayL(T.compartir) },
      { name: 'fugaz', d: 2.2, enter() { star = { x: 330, y: 18, t: 0 }; CR.audio.sfx.sparkle(); hero.mark = 1.6; cap.mark = 1.6; },
        tick(k) { star.x = CR.lerp(330, -20, k); star.y = 18 + k * 30; } , exit() { star = null; } },
      { name: 'estrella', say: sayL(T.estrella) },
      { name: 'deseo', d: 3.0, enter() { hero.eye = 'closed'; cap.eye = 'closed'; CR.audio.sfx.sparkle(); },
        tick(k) {
          wishGlow = Math.sin(k * Math.PI);
          if (Math.random() < 0.35) fx.add({ type: 'star', x: CR.pick([hero.x, cap.x]) + CR.rand(-10, 10), y: GROUND - 28, vy: -CR.rand(15, 30), life: 1.2, color: CR.pick(['#fff1a8', '#ffb3f0', '#ffffff']) });
        }, exit() { hero.eye = null; cap.eye = null; wishGlow = 0; } },
      { name: 'quedeseo', say: sayL(T.deseo) },
      { name: 'regresa', d: 2.6, enter() { fakeStar = { x: 250, y: 12, r: 1 }; CR.audio.sfx.rumble(); },
        tick(k) {
          fakeStar.x = CR.lerp(250, 180, k); fakeStar.y = CR.lerp(12, 58, k * k); fakeStar.r = 1 + k * 14;
          if (k > 0.3) { hero.mark = 0.3; cap.mark = 0.3; hero.q = true; cap.q = true; }
          dark = k * 0.4;
          CR.shake(k * 1.5, 0.1);
        }, exit() { fakeStar = null; ship.show = true; ship.y = 58; CR.flash(0.8); CR.audio.sfx.boom(); CR.shake(2.5, 0.6); hero.q = cap.q = false; hero.mark = 1.2; cap.mark = 1.2; CR.audio.stopMusic(); } },
      { name: 'risa', d: 2.4, enter() { ship.peek = true; shipBubble = { text: T.capturaGato, t: 2.6 }; CR.audio.sfx.meow(); },
        tick(k) { dark = 0.4 + k * 0.15; } },
      { name: 'rayo', d: 2.4, tick(k) {
          beam = Math.min(1, k / 0.12);
          cap.h = 40 * CR.ease.inOut(CR.clamp((k - 0.1) / 0.9, 0, 1));
          cap.kick = k > 0.1;
          cap.eye = 'sad';
          if (k > 0.35 && halves.cap.held) { halves.cap.held = false; halves.cap.falling = true; halves.cap.vy = -20; CR.audio.sfx.squeak(); }
          if (k > 0.25) { hero.run = true; hero.x = CR.lerp(138, 156, CR.ease.out((k - 0.25) / 0.75)); if (Math.random() < 0.3) CR.dust(fx, hero.x - 10, GROUND, 1); }
        }, exit() { cap.visible = false; ship.inside = true; hero.run = false; } },
      { name: 'sevan', d: 1.6, enter() { ship.peek = false; CR.audio.sfx.whoosh(); ship.flame = true; },
        tick(k, dt) { beam = Math.max(0, beam - dt * 4); ship.x += dt * (40 + k * 700); ship.y -= dt * 25; } },
      { name: 'triste', d: 2.6, enter() { CR.audio.sfx.sad(); hero.eye = 'sad'; },
        tick(k, dt) {
          dark = Math.max(0.15, dark - dt * 0.4);
          const tx = halves.cap.x - 16;
          if (hero.x < tx) { hero.x = Math.min(tx, hero.x + dt * 18); hero.run = true; } else hero.run = false;
          if (heroEye && Math.random() < 0.15) fx.add({ type: 'tear', x: heroEye.x + CR.pick([0, 1]), y: heroEye.y + 1, vx: CR.rand(4, 10), vy: 10, g: 80, life: 0.6 });
        } },
      { name: 'recoger', d: 1.4, tick(k) {
          const a = holdPos('hero');
          halves.cap.x = CR.lerp(halves.cap.x, a.x + 6, k); halves.cap.y = CR.lerp(halves.cap.y, a.y - 2, k);
          if (k > 0.5 && !heroHasBoth) { heroHasBoth = true; CR.audio.sfx.checkpoint(); for (let i = 0; i < 8; i++) fx.add({ type: 'star', x: a.x + 6, y: a.y, vx: CR.rand(-20, 20), vy: -CR.rand(10, 30), life: 0.8, color: '#ffd23f' }); }
        }, exit() { hero.eye = null; hero.hop = 0.4; hero.mark = 1.2; CR.audio.sfx.alert(); } },
      { name: 'promesa', say: T.capturaHeroe.map((text) => ({ who: '{heroe}', color: CR.color(H), text })) },
      { name: 'cohete', d: 1.4, enter() { rocket.show = true; CR.audio.music('chase'); }, tick(k) { rocket.x = CR.lerp(-60, 100, CR.ease.out(k)); } },
      { name: 'subir', d: 0.6, enter() { hero.startX = hero.x; },
        tick(k) { hero.x = CR.lerp(hero.startX, rocket.x - 2, k); hero.h = Math.sin(k * Math.PI) * 26 + k * 20; hero.run = true; },
        exit() { hero.visible = false; rocket.rider = true; hero.run = false; CR.audio.sfx.squeak(); } },
      { name: 'cuenta', d: 2.6, tick(k) {
          const n = 3 - Math.floor(k * 3.4);
          const label = n > 0 ? String(n) : T.despegue;
          if (label !== count) { count = label; n > 0 ? CR.audio.sfx.select() : CR.audio.sfx.turbo(); }
          CR.shake(0.5 + k * 1.5, 0.1);
          if (Math.random() < 0.6) fx.add({ type: 'dust', x: rocket.x - 28 + CR.rand(-4, 4), y: GROUND - 2, vx: -CR.rand(10, 40), vy: -CR.rand(2, 10), drag: 2, life: 0.9, color: CR.pick(['#c4b5fd', '#8b7fb0', '#e9ddff']) });
        } },
      { name: 'despegue', d: 1.5, tick(k, dt) {
          rocket.x += dt * (60 + k * 420);
          rocket.lift += dt * k * 90;
          if (Math.random() < 0.7) fx.add({ type: 'dust', x: rocket.x - 30, y: GROUND - 17 - rocket.lift + CR.rand(-3, 3), vx: -CR.rand(20, 50), vy: CR.rand(-6, 6), drag: 2, life: 0.8, color: CR.pick(['#c4b5fd', '#8b7fb0', '#e9ddff']) });
        }, exit() { CR.engine.go('nivel1'); } },
    ], dlg);

    function drawRat(ctx, r, k, extra) {
      if (!r.visible) return null;
      const hop = r.hop > 0 ? Math.sin((1 - r.hop / 0.4) * Math.PI) * 8 : 0;
      const eye = r.eye || (r.hop > 0 ? 'happy' : CR.blink(CR.engine.t, k === H ? 2 : 5));
      const frame = r.run || r.kick ? Math.floor(CR.engine.t * 10) % 2 : 0;
      const flip = r.kick ? Math.floor(CR.engine.t * 8) % 2 === 0 : r.flip;
      const x = r.x + (r.kick ? (Math.floor(CR.engine.t * 16) % 2 ? 1 : -1) : 0);
      const res = CR.drawRat(ctx, k, x, GROUND - r.h - hop + (extra || 0), { s: RS, frame, eye, flip });
      if (r.mark > 0) G.text(r.q ? '?' : '!', x + (r.flip ? -8 : 8), res.y - 10, { size: 8, align: 'center', color: '#ffd23f', outline: '#3a1a00' });
      return res;
    }

    return {
      get stage() { return seq.name + (dlg.active ? '*' : ''); },

      update(dt0) {
        const dt = dt0 * ritmo();
        stars.update(dt, 2, 0);
        fx.update(dt);
        if (shipBubble) { shipBubble.t -= dt; if (shipBubble.t <= 0) shipBubble = null; }
        for (const r of [hero, cap]) { if (r.mark > 0) r.mark -= dt; if (r.hop > 0) r.hop -= dt; }
        if (halves.cap.falling) {
          halves.cap.vy += 260 * dt;
          halves.cap.y += halves.cap.vy * dt;
          if (halves.cap.y >= GROUND - 7) {
            halves.cap.y = GROUND - 7;
            if (Math.abs(halves.cap.vy) > 40) { halves.cap.vy *= -0.35; CR.audio.sfx.step(); }
            else { halves.cap.falling = false; halves.cap.onGround = true; }
          }
        }
        if (halves.hero.held) { const a = holdPos('hero'); halves.hero.x = a.x; halves.hero.y = a.y; }
        if (halves.cap.held) { const b = holdPos('cap'); halves.cap.x = b.x; halves.cap.y = b.y; }
        if (heroHasBoth && seq.name !== 'recoger') { const a = holdPos('hero'); halves.cap.x = a.x + 6; halves.cap.y = a.y - 2; }

        if (!skipped && (I.hit('Escape', 'KeyS') || I.tapIn(4, 4, 56, 14))) {
          skipped = true;
          CR.audio.sfx.select();
          CR.engine.go('nivel1');
          return;
        }
        if (dlg.active) { dlg.update(dt0); return; }
        seq.update(dt);
      },

      draw(ctx) {
        if (seq.name === 'prologo') {
          G.rect(0, 0, 320, 180, '#05030c');
          if (!prologo) return;
          stars.draw(ctx, prologoA);
          ctx.globalAlpha = prologoA;
          prologo[0].draw(160, 68, { center: true, color: '#e0d4ff' });
          prologo[1].draw(160, 76 + prologo[0].height, { center: true, color: '#ff9fc0' });
          ctx.globalAlpha = 1;
          return;
        }
        const cy = Math.round(camY);
        ctx.save();
        ctx.translate(0, -cy - SKY);
        ctx.drawImage(tall, 0, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(0, -cy);
        stars.draw(ctx, 1, 1, 105);
        if (star) {
          CR.glow(ctx, star.x, star.y, 8, '#fff1a8', 0.2);
          for (let i = 0; i < 26; i++) { ctx.globalAlpha = 1 - i / 26; G.rect(star.x + i, star.y - i * 0.85, 1, 1, i < 3 ? '#ffffff' : '#ffd6f0'); }
          ctx.globalAlpha = 1;
          G.rect(star.x - 1, star.y, 3, 1, '#ffffff'); G.rect(star.x, star.y - 1, 1, 3, '#ffffff');
        }
        if (fakeStar) {
          CR.glow(ctx, fakeStar.x, fakeStar.y, fakeStar.r * 2, '#fff1a8', 0.22);
          G.circle(fakeStar.x, fakeStar.y, Math.max(1, fakeStar.r * 0.35), '#ffffff');
        }
        if (dark > 0) {
          ctx.globalAlpha = dark;
          G.rect(0, -10, 320, 200, '#05020c');
          ctx.globalAlpha = 1;
        }
        if (wishGlow > 0) CR.glow(ctx, 160, GROUND - 12, 40, '#ffb3f0', 0.16 * wishGlow);
        if (ship.show && ship.y > -30 && ship.x < 380) {
          ctx.globalAlpha = 0.35;
          G.ellipse(ship.x, GROUND + 2, 40, 3, '#000000');
          ctx.globalAlpha = 1;
        }
        // rayo tractor
        if (beam > 0) {
          const top = ship.y + 20, bot = GROUND + 2;
          for (let y = Math.round(top); y < bot; y++) {
            const k = (y - top) / (bot - top), hw = Math.round(CR.lerp(10, 24, k) * beam);
            ctx.globalAlpha = 0.16 + (Math.floor((y - CR.engine.t * 60) / 4) % 2 === 0 ? 0.12 : 0);
            G.rect(180 - hw, y, hw * 2, 1, '#7dffb0');
          }
          ctx.globalAlpha = 1;
          CR.glow(ctx, 180, GROUND, 26, '#7dffb0', 0.12 * beam);
        }
        // queso
        if (whole) CR.drawSprite(ctx, CR.heartCheese('full', 1), 160 - 8, GROUND - 14);
        else {
          if (hero.visible) CR.drawSprite(ctx, CR.heartCheese('L', 1), halves.hero.x - 8, halves.hero.y - 7);
          const capHalf = seq.name === 'partir' || seq.name === 'recoger' || halves.cap.falling || halves.cap.onGround && !heroHasBoth || (halves.cap.held && cap.visible) || (heroHasBoth && hero.visible);
          if (capHalf) CR.drawSprite(ctx, CR.heartCheese('R', 1), halves.cap.x - 8, halves.cap.y - 7);
        }
        // ratas
        const hr = drawRat(ctx, hero, H, hero.eye === 'sad' && seq.name === 'triste' ? 1 : 0);
        if (hr) heroEye = { x: hr.ex, y: hr.ey };
        const cr = drawRat(ctx, cap, K, 0);
        if (cr && cap.kick && cap.h > 4 && Math.random() < 0.4) fx.add({ type: 'tear', x: cr.ex, y: cr.ey + 1, vx: CR.rand(-8, -2), vy: 6, g: 60, life: 0.5 });

        if (ship.show && ship.x < 420) CR.drawShip(ctx, ship.x, ship.y, CR.engine.t, { s: 2, catPeek: ship.peek, captured: ship.inside ? K : null, crying: true, flame: ship.flame, bigFlame: true });

        if (rocket.show) CR.drawRocket(ctx, rocket.x, GROUND - 17 - rocket.lift, CR.engine.t, { s: RS, rider: rocket.rider ? H : null, riderFrame: Math.floor(CR.engine.t * 8) % 2, flame: seq.name === 'cuenta' || seq.name === 'despegue', boost: seq.name === 'despegue' });

        fx.draw(ctx);
        ctx.restore();

        if (shipBubble) G.bubble(shipBubble.text, ship.x + 30, ship.y - 30 - cy, { color: '#7a1530', maxW: 132 });
        if (seq.name === 'regresa' && seq.t > 1) G.bubble(T.noEsEstrella, hero.x, GROUND - 40, { color: '#1d4a7a', maxW: 132 });
        if (seq.name === 'cuenta' && count) {
          const isGo = count === T.despegue;
          G.text(count, 160, 60, { size: isGo ? 16 : 16, align: 'center', color: isGo ? '#ffd23f' : '#ffffff', outline: '#2a0f4a' });
        }
        dlg.draw();

        G.box(4, 4, 56, 14, { fill: 'rgba(18,8,38,0.8)', border: '#6b5884' });
        G.text('SALTAR >', 32, 8, { size: 6, align: 'center', color: '#c4b5fd' });
      },
    };
  });
})();
