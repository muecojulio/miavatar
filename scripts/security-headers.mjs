/**
 * Cabeceras de seguridad y de caché de miavatar — una sola fuente.
 *
 * Las usan:
 * - `vite.config.ts`, para el servidor de desarrollo y la previsualización del
 *   build (así se pueden comprobar de verdad, no sólo en producción);
 * - `vercel.json` (el test `security-headers.test.mjs` comprueba que no se
 *   separen);
 * - `docs/SEGURIDAD.md`, que explica cada decisión.
 *
 * Notas de diseño:
 * - **Nunca** se envía `X-Frame-Options` ni `frame-ancestors`: la app se ve
 *   dentro del marco de la previsualización (otro origen), así que bloquear el
 *   encuadre rompería el producto.
 * - `script-src` incluye `'unsafe-inline'` porque TanStack Start inyecta el
 *   script de hidratación en línea dentro del HTML. Se compensa sin `eval`
 *   (`'unsafe-eval'` NO está permitido), con destinos de red explícitos y con
 *   `base-uri`, `form-action` y `object-src` cerrados.
 * - `'wasm-unsafe-eval'` es imprescindible: los modelos de visión (MediaPipe)
 *   son WebAssembly y se ejecutan en el dispositivo.
 */

export const GROK_HOSTS = ["https://grok.com", "https://*.grok.com"];

/** Destinos externos que la app puede consultar (sólo si el usuario lo pide). */
export const ALLOWED_API_HOSTS = [
  "https://api.open-meteo.com",
  "https://geocoding-api.open-meteo.com",
  "https://www.thecolorapi.com",
];

export function contentSecurityPolicy({ dev = false } = {}) {
  // `blob:` en script-src: MediaPipe crea el cargador de WebAssembly como
  // worker desde un blob del mismo origen. Sin esta entrada los modelos de
  // visión no arrancan bajo CSP.
  const script = ["'self'", "'unsafe-inline'", "blob:", "'wasm-unsafe-eval'", ...GROK_HOSTS];
  const connect = [
    "'self'",
    "blob:",
    "data:",
    ...ALLOWED_API_HOSTS,
    ...GROK_HOSTS,
    // El recargado en caliente de Vite usa WebSocket en desarrollo.
    ...(dev ? ["ws:", "wss:"] : []),
  ];

  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    `style-src 'self' 'unsafe-inline' ${GROK_HOSTS.join(" ")}`,
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `connect-src ${connect.join(" ")}`,
    `frame-src ${GROK_HOSTS.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Cabeceras de seguridad aplicables a todas las respuestas. */
export function securityHeaders({ dev = false } = {}) {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy({ dev }) },
    // Evita que el navegador adivine tipos MIME (subida de SVG/HTML como imagen).
    { key: "X-Content-Type-Options", value: "nosniff" },
    // La URL de la app no debería filtrarse a terceros.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // La app no usa cámara en directo, micro, GPS, pagos ni USB.
    {
      key: "Permissions-Policy",
      value:
        "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), serial=()",
    },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ];
}

/**
 * Reglas de caché para el alojamiento estático. Los modelos de visión suman
 * unos 27 MB: sin caché se descargarían en cada visita.
 */
export const CACHE_RULES = [
  {
    source: "/assets/(.*)",
    headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
  },
  {
    source: "/vision/(.*)",
    headers: [
      {
        key: "Cache-Control",
        value: "public, max-age=604800, stale-while-revalidate=86400, stale-if-error=604800",
      },
    ],
  },
  {
    source: "/og.jpg",
    headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
  },
  {
    source: "/favicon.svg",
    headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
  },
  {
    // El service worker debe poder actualizarse: nunca se congela.
    source: "/sw.js",
    headers: [{ key: "Cache-Control", value: "no-cache" }],
  },
];

/**
 * Cabeceras de caché que corresponden a una ruta concreta.
 *
 * `vercel.json` las aplica por patrón en producción; este ayudante permite que
 * la previsualización del build (y cualquier otro servidor Node) responda lo
 * mismo, para que una regla de caché se pueda comprobar de verdad antes de
 * desplegar.
 */
export function cacheHeadersFor(pathname) {
  const path = pathname.split("?")[0];
  const headers = {};
  for (const rule of CACHE_RULES) {
    // Las reglas usan la sintaxis de Vercel: `(.*)` es el comodín de cola.
    const pattern = rule.source
      .split("(.*)")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    if (new RegExp(`^${pattern}$`).test(path)) {
      for (const { key, value } of rule.headers) headers[key] = value;
    }
  }
  return headers;
}

/** Reglas `headers` completas para vercel.json (seguridad + caché). */
export function vercelHeaderRules() {
  return [
    { source: "/(.*)", headers: securityHeaders() },
    ...CACHE_RULES,
  ];
}

export function headersRecord({ dev = false } = {}) {
  return Object.fromEntries(securityHeaders({ dev }).map(({ key, value }) => [key, value]));
}
