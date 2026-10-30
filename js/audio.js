/* =====================================================================
   COSMORAT - SONIDO
   Efectos y música chiptune generados con Web Audio (sin archivos).
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR;
  const A = (CR.audio = {});

  let ac = null, master = null, sfxG = null, musG = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('cosmorat_mute') === '1'; } catch (e) { /* nada */ }
  A.isMuted = () => muted;

  let pendingMusic = null;

  A.unlock = function () {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = new AC();
        master = ac.createGain();
        master.gain.value = muted ? 0 : 0.8;
        master.connect(ac.destination);
        sfxG = ac.createGain(); sfxG.gain.value = 0.9; sfxG.connect(master);
        musG = ac.createGain(); musG.gain.value = 0.55; musG.connect(master);
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        if (pendingMusic) { const m = pendingMusic; pendingMusic = null; A.music(m); }
      }
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { /* sin audio */ }
  };

  A.toggleMute = function () {
    muted = !muted;
    try { localStorage.setItem('cosmorat_mute', muted ? '1' : '0'); } catch (e) { /* nada */ }
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ac.currentTime, 0.02);
    return muted;
  };

  function tone(freq, dur, o) {
    if (!ac) return;
    o = o || {};
    const t0 = o.at != null ? o.at : ac.currentTime + (o.delay || 0);
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t0 + dur);
    const v = o.vol == null ? 0.12 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(o.dest || sfxG);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function noise(dur, o) {
    if (!ac) return;
    o = o || {};
    const t0 = ac.currentTime + (o.delay || 0);
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = o.ftype || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 1200, t0);
    if (o.fslide) f.frequency.exponentialRampToValueAtTime(o.fslide, t0 + dur);
    const g = ac.createGain();
    const v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(sfxG);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  const arp = (notes, step, o) => notes.forEach((n, i) => tone(n, step * 1.4, Object.assign({}, o, { delay: i * step })));

  A.sfx = {
    blip: () => tone(1250, 0.025, { vol: 0.025 }),
    select: () => { tone(660, 0.06, { vol: 0.08 }); tone(990, 0.08, { delay: 0.05, vol: 0.08 }); },
    confirm: () => arp([523, 659, 784, 1047], 0.06, { vol: 0.09 }),
    fanfare: () => arp([523, 659, 784, 1047, 784, 1047, 1319], 0.08, { vol: 0.09 }),
    squeak: () => { tone(1800, 0.08, { type: 'sine', slide: 2600, vol: 0.1 }); tone(2200, 0.07, { delay: 0.08, type: 'sine', slide: 3000, vol: 0.08 }); },
    nam: () => { tone(520, 0.05, { vol: 0.09 }); tone(820, 0.08, { delay: 0.06, vol: 0.09 }); },
    gold: () => arp([988, 1319, 1568, 1976], 0.05, { type: 'triangle', vol: 0.12 }),
    turbo: () => tone(380, 0.3, { slide: 1400, vol: 0.08 }),
    hit: () => { noise(0.25, { freq: 900, vol: 0.3 }); tone(180, 0.25, { type: 'sawtooth', slide: 60, vol: 0.12 }); },
    meow: () => { tone(720, 0.22, { type: 'sawtooth', slide: 980, vol: 0.06 }); tone(980, 0.3, { delay: 0.2, type: 'sawtooth', slide: 560, vol: 0.06 }); },
    alert: () => { tone(880, 0.07, { vol: 0.1 }); tone(1175, 0.1, { delay: 0.08, vol: 0.1 }); },
    shoot: () => tone(900, 0.05, { type: 'triangle', slide: 420, vol: 0.05 }),
    throw: () => tone(300, 0.12, { type: 'triangle', slide: 160, vol: 0.08 }),
    bossHit: () => { noise(0.07, { freq: 3000, vol: 0.12 }); tone(300, 0.08, { slide: 150, vol: 0.06 }); },
    laserWarn: () => { tone(440, 0.08, { vol: 0.05 }); tone(440, 0.08, { delay: 0.16, vol: 0.05 }); },
    laser: () => { noise(0.35, { freq: 2500, ftype: 'bandpass', vol: 0.2 }); tone(120, 0.35, { type: 'sawtooth', vol: 0.08 }); },
    rumble: () => noise(1.6, { freq: 180, vol: 0.45 }),
    whoosh: () => noise(0.7, { freq: 400, fslide: 3200, ftype: 'bandpass', vol: 0.3 }),
    boom: () => { noise(1.1, { freq: 700, fslide: 80, vol: 0.5 }); tone(90, 0.8, { type: 'sawtooth', slide: 40, vol: 0.12 }); },
    sparkle: () => arp([1319, 1568, 1976, 2637, 1976, 2637, 3136], 0.07, { type: 'sine', vol: 0.06 }),
    kiss: () => { tone(1568, 0.1, { type: 'sine', vol: 0.12 }); tone(2093, 0.25, { delay: 0.1, type: 'sine', vol: 0.1 }); },
    door: () => { tone(200, 0.6, { type: 'sawtooth', slide: 600, vol: 0.07 }); noise(0.6, { freq: 600, vol: 0.12 }); },
    checkpoint: () => arp([784, 988, 1175], 0.07, { type: 'triangle', vol: 0.1 }),
    sad: () => { tone(392, 0.5, { type: 'triangle', slide: 330, vol: 0.12 }); tone(330, 0.7, { delay: 0.45, type: 'triangle', slide: 262, vol: 0.12 }); },
    step: () => tone(160, 0.04, { type: 'triangle', vol: 0.05 }),
  };

  /* ---------------- Música ---------------- */
  const TRACKS = {
    menu: {
      bpm: 96,
      lead: 'E5 - G5 - C6 - B5 A5 G5 - E5 - D5 - C5 - E5 - G5 - A5 - G5 E5 D5 - C5 - D5 - - -',
      bass: 'C3 - - - G2 - - - A2 - - - F2 - - - C3 - - - G2 - - - F2 - - - G2 - - -',
    },
    chase: {
      bpm: 150,
      lead: 'A4 C5 E5 A5 G5 E5 C5 E5 F4 A4 C5 F5 E5 C5 A4 C5 G4 B4 D5 G5 F5 D5 B4 D5 E4 G#4 B4 E5 D5 B4 G#4 B4',
      bass: 'A2 - A2 - A3 - A2 - F2 - F2 - F3 - F2 - G2 - G2 - G3 - G2 - E2 - E2 - E3 - E2 -',
    },
    sneak: {
      bpm: 120, leadType: 'triangle',
      lead: 'E4 - - G4 - - A4 - - - B4 - A4 - G4 - E4 - - G4 - - A4 - - - D5 - B4 - - -',
      bass: 'E2 - B2 - E2 - B2 - C2 - G2 - C2 - G2 - E2 - B2 - E2 - B2 - D2 - A2 - B2 - - -',
    },
    boss: {
      bpm: 168,
      lead: 'E5 E5 - E5 G5 - E5 - D5 D5 - D5 F5 - D5 - C5 C5 - C5 E5 - C5 - B4 - D#5 - F#5 - B5 -',
      bass: 'E2 E3 E2 E3 E2 E3 E2 E3 D2 D3 D2 D3 D2 D3 D2 D3 C2 C3 C2 C3 C2 C3 C2 C3 B1 B2 B1 B2 B1 B2 B1 B2',
    },
    final: {
      bpm: 84, leadType: 'triangle',
      lead: 'C5 - E5 - G5 - E5 - F5 - A5 - C6 - A5 - G5 - E5 - D5 - G5 - E5 - - - C5 - - -',
      bass: 'C3 - - - G2 - - - F2 - - - A2 - - - G2 - - - B2 - - - C3 - - - - - - -',
    },
  };

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function parse(str) {
    return str.split(/\s+/).map((tk) => {
      const m = /^([A-G])(#?)(\d)$/.exec(tk);
      if (!m) return 0;
      const midi = 12 * (parseInt(m[3], 10) + 1) + NOTE[m[1]] + (m[2] ? 1 : 0);
      return 440 * Math.pow(2, (midi - 69) / 12);
    });
  }

  let cur = null, step = 0, nextT = 0, timer = null;

  A.music = function (name) {
    if (!name) return A.stopMusic();
    if (!ac) { pendingMusic = name; return; }
    if (cur && cur.name === name) return;
    A.stopMusic();
    const tr = TRACKS[name];
    if (!tr) return;
    cur = { name, bpm: tr.bpm, lead: parse(tr.lead), bass: parse(tr.bass), leadType: tr.leadType || 'square' };
    step = 0;
    nextT = ac.currentTime + 0.05;
    timer = setInterval(schedule, 30);
  };

  A.stopMusic = function () {
    pendingMusic = null;
    if (timer) clearInterval(timer);
    timer = null;
    cur = null;
  };

  function schedule() {
    if (!cur || !ac) return;
    const sd = 60 / cur.bpm / 2;
    if (nextT < ac.currentTime - 0.2) nextT = ac.currentTime + 0.02;
    while (nextT < ac.currentTime + 0.15) {
      const l = cur.lead[step % cur.lead.length], b = cur.bass[step % cur.bass.length];
      if (l) tone(l, sd * 0.9, { at: nextT, type: cur.leadType, vol: cur.leadType === 'square' ? 0.04 : 0.08, dest: musG });
      if (b) tone(b, sd * 1.6, { at: nextT, type: 'triangle', vol: 0.11, dest: musG });
      step++;
      nextT += sd;
    }
  }
})();
