import { getAppElements } from "./dom.js";
import { createAppState } from "./state.js";
import { createRenderer } from "./render.js";
import { createEditor } from "./editor.js";

// -----------------------------------------------------------------------------
// BLOQUE 1. Composicion de la app
// Aqui junto estado, render e interaccion. Lo hago en un solo sitio para que
// quede claro que piezas tiene la aplicacion y en que orden se montan.
// -----------------------------------------------------------------------------

export function createApp() {
  const app = {
    els: getAppElements(),
  };

  Object.assign(app, createAppState(app));
  Object.assign(app, createRenderer(app));
  Object.assign(app, createEditor(app));

  app.boot = async function boot() {
    await app.hydratePersistedData();
    app.ensureActiveFloor();
    app.ensureViewport();
    app.setupFloorForm();
    app.bindBaseEvents();
    app.render();
  };

  return app;
}
