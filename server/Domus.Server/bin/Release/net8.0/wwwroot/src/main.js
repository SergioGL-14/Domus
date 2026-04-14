import { createApp } from "./app/createApp.js";

// -----------------------------------------------------------------------------
// BLOQUE 1. Entrada del frontend
// Este archivo se queda intencionadamente corto. Su trabajo es arrancar la app
// y punto. Todo lo demas vive en modulos con una responsabilidad clara.
// -----------------------------------------------------------------------------

createApp().boot().catch((error) => {
  const banner = document.getElementById("runtimeErrorBanner");
  if (banner) {
    banner.hidden = false;
    banner.textContent = `Error de arranque: ${error?.message || "sin detalle"}`;
  }
});
