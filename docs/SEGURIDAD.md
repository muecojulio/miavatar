# Revisión de seguridad de miavatar

Revisión hecha sobre la versión de este repositorio (octubre de 2026). Incluye lo que se
encontró, lo que se corrigió y lo que queda como límite conocido.

## 1. Resumen

| Comprobación | Resultado |
| --- | --- |
| `npm audit` (dependencias de producción y desarrollo) | **0 vulnerabilidades** |
| Inyección de HTML (`dangerouslySetInnerHTML`, `innerHTML`, `document.write`) | No hay usos |
| Código dinámico (`eval`, `new Function`) | No hay usos |
| `postMessage` sin validar origen | Corregido/no aplicable: el puente valida `event.origin` y `event.source` |
| Cabeceras de seguridad (CSP, `nosniff`, referrer, permisos) | **Añadidas** en dev, preview y despliegue |
| CSP que bloquee la marca de la plataforma | Evitado a propósito (se permite `grok.com`) |
| Validación de archivos subidos | Reforzada: sólo imagen, redimensionado y recorte en el dispositivo |
| Datos sensibles fuera del dispositivo | Ninguno: fotos, medidas y pruebas nunca salen del navegador |
| Borrado real de datos | Ampliado a cachés de datos, de cómputo y del service worker |
| Fugas de memoria (URL de objeto) | Revisadas: se liberan al quitar, borrar y vaciar |

## 2. Cabeceras de seguridad

Fuente única: `scripts/security-headers.mjs`, consumida por `vite.config.ts` (desarrollo y
previsualización del build) y por `vercel.json` (producción). El test
`scripts/security-headers.test.mjs` comprueba que ambos no se separen, que la CSP cierre lo
que no se usa y que la marca de la plataforma siga permitida.

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
  'wasm-unsafe-eval' https://grok.com https://*.grok.com; style-src 'self' 'unsafe-inline'
  https://grok.com https://*.grok.com; img-src 'self' blob: data: https:; font-src 'self' data:;
  media-src 'self' blob:; worker-src 'self' blob:;
  connect-src 'self' blob: data: https://api.open-meteo.com
  https://geocoding-api.open-meteo.com https://www.thecolorapi.com https://grok.com
  https://*.grok.com; frame-src https://grok.com https://*.grok.com;
  object-src 'none'; base-uri 'self'; form-action 'self'; manifest-src 'self';
  upgrade-insecure-requests
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=(), usb=(), …
X-Permitted-Cross-Domain-Policies: none
X-DNS-Prefetch-Control: off
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

```text
script-src 'self' 'unsafe-inline' blob: 'wasm-unsafe-eval' https://grok.com https://*.grok.com
```

Decisiones que conviene entender:

- **`script-src` incluye `'unsafe-inline'`** porque TanStack Start sirve el script de
  hidratación en línea dentro del HTML; sin esa directiva la app no arranca. Se compensa con
  lo que sí se puede cerrar: **no** hay `'unsafe-eval'`, y `connect-src`, `img-src`,
  `worker-src`, `object-src`, `base-uri` y `form-action` limitan a dónde puede ir el código.
  Si algún día se migra a nonces por petición (middleware que reescriba el HTML), la directiva
  se puede endurecer sin tocar el resto.
- **`'wasm-unsafe-eval'` es imprescindible**: los modelos de visión son WebAssembly y se
  ejecutan en el dispositivo.
- **`blob:` en `script-src` también es imprescindible** y se descubrió probando con un
  navegador real: MediaPipe crea su cargador de WebAssembly como *worker* desde un blob del
  mismo origen (`blob:`) y, sin esa entrada, la CSP lo bloqueaba y el análisis de cara, pelo y
  manos no arrancaba. Es `blob:` del propio origen, no un comodín de red: ningún script
  remoto nuevo queda autorizado.
- **Nunca `X-Frame-Options` ni `frame-ancestors`**: la app se muestra dentro del marco de la
  previsualización, que es otro origen. Bloquear el encuadre rompería el producto y la marca
  de la plataforma.
- **Se permiten `grok.com` y `*.grok.com`** para no romper la marca ni la previsualización que
  inyecta la plataforma.

## 3. Superficie de ataque real de esta app

Sin servidor propio de datos, la superficie se reduce a cuatro puntos:

1. **Archivos que sube el usuario.** Se aceptan sólo como `image/*`, se decodifican con
   `createImageBitmap`/`Image` y se dibujan en un `<canvas>`: un archivo que no sea una imagen
   decodificable falla de forma controlada y el error se muestra en pantalla. Nada se ejecuta
   ni se interpreta como HTML, y el resultado nunca se transmite.
