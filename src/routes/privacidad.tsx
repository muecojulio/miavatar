import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui";
import { useStudio } from "@/lib/store";

export const Route = createFileRoute("/privacidad")({ component: Privacy });

function Privacy() {
  return <PrivacyPanel standalone />;
}

export function PrivacyPanel({ standalone = false }: { standalone?: boolean }) {
  const wipe = useStudio((state) => state.wipe);
  const note = useStudio((state) => state.note);

  return (
    <section
      className={standalone ? "mx-auto min-h-dvh max-w-md space-y-6 px-4 py-6" : "panel space-y-6"}
    >
      <header className="flex items-center justify-between">
        <p className="font-display text-3xl">Privacidad</p>
        {standalone ? (
          <Link to="/" className="tap min-h-11 text-sm text-muted">
            Volver
          </Link>
        ) : null}
      </header>
      <div className="space-y-4 text-sm leading-relaxed text-muted">
        <p className="text-fg">Tus fotos se quedan en este teléfono.</p>
        <p>
          miavatar no crea una cuenta y no envía tu cara, tu cuerpo, tu ropa, tu pelo ni tu mano a
          un servidor. El recorte, el color y la prueba se calculan en el propio aparato.
        </p>
        <p>
          Los favoritos viven en una base local del navegador, con índices por tipo y por fecha,
          para abrirlos rápido. También hay una memoria temporal de los recortes mientras usas la
          app. Nadie más puede leerlos.
        </p>
        <p>
          La primera apertura usa modelos de visión que ya viajan con la aplicación. Sirven para
          encontrar la cara, el pelo y la mano. No suben la imagen.
        </p>
        <p>
          No conectamos esta prueba con automatizaciones ni con servicios que pedirían tu foto. Eso
          sería entregar un dato biométrico a un tercero.
        </p>
        <p>
          Si la foto es de otra persona, incluidas niñas o niños, hazlo solo con su permiso o el de
          quien corresponda. La opción de niño o niña solo cambia las proporciones de la figura
          vestida.
        </p>
        <p>
          Puedes borrar cara, prendas, peinados, uñas y favoritos de este dispositivo cuando
          quieras.
        </p>
      </div>
      {note ? (
        <p role="status" className="text-sm text-accent">
          {note}
        </p>
      ) : null}
      <Button variant="ghost" onClick={() => void wipe()}>
        Borrar todo en este teléfono
      </Button>
    </section>
  );
}
