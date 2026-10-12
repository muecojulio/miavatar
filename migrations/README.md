# Migraciones

## Esta app no tiene tablas propias en Postgres

Decisión, y por qué:

- **Todo lo que el usuario crea vive en su dispositivo.** Perfil, pelo, uñas y pruebas
  guardadas están en IndexedDB (`miavatar`, versión 2), con las fotos incluidas. No hay
  cuentas, no hay sincronización y no hay nada que consultar desde un servidor.
- **Los dos únicos datos compartibles son de terceros y se piden al vuelo** (The Color API y
  Open-Meteo), cacheados en `localStorage` con caducidad. Tampoco necesitan tabla.
- **Por eso no hay ningún `0002_*.sql`.** Una migración con sólo comentarios obligaría a abrir
  conexión a la base en cada despliegue (`scripts/migrate.mjs` no distingue comentarios de
  sentencias) y a crear una tabla `_migrations` para no hacer nada. Eso es coste, no progreso.

El análisis completo —qué consultas existen, qué índices se midieron y por qué no se creó
ninguno aquí— está en [`docs/INDICES-Y-RENDIMIENTO.md`](../docs/INDICES-Y-RENDIMIENTO.md).

## Qué hay en `auth/0001_auth.sql`

El esquema de Better Auth (`user`, `session`, `account`, `verification`) con sus índices ya
declarados: `session_userId_idx`, `account_userId_idx` y el índice de `verification.identifier`.
Es **opcional y está fuera de alcance**: ni `scripts/migrate.mjs` ni el respaldo PGLite entran
en subdirectorios, así que una app que no active el inicio de sesión nunca paga por él.

Si algún día se activa el inicio de sesión en miavatar: copia el archivo al nivel superior de
`migrations/` (los nombres se registran por *basename*, así que no se reaplicará en bases que
ya lo tuvieran) y no hace falta ningún índice nuevo, porque las consultas de autenticación ya
van cubiertas por los que trae el archivo.

## Antes de añadir una migración aquí

Añadir una tabla o un índice sólo se justifica con una consulta real que lo use. Un índice
cuesta escritura y espacio en cada `insert`; si ninguna consulta filtra u ordena por esa
columna, es coste puro. La regla que se siguió en este repositorio:

1. Escribe la consulta.
2. Míde cómo se lee hoy (recorrido completo + orden en memoria, o no).
3. Añade el índice **sólo** si esa lectura ocurre de forma frecuente y las escrituras son
   raras.
4. Comprueba con datos reales que el plan cambia (en IndexedDB, el índice compuesto debe
   eliminar la ordenación en memoria).
