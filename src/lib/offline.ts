import { previewPathPrefix } from "@/lib/preview-path-prefix";

/**
 * Caché del navegador (service worker).
 *
 * Sólo se registra en la compilación de producción: en desarrollo estorbaría al
 * recargado en caliente. Guarda los archivos con huella y los modelos de visión
 * para que la app abra sin conexión, y nunca guarda fotos del usuario.
 */

export function swPrefix(): string {
  if (typeof window === "undefined") return "";
  return previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
}

export function registerOfflineCache(): void {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const prefix = swPrefix();
  const register = () => {
    void navigator.serviceWorker
      .register(`${prefix}/sw.js`, { scope: `${prefix}/` })
      .catch(() => undefined);
  };
  if (typeof document === "undefined" || document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

/** Borra la caché del service worker: forma parte del borrado total de datos. */
export async function clearOfflineCaches(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration(swPrefix() || "/");
    registration?.active?.postMessage({ type: "clear-caches" });
  } catch {
    // Sin service worker activo no hay nada que limpiar.
  }
}
