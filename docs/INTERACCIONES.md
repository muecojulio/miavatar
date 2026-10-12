# Sistema de interacción de miavatar

Un conjunto reutilizable de comportamientos —pulsación, pestañas, carriles, carruseles,
deslizamiento para revelar acciones, selector con búsqueda, interruptores y paneles
plegables— construido **encima de lo que ya existía** (los componentes de
`src/components/ui.tsx`, los tokens de `src/styles.css` y las primitivas de Radix que la
plantilla ya tenía instaladas). No se añadió ninguna dependencia nueva de interfaz.

## 1. Dónde vive cada cosa

| Necesidad | Pieza | Archivo |
| --- | --- | --- |
| Tokens, sombras, curvas, utilidades, animaciones | sistema visual | `src/styles.css` |
| Botones, campos, interruptor, deslizador, avisos, chips, muestras, fotos | primitivas | `src/components/ui.tsx` |
| Pestañas accesibles con indicador deslizante y panel animado | `TabBar` / `TabPanel` | `src/components/tabs.tsx` |
| Carril horizontal con señales de desbordamiento | `Rail` | `src/components/rail.tsx` |
| Deslizar para revelar acciones + alternativa explícita | `SwipeRow` | `src/components/swipe-row.tsx` |
| Selector con búsqueda (combobox + listbox) | `Combobox` | `src/components/combobox.tsx` |
| Escenario del avatar y estados vacíos ilustrados | `Stage` / `EmptyStage` | `src/components/stage.tsx` |
| Avisos breves | `AppToaster` / `ActionToasts` | `src/components/toaster.tsx` |
| Progreso real de los modelos + consejos rotatorios | `VisionBadge` / `TipsTicker` | `src/components/tips.tsx` |
| Fondo vivo (malla de luz + grano) | `Decor` | `src/components/decor.tsx` |
| Detección de desbordamiento | `useOverflow` | `src/lib/use-overflow.ts` |
| Gestos con bloqueo de eje | `useHorizontalSwipe` | `src/lib/use-gesture.ts` |
| Movimiento reducido | `useReducedMotion` | `src/lib/motion.ts` |

## 2. Botones y microinteracciones

- Objetivo táctil: `min-h-11` (44 px) en botones, pestañas, chips, `⋯` de las tarjetas y
  controles de carril; el deslizador mide 44 px de alto con un pulgar de 24 px.
- **Estado inactivo**: apariencia y etiqueta normales.
- **Pulsación**: `.tap` aplica `scale(0.965) translateY(1px)` y reduce la sombra en 140 ms.
- **Hover** (sólo `(hover: hover) and (pointer: fine)`): elevación de 2 px y realce dorado.
  Ningún control depende del hover para parecer interactivo.
- **Cargando**: `status="loading"` bloquea el botón (`disabled` + `aria-busy`) e intercambia el
  icono por un giro; el estado viene de `statusFor(action, kind)` en el store, así que no se
  puede enviar dos veces la misma acción.
- **Éxito**: icono de check con `pop` y texto "Guardado".
- **Error**: icono de triángulo, mensaje con `role="alert"` y sin apoyarse sólo en el color.
- **Deshabilitado**: opacidad reducida, `cursor-not-allowed` y sin respuesta de activación.
- Estados con texto para tecnologías de asistencia: `role="status"`/`aria-live` en los avisos y
  `statusLabel` en los botones.
- `touch-action: manipulation` en botones, enlaces y etiquetas de archivo.

## 3. Pestañas y cambio de sección

- `TabBar` usa la semántica completa de `tablist`: `role="tab"`, `aria-selected`,
  `aria-controls`, foco móvil y `role="tabpanel"` con `aria-labelledby`.
- Teclado: ←/→ (y ↑/↓) recorren, Inicio/Fin saltan a los extremos; el foco sigue a la pestaña
  activa.
- El indicador es una píldora que se mide del botón activo y se anima con `translateX` y
  `width` (320 ms, curva con rebote suave). La selección también se distingue por icono
  agrandado y peso tipográfico, no sólo por color.
