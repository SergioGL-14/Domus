// -----------------------------------------------------------------------------
// BLOQUE 1. Constantes del frontend
// Aqui dejo las claves comunes que se repiten bastante. Tenerlas juntas evita
// que luego cambie una y se me quede otra vieja perdida en otro archivo.
// -----------------------------------------------------------------------------

export const STORAGE_KEY = "casabase_studio_v7";
export const STORAGE_META_KEY = "casabase_studio_meta_v1";
export const PERSISTENCE_VERSION = 7;
export const APP_BASE_PATH = getAppBasePath();
export const REMOTE_PROJECT_ENDPOINT = `${APP_BASE_PATH}api/project`;
export const PLAN_CENTIMETERS_PER_METER = 100;
export const MAX_PDF_ATTACHMENT_BYTES = 2_500_000;

export const ENTITY_COLLECTION_KEYS = Object.freeze({
  room: "rooms",
  wall: "walls",
  opening: "openings",
  fixture: "fixtures",
  furniture: "furniture",
});

export const SUPPORT_PANEL_COLLECTION_KEYS = Object.freeze({
  reforms: "reforms",
  notes: "notes",
  budgets: "budgets",
  inventory: "inventory",
  documents: "documents",
});

export const EDITABLE_SUPPORT_PANEL_TYPES = Object.freeze(["reforms", "budgets", "documents"]);

export const FIELD_TAG_NAMES = new Set(["input", "textarea", "select"]);

function getAppBasePath() {
  if (typeof window === "undefined") return "/";

  const injectedBasePath = String(window.__DOMUS_BASE_PATH__ || "");
  if (injectedBasePath) return injectedBasePath.endsWith("/") ? injectedBasePath : `${injectedBasePath}/`;

  const path = window.location.pathname || "/";
  if (path.endsWith("/")) return path;

  const lastSlashIndex = path.lastIndexOf("/");
  const lastPart = path.slice(lastSlashIndex + 1);
  if (lastPart.includes(".")) {
    return path.slice(0, lastSlashIndex + 1) || "/";
  }

  return `${path}/`;
}
