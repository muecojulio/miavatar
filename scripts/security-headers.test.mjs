import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ALLOWED_API_HOSTS,
  CACHE_RULES,
  cacheHeadersFor,
  contentSecurityPolicy,
  securityHeaders,
  vercelHeaderRules,
} from "./security-headers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("la CSP cierra lo que no se usa y permite lo imprescindible", () => {
  const policy = contentSecurityPolicy();
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /base-uri 'self'/);
  assert.match(policy, /form-action 'self'/);
  // WebAssembly de los modelos de visión.
  assert.match(policy, /'wasm-unsafe-eval'/);
  // Nunca eval.
  assert.doesNotMatch(policy, /'unsafe-eval'(?!-)/);
  // Sólo los servicios que el usuario pide explícitamente.
  for (const host of ALLOWED_API_HOSTS) assert.ok(policy.includes(host), host);
  // El marco de la previsualización no se bloquea: nada de frame-ancestors.
  assert.doesNotMatch(policy, /frame-ancestors/);
});

test("la marca de la plataforma sigue permitida", () => {
  const policy = contentSecurityPolicy();
  assert.ok(policy.includes("https://grok.com"));
  assert.ok(policy.includes("https://*.grok.com"));
  const headers = Object.fromEntries(securityHeaders().map(({ key, value }) => [key, value]));
  assert.equal(headers["X-Frame-Options"], undefined);
});

test("en desarrollo se permiten los WebSocket del recargado en caliente", () => {
  assert.ok(contentSecurityPolicy({ dev: true }).includes("ws:"));
  assert.ok(!contentSecurityPolicy().includes("connect-src 'self' blob: data: https://api.open-meteo.com ws:"));
});

test("los modelos de visión se cachean y el service worker no", () => {
  const vision = CACHE_RULES.find((rule) => rule.source === "/vision/(.*)");
  assert.match(vision?.headers[0].value ?? "", /max-age=604800/);
  const sw = CACHE_RULES.find((rule) => rule.source === "/sw.js");
  assert.equal(sw?.headers[0].value, "no-cache");
  // Los archivos con huella de Vite son inmutables.
  const assets = CACHE_RULES.find((rule) => rule.source === "/assets/(.*)");
  assert.match(assets?.headers[0].value ?? "", /immutable/);
});

test("vercel.json sirve exactamente las mismas cabeceras", () => {
  const vercel = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  assert.deepEqual(vercel.headers, vercelHeaderRules());
});

test("las reglas de caché se pueden aplicar a una ruta concreta", () => {
  assert.match(cacheHeadersFor("/assets/index-abc123.js")["Cache-Control"], /immutable/);
  assert.match(cacheHeadersFor("/vision/face_landmarker.task")["Cache-Control"], /max-age=604800/);
  assert.equal(cacheHeadersFor("/sw.js")["Cache-Control"], "no-cache");
  // Una ruta cualquiera no arrastra caché larga, y el parecido no basta.
  assert.deepEqual(cacheHeadersFor("/"), {});
  assert.deepEqual(cacheHeadersFor("/visioncualquiera/x"), {});
});

test("los modelos de visión pueden cargar su worker desde un blob", () => {
  const policy = contentSecurityPolicy();
  const script = policy.split("; ").find((part) => part.startsWith("script-src")) ?? "";
  assert.ok(script.includes("blob:"), script);
  assert.ok(script.includes("'wasm-unsafe-eval'"), script);
});
