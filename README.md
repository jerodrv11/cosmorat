# COSMORAT

Minijuego pixel art de 3 niveles hecho con HTML, CSS y JavaScript puro (sin librerías).
Funciona en compu (teclado o mouse) y en iPad (pantalla táctil, en horizontal).

## Cómo abrirlo en VS Code

1. Descomprime el ZIP.
2. En VS Code: **Archivo → Abrir carpeta…** y elige la carpeta `cosmorat`.
3. Instala la extensión **Live Server** (de Ritwick Dey) si no la tienes.
4. Clic derecho sobre `index.html` → **Open with Live Server**.
5. Se abre en tu navegador. Cada vez que guardes un archivo, se recarga solo.

> Abrir `index.html` con doble clic también suele funcionar, pero con Live Server
> es más confiable (sobre todo la fuente pixel).

## Estructura

```
cosmorat/
├── index.html            ← página principal
├── css/style.css         ← estilos (pantalla completa, aviso de girar iPad)
├── fonts/                ← fuente pixel "Press Start 2P" (licencia OFL)
├── img/foto-nivel2.jpg   ← la foto que se descubre rascando en el nivel 2
└── js/
    ├── config.js         ← FRASES, NOMBRES, COLORES Y DIFICULTAD  ← edita aquí
    ├── engine.js         ← motor: escalado, escenas, textos, diálogos, partículas
    ├── input.js          ← teclado, mouse, toques y joystick virtual
    ├── audio.js          ← efectos y música chiptune (generados, sin archivos)
    ├── sprites.js        ← pintor de pixel art: sombreado, tramado y contornos (personajes, naves)
    ├── fondos.js         ← fondos pintados: nebulosas, planeta, salón del trono, mapa del nivel 2
    ├── main.js           ← arranque
    └── scenes/
        ├── inicio.js     ← pantalla de inicio y selección de rata
        ├── captura.js    ← cinemática de inicio (prólogo, deseo y secuestro)
        ├── nivel1.js     ← La Persecución
        ├── recompensa.js ← premios: carta con sello, foto para rascar, vale por cita; menú RECUERDOS
        ├── nivel2.js     ← Infiltración en el Planeta Gatuno
        ├── nivel3.js     ← Gato Comandante (jefe final)
        ├── regreso.js    ← viaje de regreso a casa
        ├── final.js      ← corazón de queso, beso, constelación, mensaje y créditos
        └── postcreditos.js ← escena después de los créditos
```

## Qué puedes cambiar fácil (js/config.js)

- `frases.nivel1` y `frases.nivel2`: mensajes que se desbloquean.
- `mensajeFinal`: las páginas del mensaje del final.
- `premios`: firma de la carta, ruta y pie de la foto, y el texto del vale (premio, detalles, nota).
  Para cambiar la foto, reemplaza `img/foto-nivel2.jpg` (vertical 3:4 se ve mejor).
- `textos`: todo lo que dicen los personajes y los gatos, incluidos los diálogos de las cinemáticas y la lista de créditos (`creditosLista`).
- `personajes`: nombres y colores de las ratas y de la versión humana.
- `dificultad`: velocidad de la persecución, asteroides, vidas del jefe, etc.

## Controles

| | Compu | iPad |
|---|---|---|
| Menú | ← → y ENTER, o clic | Tocar |
| Nivel 1 | Flechas / WASD | Arrastrar el dedo |
| Nivel 2 | Flechas / WASD | Joystick (lado izquierdo) |
| Nivel 3 | Flechas / WASD (dispara solo) | Arrastrar el dedo |
| Diálogos | ENTER / ESPACIO | Tocar |
| Pausa / sonido | P / M | Botones arriba a la derecha |

## Atajos para probar

- Agrega `#captura`, `#nivel1`, `#nivel2`, `#nivel3`, `#regreso`, `#final` o `#postcreditos` (o `#premio1`, `#premio2`, `#premio3`, `#recuerdos`) al final de la dirección para
  saltar directo a esa parte (ej. `http://127.0.0.1:5500/#nivel2`).
- Dentro de un nivel, **F9** te deja casi al final de ese nivel (solo teclado).

El juego guarda en qué nivel vas; si se cierra la página, en el inicio aparece
"SEGUIR NIVEL N".

## Publicarlo en Netlify

Arrastra la carpeta `cosmorat` completa a https://app.netlify.com/drop
(o súbela como subcarpeta de jeroycolin.space y enlázala).
