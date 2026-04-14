import {
  FIXTURE_PRESETS,
  FLOOR_TEMPLATES,
  FURNITURE_PRESETS,
} from "../modules/planner/catalogs.js";
import {
  createEmptyProject,
  normalizeProject,
} from "../modules/project/projectData.js";
import {
  clone,
  formatDateTime,
  roundNumber,
} from "../utils/common.js";
import { pointInPolygon } from "../modules/planner/geometry.js";
import {
  ENTITY_COLLECTION_KEYS,
  FIELD_TAG_NAMES,
  PERSISTENCE_VERSION,
  REMOTE_PROJECT_ENDPOINT,
  STORAGE_META_KEY,
  STORAGE_KEY,
} from "./constants.js";

// -----------------------------------------------------------------------------
// BLOQUE 1. Estado y persistencia
// Aqui separo lo que es dato real de lo que es interfaz momentanea. Si un dia
// cambia la vista o entra API, esta parte tiene que seguir siendo legible.
// -----------------------------------------------------------------------------

export function createAppState(app) {
  const state = {
    data: loadData(),
    ui: {
      route: "home",
      panel: "inspector",
      supportModalPanel: "",
      supportModalItemId: "",
      supportDetailItem: null,
      tool: "select",
      search: "",
      globalSearchOpen: false,
      globalSearchActiveIndex: -1,
      supportSearch: "",
      reformsSearch: "",
      budgetsSearch: "",
      documentsSearch: "",
      homeFilterOpen: false,
      reformsFilterOpen: false,
      budgetsFilterOpen: false,
      documentsFilterOpen: false,
      selected: null,
      multiSelected: new Set(),
      selectMode: "select",
      draft: { type: null, points: [] },
      hoverPoint: null,
      pointer: {
        down: false,
        moved: false,
        mode: null,
        pointerId: null,
        startClient: null,
        viewStart: null,
        dragSnapshots: null,
        dragHistoryPushed: false,
        rotateCenter: null,
        rotateEntityStartAngle: 0,
        rotatePointerStartAngle: 0,
        boxStart: null,
        boxEnd: null,
      },
      viewport: null,
      homeViewport: null,
      homeViewportKey: "",
      layers: new Set(["rooms", "walls", "openings", "fixtures", "furniture", "labels"]),
      presets: {
        room: "living",
        wall: "partition",
        door: "micro-door",
        window: "window-50",
        electricity: "outlet",
        water: "water-point",
        network: "router",
        furniture: "sofa",
      },
    },
  };

  const history = {
    past: [],
    future: [],
    max: 50,
  };

  const remotePersistence = {
    available: null,
    saveTimer: null,
    lastPayload: "",
    warned: false,
  };

  function pushHistory() {
    history.past.push(clone(state.data));
    history.future = [];
    if (history.past.length > history.max) {
      history.past.shift();
    }
  }

  function undo() {
    if (!history.past.length) return;
    history.future.push(clone(state.data));
    state.data = history.past.pop();
    saveData(false);
    app.render();
    app.showToast("Deshacer");
  }

  function redo() {
    if (!history.future.length) return;
    history.past.push(clone(state.data));
    state.data = history.future.pop();
    saveData(false);
    app.render();
    app.showToast("Rehacer");
  }

  function commit(mutator) {
    pushHistory();
    mutator();
    saveData();
    app.render();
  }

  async function hydratePersistedData() {
    if (!canUseRemotePersistence()) return false;

    try {
      const response = await fetch(REMOTE_PROJECT_ENDPOINT, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (response.status === 204) {
        remotePersistence.available = true;
        return false;
      }

      if (response.status === 404) {
        remotePersistence.available = false;
        return false;
      }

      if (!response.ok) {
        remotePersistence.available = false;
        return false;
      }

      state.data = normalizeProject(await response.json());
      remotePersistence.available = true;
      saveData(false, { skipRemote: true });
      return true;
    } catch {
      remotePersistence.available = false;
      return false;
    }
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeProject(JSON.parse(raw)) : createEmptyProject();
    } catch {
      return createEmptyProject();
    }
  }

  function saveData(updateTimestamp = true, options = {}) {
    if (updateTimestamp) {
      state.data.project.updatedAt = new Date().toISOString();
    }

    const payload = JSON.stringify(state.data);
    let localSaved = true;

    try {
      localStorage.setItem(STORAGE_KEY, payload);
      writePersistenceMeta(payload);
    } catch {
      localSaved = false;
      app.showToast?.("No se pudo guardar en este navegador. Si la API esta activa, se intentara guardar en el servidor.");
    }

    if (!options.skipRemote) {
      queueRemoteSave(payload);
    }

    app.flashAutosave?.();
    return localSaved;
  }

  function canUseRemotePersistence() {
    return typeof fetch === "function"
      && typeof window !== "undefined"
      && ["http:", "https:"].includes(window.location.protocol);
  }

  function queueRemoteSave(payload) {
    if (!canUseRemotePersistence()) return;
    if (remotePersistence.available === false) return;

    remotePersistence.lastPayload = payload;
    clearTimeout(remotePersistence.saveTimer);
    remotePersistence.saveTimer = setTimeout(() => {
      void flushRemoteSave();
    }, 350);
  }

  async function flushRemoteSave() {
    if (!remotePersistence.lastPayload) return;

    const payload = remotePersistence.lastPayload;
    try {
      const response = await fetch(REMOTE_PROJECT_ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      remotePersistence.available = response.ok;
      if (response.ok) {
        remotePersistence.lastPayload = "";
        remotePersistence.warned = false;
      } else {
        warnRemotePersistenceOnce();
      }
    } catch {
      remotePersistence.available = false;
      warnRemotePersistenceOnce();
    }
  }

  function warnRemotePersistenceOnce() {
    if (remotePersistence.warned) return;
    remotePersistence.warned = true;
    app.showToast?.("Guardado local activo. La API del servidor no responde.");
  }

  function writePersistenceMeta(payload) {
    try {
      localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
        version: PERSISTENCE_VERSION,
        savedAt: state.data.project.updatedAt,
        bytes: getPayloadBytes(payload),
      }));
    } catch {
      // Si el navegador bloquea estos datos auxiliares, el guardado principal ya esta hecho.
    }
  }

  function getPayloadBytes(payload) {
    if (typeof Blob !== "undefined") {
      return new Blob([payload]).size;
    }

    return String(payload || "").length;
  }

  function ensureActiveFloor() {
    if (state.data.floors.some((floor) => floor.id === state.data.project.activeFloorId)) return;
    state.data.project.activeFloorId = state.data.floors[0]?.id || "";
  }

  function getActiveFloor() {
    return state.data.floors.find((floor) => floor.id === state.data.project.activeFloorId)
      || state.data.floors[0]
      || null;
  }

  function getOrderedFloors() {
    return state.data.floors
      .map((floor, index) => ({ floor, index }))
      .sort((left, right) => {
        const levelDiff = left.floor.level - right.floor.level;
        if (levelDiff !== 0) return levelDiff;

        if (left.floor.kind !== right.floor.kind) {
          return left.floor.kind === "site" ? -1 : 1;
        }

        return left.index - right.index;
      })
      .map(({ floor }) => floor);
  }

  function getAdjacentFloor(offset, floorId = state.data.project.activeFloorId) {
    const orderedFloors = getOrderedFloors();
    const currentIndex = orderedFloors.findIndex((floor) => floor.id === floorId);
    if (currentIndex < 0) return null;
    return orderedFloors[currentIndex + offset] || null;
  }

  function getSelectedFloorTemplate() {
    const selectedId = app.els.floorTemplateInput?.value || FLOOR_TEMPLATES[0]?.id || "";
    return FLOOR_TEMPLATES.find((template) => template.id === selectedId)
      || FLOOR_TEMPLATES[0]
      || null;
  }

  function getSuggestedFloorLevel(kind) {
    if (kind === "site") {
      const levels = state.data.floors
        .filter((floor) => floor.kind === "site")
        .map((floor) => floor.level);
      return levels.length ? Math.min(...levels) - 1 : -1;
    }

    const levels = state.data.floors
      .filter((floor) => floor.kind !== "site")
      .map((floor) => floor.level);
    return levels.length ? Math.max(...levels) + 1 : 0;
  }

  function getAllFurniturePresets() {
    return [...FURNITURE_PRESETS, ...(state.data.customFurniturePresets || [])];
  }

  function getFurnitureFloorZone() {
    return getActiveFloor()?.kind === "site" ? "exterior" : "interior";
  }

  function getFurniturePresetsForActiveFloor() {
    const zone = getFurnitureFloorZone();
    return getAllFurniturePresets().filter((preset) => preset.zone === zone);
  }

  function getFurniturePresetById(presetId) {
    return getAllFurniturePresets().find((entry) => entry.id === presetId) || null;
  }

  function ensureValidPresetForTool(tool) {
    if (tool !== "furniture") return;

    const presets = getFurniturePresetsForActiveFloor();
    if (!presets.length) return;
    if (presets.some((preset) => preset.id === state.ui.presets.furniture)) return;

    state.ui.presets.furniture = presets[0].id;
  }

  function getCollectionForType(type) {
    const collectionKey = ENTITY_COLLECTION_KEYS[type];
    return collectionKey ? state.data[collectionKey] : [];
  }

  function getSelectedEntity() {
    if (!state.ui.selected) return null;
    const entity = getCollectionForType(state.ui.selected.type)
      .find((entry) => entry.id === state.ui.selected.id);
    return entity ? { type: state.ui.selected.type, entity } : null;
  }

  function getSelectedRoom() {
    const selected = getSelectedEntity();
    return selected?.type === "room" ? selected.entity : null;
  }

  function applyInspectorField(type, entity, field, rawValue) {
    const numericFields = new Set(["x", "y", "x1", "y1", "x2", "y2", "width", "height", "angle", "thickness"]);
    const value = numericFields.has(field) ? roundNumber(Number(rawValue || 0)) : rawValue;

    if (type === "furniture" && field === "preset") {
      const preset = getFurniturePresetById(rawValue);
      if (!preset) return;
      entity.preset = preset.id;
      entity.name = preset.name;
      entity.width = preset.width;
      entity.height = preset.height;
      entity.shape = preset.shape;
      entity.zone = preset.zone;
      return;
    }

    if (type === "fixture" && field === "system") {
      const preset = FIXTURE_PRESETS[rawValue]?.[0];
      if (!preset) return;
      entity.system = rawValue;
      entity.variant = preset.id;
      entity.name = preset.name;
      entity.glyph = preset.glyph;
      entity.status = preset.status;
      entity.zone = preset.zone;
      return;
    }

    if (type === "fixture" && field === "variant") {
      const preset = (FIXTURE_PRESETS[entity.system] || []).find((entry) => entry.id === rawValue);
      if (!preset) return;
      entity.variant = preset.id;
      entity.name = preset.name;
      entity.glyph = preset.glyph;
      entity.zone = preset.zone;
      return;
    }

    entity[field] = value;
  }

  function isVisibleEntity(entity) {
    if (entity.floorId !== state.data.project.activeFloorId) return false;
    if (state.data.canvas.exteriorOnly && (entity.zone || "interior") !== "exterior") return false;
    return true;
  }

  function getVisibleRooms() {
    return state.data.rooms.filter((room) => isVisibleEntity(room));
  }

  function getVisibleWalls() {
    return state.data.walls.filter((wall) => isVisibleEntity(wall));
  }

  function getVisibleOpenings() {
    return state.data.openings.filter((opening) => isVisibleEntity(opening));
  }

  function getVisibleFixtures() {
    return state.data.fixtures.filter((fixture) => isVisibleEntity(fixture));
  }

  function getVisibleFurniture() {
    return state.data.furniture.filter((item) => isVisibleEntity(item));
  }

  function getReferenceFloorIds(activeFloor = getActiveFloor()) {
    if (!activeFloor) return new Set();

    if (activeFloor.kind !== "site") {
      return new Set(
        state.data.floors
          .filter((floor) => floor.kind === "site")
          .map((floor) => floor.id),
      );
    }

    const interiorFloor = getClosestInteriorReferenceFloor(activeFloor);
    return interiorFloor ? new Set([interiorFloor.id]) : new Set();
  }

  function getClosestInteriorReferenceFloor(activeFloor) {
    const interiorFloors = state.data.floors.filter((floor) => floor.kind !== "site");
    if (!interiorFloors.length) return null;

    const nextHigherFloor = interiorFloors
      .filter((floor) => floor.level > activeFloor.level)
      .sort((left, right) => left.level - right.level)[0];

    if (nextHigherFloor) return nextHigherFloor;

    return [...interiorFloors].sort((left, right) => {
      const distance = Math.abs(left.level - activeFloor.level) - Math.abs(right.level - activeFloor.level);
      if (distance !== 0) return distance;
      return left.level - right.level;
    })[0] || null;
  }

  function getReferenceRooms() {
    const floorIds = getReferenceFloorIds();
    if (!floorIds.size) return [];
    return state.data.rooms.filter((room) => floorIds.has(room.floorId));
  }

  function getReferenceWalls() {
    const floorIds = getReferenceFloorIds();
    if (!floorIds.size) return [];
    return state.data.walls.filter((wall) => floorIds.has(wall.floorId));
  }

  function inferRoomFromPoint(x, y) {
    const floorId = state.data.project.activeFloorId;
    return state.data.rooms
      .filter((room) => room.floorId === floorId)
      .find((room) => pointInPolygon({ x, y }, room.points))
      || null;
  }

  function inferZoneFromPoint(point) {
    return inferRoomFromPoint(point.x, point.y)?.zone
      || (getActiveFloor()?.kind === "site" ? "exterior" : "interior");
  }

  function selectEntity(type, id, options = {}) {
    state.ui.selected = { type, id };
    state.ui.panel = "inspector";
    if (options.clearMulti !== false) {
      state.ui.multiSelected.clear();
    }
    if (options.render !== false) {
      app.render();
    }
  }

  function clearSelection(options = {}) {
    state.ui.selected = null;
    state.ui.multiSelected.clear();
    if (options.render !== false) {
      app.render();
    }
  }

  function deleteEntity(type, id) {
    const collection = getCollectionForType(type);
    const index = collection.findIndex((entry) => entry.id === id);
    if (index < 0) return false;

    collection.splice(index, 1);
    state.ui.multiSelected.delete(`${type}:${id}`);

    if (state.ui.selected?.type === type && state.ui.selected?.id === id) {
      state.ui.selected = null;
    }

    return true;
  }

  function deleteSelected() {
    const selected = getSelectedEntity();
    if (!selected) return;

    commit(() => {
      deleteEntity(selected.type, selected.entity.id);
    });
  }

  function toggleSnap() {
    state.data.canvas.snap = !state.data.canvas.snap;
    saveData(false);
    app.render();
  }

  function isTypingTarget(target) {
    const tagName = String(target?.tagName || "").toLowerCase();
    return FIELD_TAG_NAMES.has(tagName);
  }

  function getFormattedUpdatedAt() {
    return formatDateTime(state.data.project.updatedAt);
  }

  return {
    state,
    history,
    pushHistory,
    undo,
    redo,
    commit,
    hydratePersistedData,
    loadData,
    saveData,
    ensureActiveFloor,
    getActiveFloor,
    getOrderedFloors,
    getAdjacentFloor,
    getSelectedFloorTemplate,
    getSuggestedFloorLevel,
    getAllFurniturePresets,
    getFurnitureFloorZone,
    getFurniturePresetsForActiveFloor,
    getFurniturePresetById,
    ensureValidPresetForTool,
    getCollectionForType,
    getSelectedEntity,
    getSelectedRoom,
    applyInspectorField,
    isVisibleEntity,
    getVisibleRooms,
    getVisibleWalls,
    getVisibleOpenings,
    getVisibleFixtures,
    getVisibleFurniture,
    getReferenceFloorIds,
    getClosestInteriorReferenceFloor,
    getReferenceRooms,
    getReferenceWalls,
    inferRoomFromPoint,
    inferZoneFromPoint,
    selectEntity,
    clearSelection,
    deleteEntity,
    deleteSelected,
    toggleSnap,
    isTypingTarget,
    getFormattedUpdatedAt,
  };
}
