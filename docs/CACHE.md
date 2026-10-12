# Caché de miavatar

Cuatro capas independientes, todas en el dispositivo. La regla que las ordena: **primero lo
que evita trabajo local, después lo que evita red, y nunca se cachea lo que identifica a una
persona fuera de su navegador.**

| Capa | Dónde | Qué guarda | Caducidad | Se borra con "Borrar todo" |
| --- | --- | --- | --- | --- |
| HTTP | Cabeceras del alojamiento | Assets con huella, modelos de visión, iconos | 1 año (assets), 7 días (modelos) | No (es contenido público de la app) |
| Service worker | Cache Storage | Los mismos archivos, más el HTML de la última visita | Hasta nueva versión | Sí (mensaje `clear-caches`) |
| Caché de datos | `localStorage` | Ciudades, pronóstico y armonías de color | 24 h / 15 min / 30 días | Sí |
| Caché de cómputo | Memoria | Análisis de rostro/pelo/mano y paletas | Hasta 4-12 entradas LRU o hasta recargar | Sí |

## 1. Cabeceras HTTP (`scripts/security-headers.mjs`)

Los modelos de visión suman unos 27 MB; sin cabeceras de caché se descargarían en cada
visita. Ahora:

```
/assets/*   → public, max-age=31536000, immutable
/vision/*   → public, max-age=604800, stale-while-revalidate=86400, stale-if-error=604800
/sw.js      → no-cache      (el worker debe poder actualizarse)
```

`stale-if-error` es deliberado: si el alojamiento falla, el navegador reutiliza la copia
guardada en lugar de dejar la app sin modelos.

`cacheHeadersFor(pathname)` (en `scripts/security-headers.mjs`) aplica estas mismas reglas por
ruta, así que la previsualización del build responde igual que producción y una regla de caché
se puede comprobar antes de desplegar. Verificado en `127.0.0.1:8081`:

| Ruta | `Cache-Control` servido |
| --- | --- |
| `/assets/styles-*.css` | `public, max-age=31536000, immutable` |
| `/vision/face_landmarker.task` | `public, max-age=604800, stale-while-revalidate=86400, stale-if-error=604800` |
| `/sw.js` | `no-cache` |
| `/favicon.svg` | `public, max-age=86400` |

En el servidor de desarrollo no se aplican: ahí se sirven archivos recién escritos y una caché
larga haría justamente lo contrario de lo que se busca.

## 2. Service worker (`public/sw.js`)

- **Cache-first** para `/assets/*`, `/vision/*`, `.woff2` y `/favicon.svg`: contenido
  inmutable y pesado.
- **Network-first** para documentos HTML, con respaldo de la última copia para poder abrir la
  app sin conexión.
- **Nada más**: ninguna consulta a The Color API ni a Open-Meteo entra en el worker (esas ya
  tienen su caché con caducidad dentro de la app), y las fotos del usuario viven en `blob:` e
  IndexedDB, fuera de su alcance.
- Sólo se registra en la compilación de producción y sólo en el mismo origen: en desarrollo
  estorbaría al recargado en caliente.

## 3. Caché de datos con caducidad (`src/lib/cache.ts`)

`createTtlCache()` combina memoria y `localStorage`:

- `peek()` devuelve el valor si sigue vigente (memoria primero, disco después).
- `load()` **agrupa peticiones idénticas simultáneas**: dos componentes que pidan Madrid a la
  vez hacen una sola llamada de red.
- `peekStale()` permite servir el último dato cuando la red falla; el clima lo usa y avisa
  ("Sin conexión: se muestra el último pronóstico guardado").
- La escritura tolera cuota llena: poda las claves más antiguas de la propia caché y sigue.

| Clave | Contenido | TTL |
| --- | --- | --- |
| `miavatar:cache:openmeteo:places:*` | Nombre, región y coordenadas de las ciudades buscadas | 24 h |
| `miavatar:cache:openmeteo:forecast:*` | Resumen del pronóstico por coordenada redondeada | 15 min |
| `miavatar:cache:thecolorapi:advice:*` | Armonías por color y modo | 30 días |

## 4. Caché de cómputo (`src/lib/analysis-cache.ts`)

LRU en memoria para lo que cuesta CPU: análisis de persona (4), paletas (12) y manos (4),
con agrupación de peticiones en vuelo. Se vacía al recargar la página y también con `wipe()`.
Detalle y efecto medible en [INDICES-Y-RENDIMIENTO.md](./INDICES-Y-RENDIMIENTO.md).

## 5. Privacidad y coherencia

- Nada de lo cacheado sale del dispositivo. Las dos únicas salidas de red (color y clima) van
  con datos mínimos y ya se documentan en la política.
- El botón "Borrar todo en este teléfono" llama a `clearAllCaches()`, `clearComputeCache()` y
  `clearOfflineCaches()`: no queda una copia olvidada del color o de la ciudad consultada.
- La política publica la tabla exacta de claves y duraciones
  ([POLITICA-DE-PRIVACIDAD.md](./POLITICA-DE-PRIVACIDAD.md), sección *Cookies y
  almacenamiento local*).
