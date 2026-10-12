/**
 * Fondo vivo: una malla de luz cálida detrás del contenido.
 *
 * Puro CSS/SVG (sin dependencias ni imágenes que descargar), decorativo y
 * `aria-hidden`, con deriva lenta que se detiene con `prefers-reduced-motion`.
 */
export function Decor() {
  return (
    <div className="decor" aria-hidden="true">
      <span
        className="decor-blob"
        style={{
          width: "46vmax",
          height: "46vmax",
          top: "-14vmax",
          left: "-10vmax",
          background:
            "radial-gradient(circle at 30% 30%, rgba(198,163,106,0.55), transparent 68%)",
          animationDuration: "28s",
        }}
      />
      <span
        className="decor-blob"
        style={{
          width: "40vmax",
          height: "40vmax",
          top: "28vh",
          right: "-16vmax",
          background: "radial-gradient(circle at 60% 40%, rgba(196,107,138,0.34), transparent 70%)",
          animationDuration: "34s",
          animationDelay: "-6s",
        }}
      />
      <span
        className="decor-blob"
        style={{
          width: "38vmax",
          height: "38vmax",
          bottom: "-16vmax",
          left: "18vw",
          background: "radial-gradient(circle at 40% 60%, rgba(122,162,201,0.26), transparent 70%)",
          animationDuration: "40s",
          animationDelay: "-12s",
        }}
      />
      <span className="decor-grain" />
    </div>
  );
}
