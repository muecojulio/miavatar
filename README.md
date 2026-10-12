# miavatar

Pruébate la ropa, los peinados, los tintes y el esmalte de uñas antes de comprarlos.
El avatar, la cara, la prenda, el cabello y la mano se calculan en el propio teléfono y
todo se guarda solo en la memoria local del navegador.

## Pestañas

- **Prendas** — eliges si el avatar es hombre, mujer, niño o niña, ajustas estatura, peso y
  color de ojos, pones tu foto de cara y subes fotos de prendas. Cada prenda se recorta, se
  coloca sobre el avatar (superior, inferior o look completo) y puedes guardar el resultado en
  favoritos.
- **Cabello** — subes una foto tuya, uno o varios peinados de referencia y eliges el color de
  tinte con su intensidad. El tinte se aplica sobre tu pelo y el peinado se coloca encima, así
  ves cómo te quedaría.
- **Uñas** — solo aparece si el avatar es mujer o niña. Subes la foto de tu mano, eliges el
  color de esmalte, el brillo y hasta un diseño (todas las uñas o solo la de acento).
- **Estilo** — detecta una paleta desde la foto de una prenda en el dispositivo y, si pides ideas,
  consulta combinaciones armónicas a The Color API. También permite buscar una ciudad y ver el
  clima de hoy con recomendaciones de capas de Open-Meteo.
- **Favoritos** — cada prueba guardada, con la imagen del resultado, las fotos que usaste
  (prenda, peinado, diseño) y un cuadro del color del tinte o del esmalte.

Cada pestaña de trabajo (Prendas, Cabello y Uñas) tiene el bloque **Volver a subir fotos**: las
fotos que elijas ahí se suman al avatar que ya tienes, sin tocar tu cara ni la figura.

## APIs y coste

Las consultas de Estilo son voluntarias, se hacen directamente desde el navegador y no necesitan
cuenta ni clave:

- [The Color API](https://www.thecolorapi.com/) recibe solo el código HEX de un color detectado
  localmente; nunca la foto.
- [Open-Meteo](https://open-meteo.com/) recibe el nombre de ciudad para buscarla y sus coordenadas
  cuando la eliges; nunca la foto ni la ubicación GPS del dispositivo.

No se añaden APIs de pago, claves, registro ni cuenta de usuario. Open-Meteo publica su API
anónima gratuita para uso **no comercial**, con límites de uso y atribución [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/);
si el proyecto se usa comercialmente, hay que revisar sus condiciones y tarifas vigentes. Los
servicios externos pueden tener interrupciones o cambiar sus condiciones; el resto de la prueba
sigue funcionando sin ellos.

La extracción de paletas se basa en código abierto MIT de
[Color Thief](https://github.com/lokesh/color-thief) y
[quantize.js](https://github.com/lokesh/quantize), ejecutado localmente. Los avisos completos
están en [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## Privacidad

No hay cuenta ni servidor que reciba tus fotos. Los modelos de visión (cara, pelo y mano), el
recorte, la paleta y la prueba se calculan en el dispositivo. Solo las consultas opcionales de
Estilo comparten los datos mínimos indicados arriba; como en cualquier conexión web, el proveedor
puede recibir la dirección IP y datos técnicos de la solicitud. Todo lo guardado localmente se
puede borrar desde la pestaña Privacidad.

## Accesibilidad e interacción

Los botones, pestañas, carriles, carruseles, deslizamientos para revelar acciones, el selector
con búsqueda de ciudad, los interruptores y los paneles plegables comparten un mismo sistema:
objetivos táctiles de 44 px, respuesta de pulsación, estados de carga, éxito y error que no
dependen solo del color, foco visible, nombres accesibles en cada grupo y control por teclado
(flechas, Inicio/Fin, Enter y Escape). El deslizamiento nunca es la única vía para llegar a una
acción, el bloqueo de eje evita cancelar el scroll vertical y todo se reduce a movimiento nulo
cuando el sistema pide `prefers-reduced-motion`. Detalle completo en
[docs/INTERACCIONES.md](./docs/INTERACCIONES.md).

## Documentación y comprobaciones

| Documento | Contenido |
| --- | --- |
| [docs/POLITICA-DE-PRIVACIDAD.md](./docs/POLITICA-DE-PRIVACIDAD.md) | Política publicada, generada con `npm run docs:legal` desde `src/lib/legal.ts` |
| [docs/SEGURIDAD.md](./docs/SEGURIDAD.md) | Auditoría, cabeceras aplicadas, correcciones y límites conocidos |
| [docs/INDICES-Y-RENDIMIENTO.md](./docs/INDICES-Y-RENDIMIENTO.md) | Qué índices se aplicaron (IndexedDB) y por qué Postgres no necesita ninguno |
| [docs/CACHE.md](./docs/CACHE.md) | Las cuatro capas de caché, sus claves y su borrado |
| [docs/INTERACCIONES.md](./docs/INTERACCIONES.md) | Sistema de interacción, gestos y accesibilidad |
| [migrations/README.md](./migrations/README.md) | Por qué esta app no tiene tablas propias en Postgres |

```bash
npm run dev        # 0.0.0.0:8080
npm run typecheck  # tipos
npm run lint       # eslint
npm test           # pruebas de scripts y de lib
npm run build      # compilación de producción
npm run docs:legal # regenera docs/POLITICA-DE-PRIVACIDAD.md
```

Los avisos de software de terceros (Color Thief, quantize.js, Protovis, tipografías
`@fontsource` y `qrcode.react`) están en [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

Producción pensada para Node.js 24.x.
