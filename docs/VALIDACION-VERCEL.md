# Validación previa a Vercel

Revisión realizada el 12 de octubre de 2026 con Node.js 24.21.0.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| Instalación limpia con `npm ci` | Correcta |
| `npm run typecheck` | Sin errores |
| `npm run lint` | Sin errores ni avisos |
| `npm test` | 277 pruebas aprobadas, 0 fallidas, 4 omitidas |
| `npm run build` | Correcto; genera `.vercel/output` con runtime `nodejs24.x` |
| `npm audit --omit=dev` | 0 vulnerabilidades conocidas reportadas |
| Render inicial de desarrollo y producción | HTTP 200, contenido visible en escritorio y móvil |
| JavaScript e hidratación en el render inicial | Sin excepciones ni errores de hidratación observados |
| Desbordamiento horizontal | No detectado a 1280×800 ni a 390×844 |
| Comparación desarrollo/producción | Sin divergencias de contenido detectadas |

Las 4 pruebas omitidas comprueban instrucciones de documentación opcional en
`.grok/skills/og`, no incluida en este repositorio. Se ejecutan si esos documentos
están disponibles; las pruebas funcionales no se omiten. Las pruebas genéricas de
metadatos ahora usan un directorio temporal para no heredar el título y la imagen
reales de miavatar.

## Correcciones

- Se incluye en Git únicamente `.grok/app-env.json`, con autenticación desactivada,
  para que una clonación limpia conserve la configuración de esta app sin cuentas.
  El resto del directorio `.grok` continúa ignorado.
- Instalación reproducible en Vercel mediante `npm ci` y comando de build explícito.
- Pruebas de metadatos aisladas de los archivos de marca reales.
- El script de comprobación visual resuelve la raíz del repositorio, sin depender
  de `/workspace`, y permite especificar un navegador instalado. Los fallos de red
  incluyen ahora la URL para facilitar el diagnóstico.

## Límites y avisos

- El navegador de este entorno no puede acceder a
  `https://grok.com/grok-app-builder/extensions.js`: la conexión externa se cierra.
  El smoke test conserva este error de consola y devuelve un estado no exitoso;
  **no se presenta como una prueba visual completamente limpia**. La interfaz sí
  renderiza y el recurso bloqueado corresponde a la insignia externa de Grok.
- El build emite avisos no bloqueantes sobre directivas `use client` de dependencias.
- Esta revisión no constituye un despliegue real en Vercel. No se han comprobado
  allí el dominio, las variables del proyecto ni permisos de cámara de dispositivos
  reales. Tampoco se han probado exhaustivamente cargas de fotos, inferencia de
  visión, todas las interacciones o disponibilidad de las APIs externas.
- Una compilación correcta y las pruebas aprobadas no garantizan ausencia absoluta
  de errores. Tras desplegar, comprobar especialmente cámara/fotos, modelos de
  visión, guardado local y consultas opcionales de Estilo bajo HTTPS.
