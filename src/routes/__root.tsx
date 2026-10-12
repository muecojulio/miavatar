import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { OfflineCache } from "@/components/offline-cache";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppErrorComponent, AppNotFoundComponent } from "@/lib/error-component";
import { useStudio } from "@/lib/store";
import { useEffect } from "react";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "miavatar" },
      { name: "description", content: "Prueba ropa, peinado y uñas sobre tu propia foto, en el teléfono." },
      { name: "theme-color", content: "#141210" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: Root,
  // Una ruta que falle o no exista se ve con la misma identidad visual.
  errorComponent: AppErrorComponent,
  notFoundComponent: AppNotFoundComponent,
});

function Root() {
  const init = useStudio((state) => state.init);
  useEffect(() => {
    void init();
  }, [init]);

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <OfflineCache />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
