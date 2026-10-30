/* =====================================================================
   COSMORAT - ARRANQUE
   Truco para probar: agrega #captura, #nivel1, #nivel2, #nivel3, #regreso,
   #final o #postcreditos al
   final de la dirección (ej. http://127.0.0.1:5500/#nivel2).
   ===================================================================== */
(function () {
  'use strict';
  const CR = window.CR;

  async function boot() {
    CR.engine.init(document.getElementById('game'));
    try {
      await Promise.race([
        document.fonts.load('8px "Press Start 2P"'),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch (e) { /* seguimos con la fuente de respaldo */ }
    CR.buildSprites();
    // foto del premio del nivel 2
    await new Promise((res) => {
      const im = new Image();
      im.onload = () => { CR.photo = im; res(); };
      im.onerror = () => { CR.photo = null; res(); };
      im.src = CR.CONFIG.premios.foto;
      setTimeout(res, 4000);
    });
    document.getElementById('loading').style.display = 'none';

    const jump = (location.hash || '').replace('#', '');
    const tests = ['captura', 'nivel1', 'nivel2', 'nivel3', 'regreso', 'final', 'postcreditos'];
    const prem = /^premio([123])$/.exec(jump);
    if (prem) {
      CR.engine.start('recompensa', { n: +prem[1], next: 'inicio' });
    } else if (jump === 'recuerdos') {
      CR.engine.start('recuerdos');
    } else if (tests.includes(jump)) {
      CR.state.hero = 'yazeth';
      CR.state.captured = 'jero';
      CR.state.quesos = 5;
      CR.state.oro = 1;
      CR.engine.start(jump);
    } else {
      CR.engine.start('inicio');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