- Si no caben, el carril se desplaza de forma nativa, la pestaña activa se centra al cambiar y
  aparecen bordes difuminados y una pista "Desliza" **sólo** mientras hay contenido fuera de
  vista y el usuario no ha movido el carril.
- En pantallas táctiles se puede cambiar de sección con un deslizamiento horizontal sobre el
  panel (umbral 76 px o velocidad > 0.5 px/ms, con bloqueo de eje 1.2). Las pestañas siguen
  siendo la vía principal.
- El gesto nunca empieza a contar si nace sobre un control (`use-gesture.ts`), y el clic
  posterior a un arrastre se descarta.
- Los paneles entran con un desplazamiento corto y fundido de 180–250 ms
  (`.panel-enter`/`.panel-enter-back`), y al cambiar de pestaña la página vuelve arriba con
  desplazamiento suave (inmediato con movimiento reducido).

## 4. Carriles, chips y filtros

- Desplazamiento **nativo** (`overflow-x: auto`, momentum del sistema) con `scroll-snap`
  moderado (`proximity` para opciones, `mandatory` en el carrusel de tarjetas).
- La barra se oculta sólo visualmente (`no-scrollbar`), nunca la capacidad de desplazarse.
- `useOverflow` mide `scrollLeft`, `scrollWidth` y `clientWidth` (con `ResizeObserver` y
  `MutationObserver`) y decide si hay contenido a la izquierda, a la derecha o en ambos lados.
- Al cambiar la selección, `Rail` centra el elemento marcado con `data-active="true"`; con
  movimiento reducido el desplazamiento es inmediato.
- Chips y filtros: estado activo con relleno dorado + check + `aria-checked` (radiogroup) o
  `aria-pressed`, foco visible conservado y uso sin gestos.
- Desplazarse por un carril no activa nada: la selección sólo ocurre en `click`, que además se
  descarta si hubo arrastre.
- Cada grupo tiene nombre accesible ("Filtros de pruebas guardadas", "Color de tinte",
  "Peinados de referencia", "Índice de la política de privacidad", …).

## 5. Tarjetas, cuadros y carruseles

- Favoritos en móvil es un carrusel horizontal (`.carousel-track`) con la siguiente tarjeta
  asomando (`grid-auto-columns: minmax(76%, 1fr)`), imán por tarjeta y botones ←/→ visibles.
- A partir de 1024 px cambia a cuadrícula (`repeat(auto-fill, minmax(17rem, 1fr))`) y
  desaparece el desplazamiento horizontal: no hay scroll global en ningún caso.
- Tarjeta: borde cálido, elevación al pasar el mouse, lustre diagonal (`sheen`) y entrada
  escalonada (`--i`).
- La tarjeta destacada se marca con borde dorado **y** una etiqueta "Destacada" con
  `aria-pressed`, no sólo con color.
- Acciones secundarias (descargar, quitar) viven en un panel plegable dentro de la tarjeta, con
  disparador visible de 44 px: accesible con mouse, teclado y toque.
- En Prendas, cada prenda se presenta como tarjeta con acciones reveladas por deslizamiento y
  un botón `⋯` siempre visible.

## 6. Deslizar para revelar acciones (`SwipeRow`)

- Un botón `⋯` visible abre y cierra las mismas acciones (`aria-expanded`, `aria-label`), y en
  escritorio las acciones se muestran directamente en la fila: el gesto nunca es la única vía.
- Bloqueo de eje: la tarjeta sólo se mueve cuando `|dx| ≥ 1.2·|dy|` y se han superado 10 px; si
  el gesto es vertical, se abandona y el navegador sigue desplazando la página
  (`touch-action: pan-y`).
- Umbral de decisión: 40 % del ancho del panel o velocidad > 0.45 px/ms, con resistencia al
  pasar del tope.
