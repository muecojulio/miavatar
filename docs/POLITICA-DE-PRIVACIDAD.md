# Política de privacidad y tratamiento de datos

> **Versión 2.0** · actualizada el 12 de octubre de 2026 · vigente desde el 12 de octubre de 2026.

miavatar no tiene cuentas ni servidor de fotos: tus imágenes se analizan y se guardan dentro de tu propio navegador. Solo dos consultas opcionales salen a Internet y comparten datos mínimos.

> Tus fotos se quedan en este dispositivo: se analizan y se guardan aquí, sin cuentas y sin servidores de imágenes.

Este documento se genera desde `src/lib/legal.ts` con `npm run docs:legal`: la
página de privacidad de la aplicación y este archivo muestran el mismo texto.

## Índice

- [Resumen en un minuto](#resumen)
- [Quién trata tus datos y alcance](#responsable)
- [Qué datos se tratan](#datos)
- [Base de legitimación](#base)
- [Cookies y almacenamiento local](#cookies)
- [Terceros y transferencias](#terceros)
- [Conservación y borrado](#conservacion)
- [Tus derechos](#derechos)
- [Menores de edad](#menores)
- [Seguridad](#seguridad)
- [Cambios en esta política](#cambios)
- [Términos de uso y licencias](#terminos)

## <a id="resumen"></a>Resumen en un minuto

- Las fotos que subes (cara, cuerpo, prendas, pelo, mano) nunca se envían a ningún servidor: el recorte, el análisis y la prueba se calculan en tu dispositivo.
- No hay cuenta, no hay inicio de sesión y no hay perfil en la nube. Tus pruebas se guardan en la base local del navegador (IndexedDB).
- No usamos cookies propias ni de seguimiento, ni analítica, ni píxeles de redes sociales.
- Solo salen dos consultas voluntarias: el código de color a The Color API y el nombre de ciudad o coordenadas a Open-Meteo. Puedes no usarlas y la app sigue funcionando.
- Puedes borrar todo lo guardado con un botón, desde la propia app, en cualquier momento.

> **Nota.** Una foto puede ser un dato sensible Una imagen de tu rostro o de tu cuerpo puede identificar a una persona. Por eso miavatar evita todo lo que implicaría entregarla a un tercero: sin servidor propio de imágenes, sin modelos de IA en la nube y sin cargas automáticas.

---

## <a id="responsable"></a>Quién trata tus datos y alcance

miavatar es una aplicación web que se ejecuta en el navegador. El responsable del proyecto es su autor, disponible a través del repositorio público del proyecto.

Esta política cubre la aplicación miavatar y su almacenamiento local. No cubre los sitios de terceros que se abren desde enlaces externos (por ejemplo, la documentación de Open-Meteo o The Color API).

---

## <a id="datos"></a>Qué datos se tratan

_Datos tratados y dónde viven_

| Dato | Para qué | Dónde se guarda | Sale de tu dispositivo |
| --- | --- | --- | --- |
| Fotos de tu cara, cuerpo, prendas, pelo y manos | Recortar, detectar la silueta y generar la prueba | Memoria del navegador; copia en IndexedDB si la guardas | No |
| Medidas y preferencias (estatura, peso, color de ojos, tipo de figura) | Ajustar las proporciones del avatar | IndexedDB (base `miavatar`) | No |
| Tinte, intensidad, esmalte, brillo y alcance del diseño | Reproducir la prueba y guardarla | IndexedDB (base `miavatar`) | No |
| Pruebas guardadas (imagen del resultado y fotos de referencia) | Verlas en Favoritos, descargarlas o compararlas | IndexedDB, almacén `favorites` | No |
| Código HEX de un color detectado | Buscar armonías de color (opcional) | No se guarda en el dispositivo; la respuesta se cachea | Sí, a The Color API |
| Nombre de ciudad y coordenadas elegidas | Buscar el pronóstico (opcional) | No; la respuesta se cachea con caducidad | Sí, a Open-Meteo |
| Dirección IP y datos técnicos de la conexión | Servir la aplicación y su contenido estático | Registros del proveedor de alojamiento | Sí, al proveedor de hosting |

No se solicitan tu nombre, tu correo, tu teléfono, tu ubicación GPS, tus contactos ni el acceso a la cámara en directo: las fotos se eligen con el selector de archivos del sistema, que no comparte la cámara con la página.

No se toman decisiones automatizadas con efectos legales ni se elaboran perfiles publicitarios. La app no vende datos ni los comparte con terceros para publicidad.

---

## <a id="base"></a>Base de legitimación

- Consentimiento: tú eliges qué foto subir y qué prueba guardar. Puedes retirarlo borrando los datos desde la app.
- Interés legítimo técnico: el alojamiento registra datos mínimos de conexión para servir la aplicación y protegerse de abusos.
- Ejecución de una consulta a petición tuya: cuando pulsas «Ver combinaciones» o buscas una ciudad, se realiza la consulta que has pedido.

El tratamiento de las fotos ocurre íntegramente en tu dispositivo, bajo tu control: la app no actúa como responsable de esas imágenes porque no las recibe.

---

## <a id="cookies"></a>Cookies y almacenamiento local

miavatar no usa cookies propias de seguimiento ni cookies de terceros con fines publicitarios. Para funcionar y para ir más rápido guarda información en tu navegador:

_Almacenamiento técnico en tu navegador_

| Nombre | Tipo | Contenido | Duración |
| --- | --- | --- | --- |
| `miavatar` (base IndexedDB) | Base de datos local | Perfil, pelo, uñas y pruebas guardadas, incluidos sus blobs de imagen | Hasta que borres los datos o la app |
| `miavatar:cache:openmeteo:places` | `localStorage` | Nombre y coordenadas de las ciudades que buscaste | 24 horas |
| `miavatar:cache:openmeteo:forecast` | `localStorage` | Último pronóstico consultado por ciudad | 15 minutos (se reutiliza si no hay conexión) |
| `miavatar:cache:thecolorapi:advice` | `localStorage` | Paletas de color ya consultadas, sin ninguna foto | 30 días |
| Caché del service worker | Cache Storage del navegador | Archivos de la app y modelos de visión (unos 27 MB) para abrir sin conexión | Hasta que borres la caché del sitio |

> **Nota.** Nada de esto sale de tu equipo Estos almacenes son locales al navegador y al dispositivo donde usaste la app. Otra persona con acceso físico a ese dispositivo y a ese navegador podría abrirlos: usa el bloqueo del equipo y borra los datos si compartes el teléfono.

---

## <a id="terceros"></a>Terceros y transferencias

- Open-Meteo (pronóstico y geocodificación): recibe el nombre de la ciudad escrita y, si eliges una sugerencia, sus coordenadas. Nunca recibe fotos. Su API pública gratuita está limitada a usos no comerciales (CC BY 4.0).
- The Color API (armonías): recibe solo el código hexadecimal del color detectado en tu prenda. Nunca recibe fotos.
- Proveedor de alojamiento (por ejemplo, Vercel): sirve los archivos de la app y puede registrar la dirección IP y datos técnicos de la petición, como cualquier servicio web. Las tipografías ya se sirven desde la propia aplicación, así que no se contacta con Google Fonts.
- MediaPipe (modelos de visión y WebAssembly): se descargan una sola vez desde la propia aplicación y se ejecutan en tu dispositivo. No reciben imágenes.

Estos proveedores pueden procesar datos fuera de tu país (por ejemplo, en Estados Unidos o la Unión Europea). Si eso te preocupa, evita las consultas opcionales: la app funciona completa sin ellas.

---

## <a id="conservacion"></a>Conservación y borrado

No hay plazo impuesto por nosotros: las fotos y pruebas se quedan en tu navegador hasta que las borres. La caché de datos externos caduca sola según la tabla anterior.

El botón «Borrar todo en este teléfono» elimina de una vez el perfil, las fotos, los peinados, los diseños de uñas, las pruebas guardadas, las cachés de consultas y los resultados derivados que estaban en memoria. También puedes borrar los datos del sitio desde los ajustes del navegador o instalar la app como PWA y desinstalarla, lo que elimina sus almacenes.

---

## <a id="derechos"></a>Tus derechos

- Acceso: todo lo guardado está en tu dispositivo y se ve en la propia app (Favoritos y cada pestaña).
- Rectificación: puedes cambiar o reemplazar cualquier foto, medida o color cuando quieras.
- Supresión: borra una prueba concreta desde Favoritos, o todo con el botón de esta página.
- Oposición y limitación: basta con no usar las consultas opcionales (color y clima) para que no se comparta nada.
- Portabilidad: cada prueba guardada se puede descargar como imagen.

Si tu normativa local (por ejemplo, el RGPD en Europa o la LFPDPPP en México) reconoce otros derechos, puedes plantearlos en el repositorio del proyecto: https://github.com/muecojulio/miavatar/issues. Como no conservamos tus datos, en la mayoría de los casos la respuesta será indicarte exactamente dónde están en tu navegador y cómo borrarlos.

---

## <a id="menores"></a>Menores de edad

Las opciones «Niño» y «Niña» solo cambian las proporciones de la figura vestida: no cambian nada más ni crean un perfil de un menor. Si la foto es de otra persona, incluidas niñas o niños, súbela solo con su permiso o el de quien tenga la patria potestad o tutela.

La app no está dirigida a menores de 14 años sin supervisión de una persona adulta: incluye cámaras de fotos y almacenamiento local que conviene explicar.

---

## <a id="seguridad"></a>Seguridad

- Las fotos nunca se envían: el análisis de rostro, pelo y mano se ejecuta en el dispositivo con modelos que viajan con la app.
- La aplicación se sirve con cabeceras de seguridad (CSP, `nosniff`, política de permisos y referrer restringido) que limitan el código que puede ejecutarse y los destinos a los que se puede conectar.
- No hay analítica, publicidad ni scripts de terceros; las tipografías y los modelos se sirven desde el propio dominio.
- Los archivos que subes se validan como imagen y se reducen en el dispositivo antes de guardarlos.
- El botón de borrado elimina también las cachés, de modo que no queda una copia olvidada de la consulta o del color.

> **Atención.** Límite que debes conocer La seguridad de tus pruebas depende también de la seguridad de tu dispositivo: quien pueda desbloquear tu teléfono y abrir este navegador puede ver los favoritos guardados. Usa bloqueo con código o biometría y borra los datos si el dispositivo cambia de manos.

---

## <a id="cambios"></a>Cambios en esta política

Cada versión se publica con fecha de actualización y número de versión. Si un cambio ampliara los datos que salen del dispositivo, se pediría una acción explícita antes de aplicarlo.

---

## <a id="terminos"></a>Términos de uso y licencias

- Uso previsto: probarte prendas, peinados, tintes y esmalte antes de comprarlos. Es una simulación orientativa, no una promesa de resultado real ni asesoría profesional.
- No es un servicio médico: no diagnostica ni mide nada clínicamente.
- Si usas la app comercialmente, revisa las condiciones vigentes de Open-Meteo, cuya API pública gratuita se limita a uso no comercial.
- Avisos de software de terceros: la extracción de paletas se inspira en Color Thief y quantize.js (MIT), y los modelos de visión son de MediaPipe (Apache 2.0). El detalle está en THIRD_PARTY_NOTICES.md y en public/vision/NOTICE.txt.

