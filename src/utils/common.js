// -----------------------------------------------------------------------------
// BLOQUE 1. Utilidades comunes
// Aqui dejo las piezas pequenas que se repiten mucho. Tenerlas juntas evita
// copiar funciones por todos lados y luego olvidarme de corregir una version.
// -----------------------------------------------------------------------------

export function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

export function createId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function roundNumber(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

export function radiansToDegrees(value) {
  return (value * 180) / Math.PI;
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttribute(value) {
  return escapeHtml(value);
}

export function hexToRgba(hex, alpha) {
  const safe = String(hex || "").replace("#", "");
  if (safe.length !== 6) {
    return `rgba(239, 225, 212, ${alpha})`;
  }

  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatArea(value) {
  return `${roundNumber(value, 1)} m²`;
}

export function formatLength(value) {
  return `${roundNumber(value, 1)} m`;
}

export function formatDateTime(value) {
  if (!value) return "sin fecha";

  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}