2. **`postMessage` de la previsualización.** `src/lib/preview-host-bridge.ts` valida el
   envoltorio con Zod, descarta remitentes que no sean `window.parent`, exige el origen exacto
   del embedder y comprueba la versión del protocolo; además acepta sólo un conjunto cerrado
   de mensajes (`hello`, `navigate`, `history`, `connector-token-ready`) y los caminos de
   navegación pasan por `isSafeBridgePath()` (nada de `//`, `\` ni salidas del origen).
3. **Consultas opcionales a terceros.** The Color API recibe únicamente un hexadecimal
   validado con `/^#[\da-f]{6}$/i`; Open-Meteo recibe el nombre de la ciudad y las coordenadas
   elegidas. Ambas van por HTTPS y desde el navegador, sin claves ni credenciales.
4. **Almacenamiento local.** IndexedDB y `localStorage` son del origen: ninguna otra web los
   lee (mismo origen) y la app no los expone por red.

## 4. Correcciones aplicadas en esta revisión

- **Cabeceras de seguridad**: antes no se enviaba ninguna. Ahora CSP, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, HSTS, `X-Permitted-Cross-Domain-Policies` y
  `X-DNS-Prefetch-Control`, aplicadas también en desarrollo y en la previsualización del build
  mediante un plugin de Vite (si sólo estuvieran en producción, un error de CSP no se vería
  hasta desplegar).
- **Sin peticiones a terceros por tipografías**: se servían desde Google Fonts (una petición a
  un tercero con la IP del visitante en cada carga). Ahora las fuentes viajan con la app
  (`@fontsource`), lo que además las hace disponibles sin conexión.
- **Borrado completo de rastros**: el botón de borrado limpia IndexedDB, las cachés de datos,
  la caché de cómputo y la caché del service worker.
- **Identificadores robustos**: `crypto.randomUUID()` exige contexto seguro; se añadió un
  respaldo por si el navegador no lo expone, para que guardar una prueba no falle en un
  contexto no seguro.
- **La interfaz no pierde lo que tocas durante el arranque**: la memoria local tarda unas
  décimas en cargar y una pulsación en ese instante se sobrescribía al llegar el estado
  guardado. Ahora lo elegido durante la carga se conserva y se guarda después (comprobado:
  elegir figura y medidas antes de que termine el arranque sobrevive a la recarga).
- **Presupuesto de tiempo en consultas externas**: las llamadas a color y clima usan
  `AbortController` con corte a los 12 s, de modo que una red colgada no deja la interfaz
  esperando indefinidamente.
- **Lecturas acotadas**: Favoritos lee como máximo 120 registros por consulta
  (`FAVORITES_PAGE`), evitando que un almacén enorme bloquee el hilo principal.
- **`Referrer-Policy` y `Permissions-Policy`**: reducen la información que se filtra a
  terceros y desactivan permisos que la app no usa (micrófono, ubicación GPS, pagos, USB).
- **Limpieza de código muerto**: se eliminaron rutas y utilidades sin uso, reduciendo la
  superficie que hay que revisar (ver la lista al final del README del cambio).
- **Un `catch {}` vacío** en un helper de la plataforma pasó a tener un comentario que explica
  por qué es intencional (la firma es opcional), de modo que `npm run lint` queda limpio.

## 5. Límites conocidos (sin adornos)

- `'unsafe-inline'` en `script-src` (ver arriba): no protege frente a un script inyectado en
  el HTML. Sin un canal de entrada de HTML de usuario (no lo hay) el riesgo es bajo, pero es
  una concesión, no una virtud.
- **Quien tenga tu dispositivo desbloqueado y tu navegador puede ver los favoritos.** El
  cifrado en reposo no está al alcance de una app web (la clave tendría que vivir en el mismo
  origen). Mitigación realista: bloqueo del equipo y borrado desde la app.
- **La primera visita descarga unos 27 MB** de modelos de visión. Es tráfico hacia el
  alojamiento, no a un tercero, pero es tráfico.
- **`npm audit` es una foto del momento**: conviene repetirlo en cada actualización de
  dependencias. En esta revisión: 0 vulnerabilidades conocidas.
- Los proveedores de hosting y de las dos APIs opcionales pueden ver la IP y datos técnicos de
  la petición, como cualquier servicio web.

## 6. Cómo volver a comprobarlo

Comprobado con Chromium 153 headless contra el build de producción servido en
`127.0.0.1:8081`: los modelos se cargan bajo CSP, el service worker se registra y cachea
`miavatar-v1-static`, y una recarga sin conexión sigue mostrando la app.

```bash
npm audit                 # dependencias
npm run typecheck         # tipos
npm run lint              # incluye las reglas de hooks de React
node --test scripts/security-headers.test.mjs
curl -s -D - -o /dev/null http://127.0.0.1:8080/ | grep -i content-security-policy
```