- Los gestos que empiezan sobre botones, enlaces, campos o selectores no mueven nada.
- El clic posterior a un arrastre se cancela en captura, así que no abre la tarjeta ni activa
  un control.
- Mientras están ocultas, las acciones quedan fuera del orden de foco (`tabIndex={-1}`) e
  invisibles para lectores (`aria-hidden`). Escape y un toque fuera cierran el panel.

### 6.1 Capas de gesto (comprobado con navegador real)

Dos reglas que sólo se ven al probar en un dispositivo, y que se corrigieron tras
detectarlas:

- **Un carril, un carrusel o una fila deslizable se quedan con su gesto.** El armazón de
  pestañas declara `ignoreFrom: NESTED_SWIPE_SELECTOR` (`[data-rail]`,
  `[data-swipe-surface]`): deslizar una prenda o el carrusel de Favoritos nunca cambia de
  sección. Antes, arrastrar una prenda abría sus acciones *y* saltaba a otra pestaña, que es
  justo el fallo descrito como "el gesto compite por el mismo eje".
- **El gesto se reclama al engancharse (bloqueo de eje).** `useHorizontalSwipe` llama a
  `stopPropagation()` en cuanto decide que el movimiento es horizontal y en el `pointerup`, de
  modo que ningún contenedor externo reacciona al mismo arrastre; si el movimiento resulta
  vertical, no se cancela nada y el navegador sigue desplazando la página.
- **Revelar la opción activa no engaña a las señales de desbordamiento**: `useOverflow`
  sólo marca el carril como "ya movido" si el desplazamiento real supera 2 px, así que
  seleccionar la primera opción de un carril no oculta la pista de "Desliza".

## 7. Selector con búsqueda (Estilo → ciudad)

- `role="combobox"` con `aria-expanded`, `aria-controls`, `aria-autocomplete="list"` y
  `aria-activedescendant`; la lista es `role="listbox"` con opciones `role="option"` y
  `aria-selected`.
- Teclado: ↑/↓ recorren, Inicio/Fin, Enter confirma, Escape cierra, Tab sale.
- La búsqueda ignora mayúsculas, minúsculas y diacríticos (`normalizeText`), con 420 ms de
  retardo para no consultar en cada tecla; mientras busca, un `role="status"` anuncia
  "Buscando…" y luego "N opciones disponibles".
- Si no hay coincidencias se muestra un mensaje claro y se sugiere añadir el país.
- Se cierra al tocar fuera, el foco se mantiene predecible (las opciones no roban el foco del
  campo) y hay un control táctil (chevron/X) de 36 px dentro de un campo de 44 px.
- La lista limita su altura a 18rem con scroll propio y `overscroll-behavior: contain`, así que
  desplazarla no arrastra la página.

## 8. Campos, interruptores y paneles plegables

- `Field` resalta el foco con borde dorado y halo de 4 px, etiqueta siempre visible (nunca el
  placeholder como único nombre) y `aria-describedby` para ayuda y error.
- El interruptor usa Radix (`role="switch"`, `aria-checked`), anima el pulgar 200 ms y añade un
  check y el texto "Activado/Desactivado" para lectores.
- Acordeones (`Acordion` de Radix) y paneles plegables (`Collapsible`) animan apertura y cierre
  con la altura real y actualizan `aria-expanded`/`aria-controls`. Con movimiento reducido la
  animación se elimina, el contenido sigue disponible.

## 9. Accesibilidad y movimiento reducido

- `prefers-reduced-motion: reduce` desactiva animaciones y transiciones decorativas (malla de
  fondo, brillos, esqueletos, barrido de análisis, rebote del indicador) y convierte el scroll
  suave en inmediato, sin ocultar información: los estados siguen comunicándose con iconos,
  texto y `aria-live`.
- El contraste se mantiene: tinta `#f4efe6` sobre `#141210` (≈15:1) y el dorado se usa sobre
  fondo claro sólo con texto oscuro `#17140f`.
- No se bloquea el zoom (`viewport-fit=cover`, sin `user-scalable=no`), ni el scroll normal, ni
  el teclado virtual, ni los gestos del navegador.
