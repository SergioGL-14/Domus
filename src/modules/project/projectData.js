import { FIXTURE_PRESETS, FURNITURE_PRESETS } from "../planner/catalogs.js";
import { clone, createId, roundNumber } from "../../utils/common.js";

const MAX_NORMALIZED_PDF_BYTES = 2_500_000;
const PDF_DATA_URL_PREFIX = "data:application/pdf;base64,";

// -----------------------------------------------------------------------------
// BLOQUE 1. Proyecto vacio y normalizacion
// Aqui dejo el esquema real que usa la app. Si el proyecto crece y un dia pasa
// a base de datos o API, esta referencia tiene que seguir siendo clara.
// -----------------------------------------------------------------------------

export function createEmptyProject() {
  const floors = [
    { id: "floor-ground", name: "Planta baja", level: 0, kind: "interior" },
    { id: "floor-upper", name: "Planta alta", level: 1, kind: "interior" },
    { id: "floor-site", name: "Parcela", level: -1, kind: "site" },
  ];

  return {
    project: {
      name: "Domus",
      address: "Plano vacio listo para empezar",
      notes: "Empieza por muros exteriores, luego cierra estancias y despues mete instalaciones y notas.",
      activeFloorId: floors[0].id,
      updatedAt: new Date().toISOString(),
    },
    canvas: {
      width: 2600,
      height: 1600,
      grid: 50,
      snap: true,
      showGrid: true,
      exteriorOnly: false,
    },
    floors,
    rooms: [],
    walls: [],
    openings: [],
    fixtures: [],
    furniture: [],
    customFurniturePresets: [],
    reforms: [],
    inventory: [],
    notes: [],
    budgets: [],
    documents: [],
  };
}

export function normalizeProject(raw) {
  const base = createEmptyProject();
  if (!raw || typeof raw !== "object") return base;

  const floors = Array.isArray(raw.floors)
    ? raw.floors.map(normalizeFloor).filter(Boolean)
    : base.floors;
  const safeFloors = floors.length ? floors : base.floors;
  const activeFloorId = String(raw.project?.activeFloorId || base.project.activeFloorId);
  const safeActiveFloorId = safeFloors.some((floor) => floor.id === activeFloorId)
    ? activeFloorId
    : safeFloors[0].id;
  const customFurniturePresets = Array.isArray(raw.customFurniturePresets)
    ? raw.customFurniturePresets.map(normalizeCustomFurniturePreset).filter(Boolean)
    : base.customFurniturePresets;
  const furnitureCatalog = [...FURNITURE_PRESETS, ...customFurniturePresets];
  const floorIds = new Set(safeFloors.map((floor) => floor.id));
  const keepKnownFloor = (entry) => floorIds.has(entry.floorId);
  const rooms = normalizeCollection(raw.rooms, normalizeRoom, base.rooms).filter(keepKnownFloor);
  const roomIds = new Set(rooms.map((room) => room.id));
  const keepKnownRoom = (entry) => clearMissingRoomLink(entry, roomIds);
  const reforms = normalizeCollection(raw.reforms, normalizeReform, base.reforms)
    .filter(keepKnownFloor)
    .map(keepKnownRoom);
  const reformIds = new Set(reforms.map((reform) => reform.id));
  const keepKnownReform = (entry) => clearMissingReformLink(entry, reformIds);
  const notes = normalizeCollection(raw.notes, normalizeNote, base.notes)
    .filter(keepKnownFloor)
    .map(keepKnownRoom)
    .map(keepKnownReform);
  const noteIds = new Set(notes.map((note) => note.id));

  return {
    project: {
      ...base.project,
      ...(raw.project || {}),
      name: normalizeProjectName(raw.project?.name, base.project.name),
      activeFloorId: safeActiveFloorId,
    },
    canvas: {
      ...base.canvas,
      ...(raw.canvas || {}),
    },
    floors: safeFloors,
    rooms,
    walls: normalizeCollection(raw.walls, normalizeWall, base.walls).filter(keepKnownFloor),
    openings: normalizeCollection(raw.openings, normalizeOpening, base.openings).filter(keepKnownFloor),
    fixtures: normalizeCollection(raw.fixtures, normalizeFixture, base.fixtures).filter(keepKnownFloor),
    furniture: normalizeCollection(
      raw.furniture,
      (piece) => normalizeFurniture(piece, furnitureCatalog),
      base.furniture,
    ).filter(keepKnownFloor),
    customFurniturePresets,
    reforms,
    inventory: normalizeCollection(raw.inventory, normalizeInventory, base.inventory)
      .filter(keepKnownFloor)
      .map(keepKnownRoom),
    notes,
    budgets: normalizeCollection(raw.budgets, normalizeBudget, base.budgets)
      .filter(keepKnownFloor)
      .map(keepKnownRoom)
      .map(keepKnownReform)
      .map((entry) => clearMissingLinkedNote(entry, noteIds)),
    documents: normalizeCollection(raw.documents, normalizeDocument, base.documents)
      .filter(keepKnownFloor)
      .map(keepKnownRoom)
      .map(keepKnownReform),
  };
}

