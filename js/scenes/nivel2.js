/* =====================================================================
   NIVEL 2: INFILTRACIÓN EN EL PLANETA GATUNO
   Junta los quesos y llega a la puerta de la base sin que te vean.
   Mapa: # roca · W muro · D puerta · C caja · b arbusto · q queso
         g queso dorado · k punto seguro · s cartel · P inicio
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR, G = CR.g, I = CR.input;
  const TS = 16;

  const MAP = [
    '########################################',
    '#..........#............#WWWWWWWWWWWWWW#',
    '#..q.......#....C...bb..#WWWWWWWWWWWWWW#',
    '#...bb.....#....C...bb...WWWWWWWWWWWWWW#',
    '#...bb..#..#..........s..WWWWWWWWWWWWWW#',
    '#.......#.......####.....WWWWWWDWWWWWWW#',
    '#..#....#..g....#..#..........b........#',
    '#..#....###.....#q.#......#...b....#...#',
    '#..#..........bb.......C...#........#..#',
    '#......k.......b...CCC.....#..s..k..#..#',
    '####...####.........C......####...###..#',
    '#..........#....bb.............#.......#',
    '#..bb......#....bb.....#.......#...q...#',
    '#..bb......#...........#.......#.......#',
    '#..........#.....###...#...bb..#..bb...#',
    '#.....q....#.......#...k...bb......bb..#',
    '#..........#..q....#........C......g...#',
    '#...####...........#....CC..C..........#',
    '#..........s.......#...........###.....#',
    '#.P....bb..........#.....q.....#.......#',
    '#......bb..........#...........#.......#',
    '########################################',
  ];

  // Guardias: ruta en casillas. "look" = vigilante fijo que gira.
  const GUARDS = [
    { path: [[12, 16], [18, 16]], speed: 24 },
    { path: [[6, 12]], look: [0, Math.PI / 2, Math.PI, -Math.PI / 2] },
    { path: [[4, 8], [12, 8]], speed: 22 },
    { path: [[13, 1], [13, 9]], speed: 24 },
    { path: [[22, 6], [22, 13]], speed: 22 },
    { path: [[26, 6], [38, 6]], speed: 22, sleepy: true },
    { path: [[34, 11], [38, 11], [38, 19], [34, 19]], speed: 26, sleepy: true },
  ];

  const RANGE = 58, HALF = 0.46;

  CR.scene('nivel2', function () {
    const C = CR.CONFIG, T = C.textos, NEED = C.quesosNecesarios;
    const H = CR.state.hero, SUF = C.personajes[H].sufijo;
    CR.state.quesos = 0;
    CR.state.oro = 0;
    CR.save.set({ hero: H, level: 2, quesos: 0, oro: 0 });

    const MW = MAP[0].length, MH = MAP.length, WW = MW * TS, WH = MH * TS;
    const fx = new CR.Particles(), dlg = new CR.Dialog(), joy = new CR.Joystick();
    const cheeses = [], flags = [], signs = [];
    let start = { x: 40, y: 40 }, door = null, si = 0;

    for (let ty = 0; ty < MH; ty++) {
      for (let tx = 0; tx < MW; tx++) {
        const ch = MAP[ty][tx], cx = tx * TS + 8, cy = ty * TS + 8;
        if (ch === 'q' || ch === 'g') cheeses.push({ x: cx, y: cy, gold: ch === 'g', taken: false, ph: Math.random() * 6 });
        else if (ch === 'P') start = { x: cx, y: cy };
        else if (ch === 'k') flags.push({ x: cx, y: cy, on: false });
        else if (ch === 's') signs.push({ x: cx, y: cy, text: T.carteles[si++ % T.carteles.length] });
        else if (ch === 'D') door = { tx, ty, x: cx, y: cy, open: 0 };
      }
    }

    const tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= MW || ty >= MH ? '#' : MAP[ty][tx]);
    const tilePx = (x, y) => tileAt(Math.floor(x / TS), Math.floor(y / TS));
    const solidPx = (x, y) => { const ch = tilePx(x, y); return ch === '#' || ch === 'W' || ch === 'C' || (ch === 'D' && door.open < 1); };
    const sightBlock = (x, y) => { const ch = tilePx(x, y); return ch === '#' || ch === 'W' || ch === 'C' || ch === 'D'; };

    /* ---------- Mapa pre-dibujado ---------- */
    const { base, over, sparks } = CR.renderLevel2(MAP, TS, tileAt);
    let dustT = 0;

    /* ---------- Guardias ---------- */
    const guards = GUARDS.map((g) => {
      const path = g.path.map(([tx, ty]) => ({ x: tx * TS + 8, y: ty * TS + 8 }));
      const look = g.look || null;
      const dir0 = look ? look[0] : path.length > 1 ? Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x) : 0;
      return {
        path, look, li: 0, ti: path.length > 1 ? 1 : 0,
        x: path[0].x, y: path[0].y, dir: dir0, wantDir: dir0,
        speed: (g.speed || 24) * 0.85, sleepy: !!g.sleepy,
        mode: look ? 'look' : 'walk', timer: CR.rand(1.5, 2.6),
        sus: 0, peak: 0, bubble: null, anim: Math.random() * 3, zT: 0,
      };
    });

    /* ---------- Jugador ---------- */
    const p = { x: start.x, y: start.y, flip: false, moving: false, anim: 0, safe: 0, hidden: false, alpha: 1 };
    let cp = { x: start.x, y: start.y };
    const cam = { x: 0, y: 0 };
    let state = 'intro', st = 0, t = 0, black = 0, quesos = 0, oro = 0;
    let introSaid = false, respawned = false, doorMsgT = 0, heroBubble = null, nearSign = null, stepT = 0;

    CR.audio.music('sneak');

    function camTarget() {
      return { x: CR.clamp(p.x - 160, 0, WW - 320), y: CR.clamp(p.y - 96, 0, WH - 180) };
    }
    Object.assign(cam, camTarget());
    function updateCam(dt, snap) {
      const c = camTarget();
      if (snap) { cam.x = c.x; cam.y = c.y; return; }
      cam.x += (c.x - cam.x) * Math.min(1, dt * 6);
      cam.y += (c.y - cam.y) * Math.min(1, dt * 6);
    }

    function blocked(x, y) {
      return solidPx(x - 5, y - 2) || solidPx(x + 5, y - 2) || solidPx(x - 5, y + 5) || solidPx(x + 5, y + 5);
    }
    function moveP(dx, dy) {
      if (dx && !blocked(p.x + dx, p.y)) p.x += dx;
      if (dy && !blocked(p.x, p.y + dy)) p.y += dy;
    }

    function angDiff(a, b) {
      let d = a - b;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    }
    function turn(g, dt) {
      const d = angDiff(g.wantDir, g.dir), s = 4.5 * dt;
      g.dir += Math.abs(d) < s ? d : Math.sign(d) * s;
    }
    function startYawn(g) {
      g.mode = 'yawn';
      g.timer = g.sleepy ? CR.rand(2.8, 3.8) : CR.rand(1.8, 2.6);
      g.bubble = { text: CR.pick(T.guardiaBostezo), t: 1.4 };
    }
    function updGuard(g, dt) {
      g.anim += dt;
      if (g.mode === 'alert') return;
      if (g.mode === 'yawn') {
        g.timer -= dt;
        g.zT -= dt;
        if (g.zT <= 0) { g.zT = 0.55; fx.add({ type: 'text', text: 'z', x: g.x + 5, y: g.y - 12, vx: 6, vy: -10, life: 1.2, color: '#c4b5fd' }); }
        if (g.timer <= 0) { g.mode = g.look ? 'look' : 'pause'; g.timer = 0.5; }
        return;
      }
      turn(g, dt);
      if (g.look) {
        g.timer -= dt;
        if (g.timer <= 0) {
          if (Math.random() < 0.25) return startYawn(g);
          g.li = (g.li + 1) % g.look.length;
          g.wantDir = g.look[g.li];
          g.timer = 2.6;
        }
        return;
      }
      if (g.mode === 'pause') {
        g.timer -= dt;
        if (g.timer <= 0) g.mode = 'walk';
        return;
      }
      const tg = g.path[g.ti], dx = tg.x - g.x, dy = tg.y - g.y, d = Math.hypot(dx, dy);
      if (d < 1.5) {
        g.x = tg.x; g.y = tg.y;
        g.ti = (g.ti + 1) % g.path.length;
        const nt = g.path[g.ti];
        g.wantDir = Math.atan2(nt.y - g.y, nt.x - g.x);
        if (Math.random() < (g.sleepy ? 0.55 : 0.25)) startYawn(g);
        else { g.mode = 'pause'; g.timer = CR.rand(0.8, 1.6); }
        return;
      }
      g.wantDir = Math.atan2(dy, dx);
      const sp = Math.min(g.speed * dt, d);
      g.x += (dx / d) * sp;
      g.y += (dy / d) * sp;
    }

    function canSee(g) {
      if (g.mode === 'yawn' || p.hidden || p.safe > 0) return false;
      const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy);
      if (d < 10) return true;
      if (d > RANGE) return false;
      if (Math.abs(angDiff(Math.atan2(dy, dx), g.dir)) > HALF) return false;
      for (let s = 6; s < d; s += 4) if (sightBlock(g.x + (dx / d) * s, g.y + (dy / d) * s)) return false;
      return true;
    }
    function detect(g, dt) {
      if (canSee(g)) {
        const d = Math.hypot(p.x - g.x, p.y - g.y);
        g.sus += dt * (2.7 - d / RANGE);
        g.peak = Math.max(g.peak, g.sus);
        if (g.sus >= 1) caught(g);
      } else if (g.sus > 0) {
        g.sus = Math.max(0, g.sus - dt * 0.9);
        if (g.sus === 0) {
          if (g.peak > 0.3 && g.mode !== 'yawn') g.bubble = { text: CR.pick(T.guardiaPierde), t: 2.2 };
          g.peak = 0;
        }
      }
    }
    function caught(g) {
      state = 'caught';
      st = 0;
      respawned = false;
      g.mode = 'alert';
      g.wantDir = g.dir = Math.atan2(p.y - g.y, p.x - g.x);
      g.bubble = { text: CR.fmt(CR.pick(T.guardiaVe)), t: 1.6 };
      CR.audio.sfx.alert();
      CR.audio.sfx.meow();
      CR.shake(2, 0.25);
    }

    function drawCone(ctx, g) {
      if (g.mode === 'yawn') return;
      const N = 14;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      for (let i = 0; i <= N; i++) {
        const a = g.dir - HALF + (2 * HALF * i) / N;
        let d = 6;
        while (d < RANGE && !sightBlock(g.x + Math.cos(a) * d, g.y + Math.sin(a) * d)) d += 3;
        ctx.lineTo(g.x + Math.cos(a) * d, g.y + Math.sin(a) * d);
      }
      ctx.closePath();
      ctx.fillStyle = g.mode === 'alert' ? 'rgba(255,60,80,0.38)' : g.sus > 0 ? 'rgba(255,150,40,' + (0.24 + g.sus * 0.22) + ')' : 'rgba(255,225,90,0.2)';
      ctx.fill();
    }

    function drawDoor() {
      const x = door.tx * TS, y = door.ty * TS;
      G.rect(x - 1, y - 2, TS + 2, TS + 2, '#1a1530');
      G.rect(x, y, TS, TS, '#0c0716');
      const slide = Math.round(door.open * 15);
      if (slide < 16) {
        const h = 16 - slide;
        G.rect(x + 1, y, 14, h, '#5b21b6');
        G.rect(x + 1, y, 14, 1, '#8b5cf6');
        G.rect(x + 1, y, 1, h, '#7c3aed');
        G.rect(x + 14, y, 1, h, '#3b1270');
        G.rect(x + 7, y, 2, h, '#3b1270');
        G.rect(x + 7, y, 1, h, '#4c1d95');
        if (h > 9) {
          G.rect(x + 3, y + h - 9, 2, 2, '#ffcc33');
          G.rect(x + 11, y + h - 9, 2, 2, '#ffcc33');
          G.rect(x + 4, y + h - 6, 8, 3, '#c084fc');
          G.rect(x + 5, y + h - 6, 6, 1, '#e9d5ff');
        }
      }
      const ready = quesos >= NEED;
      const lc = ready ? (Math.floor(t * 4) % 2 ? '#5eead4' : '#99f6e4') : '#ff4d6d';
      CR.glow(ctx0, x + 8, y - 4, 8, lc, 0.15);
      G.rect(x + 5, y - 6, 6, 3, '#1a1530');
      G.rect(x + 6, y - 5, 4, 1, lc);
    }
    let ctx0 = null;

    function drawFlag(f) {
      G.rect(f.x - 5, f.y - 13, 3, 20, '#1a1530');
      G.rect(f.x - 4, f.y - 12, 1, 18, '#e5e7eb');
      if (f.on) {
        CR.glow(ctx0, f.x, f.y - 9, 9, '#5eead4', 0.1);
        for (let i = 0; i < 8; i++) {
          const yo = Math.round(Math.sin(t * 6 + i * 0.8));
          G.rect(f.x - 3 + i, f.y - 13 + yo, 1, 7, '#0b4d47');
          G.rect(f.x - 3 + i, f.y - 12 + yo, 1, 5, i % 2 ? '#5eead4' : '#2dd4bf');
        }
      } else {
        G.rect(f.x - 3, f.y - 12, 4, 7, '#2a1d40');
        G.rect(f.x - 3, f.y - 11, 3, 5, '#6b5884');
      }
    }

    function drawSign(s) {
      G.rect(s.x - 2, s.y - 2, 4, 10, '#24120a');
      G.rect(s.x - 1, s.y - 2, 2, 9, '#8a5a2b');
      G.rect(s.x - 8, s.y - 11, 16, 10, '#24120a');
      G.rect(s.x - 7, s.y - 10, 14, 8, '#b07a42');
      G.rect(s.x - 7, s.y - 10, 14, 1, '#d39a5e');
      G.rect(s.x - 7, s.y - 3, 14, 1, '#8a5a2b');
      G.rect(s.x - 5, s.y - 8, 10, 1, '#5e3a17');
      G.rect(s.x - 5, s.y - 6, 7, 1, '#5e3a17');
    }

    return {
      pausable: true,

      update(dt) {
        t += dt;
        st += dt;
        fx.update(dt);
        // ambiente: esporas flotantes y destellos de cristales
        if (Math.random() < dt * 7) fx.add({ type: 'firefly', x: cam.x + CR.rand(0, 320), y: cam.y + CR.rand(20, 190), vx: CR.rand(-3, 3), vy: -CR.rand(4, 10), wob: 8, wobF: CR.rand(1, 2.5), ph: Math.random() * 6, life: CR.rand(2.5, 4.5), color: CR.pick(['#5eead4', '#f0abfc', '#c4b5fd']) });
        if (Math.random() < dt * 5) {
          const sp = CR.pick(sparks);
          if (sp && sp.x > cam.x - 10 && sp.x < cam.x + 330 && sp.y > cam.y - 10 && sp.y < cam.y + 190) fx.add({ type: 'star', x: sp.x + CR.rand(-3, 3), y: sp.y + CR.rand(-3, 2), vy: -3, life: 0.6, color: '#ffffff' });
        }
        for (const g of guards) if (g.bubble) { g.bubble.t -= dt; if (g.bubble.t <= 0) g.bubble = null; }
        if (heroBubble) { heroBubble.t -= dt; if (heroBubble.t <= 0) heroBubble = null; }

        if (state === 'intro') {
          if (!introSaid && (st > 2.6 || (st > 0.6 && I.confirm()))) {
            introSaid = true;
            const col = CR.color(H);
            dlg.say([
              { who: '{heroe}', color: col, text: T.nivel2Intro[0] },
              { who: '{heroe}', color: col, text: T.nivel2Intro[1] },
              { who: 'TIP', color: '#5eead4', text: I.isTouch ? T.nivel2TipTouch : T.nivel2TipKeys },
            ], () => { state = 'play'; st = 0; });
          } else dlg.update(dt);
          for (const g of guards) updGuard(g, dt);
          updateCam(dt);
          return;
        }

        if (state === 'play') {
          if (I.hit('F9')) { quesos = NEED; p.x = door.x; p.y = door.y + 40; updateCam(dt, true); } // atajo de prueba
          joy.update();
          const ax = I.axis();
          let vx = ax.x, vy = ax.y;
          if (joy.active) { vx = joy.vx; vy = joy.vy; }
          const len = Math.hypot(vx, vy);
          if (len > 1) { vx /= len; vy /= len; }
          p.moving = len > 0.1;
          if (p.moving) {
            p.anim += dt;
            if (vx < -0.1) p.flip = true;
            else if (vx > 0.1) p.flip = false;
            stepT -= dt;
            if (stepT <= 0) { stepT = 0.28; if (!p.hidden) CR.audio.sfx.step(); }
            dustT -= dt;
            if (dustT <= 0 && !p.hidden) { dustT = 0.16; CR.dust(fx, p.x - (p.flip ? -5 : 5), p.y + 5, p.flip ? -1 : 1); }
          }
          moveP(vx * 54 * dt, vy * 54 * dt);
          p.hidden = tilePx(p.x, p.y + 2) === 'b';
          if (p.safe > 0) p.safe -= dt;

          for (const c of cheeses) {
            if (c.taken || Math.hypot(c.x - p.x, c.y - p.y) > 12) continue;
            c.taken = true;
            if (c.gold) {
              oro++;
              CR.audio.sfx.gold();
              fx.add({ type: 'text', text: '+1 VIDA', x: c.x, y: c.y - 10, vy: -14, life: 1.4, color: '#ffd23f' });
            } else {
              quesos++;
              CR.audio.sfx.nam();
              fx.add({ type: 'text', text: 'ÑAM', x: c.x, y: c.y - 10, vy: -14, life: 1, color: '#fff1a8' });
              if (quesos === NEED) heroBubble = { text: '¡Ya tengo los ' + NEED + ' quesos! Ahora, a la puerta.', t: 2.6 };
            }
            fx.burst(c.x, c.y, 12, { color: ['#ffd23f', '#fff1a8', '#ffffff'], max: 40 });
          }

          for (const f of flags) {
            if (f.on || Math.hypot(f.x - p.x, f.y - p.y) > 14) continue;
            flags.forEach((o) => { o.on = false; });
            f.on = true;
            cp = { x: f.x, y: f.y };
            CR.audio.sfx.checkpoint();
            fx.add({ type: 'text', text: T.puntoSeguro, x: f.x, y: f.y - 18, vy: -12, life: 1.4, color: '#5eead4' });
          }

          for (const g of guards) {
            updGuard(g, dt);
            if (state === 'play') detect(g, dt);
          }

          if (state === 'play') {
            if (doorMsgT > 0) doorMsgT -= dt;
            if (Math.hypot(door.x - p.x, door.y + 14 - p.y) < 18) {
              if (quesos >= NEED) {
                state = 'door';
                st = 0;
                CR.audio.sfx.door();
              } else if (doorMsgT <= 0) {
                doorMsgT = 4;
                heroBubble = { text: CR.fmt(T.puertaFaltan).replace('{faltan}', NEED - quesos), t: 2.8 };
              }
            }
          }
          nearSign = signs.find((s) => Math.hypot(s.x - p.x, s.y - p.y) < 22) || null;
        } else if (state === 'caught') {
          for (const g of guards) g.anim += dt;
          if (st > 1.1 && !respawned) black = Math.min(1, (st - 1.1) / 0.3);
          if (st > 1.45 && !respawned) {
            respawned = true;
            p.x = cp.x;
            p.y = cp.y;
            p.safe = 1.8;
            for (const g of guards) {
              g.sus = 0;
              g.peak = 0;
              if (g.mode === 'alert') { g.mode = g.look ? 'look' : 'pause'; g.timer = 1; }
            }
            updateCam(dt, true);
          }
          if (respawned) black = Math.max(0, 1 - (st - 1.45) / 0.35);
          if (st > 1.85) { state = 'play'; black = 0; }
        } else if (state === 'door') {
          door.open = Math.min(1, st / 1.0);
          for (const g of guards) updGuard(g, dt);
          if (st > 1.1) {
            p.y -= dt * 28;
            p.x += (door.x - p.x) * Math.min(1, dt * 6);
            p.moving = true;
            p.anim += dt;
            p.alpha = Math.max(0, 1 - (st - 1.5) * 1.5);
          }
          if (st > 2.3) {
            CR.state.quesos = quesos;
            CR.state.oro = oro;
            CR.save.set({ hero: H, level: 3, quesos, oro });
            CR.engine.go('recompensa', { n: 2, next: 'nivel3' });
          }
        }
        updateCam(dt);
      },

      draw(ctx) {
        const cx = Math.round(cam.x), cy = Math.round(cam.y);
        ctx.save();
        ctx.translate(-cx, -cy);
        ctx0 = ctx;
        ctx.drawImage(base, 0, 0);
        drawDoor();
        // cohete estacionado donde aterrizaste
        CR.drawRocket(ctx, start.x + 30, start.y + 2, t, { flame: false });

        for (const f of flags) drawFlag(f);
        for (const s of signs) drawSign(s);
        for (const c of cheeses) {
          if (c.taken) continue;
          const bob = Math.round(Math.sin(t * 3 + c.ph) * 1.5);
          CR.glow(ctx, c.x, c.y, c.gold ? 11 : 8, c.gold ? '#fff1a8' : '#ffd23f', 0.14 + 0.05 * Math.sin(t * 5 + c.ph));
          ctx.globalAlpha = 0.4;
          G.ellipse(c.x, c.y + 6, 4, 1, '#000000');
          ctx.globalAlpha = 1;
          CR.drawSprite(ctx, c.gold ? CR.SPR.gold : CR.SPR.cheese, c.x - 5, c.y - 5 + bob);
          if (c.gold && Math.floor(t * 3 + c.ph) % 3 === 0) {
            G.rect(c.x + 5, c.y - 8, 1, 3, '#ffffff');
            G.rect(c.x + 4, c.y - 7, 3, 1, '#ffffff');
          }
        }

        for (const g of guards) drawCone(ctx, g);
        for (const g of guards) {
          ctx.globalAlpha = 0.4;
          G.ellipse(g.x, g.y + 6, 7, 1, '#000000');
          ctx.globalAlpha = 1;
          CR.drawGuard(ctx, g.x, g.y + 6, { frame: g.mode === 'walk' ? Math.floor(g.anim * 6) % 2 : 0, sleep: g.mode === 'yawn', flip: Math.cos(g.dir) < 0 });
          const jump = Math.round(Math.abs(Math.sin(t * 10)) * 2);
          if (g.mode === 'alert') G.text('!', g.x, g.y - 26 - jump, { size: 8, align: 'center', color: '#ff4d6d', outline: '#3a0010' });
          else if (g.sus > 0) G.text('?', g.x, g.y - 26 - jump, { size: 8, align: 'center', color: '#ffb347', outline: '#3a1a00' });
        }

        // jugador
        if (!(p.safe > 0 && Math.floor(p.safe * 10) % 2 === 0)) {
          ctx.globalAlpha = 0.4;
          G.ellipse(p.x, p.y + 5, 6, 1, '#000000');
          ctx.globalAlpha = 1;
          const frame = p.moving ? Math.floor(p.anim * 8) % 2 : 0;
          const tip = p.hidden && p.moving ? -Math.round(Math.abs(Math.sin(p.anim * 10))) : p.moving ? 0 : -(Math.floor(t * 1.6) % 2);
          const eye = state === 'caught' && !respawned ? 'closed' : CR.blink(t, 3);
          CR.drawRat(ctx, H, p.x, p.y + 5 + tip, { frame, flip: p.flip, eye, alpha: p.alpha * (p.hidden ? 0.75 : 1) });
          if (state === 'caught' && !respawned) G.text('!', p.x, p.y - 24, { size: 8, align: 'center', color: '#ffd23f', outline: '#3a1a00' });
        }

        ctx.drawImage(over, 0, 0);

        // pista hacia la puerta cuando ya tienes los quesos
        if (quesos >= NEED && state === 'play') {
          const a = Math.atan2(door.y + 14 - p.y, door.x - p.x);
          for (let i = 0; i < 3; i++) {
            const r = 14 + i * 4 + (Math.floor(t * 6) % 3) * 0;
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6 - i);
            G.rect(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 2, 2, '#5eead4');
          }
          ctx.globalAlpha = 1;
        }
        fx.draw(ctx);
        ctx.restore();

        for (const g of guards) {
          const sx = g.x - cx, sy = g.y - cy;
          if (g.bubble && sx > -8 && sx < 328 && sy > 0 && sy < 190) G.bubble(g.bubble.text, sx, sy - 14, { color: '#7a1530' });
        }
        if (heroBubble) G.bubble(heroBubble.text, p.x - cx, p.y - cy - 10, { color: '#1d4a7a', maxW: 132 });
        if (nearSign && state === 'play' && !heroBubble) G.bubble(nearSign.text, nearSign.x - cx, nearSign.y - cy - 10, { maxW: 132, color: '#3b2a10', fill: '#ffe9c2' });

        // HUD
        G.box(4, 4, 64, 15, { fill: 'rgba(18,8,38,0.85)', border: quesos >= NEED ? '#5eead4' : '#ffd23f' });
        CR.drawSprite(ctx, CR.SPR.cheese, 7, 7);
        G.text(quesos + '/' + NEED, 21, 8, { size: 8, color: quesos >= NEED ? '#5eead4' : '#ffd23f' });
        if (oro > 0) {
          G.box(70, 4, 34, 15, { fill: 'rgba(18,8,38,0.85)', border: '#ff4d6d' });
          CR.drawSprite(ctx, CR.SPR.heart, 74, 8);
          G.text('+' + oro, 83, 8, { size: 8, color: '#ffc2d1' });
        }
        if (p.hidden && state === 'play') G.text('ESCONDID' + SUF.toUpperCase(), 160, 8, { size: 6, align: 'center', color: '#5eead4', outline: '#062a26' });
        if (quesos >= NEED && state === 'play' && Math.floor(t * 2) % 2) G.text('¡A LA PUERTA!', 160, 18, { size: 6, align: 'center', color: '#5eead4', outline: '#062a26' });

        if (state === 'play') joy.draw(ctx);

        if (black > 0) {
          ctx.globalAlpha = black;
          G.rect(0, 0, 320, 180, '#07040f');
          ctx.globalAlpha = 1;
        }

        if (state === 'intro' && !introSaid) {
          const a = Math.min(1, st * 2.5);
          ctx.globalAlpha = a;
          G.box(60, 56, 200, 56, { fill: 'rgba(18,8,38,0.9)', border: '#5eead4' });
          G.text('NIVEL 2', 160, 64, { size: 16, align: 'center', color: '#ffd23f' });
          G.text(T.nivel2Titulo, 160, 88, { size: 8, align: 'center', color: '#5eead4' });
          ctx.globalAlpha = 1;
        }
        dlg.draw();
      },
    };
  });
})();
