# Índices y rendimiento de la base de datos

Pregunta de partida: **¿conviene aplicar índices a la base de datos de la aplicación?**
Sí, pero sólo en la base que la app usa de verdad. Este documento explica qué se midió,
qué se cambió y qué se descartó a propósito.

## 1. Qué base de datos usa miavatar

| Capa | Motor | Qué guarda | Quién la usa |
| --- | --- | --- | --- |
| Datos del usuario | **IndexedDB** (`miavatar`, versión 2) | Perfil, pelo, uñas y pruebas guardadas con sus fotos | Todo el producto |
| Caché de consultas | **`localStorage`** con caducidad | Geocodificación, pronóstico y armonías de color | Pestaña Estilo |
| Modelos y archivos | **Cache Storage** (service worker) | `.tflite`, `.task`, wasm y assets con huella | Análisis en el dispositivo |
| Identidad (opcional) | **Postgres** (Neon) o PGLite | Tablas de Better Auth, sólo si se activa el inicio de sesión | No se usa en esta app |

El producto no tiene tablas propias en Postgres: no hay cuentas ni datos compartidos entre
dispositivos, así que **no había índices pendientes del lado servidor**. Los índices que
importan son los de IndexedDB, que es donde vive el trabajo real de lectura.

## 2. Consultas reales de la app y coste antes de tocar nada

| Consulta | Patrón | Frecuencia |
| --- | --- | --- |
| `listar todas las pruebas` | orden por `createdAt` descendente | cada apertura de Favoritos |
| `listar pruebas de un tipo` | filtro por `kind` y orden por `createdAt` | cada cambio de filtro |
| `contar por tipo` | `count` por `kind` | cada apertura de Favoritos |
| `leer perfil / pelo / uñas` | clave fija en el almacén `kv` | arranque |

Los dos primeros son los caros: sin índice obligan a recorrer el almacén completo y, en el
caso del filtro, además a **ordenar en memoria** cada fila leída.

## 3. Qué se aplicó

### 3.1 IndexedDB v2 — índice compuesto `byKindCreated`

```ts
store.createIndex("byKindCreated", ["kind", "createdAt"], { unique: false });
```

- **Antes**: índice simple `byKind` + `getAll(kind)` + `sort()` en JavaScript.
- **Después**: un único rango `[kind, 0] … [kind, Number.MAX_SAFE_INTEGER]` recorrido con
  `openCursor(range, "prev")`. El índice ya entrega las filas ordenadas por fecha, así que
  **desaparece la ordenación en memoria** y el filtro queda cubierto por el prefijo del
  índice compuesto.
- El índice simple `byKind` se elimina: su consulta es el prefijo izquierdo del compuesto,
  mantenerlo sólo añadiría coste de escritura (cada `put` actualiza todos los índices).
- `byCreated` se conserva para el listado completo: es el caso más frecuente.

Justificación de la decisión: un índice se paga en escritura y espacio. Aquí las escrituras
son raras (guardar o quitar una prueba a mano) y las lecturas son frecuentes y repetidas
(cada visita a Favoritos), que es justo el perfil en el que un índice compuesto gana.

### 3.2 Lectura acotada (`FAVORITES_PAGE = 120`)

`readDescending()` corta el cursor al llegar al límite, así que abrir Favoritos no
materializa años de pruebas ni sus blobs. Si algún día hay más, el siguiente paso natural es
paginación por cursor (`createdAt` como ancla), no un índice nuevo.

### 3.3 Contadores servidos por el índice

`countFavorites()` usa `index.count(range)`: el motor cuenta sin deserializar los registros
(que incluyen imágenes). Es la forma más barata de alimentar los contadores de los filtros.

### 3.4 Índices del lado Postgres

Las tablas de Better Auth que vienen con la plantilla ya traen los índices que sus consultas
necesitan (`session.userId`, `account.userId`, `verification.identifier`) en
`migrations/auth/0001_auth.sql`. Como la app no añade tablas propias, **no se crea ninguna
migración nueva**: añadir índices sin consultas que los usen sería coste puro.

## 4. Caché de cómputo (donde el coste no era la base, sino la CPU)

Los dos cálculos pesados no son consultas, son píxeles:

- `analyzePerson()` ejecuta segmentación multiclase y detección de rostro (~cientos de ms).
- `extractColorPalette()` cuantiza la imagen de la prenda.
- `detectHands()` ejecuta el detector de manos en cada cambio de color de esmalte.

Con la caché LRU de `src/lib/analysis-cache.ts` (4 análisis, 12 paletas, 4 detecciones de
manos, con agrupación de peticiones simultáneas):

- volver a la pestaña no vuelve a ejecutar los modelos;
- cambiar de esmalte no vuelve a detectar la mano (las posiciones se recuerdan por foto);
- tocar la misma prenda en Estilo no reanaliza la paleta.

`npm run docs:legal` también genera la política desde una única fuente, y `wipe()` borra
estas cachés junto con IndexedDB para que "borrar todo" sea literal.

## 5. Cómo comprobar el efecto

1. Abre Favoritos, cambia de filtro varias veces y observa en las herramientas del navegador
   (pestaña *Application → IndexedDB → miavatar → favorites*) que existen los índices
   `byKindCreated` y `byCreated`, y que ya no está `byKind`.
2. Sube una foto en Cabello, cambia a Prendas y vuelve: el análisis no se repite
   (el estado "Analizando la foto…" no reaparece).
3. Con la pestaña Estilo, pide combinaciones para el mismo color dos veces: la segunda es
   instantánea porque la respuesta está cacheada (30 días).

## 6. Lo que se descartó

- **Índices adicionales por `sources` o por `meta`**: ninguna consulta filtra por ellos.
- **Migrar favoritos a Postgres**: cambiaría el modelo de privacidad (las fotos saldrían del
  dispositivo), que es la promesa central del producto.
- **`idb`/`dexie` como dependencia**: las consultas caben en unas decenas de líneas sobre la
  API nativa; añadir un ORM habría engordado el paquete sin mejorar los índices.