function normalizeCollection(rawCollection, normalizeEntry, fallback) {
  return Array.isArray(rawCollection)
    ? rawCollection.map(normalizeEntry).filter(Boolean)
    : fallback;
}

function clearMissingRoomLink(entry, roomIds) {
  if (!entry.roomId || roomIds.has(entry.roomId)) return entry;
  return { ...entry, roomId: "" };
}

function clearMissingReformLink(entry, reformIds) {
  if (!entry.reformId || reformIds.has(entry.reformId)) return entry;
  return { ...entry, reformId: "" };
}

function clearMissingLinkedNote(entry, noteIds) {
  if (!entry.linkedNoteId || noteIds.has(entry.linkedNoteId)) return entry;
  return { ...entry, linkedNoteId: "" };
}

function normalizeProjectName(value, fallback = "Domus") {
  const name = String(value || fallback).trim() || fallback;
  const oldBrandName = ["mil", "vik"].join("");
  return name.toLowerCase().includes("casabase") || name.toLowerCase().includes(oldBrandName) ? fallback : name;
}

function normalizeFloor(floor) {
  if (!floor) return null;

  return {
    id: String(floor.id || createId("floor")),
    name: String(floor.name || "Nueva planta"),
    level: Number(floor.level || 0),
    kind: ["interior", "site"].includes(floor.kind) ? floor.kind : "interior",
  };
}

function normalizeRoom(room) {
  if (!room || !Array.isArray(room.points) || room.points.length < 3) return null;

  return {
    id: String(room.id || createId("room")),
    floorId: String(room.floorId || "floor-ground"),
    zone: room.zone === "exterior" ? "exterior" : "interior",
    name: String(room.name || "Nueva estancia"),
    type: String(room.type || "Comun"),
    color: String(room.color || "#efe1d4"),
    notes: String(room.notes || ""),
    points: room.points.map((point) => ({
      x: roundNumber(Number(point.x || 0)),
      y: roundNumber(Number(point.y || 0)),
    })),
  };
}

function normalizeWall(wall) {
  if (!wall) return null;

  return {
    id: String(wall.id || createId("wall")),
    floorId: String(wall.floorId || "floor-ground"),
    zone: wall.zone === "exterior" ? "exterior" : "interior",
    name: String(wall.name || "Muro"),
    kind: String(wall.kind || "Interior"),
    x1: roundNumber(Number(wall.x1 || 0)),
    y1: roundNumber(Number(wall.y1 || 0)),
    x2: roundNumber(Number(wall.x2 || 0)),
    y2: roundNumber(Number(wall.y2 || 0)),
    thickness: roundNumber(Number(wall.thickness || 16)),
    notes: String(wall.notes || ""),
  };
}

function normalizeOpening(opening) {
  if (!opening) return null;

  return {
    id: String(opening.id || createId("opening")),
    floorId: String(opening.floorId || "floor-ground"),
    zone: opening.zone === "exterior" ? "exterior" : "interior",
    type: opening.type === "window" ? "window" : "door",
    name: String(opening.name || "Hueco"),
    x: roundNumber(Number(opening.x || 0)),
    y: roundNumber(Number(opening.y || 0)),
    angle: roundNumber(Number(opening.angle || 0)),
    width: roundNumber(Number(opening.width || 100)),
    swing: Number(opening.swing || 1) === -1 ? -1 : 1,
    notes: String(opening.notes || ""),
  };
}