- Los gestos no interfieren con mapas, campos, enlaces, botones ni controles anidados.
- Las animaciones son breves y con propósito: ninguna destella, vibra ni se repite sin fin.

## 10. Decisiones y límites

### Comprobado en navegador (Chromium 153 headless, 390×844 y 1280×900)

| Comprobación | Resultado |
| --- | --- |
| Pestañas por teclado (←/→, Inicio/Fin) y por toque | Selección y anillo indicador correctos; el panel lleva `aria-labelledby` a su pestaña |
| Indicador deslizante | Se mide y se mueve (`translateX` 6 → 158 → 234 px) y aparece una sola vez listo |
| Deslizar el panel para cambiar de sección | `Prendas → Cabello` con un gesto de 200 px |
| Deslizar una fila de prenda | Abre sus acciones (`translate3d(-109px)`), se anuncia (`aria-expanded=true`, acciones enfocables) y Escape cierra |
| Gestos verticales sobre la fila | No abren nada y la sección no cambia |
| Desbordamiento de página | 0 px en móvil, en 320 px y en escritorio |
| Carrusel de Favoritos | 272 px de ancho, `scroll-snap-type: x mandatory`, siguiente tarjeta con 88 px visibles |
| Filtros de Favoritos | El chip activo recibe `aria-checked`, el riel lo revela y no desplaza la página |
| Detalles de la tarjeta | `data-state=open` con 119 px de alto y acciones "Descargar" y "Quitar" |
| Selector de ciudad | Escribe "Mad" → una opción con `aria-activedescendant`; Enter fija "Madrid, España" y pide el pronóstico |
| Interfaz con `prefers-reduced-motion: reduce` | Sin animaciones decorativas, estados intactos |
| Escritorio | El carrusel se convierte en cuadrícula de 2 columnas y las acciones se muestran en la fila (sin `⋯`) |
| Guardado y recarga | La figura, las medidas y la prueba guardada sobreviven a `reload`, con sus contadores |
| Arranque rápido (tocar antes de que cargue la memoria) | Lo elegido durante la carga se conserva y se guarda al terminar |
| Build de producción (`127.0.0.1:8081`) | Mismos resultado y `Cache-Control` por ruta (`/assets` inmutable, `/vision` 7 días, `/sw.js` `no-cache`) |
| Recarga sin conexión | El service worker sirve la app completa desde `miavatar-v1-static` |
| Ruta inexistente | Pantalla propia ("Esta página no existe") con enlace de vuelta, no un error pelado |

### Límites

- Sin navegador con GPU real: el resaltado y las animaciones se midieron por estilos calculados
  y capturas, no con el ojo humano; `--use-angle=swiftshader` puede alisar detalles de color.
- Los gestos se probaron con eventos de puntero sintéticos y con `touchscreen`, no con el
  firmware táctil de un teléfono real: la inercia del navegador (momentum) no se puede medir
  desde ahí.
- El bloqueo de eje se apoya en `touch-action: pan-y`; en navegadores muy antiguos sin
  Pointer Events el carril simplemente se desplaza sin revelado (degradación correcta, pero no
  verificada en ese hardware).

- **El carrusel de Favoritos no usa deslizamiento para revelar acciones**: el carrusel ya
  consume el gesto horizontal y competir por el mismo eje generaría movimientos encontrados.
  Ahí las acciones son explícitas (botón `⋯`/panel plegable) y el deslizamiento se reserva para
  listas verticales, donde no hay conflicto (Prendas).
- El deslizamiento se desactiva en pantallas con mouse y ≥1024 px a favor de acciones visibles.
- Las pestañas no animan la salida del panel anterior (Radix desmonta el contenido); se anima la
  entrada del nuevo, que es lo que percibe el usuario.
- `scroll-snap` se mantiene en `proximity` en los carriles de opciones para no secuestrar el
  gesto cuando el usuario quiere deslizar varios elementos de una vez.
