import { useEffect } from "react";
import { registerOfflineCache } from "@/lib/offline";

/** Registra la caché del navegador una sola vez, al cargar la app. */
export function OfflineCache() {
  useEffect(() => {
    registerOfflineCache();
  }, []);

  return null;
}