function normalizeFixture(fixture) {
  if (!fixture) return null;
  const system = ["electricity", "water", "network"].includes(fixture.system) ? fixture.system : "electricity";
  const fallback = FIXTURE_PRESETS[system][0];

  return {
    id: String(fixture.id || createId("fixture")),
    floorId: String(fixture.floorId || "floor-ground"),
    zone: fixture.zone === "exterior" ? "exterior" : fallback.zone,
    system,
    variant: String(fixture.variant || fallback.id),
    name: String(fixture.name || fallback.name),
    glyph: String(fixture.glyph || fallback.glyph),
    x: roundNumber(Number(fixture.x || 0)),
    y: roundNumber(Number(fixture.y || 0)),
    angle: roundNumber(Number(fixture.angle || 0)),
    status: ["ok", "attention", "critical"].includes(fixture.status) ? fixture.status : fallback.status,
    notes: String(fixture.notes || ""),
  };
}

function normalizeCustomFurniturePreset(preset) {
  if (!preset) return null;

  return {
    id: String(preset.id || createId("furnpreset")),
    label: String(preset.label || preset.name || "Mueble"),
    name: String(preset.name || preset.label || "Mueble"),
    width: roundNumber(Number(preset.width || 100)),
    height: roundNumber(Number(preset.height || 100)),
    shape: preset.shape === "round" ? "round" : "rounded",
    zone: preset.zone === "exterior" ? "exterior" : "interior",
    isCustom: true,
  };
}

function normalizeFurniture(piece, presets = FURNITURE_PRESETS) {
  if (!piece) return null;
  const preset = presets.find((entry) => entry.id === piece.preset) || presets[0] || FURNITURE_PRESETS[0];

  return {
    id: String(piece.id || createId("furniture")),
    floorId: String(piece.floorId || "floor-ground"),
    zone: piece.zone === "exterior" ? "exterior" : preset.zone,
    preset: preset.id,
    name: String(piece.name || preset.name),
    x: roundNumber(Number(piece.x || 0)),
    y: roundNumber(Number(piece.y || 0)),
    width: roundNumber(Number(piece.width || preset.width)),
    height: roundNumber(Number(piece.height || preset.height)),
    angle: roundNumber(Number(piece.angle || 0)),
    shape: piece.shape === "round" ? "round" : preset.shape,
    notes: String(piece.notes || ""),
  };
}

function normalizeInventory(item) {
  if (!item) return null;

  const safeState = item.state === "review"
    ? "attention"
    : item.state === "replace"
      ? "critical"
      : item.state;

  return {
    id: String(item.id || createId("inventory")),
    floorId: String(item.floorId || "floor-ground"),
    roomId: String(item.roomId || ""),
    linkedId: String(item.linkedId || ""),
    name: String(item.name || "Elemento"),
    category: String(item.category || "General"),
    state: ["ok", "attention", "critical"].includes(safeState) ? safeState : "ok",
    value: roundNumber(Number(item.value || 0)),
    notes: String(item.notes || ""),
  };
}

function normalizeNote(note) {
  if (!note) return null;

  return {
    id: String(note.id || createId("note")),
    floorId: String(note.floorId || "floor-ground"),
    roomId: String(note.roomId || ""),
    reformId: String(note.reformId || ""),
    kind: note.kind === "improvement" ? "improvement" : "issue",
    priority: ["high", "medium", "low"].includes(note.priority) ? note.priority : "medium",
    status: ["open", "monitoring", "done"].includes(note.status) ? note.status : "open",
    title: String(note.title || "Nota nueva"),
    estimatedCost: roundNumber(Number(note.estimatedCost || 0)),
    notes: String(note.notes || ""),
  };
}

function normalizeReform(reform) {
  if (!reform) return null;

  const safeKind = reform.kind === "issue" ? "issue" : "improvement";

  return {
    id: String(reform.id || createId("reform")),
    floorId: String(reform.floorId || "floor-ground"),
    roomId: String(reform.roomId || ""),
    kind: safeKind,
    priority: ["high", "medium", "low"].includes(reform.priority) ? reform.priority : "medium",
    status: ["planned", "in_progress", "done"].includes(reform.status) ? reform.status : "planned",
    title: String(reform.title || "Reforma"),
    notes: String(reform.notes || ""),
  };
}

