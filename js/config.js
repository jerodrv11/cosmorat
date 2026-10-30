/* =====================================================================
   COSMORAT - CONFIGURACIÓN
   Aquí puedes cambiar frases, nombres, colores y dificultad
   sin tocar la lógica del juego.
   - {heroe}     se reemplaza por el nombre de la rata que juega
   - {capturado} se reemplaza por el nombre de la rata secuestrada
   - {quesos}    se reemplaza por los quesos necesarios del nivel 2
   ===================================================================== */
window.CR = window.CR || {};

CR.CONFIG = {
  titulo: 'COSMORAT',
  subtitulo: 'UNA AVENTURA ESPACIAL',
  fechaInicio: '30/07/2026',
  fecha: '30/10/2026',
  aniversario: '3 MESES',
  creditos: 'Un juego hecho por Jero, para Colin',

  quesosNecesarios: 5,

  personajes: {
    jero: {
      nombre: 'Jero',
      sufijo: 'o', // escondido / escondida
      rata: {
        tipoAccesorio: 'bufanda',
        pelo: '#9b9bab', sombra: '#6c6c7e', panza: '#c9c9d6', rosa: '#f4a3b8',
        accesorio: '#3b82f6', accesorioSombra: '#1e4fa8',
      },
      humano: {
        pelo: '#6b4226', peloSombra: '#4a2c18',
        piel: '#f1c7a3', pielSombra: '#d9a07c',
        ropa: '#3b82f6', ropaSombra: '#1e4fa8',
        pantalon: '#2a2f4a', zapatos: '#1a1a24',
      },
    },
    yazeth: {
      nombre: 'Colin',
      sufijo: 'a',
      rata: {
        tipoAccesorio: 'moño',
        pelo: '#f5f2ec', sombra: '#cfc6da', panza: '#ffffff', rosa: '#ffa3c4',
        accesorio: '#ff5fa2', accesorioSombra: '#c23a7a',
      },
      humano: {
        pelo: '#b98a5a', peloSombra: '#8f6538',
        piel: '#f3cdb0', pielSombra: '#dcaa88',
        ropa: '#f6e7d0', ropaSombra: '#f2a7c3',
        pantalon: '#f3cdb0', zapatos: '#ff5fa2',
      },
    },
  },

  // 1 = normal. Más alto = más difícil.
  dificultad: {
    velocidadPersecucion: 1 / 62, // fracción de distancia por segundo (62 s sin chocar)
    asteroides: 1,                // >1 = menos asteroides
    penalizacionChoque: 0.03,     // distancia que se pierde al chocar
    jefe: 1,                      // velocidad de ataques del Gato Comandante
    vidasJefe: 5,                 // corazones base en el nivel 3 (+1 por queso dorado)
    ritmo: 0.8,                   // velocidad de cinemáticas y final (1 = original, menor = más lento)
  },

  // Mensajes que se desbloquean al terminar cada nivel
  frases: {
    nivel1: 'Desde el 30 de julio aprendí que ninguna distancia es demasiado grande cuando al final del camino estás tú. Cruzaría galaxias enteras solo para volver a encontrarte.',
    nivel2: 'Contigo entendí que lo más valioso casi nunca hace ruido: está en tu risa, en tu calma y en la forma en que todo se acomoda cuando estás cerca.',
  },

  // Premios al terminar cada nivel
  premios: {
    // Nivel 1: carta con sello (usa frases.nivel1)
    firmaCarta: '- Jero',
    // Nivel 2: foto que se descubre rascando (usa frases.nivel2)
    foto: 'img/foto-nivel2.jpg',
    pieFoto: 'Tú y yo',
    // Nivel 3: vale canjeable en la vida real
    vale: {
      titulo: 'VALE POR',
      premio: 'UNA CITA ROMÁNTICA',
      detalles: ['Lugar: sorpresa', 'Fecha: tú eliges', 'Incluye: abrazos ilimitados'],
      nota: 'Canjeable con Jero. No caduca nunca.',
      numero: '0001',
    },
  },

  // Mensaje final (cada elemento es una página)
  mensajeFinal: [
    'Ningún hechizo, ningún imperio y ningún gato del universo podría separarme de ti.',
    'Hoy cumplimos tres meses. Parece poco tiempo, pero ha sido suficiente para saber que quiero seguir eligiéndote todos los días.',
    'Gracias por tu cariño, por tu paciencia y por hacer especial hasta lo más cotidiano. Eres mi rata favorita en toda la galaxia. Feliz aniversario. Te quiero. - Jero',
  ],

  textos: {
    inicioElige: 'ELIGE TU RATA',
    inicioIdle: ['*bostezo*', '*se rasca la oreja*', 'zzz...', '*olfatea*'],

    // ---- Cinemática de inicio ----
    prologo: ['En un rincón tranquilo de la galaxia...', 'vivían dos ratitas que se querían muchísimo.'],
    compartir: [
      ['{heroe}', 'Mitad para ti, mitad para mí.'],
      ['{capturado}', 'Como todo lo nuestro.'],
    ],
    estrella: [
      ['{capturado}', '¡Mira! ¡Una estrella fugaz!'],
      ['{heroe}', 'Rápido, cierra los ojos y pide un deseo.'],
    ],
    deseo: [
      ['{heroe}', '¿Qué pediste?'],
      ['{capturado}', 'Que nada nos separe nunca.'],
    ],
    noEsEstrella: '¿Esa estrella... viene hacia acá?',
    capturaGato: '¡JAJAJA, MIAU! ¡Este roedor ahora es del Imperio Gatuno!',
    capturaHeroe: [
      '¡Se llevaron a {capturado}!',
      'Prometimos que nada nos separaría...',
      'Tengo que alcanzar esa nave. ¡Aguanta, ya voy por ti!',
    ],
    despegue: '¡DESPEGUE!',

    // ---- Regreso a casa ----
    regresoTitulo: 'DE REGRESO A CASA',
    regresoJefe: '¡Esto no se queda así! ¡Miaaau!',
    regreso: [
      ['{capturado}', 'Viniste por mí...'],
      ['{heroe}', 'Siempre voy a ir por ti.'],
      ['{capturado}', 'Entonces vamos a casa.'],
    ],

    // ---- Final ----
    finalMitad: [
      ['{heroe}', 'Te guardé tu mitad.'],
      ['{capturado}', '¡La rescataste también!'],
      ['{capturado}', 'Gracias por no rendirte.'],
      ['{heroe}', 'Por ti cruzaría la galaxia las veces que haga falta.'],
    ],

    nivel1Titulo: 'LA PERSECUCIÓN',
    nave: [
      '¡Nunca nos alcanzarás, roedor!',
      '¡Este ratón ya es nuestro!',
      '¡Miau-ja-ja! ¡Acelera, piloto!',
      '¿Todavía nos sigue esa rata?',
    ],
    capturadoCasi: '¡{heroe}! ¡Ya casi!',
    naveAlcanzada: '¡¿QUÉ?! ¡Nos alcanzó!',

    nivel2Titulo: 'EL PLANETA GATUNO',
    nivel2Intro: [
      'El Planeta Gatuno... La base del Comandante está al norte.',
      'Necesito juntar {quesos} quesos para enfrentarlo. Y que los guardias no me vean.',
    ],
    nivel2TipTouch: 'Muévete con el joystick (lado izquierdo). Dentro de los arbustos nadie te ve.',
    nivel2TipKeys: 'Muévete con las flechas o WASD. Dentro de los arbustos nadie te ve.',
    guardiaVe: ['¿Eh? ¿¡Una rata!?', '¡Alto ahí, roedor!', '¡Miau! ¡Te vi!'],
    guardiaPierde: ['Mmm... habrá sido el viento.', 'Juraría que vi algo...', 'Necesito otra siesta.'],
    guardiaBostezo: ['*bostezo*', 'Zzz...', '*se lame la pata*'],
    // En orden: cartel del centro, cartel junto a la puerta, cartel cerca del inicio
    carteles: [
      'IMPERIO GATUNO: SIESTA OBLIGATORIA A LAS 3 PM',
      'BASE DEL COMANDANTE. NO TOCAR LA PUERTA (SÍ, TÚ)',
      'PROHIBIDAS LAS RATAS',
    ],
    puntoSeguro: 'PUNTO SEGURO',
    puertaFaltan: 'Me faltan {faltan} quesos... los necesitaré contra el Comandante.',

    nivel3Titulo: 'EL GATO COMANDANTE',
    jefeNombre: 'GATO COMANDANTE',
    jefeIntro: [
      '¿Viniste por tu ratoncito? Qué tierno... y qué inútil.',
      '¡Devuélveme a {capturado}!',
      '¡{heroe}! ¡Viniste por mí!',
      '¡Guardias! ...Ah, cierto, están dormidos. Lo haré yo mismo.',
    ],
    jefeFases: ['¡Imposible! ¡Esto es personal!', '¡Mi bigote no! ¡MI CORONA!'],
    jefeDerrota: '¡Me las pagarás, miaaau!',
    jefeReintento: '¡Casi! Respira y vuelve a intentarlo.',
    capturadoAnima: ['¡Tú puedes, {heroe}!', '¡Dale con todo!', '¡Eso!'],
    capturadoLlora: ['snif...', 'snif... snif...'],

    finalUps: '¡Ups!',
    // Créditos que suben al final (líneas vacías = espacio)
    creditosLista: [
      'COSMORAT', '',
      'PROTAGONISTAS', 'Jero, la rata gris de la bufanda', 'Colin, la rata blanca del moño', '',
      'VILLANO', 'Gato Comandante', '',
      'GUARDIAS', 'Gatos naranjas (casi siempre dormidos)', '',
      'QUESOS', 'Ninguno resultó herido... casi', '',
      'HECHO CON MUCHO AMOR POR', 'Jero', '',
      'PARA', 'Colin', '',
      '30/10/2026', '3 MESES JUNTOS',
    ],
    // Escena post-créditos
    postIntro: 'Mientras tanto, en el Planeta Gatuno...',
    postSuspiro: 'Snif... nadie me quiere.',
    post: [
      ['GUARDIA', 'Jefe... ¿quiere queso?'],
      ['GATO COMANDANTE', '...¿Es para mí?'],
      ['GUARDIA', 'Los amigos comparten.'],
      ['GATO COMANDANTE', 'Snif... ¡gracias!'],
    ],
    finalGato: 'snif... qué bonito...',
    continuar: 'Toca para continuar',
  },
};
