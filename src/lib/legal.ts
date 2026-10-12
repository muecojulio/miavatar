/**
 * Textos legales de miavatar: una sola fuente para la página de la app y para
 * el documento versionado del repositorio (`npm run docs:legal`).
 *
 * Este archivo no importa nada: se puede leer con el removedor de tipos de Node
 * para generar `docs/POLITICA-DE-PRIVACIDAD.md` sin arrancar el navegador.
 */

export type PolicyBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; headers: string[]; caption?: string; rows: string[][] }
  | { kind: "callout"; tone: "info" | "warn"; title: string; text: string };

export type PolicySection = {
  id: string;
  title: string;
  /** Icono de lucide, usado sólo por la interfaz. */
  icon?: string;
  blocks: PolicyBlock[];
};

export type Policy = {
  title: string;
  version: string;
  updated: string;
  effective: string;
  summary: string;
  sections: PolicySection[];
};

const CONTACT = "https://github.com/muecojulio/miavatar/issues";

export const PRIVACY_POLICY: Policy = {
  title: "Política de privacidad y tratamiento de datos",
  version: "2.0",
  updated: "12 de octubre de 2026",
  effective: "12 de octubre de 2026",
  summary:
    "miavatar no tiene cuentas ni servidor de fotos: tus imágenes se analizan y se guardan dentro de tu propio navegador. Solo dos consultas opcionales salen a Internet y comparten datos mínimos.",
  sections: [
    {
      id: "resumen",
      title: "Resumen en un minuto",
      icon: "sparkles",
      blocks: [
        {
          kind: "list",
          items: [
            "Las fotos que subes (cara, cuerpo, prendas, pelo, mano) nunca se envían a ningún servidor: el recorte, el análisis y la prueba se calculan en tu dispositivo.",
            "No hay cuenta, no hay inicio de sesión y no hay perfil en la nube. Tus pruebas se guardan en la base local del navegador (IndexedDB).",
            "No usamos cookies propias ni de seguimiento, ni analítica, ni píxeles de redes sociales.",
            "Solo salen dos consultas voluntarias: el código de color a The Color API y el nombre de ciudad o coordenadas a Open-Meteo. Puedes no usarlas y la app sigue funcionando.",
            "Puedes borrar todo lo guardado con un botón, desde la propia app, en cualquier momento.",
          ],
        },
        {
          kind: "callout",
          tone: "info",
          title: "Una foto puede ser un dato sensible",
          text: "Una imagen de tu rostro o de tu cuerpo puede identificar a una persona. Por eso miavatar evita todo lo que implicaría entregarla a un tercero: sin servidor propio de imágenes, sin modelos de IA en la nube y sin cargas automáticas.",
        },
      ],
    },
    {
      id: "responsable",
      title: "Quién trata tus datos y alcance",
      icon: "shield",
      blocks: [
        {
          kind: "p",
          text: "miavatar es una aplicación web que se ejecuta en el navegador. El responsable del proyecto es su autor, disponible a través del repositorio público del proyecto.",
        },
        {
          kind: "p",
          text: "Esta política cubre la aplicación miavatar y su almacenamiento local. No cubre los sitios de terceros que se abren desde enlaces externos (por ejemplo, la documentación de Open-Meteo o The Color API).",
        },
      ],
    },
    {
      id: "datos",
      title: "Qué datos se tratan",
      icon: "database",
      blocks: [
        {
          kind: "table",
          caption: "Datos tratados y dónde viven",
          headers: ["Dato", "Para qué", "Dónde se guarda", "Sale de tu dispositivo"],
          rows: [
            [
              "Fotos de tu cara, cuerpo, prendas, pelo y manos",
              "Recortar, detectar la silueta y generar la prueba",
              "Memoria del navegador; copia en IndexedDB si la guardas",
              "No",
            ],
            [
              "Medidas y preferencias (estatura, peso, color de ojos, tipo de figura)",
              "Ajustar las proporciones del avatar",
              "IndexedDB (base `miavatar`)",
              "No",
            ],
            [
              "Tinte, intensidad, esmalte, brillo y alcance del diseño",
              "Reproducir la prueba y guardarla",
              "IndexedDB (base `miavatar`)",
              "No",
            ],
            [
              "Pruebas guardadas (imagen del resultado y fotos de referencia)",
              "Verlas en Favoritos, descargarlas o compararlas",
              "IndexedDB, almacén `favorites`",
              "No",
            ],
            [
              "Código HEX de un color detectado",
              "Buscar armonías de color (opcional)",
              "No se guarda en el dispositivo; la respuesta se cachea",
              "Sí, a The Color API",
            ],
            [
              "Nombre de ciudad y coordenadas elegidas",
              "Buscar el pronóstico (opcional)",
              "No; la respuesta se cachea con caducidad",
              "Sí, a Open-Meteo",
            ],
            [
              "Dirección IP y datos técnicos de la conexión",
              "Servir la aplicación y su contenido estático",
              "Registros del proveedor de alojamiento",
              "Sí, al proveedor de hosting",
            ],
          ],
        },
        {
          kind: "p",
          text: "No se solicitan tu nombre, tu correo, tu teléfono, tu ubicación GPS, tus contactos ni el acceso a la cámara en directo: las fotos se eligen con el selector de archivos del sistema, que no comparte la cámara con la página.",
        },
        {
          kind: "p",
          text: "No se toman decisiones automatizadas con efectos legales ni se elaboran perfiles publicitarios. La app no vende datos ni los comparte con terceros para publicidad.",
        },
      ],
    },
    {
      id: "base",
      title: "Base de legitimación",
      icon: "scale",
      blocks: [
        {
          kind: "list",
          items: [
            "Consentimiento: tú eliges qué foto subir y qué prueba guardar. Puedes retirarlo borrando los datos desde la app.",
            "Interés legítimo técnico: el alojamiento registra datos mínimos de conexión para servir la aplicación y protegerse de abusos.",
            "Ejecución de una consulta a petición tuya: cuando pulsas «Ver combinaciones» o buscas una ciudad, se realiza la consulta que has pedido.",
          ],
        },
        {
          kind: "p",
          text: "El tratamiento de las fotos ocurre íntegramente en tu dispositivo, bajo tu control: la app no actúa como responsable de esas imágenes porque no las recibe.",
        },
      ],
    },
    {
      id: "cookies",
      title: "Cookies y almacenamiento local",
      icon: "cookie",
      blocks: [
        {
          kind: "p",
          text: "miavatar no usa cookies propias de seguimiento ni cookies de terceros con fines publicitarios. Para funcionar y para ir más rápido guarda información en tu navegador:",
        },
        {
          kind: "table",
          caption: "Almacenamiento técnico en tu navegador",
          headers: ["Nombre", "Tipo", "Contenido", "Duración"],
          rows: [
            [
              "`miavatar` (base IndexedDB)",
              "Base de datos local",
              "Perfil, pelo, uñas y pruebas guardadas, incluidos sus blobs de imagen",
              "Hasta que borres los datos o la app",
            ],
            [
              "`miavatar:cache:openmeteo:places`",
              "`localStorage`",
              "Nombre y coordenadas de las ciudades que buscaste",
              "24 horas",
            ],
            [
              "`miavatar:cache:openmeteo:forecast`",
              "`localStorage`",
              "Último pronóstico consultado por ciudad",
              "15 minutos (se reutiliza si no hay conexión)",
            ],
            [
              "`miavatar:cache:thecolorapi:advice`",
              "`localStorage`",
              "Paletas de color ya consultadas, sin ninguna foto",
              "30 días",
            ],
            [
              "Caché del service worker",
              "Cache Storage del navegador",
              "Archivos de la app y modelos de visión (unos 27 MB) para abrir sin conexión",
              "Hasta que borres la caché del sitio",
            ],
          ],
        },
        {
          kind: "callout",
          tone: "info",
          title: "Nada de esto sale de tu equipo",
          text: "Estos almacenes son locales al navegador y al dispositivo donde usaste la app. Otra persona con acceso físico a ese dispositivo y a ese navegador podría abrirlos: usa el bloqueo del equipo y borra los datos si compartes el teléfono.",
        },
      ],
    },
    {
      id: "terceros",
      title: "Terceros y transferencias",
      icon: "globe",
      blocks: [
        {
          kind: "list",
          items: [
            "Open-Meteo (pronóstico y geocodificación): recibe el nombre de la ciudad escrita y, si eliges una sugerencia, sus coordenadas. Nunca recibe fotos. Su API pública gratuita está limitada a usos no comerciales (CC BY 4.0).",
            "The Color API (armonías): recibe solo el código hexadecimal del color detectado en tu prenda. Nunca recibe fotos.",
            "Proveedor de alojamiento (por ejemplo, Vercel): sirve los archivos de la app y puede registrar la dirección IP y datos técnicos de la petición, como cualquier servicio web. Las tipografías ya se sirven desde la propia aplicación, así que no se contacta con Google Fonts.",
            "MediaPipe (modelos de visión y WebAssembly): se descargan una sola vez desde la propia aplicación y se ejecutan en tu dispositivo. No reciben imágenes.",
          ],
        },
        {
          kind: "p",
          text: "Estos proveedores pueden procesar datos fuera de tu país (por ejemplo, en Estados Unidos o la Unión Europea). Si eso te preocupa, evita las consultas opcionales: la app funciona completa sin ellas.",
        },
      ],
    },
    {
      id: "conservacion",
      title: "Conservación y borrado",
      icon: "trash",
      blocks: [
        {
          kind: "p",
          text: "No hay plazo impuesto por nosotros: las fotos y pruebas se quedan en tu navegador hasta que las borres. La caché de datos externos caduca sola según la tabla anterior.",
        },
        {
          kind: "p",
          text: "El botón «Borrar todo en este teléfono» elimina de una vez el perfil, las fotos, los peinados, los diseños de uñas, las pruebas guardadas, las cachés de consultas y los resultados derivados que estaban en memoria. También puedes borrar los datos del sitio desde los ajustes del navegador o instalar la app como PWA y desinstalarla, lo que elimina sus almacenes.",
        },
      ],
    },
    {
      id: "derechos",
      title: "Tus derechos",
      icon: "user",
      blocks: [
        {
          kind: "list",
          items: [
            "Acceso: todo lo guardado está en tu dispositivo y se ve en la propia app (Favoritos y cada pestaña).",
            "Rectificación: puedes cambiar o reemplazar cualquier foto, medida o color cuando quieras.",
            "Supresión: borra una prueba concreta desde Favoritos, o todo con el botón de esta página.",
            "Oposición y limitación: basta con no usar las consultas opcionales (color y clima) para que no se comparta nada.",
            "Portabilidad: cada prueba guardada se puede descargar como imagen.",
          ],
        },
        {
          kind: "p",
          text: `Si tu normativa local (por ejemplo, el RGPD en Europa o la LFPDPPP en México) reconoce otros derechos, puedes plantearlos en el repositorio del proyecto: ${CONTACT}. Como no conservamos tus datos, en la mayoría de los casos la respuesta será indicarte exactamente dónde están en tu navegador y cómo borrarlos.`,
        },
      ],
    },
    {
      id: "menores",
      title: "Menores de edad",
      icon: "baby",
      blocks: [
        {
          kind: "p",
          text: "Las opciones «Niño» y «Niña» solo cambian las proporciones de la figura vestida: no cambian nada más ni crean un perfil de un menor. Si la foto es de otra persona, incluidas niñas o niños, súbela solo con su permiso o el de quien tenga la patria potestad o tutela.",
        },
        {
          kind: "p",
          text: "La app no está dirigida a menores de 14 años sin supervisión de una persona adulta: incluye cámaras de fotos y almacenamiento local que conviene explicar.",
        },
      ],
    },
    {
      id: "seguridad",
      title: "Seguridad",
      icon: "lock",
      blocks: [
        {
          kind: "list",
          items: [
            "Las fotos nunca se envían: el análisis de rostro, pelo y mano se ejecuta en el dispositivo con modelos que viajan con la app.",
            "La aplicación se sirve con cabeceras de seguridad (CSP, `nosniff`, política de permisos y referrer restringido) que limitan el código que puede ejecutarse y los destinos a los que se puede conectar.",
            "No hay analítica, publicidad ni scripts de terceros; las tipografías y los modelos se sirven desde el propio dominio.",
            "Los archivos que subes se validan como imagen y se reducen en el dispositivo antes de guardarlos.",
            "El botón de borrado elimina también las cachés, de modo que no queda una copia olvidada de la consulta o del color.",
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Límite que debes conocer",
          text: "La seguridad de tus pruebas depende también de la seguridad de tu dispositivo: quien pueda desbloquear tu teléfono y abrir este navegador puede ver los favoritos guardados. Usa bloqueo con código o biometría y borra los datos si el dispositivo cambia de manos.",
        },
      ],
    },
    {
      id: "cambios",
      title: "Cambios en esta política",
      icon: "history",
      blocks: [
        {
          kind: "p",
          text: "Cada versión se publica con fecha de actualización y número de versión. Si un cambio ampliara los datos que salen del dispositivo, se pediría una acción explícita antes de aplicarlo.",
        },
      ],
    },
    {
      id: "terminos",
      title: "Términos de uso y licencias",
      icon: "scroll",
      blocks: [
        {
          kind: "list",
          items: [
            "Uso previsto: probarte prendas, peinados, tintes y esmalte antes de comprarlos. Es una simulación orientativa, no una promesa de resultado real ni asesoría profesional.",
            "No es un servicio médico: no diagnostica ni mide nada clínicamente.",
            "Si usas la app comercialmente, revisa las condiciones vigentes de Open-Meteo, cuya API pública gratuita se limita a uso no comercial.",
            "Avisos de software de terceros: la extracción de paletas se inspira en Color Thief y quantize.js (MIT), y los modelos de visión son de MediaPipe (Apache 2.0). El detalle está en THIRD_PARTY_NOTICES.md y en public/vision/NOTICE.txt.",
          ],
        },
      ],
    },
  ],
};

/** Texto corto y reutilizable para la primera pantalla y los pies de página. */
export const PRIVACY_PROMISE =
  "Tus fotos se quedan en este dispositivo: se analizan y se guardan aquí, sin cuentas y sin servidores de imágenes.";