function normalizeBudget(budget) {
  if (!budget) return null;

  const safeStatus = budget.status === "accepted" ? "approved" : budget.status;

  return {
    id: String(budget.id || createId("budget")),
    floorId: String(budget.floorId || "floor-ground"),
    roomId: String(budget.roomId || ""),
    reformId: String(budget.reformId || ""),
    linkedNoteId: String(budget.linkedNoteId || ""),
    title: String(budget.title || "Presupuesto"),
    amount: roundNumber(Number(budget.amount || 0)),
    status: ["draft", "requested", "approved", "rejected"].includes(safeStatus) ? safeStatus : "draft",
    supplier: String(budget.supplier || ""),
    notes: String(budget.notes || ""),
    pdf: normalizePdfAttachment(budget.pdf),
  };
}

function normalizeDocument(doc) {
  if (!doc) return null;

  return {
    id: String(doc.id || createId("doc")),
    floorId: String(doc.floorId || "floor-ground"),
    roomId: String(doc.roomId || ""),
    reformId: String(doc.reformId || ""),
    title: String(doc.title || "Documento"),
    type: String(doc.type || "General"),
    reference: String(doc.reference || ""),
    notes: String(doc.notes || ""),
    pdf: normalizePdfAttachment(doc.pdf),
  };
}

function normalizePdfAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") return null;

  const dataUrl = String(attachment.dataUrl || "");
  if (!isSafePdfDataUrl(dataUrl)) return null;

  const size = roundNumber(Number(attachment.size || estimatePdfDataUrlBytes(dataUrl)));
  if (size > MAX_NORMALIZED_PDF_BYTES) return null;

  return {
    name: String(attachment.name || "adjunto.pdf"),
    mimeType: "application/pdf",
    size,
    dataUrl,
  };
}

function isSafePdfDataUrl(dataUrl) {
  if (!dataUrl.startsWith(PDF_DATA_URL_PREFIX)) return false;
  const payload = dataUrl.slice(PDF_DATA_URL_PREFIX.length);
  return Boolean(payload) && /^[A-Za-z0-9+/=]+$/.test(payload);
}

function estimatePdfDataUrlBytes(dataUrl) {
  const payload = dataUrl.slice(PDF_DATA_URL_PREFIX.length);
  if (!payload) return 0;
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

export function buildNewFloor(label, level, kind = "interior") {
  return {
    id: createId("floor"),
    name: label || "Nueva planta",
    level: Number(level || 0),
    kind,
  };
}

export function cloneFloorContent(project, sourceFloorId, newFloorId, newFloorName, newLevel) {
  const nextProject = clone(project);
  const newFloor = {
    id: newFloorId,
    name: newFloorName,
    level: newLevel,
    kind: nextProject.floors.find((floor) => floor.id === sourceFloorId)?.kind || "interior",
  };

  nextProject.floors.push(newFloor);

  nextProject.rooms
    .filter((room) => room.floorId === sourceFloorId)
    .forEach((room) => nextProject.rooms.push({
      ...clone(room),
      id: createId("room"),
      floorId: newFloorId,
      name: `${room.name} copia`,
    }));

  nextProject.walls
    .filter((wall) => wall.floorId === sourceFloorId)
    .forEach((wall) => nextProject.walls.push({
      ...clone(wall),
      id: createId("wall"),
      floorId: newFloorId,
    }));

  nextProject.openings
    .filter((opening) => opening.floorId === sourceFloorId)
    .forEach((opening) => nextProject.openings.push({
      ...clone(opening),
      id: createId("opening"),
      floorId: newFloorId,
    }));

  nextProject.fixtures
    .filter((fixture) => fixture.floorId === sourceFloorId)
    .forEach((fixture) => nextProject.fixtures.push({
      ...clone(fixture),
      id: createId("fixture"),
      floorId: newFloorId,
    }));

  nextProject.furniture
    .filter((piece) => piece.floorId === sourceFloorId)
    .forEach((piece) => nextProject.furniture.push({
      ...clone(piece),
      id: createId("furniture"),
      floorId: newFloorId,
    }));

  return nextProject;
}
