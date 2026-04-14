import {
  FIXTURE_PRESETS,
  LAYER_DEFINITIONS,
  OPENING_PRESETS,
  ROOM_PRESETS,
  TOOL_DEFINITIONS,
  TOOL_GROUP_DEFINITIONS,
  WALL_PRESETS,
} from "../modules/planner/catalogs.js";
import {
  distanceBetween,
  getDoorGeometry,
  getOpeningVector,
  getPolygonCentroid,
  getRoomArea,
  getWallLength,
} from "../modules/planner/geometry.js";
import {
  escapeAttribute,
  escapeHtml,
  formatArea,
  formatCurrency,
  formatLength,
  hexToRgba,
  roundNumber,
} from "../utils/common.js";
import {
  EDITABLE_SUPPORT_PANEL_TYPES,
  PLAN_CENTIMETERS_PER_METER,
  SUPPORT_PANEL_COLLECTION_KEYS,
} from "./constants.js";

const REFORM_KIND_LABELS = Object.freeze({
  issue: "Incidencia",
  improvement: "Mejora",
});

const REFORM_PRIORITY_LABELS = Object.freeze({
  high: "Alta",
  medium: "Media",
  low: "Baja",
});

const REFORM_STATUS_LABELS = Object.freeze({
  planned: "Planificada",
  in_progress: "En curso",
  done: "Hecha",
});

const BUDGET_STATUS_LABELS = Object.freeze({
  draft: "Borrador",
  requested: "Pedido",
  approved: "Aprobado",
  rejected: "Rechazado",
});

const INVENTORY_STATE_LABELS = Object.freeze({
  ok: "En uso · ok",
  attention: "A revisar",
  critical: "Para reemplazar",
});

const GLOBAL_SEARCH_LIMIT = 14;

const GLOBAL_SEARCH_KIND_LABELS = Object.freeze({
  floor: "Planta",
  room: "Estancia",
  reform: "Reforma",
  note: "Nota",
  budget: "Presupuesto",
  document: "Documento",
  inventory: "Inventario",
  wall: "Muro",
  opening: "Hueco",
  fixture: "Instalacion",
  furniture: "Mueble",
});

// -----------------------------------------------------------------------------
// BLOQUE 1. Render y vista
// Aqui vive la parte visual. La idea es que este archivo pinte, formatee y
// actualice la interfaz, pero no cargue con toda la logica de negocio.
// -----------------------------------------------------------------------------

export function createRenderer(app) {
  function render() {
    app.ensureActiveFloor();
    ensureViewport();
    renderRoute();
    renderHeader();
    renderGlobalSearch();
    renderToolRibbon();
    renderPresetPanel();
    renderCustomFurnitureTools();
    renderLayerList();
    renderFloorList();
    renderStageMeta();
    renderSupportFilters();
    renderReformsHub();
    renderCanvas();
    renderHomeFloorStepper();
    renderPanels();
    renderSupportEntryModal();
    renderSupportDetailModal();
    renderButtons();
  }

  function renderRoute() {
    app.els.appShell.classList.toggle("route-home", app.state.ui.route === "home");
    app.els.appShell.classList.toggle("route-editor", app.state.ui.route === "editor");
    app.els.appShell.classList.toggle("route-reforms", app.state.ui.route === "reforms");
    app.els.appShell.classList.toggle("route-budgets", app.state.ui.route === "budgets");
    app.els.appShell.classList.toggle("route-documents", app.state.ui.route === "documents");

    if (app.state.ui.route !== "editor" && app.els.layerModal?.open) {
      app.els.layerModal.close();
    }

    if (!["home", "reforms", "budgets", "documents"].includes(app.state.ui.route) && app.els.supportEntryModal?.open) {
      app.els.supportEntryModal.close();
    }

    if (!["home", "reforms", "budgets", "documents"].includes(app.state.ui.route) && app.els.supportDetailModal?.open) {
      app.els.supportDetailModal.close();
    }

    [...app.els.pageNav.querySelectorAll("[data-route]")].forEach((button) => {
      button.classList.toggle("active", button.dataset.route === app.state.ui.route);
    });
  }

  function renderHeader() {
    const activeFloor = app.getActiveFloor();
    const totalArea = app.state.data.rooms.reduce((sum, room) => sum + getRoomArea(room.points), 0);
    const routeLabel = app.state.ui.route === "editor"
      ? "Editor"
      : app.state.ui.route === "reforms"
        ? "Reformas"
        : app.state.ui.route === "budgets"
          ? "Presupuestos"
          : app.state.ui.route === "documents"
            ? "Documentos"
        : "Inicio";

    if (false) {

    app.els.projectMeta.textContent = `${routeLabel} · ${app.state.data.floors.length} plantas · ${formatArea(totalArea)} · ${formatLength(wallMeters)} de muros · ${app.getFormattedUpdatedAt()}`;
    app.els.projectMeta.textContent = `${routeLabel} · ${app.state.data.floors.length} plantas · ${formatArea(totalArea)} · ${app.getFormattedUpdatedAt()}`;
    }
    app.els.projectMeta.textContent = `${routeLabel} - ${app.state.data.floors.length} plantas - ${formatArea(totalArea)} - ${app.getFormattedUpdatedAt()}`;
    app.els.projectTitle.textContent = app.state.data.project.name;
    app.els.projectSubtitle.textContent = `${app.state.data.project.address} - ${app.state.data.project.notes}`;
    app.els.projectSubtitle.textContent = `${app.state.data.project.address} · ${app.state.data.project.notes}`;
    app.els.stageKicker.textContent = app.state.ui.route === "editor"
      ? "Editor de plano"
      : app.state.ui.route === "reforms"
        ? "Reformas"
        : app.state.ui.route === "budgets"
          ? "Presupuestos"
          : app.state.ui.route === "documents"
            ? "Documentos"
        : "Inicio";
    app.els.stageTitle.textContent = app.state.ui.route === "editor"
      ? `Editor · ${activeFloor?.name || "Sin planta"}`
      : `Vista general · ${activeFloor?.name || "Sin planta"}`;
    if (app.state.ui.route === "reforms") {
      app.els.stageTitle.textContent = "Reformas · Seguimiento general";
    }
    if (app.state.ui.route === "budgets") {
      app.els.stageTitle.textContent = "Presupuestos - Biblioteca general";
    }
    if (app.state.ui.route === "documents") {
      app.els.stageTitle.textContent = "Documentos - Biblioteca general";
    }
    app.els.projectSubtitle.textContent = `${app.state.data.project.address} - ${app.state.data.project.notes}`;
    app.els.stageTitle.textContent = app.state.ui.route === "editor"
      ? `Editor - ${activeFloor?.name || "Sin planta"}`
      : app.state.ui.route === "reforms"
        ? "Reformas - Seguimiento general"
        : app.state.ui.route === "budgets"
          ? "Presupuestos - Biblioteca general"
          : app.state.ui.route === "documents"
            ? "Documentos - Biblioteca general"
            : `Vista general - ${activeFloor?.name || "Sin planta"}`;
    app.els.exteriorOnlyBtn.classList.toggle("active", app.state.data.canvas.exteriorOnly);
    app.els.exteriorOnlyBtn.textContent = app.state.data.canvas.exteriorOnly ? "Volver a todo" : "Solo exterior";
  }

  function renderGlobalSearch() {
    if (!app.els.globalSearch || !app.els.globalSearchResults || !app.els.globalSearchClearBtn) return;

    const rawQuery = String(app.state.ui.search || "");
    const hasQuery = Boolean(rawQuery.trim());
    const results = hasQuery ? buildGlobalSearchResults(rawQuery) : [];
    const safeActiveIndex = results.length
      ? Math.min(Math.max(app.state.ui.globalSearchActiveIndex, 0), results.length - 1)
      : -1;
    const shouldShow = Boolean(app.state.ui.globalSearchOpen && hasQuery);

    app.els.globalSearch.value = rawQuery;
    app.els.globalSearch.setAttribute("aria-expanded", shouldShow ? "true" : "false");
    app.els.globalSearchClearBtn.hidden = !hasQuery;
    app.els.globalSearchClearBtn.disabled = !hasQuery;
    app.els.globalSearchResults.hidden = !shouldShow;
    app.els.globalSearchResults.innerHTML = shouldShow
      ? buildGlobalSearchResultsMarkup(results, safeActiveIndex)
      : "";
  }

  function buildGlobalSearchResults(rawQuery) {
    const normalizedQuery = normalizeGlobalSearchText(rawQuery);
    if (!normalizedQuery) return [];

    const reformLinks = buildReformSupportSearchMap();
    const results = [
      ...buildFloorSearchResults(),
      ...buildRoomSearchResults(),
      ...buildReformSearchResults(reformLinks),
      ...buildNoteSearchResults(),
      ...buildBudgetSearchResults(),
      ...buildDocumentSearchResults(),
      ...buildInventorySearchResults(),
      ...buildWallSearchResults(),
      ...buildOpeningSearchResults(),
      ...buildFixtureSearchResults(),
      ...buildFurnitureSearchResults(),
    ].map((entry) => ({
      ...entry,
      score: scoreGlobalSearchEntry(entry, rawQuery),
    })).filter((entry) => entry.score > 0);

    return results
      .sort((left, right) => {
        const scoreDiff = right.score - left.score;
        if (scoreDiff !== 0) return scoreDiff;
        return left.title.localeCompare(right.title, "es", { sensitivity: "base" });
      })
      .slice(0, GLOBAL_SEARCH_LIMIT);
  }

  function buildGlobalSearchResultsMarkup(results, activeIndex) {
    if (!results.length) {
      return `
        <div class="global-search-empty">
          <strong>Sin coincidencias</strong>
          <span>Prueba con otra palabra o una descripcion mas corta.</span>
        </div>
      `;
    }

    return `
      <div class="global-search-summary">
        <strong>${results.length} resultados</strong>
        <span>Saltos directos dentro del proyecto.</span>
      </div>
      <div class="global-search-list">
        ${results.map((result, index) => buildGlobalSearchResultMarkup(result, index === activeIndex)).join("")}
      </div>
    `;
  }

  function buildGlobalSearchResultMarkup(result, isActive) {
    const activeClass = isActive ? " active" : "";
    const label = GLOBAL_SEARCH_KIND_LABELS[result.kind] || "Resultado";
    const selectionMarkup = result.selection
      ? ` data-select-type="${escapeAttribute(result.selection.type)}" data-select-id="${escapeAttribute(result.selection.id)}"`
      : "";
    const floorIdMarkup = result.floorId ? ` data-floor-id="${escapeAttribute(result.floorId)}"` : "";
    const focusRoomMarkup = result.focusRoomId ? ` data-focus-room-id="${escapeAttribute(result.focusRoomId)}"` : "";
    const detailMarkup = result.panelType && result.itemId
      ? ` data-panel-type="${escapeAttribute(result.panelType)}" data-item-id="${escapeAttribute(result.itemId)}"`
      : "";

    return `
      <button
        type="button"
        class="global-search-result${activeClass}"
        data-global-search-result="true"
        data-route="${escapeAttribute(result.route)}"
        ${floorIdMarkup}
        ${selectionMarkup}
        ${focusRoomMarkup}
        ${detailMarkup}
      >
        <span class="global-search-kind ${escapeAttribute(result.kind)}">${escapeHtml(label)}</span>
        <div class="global-search-result-copy">
          <strong>${escapeHtml(result.title)}</strong>
          <span>${escapeHtml(result.meta)}</span>
        </div>
      </button>
    `;
  }

  function buildFloorSearchResults() {
    return app.state.data.floors.map((floor) => buildGlobalSearchEntry({
      kind: "floor",
      route: "editor",
      floorId: floor.id,
      title: floor.name || "Planta",
      meta: `${floor.kind === "site" ? "Parcela" : "Interior"} - nivel ${floor.level}`,
      keywords: [
        floor.name,
        floor.kind === "site" ? "parcela exterior terreno" : "planta interior vivienda",
        `nivel ${floor.level}`,
      ],
    }));
  }

  function buildRoomSearchResults() {
    return app.state.data.rooms.map((room) => buildGlobalSearchEntry({
      kind: "room",
      route: "editor",
      floorId: room.floorId,
      selection: { type: "room", id: room.id },
      focusRoomId: room.id,
      title: room.name || "Estancia",
      meta: `${getFloorNameById(room.floorId)} - ${room.type || (room.zone === "exterior" ? "Exterior" : "Interior")}`,
      keywords: [
        room.name,
        room.type,
        room.zone,
        room.notes,
        getFloorNameById(room.floorId),
      ],
    }));
  }

  function buildReformSearchResults(reformLinks) {
    return app.state.data.reforms.map((reform) => buildGlobalSearchEntry({
      kind: "reform",
      route: "reforms",
      floorId: reform.floorId,
      panelType: "reforms",
      itemId: reform.id,
      focusRoomId: reform.roomId || "",
      title: reform.title || "Reforma",
      meta: `${getFloorNameById(reform.floorId)} - ${getRoomNameById(reform.roomId)} - ${REFORM_STATUS_LABELS[reform.status] || "Planificada"}`,
      keywords: [
        reform.title,
        reform.notes,
        REFORM_KIND_LABELS[reform.kind] || "",
        REFORM_PRIORITY_LABELS[reform.priority] || "",
        REFORM_STATUS_LABELS[reform.status] || "",
        getFloorNameById(reform.floorId),
        getRoomNameById(reform.roomId),
        reformLinks.get(reform.id) || "",
      ],
    }));
  }

  function buildNoteSearchResults() {
    return app.state.data.notes.map((note) => buildGlobalSearchEntry({
      kind: "note",
      route: "home",
      floorId: note.floorId,
      panelType: "notes",
      itemId: note.id,
      focusRoomId: note.roomId || "",
      title: note.title || "Nota",
      meta: `${getFloorNameById(note.floorId)} - ${getRoomNameById(note.roomId)} - ${getSupportReformLabel(note.reformId)}`,
      keywords: [
        note.title,
        note.notes,
        getSupportReformLabel(note.reformId),
        getFloorNameById(note.floorId),
        getRoomNameById(note.roomId),
      ],
    }));
  }

  function buildBudgetSearchResults() {
    return app.state.data.budgets.map((budget) => buildGlobalSearchEntry({
      kind: "budget",
      route: "budgets",
      floorId: budget.floorId,
      panelType: "budgets",
      itemId: budget.id,
      focusRoomId: budget.roomId || "",
      title: budget.title || "Presupuesto",
      meta: `${getFloorNameById(budget.floorId)} - ${getRoomNameById(budget.roomId)} - ${formatCurrency(budget.amount || 0)}`,
      keywords: [
        budget.title,
        budget.notes,
        budget.supplier,
        formatCurrency(budget.amount || 0),
        BUDGET_STATUS_LABELS[budget.status] || "",
        getSupportReformLabel(budget.reformId),
        getFloorNameById(budget.floorId),
        getRoomNameById(budget.roomId),
        budget.pdf?.name || "",
      ],
    }));
  }

  function buildDocumentSearchResults() {
    return app.state.data.documents.map((doc) => buildGlobalSearchEntry({
      kind: "document",
      route: "documents",
      floorId: doc.floorId,
      panelType: "documents",
      itemId: doc.id,
      focusRoomId: doc.roomId || "",
      title: doc.title || "Documento",
      meta: `${getFloorNameById(doc.floorId)} - ${getRoomNameById(doc.roomId)} - ${doc.type || "General"}`,
      keywords: [
        doc.title,
        doc.type,
        doc.reference,
        doc.notes,
        getSupportReformLabel(doc.reformId),
        getFloorNameById(doc.floorId),
        getRoomNameById(doc.roomId),
        doc.pdf?.name || "",
      ],
    }));
  }

  function buildInventorySearchResults() {
    return app.state.data.inventory.map((item) => buildGlobalSearchEntry({
      kind: "inventory",
      route: "home",
      floorId: item.floorId,
      panelType: "inventory",
      itemId: item.id,
      focusRoomId: item.roomId || "",
      title: item.name || "Elemento",
      meta: `${getFloorNameById(item.floorId)} - ${getRoomNameById(item.roomId)} - ${item.category || "General"}`,
      keywords: [
        item.name,
        item.category,
        item.notes,
        INVENTORY_STATE_LABELS[item.state] || "",
        String(item.value || ""),
        getFloorNameById(item.floorId),
        getRoomNameById(item.roomId),
      ],
    }));
  }

  function buildWallSearchResults() {
    return app.state.data.walls.map((wall) => buildGlobalSearchEntry({
      kind: "wall",
      route: "editor",
      floorId: wall.floorId,
      selection: { type: "wall", id: wall.id },
      title: wall.name || "Muro",
      meta: `${getFloorNameById(wall.floorId)} - ${wall.kind || "Interior"}`,
      keywords: [
        wall.name,
        wall.kind,
        wall.zone,
        wall.notes,
        getFloorNameById(wall.floorId),
      ],
    }));
  }

  function buildOpeningSearchResults() {
    return app.state.data.openings.map((opening) => buildGlobalSearchEntry({
      kind: "opening",
      route: "editor",
      floorId: opening.floorId,
      selection: { type: "opening", id: opening.id },
      title: opening.name || (opening.type === "window" ? "Ventana" : "Puerta"),
      meta: `${getFloorNameById(opening.floorId)} - ${opening.type === "window" ? "Ventana" : "Puerta"}`,
      keywords: [
        opening.name,
        opening.type === "window" ? "ventana" : "puerta",
        opening.zone,
        opening.notes,
        getFloorNameById(opening.floorId),
      ],
    }));
  }

  function buildFixtureSearchResults() {
    return app.state.data.fixtures.map((fixture) => buildGlobalSearchEntry({
      kind: "fixture",
      route: "editor",
      floorId: fixture.floorId,
      selection: { type: "fixture", id: fixture.id },
      title: fixture.name || "Instalacion",
      meta: `${getFloorNameById(fixture.floorId)} - ${getFixtureSystemLabel(fixture.system)}`,
      keywords: [
        fixture.name,
        fixture.notes,
        fixture.zone,
        fixture.status,
        getFixtureSystemLabel(fixture.system),
        getFloorNameById(fixture.floorId),
      ],
    }));
  }

  function buildFurnitureSearchResults() {
    return app.state.data.furniture.map((piece) => buildGlobalSearchEntry({
      kind: "furniture",
      route: "editor",
      floorId: piece.floorId,
      selection: { type: "furniture", id: piece.id },
      title: piece.name || "Mueble",
      meta: `${getFloorNameById(piece.floorId)} - ${piece.zone === "exterior" ? "Exterior" : "Interior"}`,
      keywords: [
        piece.name,
        piece.notes,
        piece.zone,
        getFloorNameById(piece.floorId),
      ],
    }));
  }

  function buildGlobalSearchEntry(options) {
    return {
      ...options,
      searchText: normalizeGlobalSearchText([
        options.title,
        options.meta,
        ...(options.keywords || []),
      ].join(" ")),
    };
  }

  function buildReformSupportSearchMap() {
    const map = new Map();
    const append = (reformId, value) => {
      if (!reformId || !value) return;
      const current = map.get(reformId) || [];
      current.push(value);
      map.set(reformId, current);
    };

    app.state.data.notes.forEach((entry) => append(entry.reformId, `${entry.title || ""} ${entry.notes || ""}`));
    app.state.data.budgets.forEach((entry) => append(entry.reformId, `${entry.title || ""} ${entry.notes || ""} ${entry.pdf?.name || ""}`));
    app.state.data.documents.forEach((entry) => append(entry.reformId, `${entry.title || ""} ${entry.reference || ""} ${entry.notes || ""} ${entry.pdf?.name || ""}`));

    return new Map([...map.entries()].map(([key, values]) => [key, values.join(" ")]));
  }

  function scoreGlobalSearchEntry(entry, rawQuery) {
    const query = normalizeGlobalSearchText(rawQuery);
    if (!query) return 0;

    const tokens = query.split(" ").filter(Boolean);
    const title = normalizeGlobalSearchText(entry.title || "");
    const text = entry.searchText || "";
    const titleCompact = title.replace(/\s+/g, "");
    const textCompact = text.replace(/\s+/g, "");
    const titleWords = title.split(" ").filter(Boolean);
    const textWords = text.split(" ").filter(Boolean);
    let score = 0;

    if (title === query) {
      score += 420;
    } else if (title.startsWith(query)) {
      score += 260;
    } else if (title.includes(query)) {
      score += 180;
    } else if (text.includes(query)) {
      score += 120;
    }

    for (const token of tokens) {
      if (!token) continue;

      if (titleWords.some((word) => word.startsWith(token))) {
        score += 90;
        continue;
      }

      if (textWords.some((word) => word.startsWith(token))) {
        score += 60;
        continue;
      }

      if (title.includes(token)) {
        score += 48;
        continue;
      }

      if (text.includes(token)) {
        score += 36;
        continue;
      }

      if (matchesLooseSearchToken(token, titleCompact)) {
        score += 24;
        continue;
      }

      if (matchesLooseSearchToken(token, textCompact)) {
        score += 16;
        continue;
      }

      return 0;
    }

    return score + Math.max(0, 24 - Math.min(title.length, 24));
  }

  function matchesLooseSearchToken(token, haystack) {
    if (!token || !haystack) return false;
    let tokenIndex = 0;
    for (const character of haystack) {
      if (character === token[tokenIndex]) {
        tokenIndex += 1;
        if (tokenIndex >= token.length) {
          return true;
        }
      }
    }
    return false;
  }

  function normalizeGlobalSearchText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function getFixtureSystemLabel(system) {
    if (system === "water") return "Agua";
    if (system === "network") return "Red";
    return "Electricidad";
  }

  function renderToolRibbon() {
    app.els.toolRibbon.innerHTML = TOOL_GROUP_DEFINITIONS.map((group) => {
      const tools = TOOL_DEFINITIONS.filter((tool) => tool.group === group.id);
      if (!tools.length) return "";

      return `
        <section class="tool-strip" aria-label="${escapeAttribute(group.label)}">
          <p class="tool-strip-title">${escapeHtml(group.label)}</p>
          <div class="tool-strip-buttons">
            ${tools.map((tool) => buildToolButtonMarkup(tool)).join("")}
          </div>
        </section>
      `;
    }).join("");

    [...app.els.toolRibbon.querySelectorAll("[data-tool]")].forEach((button) => {
      button.addEventListener("click", () => app.selectTool(button.dataset.tool));
    });
  }

  function buildToolButtonMarkup(tool) {
    const active = tool.id === app.state.ui.tool ? " active" : "";
    const destructive = tool.id === "erase" ? " destructive" : "";
    const tooltip = `${tool.label}. ${tool.short}`;
    return `
      <button
        type="button"
        class="tool-ribbon-btn${active}${destructive}"
        data-tool="${tool.id}"
        data-tooltip="${escapeAttribute(tool.short)}"
        title="${escapeAttribute(tooltip)}"
        aria-label="${escapeAttribute(tooltip)}"
        aria-pressed="${tool.id === app.state.ui.tool ? "true" : "false"}"
      >
        <span class="tool-ribbon-icon" aria-hidden="true">${getToolIconMarkup(tool.icon)}</span>
        <span class="tool-ribbon-label">${escapeHtml(tool.label)}</span>
      </button>
    `;
  }

  function getToolIconMarkup(icon) {
    const icons = {
      pointer: `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M6 4L18 13L12.5 14.5L16 20L13.4 21.4L10 15.8L6 19V4Z" fill="currentColor"></path>
        </svg>
      `,
      eraser: `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M10.2 5.8C11 5 12.2 5 13 5.8L19.2 12C20 12.8 20 14 19.2 14.8L15 19H8.8L4.8 15C4 14.2 4 13 4.8 12.2L10.2 5.8Z" fill="currentColor" opacity="0.22"></path>
          <path d="M10.2 5.8C11 5 12.2 5 13 5.8L19.2 12C20 12.8 20 14 19.2 14.8L15 19H8.8L4.8 15C4 14.2 4 13 4.8 12.2L10.2 5.8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
          <path d="M11.6 7.2L17.8 13.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="M8.8 19H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
      `,
      wall: `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M4 7H20V17H4Z" fill="currentColor" opacity="0.18"></path>
          <path d="M4 7H20V17H4V7Z" stroke="currentColor" stroke-width="1.8"></path>
          <path d="M8 7V11M12 7V11M16 7V11M6 13H10M10 13H14M14 13H18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
      `,
      room: `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M5 6H19V18H5Z" fill="currentColor" opacity="0.18"></path>
          <path d="M5 6H19V18H5V6Z" stroke="currentColor" stroke-width="1.8"></path>
          <path d="M9 10H15M9 14H13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
      `,
      door: `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M7 4H16V20H7Z" fill="currentColor" opacity="0.14"></path>
          <path d="M7 4H16V20H7V4Z" stroke="currentColor" stroke-width="1.8"></path>
          <path d="M7 19L16 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <circle cx="13.4" cy="12.5" r="1" fill="currentColor"></circle>
        </svg>
      `,
      window: `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M5 5H19V19H5Z" fill="currentColor" opacity="0.14"></path>
          <path d="M5 5H19V19H5V5Z" stroke="currentColor" stroke-width="1.8"></path>
          <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
      `,
      electricity: `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M13 3L7 13H11L10 21L17 10H13L13 3Z" fill="currentColor"></path>
        </svg>
      `,
      water: `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 3C12 3 6.5 9.1 6.5 13.4C6.5 16.8 9 19.5 12 19.5C15 19.5 17.5 16.8 17.5 13.4C17.5 9.1 12 3 12 3Z" fill="currentColor" opacity="0.22"></path>
          <path d="M12 3C12 3 6.5 9.1 6.5 13.4C6.5 16.8 9 19.5 12 19.5C15 19.5 17.5 16.8 17.5 13.4C17.5 9.1 12 3 12 3Z" stroke="currentColor" stroke-width="1.8"></path>
          <path d="M10 16.2C10.5 16.8 11.2 17.1 12 17.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
      `,
      network: `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M4.5 9.5C9.2 5.6 14.8 5.6 19.5 9.5M7.8 12.8C10.7 10.5 13.3 10.5 16.2 12.8M11 16.1C11.7 15.6 12.3 15.6 13 16.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <circle cx="12" cy="18.5" r="1.4" fill="currentColor"></circle>
        </svg>
      `,
      furniture: `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M6 10C6 8.3 7.3 7 9 7H15C16.7 7 18 8.3 18 10V16H6V10Z" fill="currentColor" opacity="0.18"></path>
          <path d="M6 10C6 8.3 7.3 7 9 7H15C16.7 7 18 8.3 18 10V16H6V10Z" stroke="currentColor" stroke-width="1.8"></path>
          <path d="M8 16V19M16 16V19M6 13H18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
      `,
      "mode-select": `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M6 4L18 13L12.5 14.5L16 20L13.4 21.4L10 15.8L6 19V4Z" fill="currentColor"></path>
        </svg>
      `,
      "mode-box": `
        <svg viewBox="0 0 24 24" focusable="false">
          <rect x="4" y="4" width="16" height="16" rx="1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4 2"></rect>
          <circle cx="4" cy="4" r="2" fill="currentColor"></circle>
          <circle cx="20" cy="4" r="2" fill="currentColor"></circle>
          <circle cx="20" cy="20" r="2" fill="currentColor"></circle>
          <circle cx="4" cy="20" r="2" fill="currentColor"></circle>
        </svg>
      `,
      "mode-rotate": `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M4.5 9A9.5 9.5 0 0 1 19 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"></path>
          <path d="M19 4V8H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
          <path d="M19.5 15A9.5 9.5 0 0 1 5 16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"></path>
          <path d="M5 20v-4h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
        </svg>
      `,
      "mode-scale": `
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M5 5H10M5 5V10M5 5L10 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="M19 19H14M19 19V14M19 19L14 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      `,
    };

    return icons[icon] || icons.pointer;
  }

  function renderPresetPanel() {
    const tool = app.state.ui.tool;

    if (tool === "select") {
      const modes = [
        { id: "select", label: "Seleccionar", hint: "Clic para elegir el elemento y arrastre para moverlo.", icon: "mode-select" },
        { id: "box", label: "Zona", hint: "Dibuja un rectangulo para seleccionar varios elementos.", icon: "mode-box" },
        { id: "rotate", label: "Rotar", hint: "Arrastra sobre la pieza para girarla. Shift fuerza saltos mayores.", icon: "mode-rotate" },
        { id: "scale", label: "Escalar", hint: "Arrastra para redimensionar y usa la rueda para ajustar rapido.", icon: "mode-scale" },
      ];

      app.els.presetPanel.innerHTML = modes.map((mode) => {
        const active = mode.id === app.state.ui.selectMode ? " active" : "";
        return `
          <button
            type="button"
            class="preset-btn preset-icon-btn${active}"
            data-select-mode="${mode.id}"
            title="${escapeAttribute(mode.hint)}"
            aria-label="${escapeAttribute(mode.label)}"
          >
            <span class="preset-mode-icon">${getToolIconMarkup(mode.icon)}</span>
            <strong>${escapeHtml(mode.label)}</strong>
          </button>
        `;
      }).join("");

      [...app.els.presetPanel.querySelectorAll("[data-select-mode]")].forEach((button) => {
        button.addEventListener("click", () => {
          app.state.ui.selectMode = button.dataset.selectMode;
          renderPresetPanel();
          updateCanvasClassName();
        });
      });
      return;
    }

    app.ensureValidPresetForTool(tool);
    const presets = getPresetsForTool(tool);

    if (!presets.length) {
      app.els.presetPanel.innerHTML = `
        <div class="empty-box preset-empty-box">
          <strong>Sin preset previo</strong>
          <p>Esta herramienta trabaja directa sobre el plano. No necesitas elegir una variante antes de dibujar.</p>
        </div>
      `;
      return;
    }

    app.els.presetPanel.innerHTML = presets.map((preset) => {
      const active = preset.id === app.state.ui.presets[tool] ? " active" : "";
      return `<button type="button" class="preset-btn${active}" data-preset-id="${preset.id}"><strong>${escapeHtml(preset.label)}</strong><span>${escapeHtml(describePreset(tool, preset))}</span></button>`;
    }).join("");

    [...app.els.presetPanel.querySelectorAll("[data-preset-id]")].forEach((button) => {
      button.addEventListener("click", () => {
        app.state.ui.presets[tool] = button.dataset.presetId;
        renderPresetPanel();
        renderCustomFurnitureTools();
      });
    });
  }

  function renderCustomFurnitureTools() {
    if (app.state.ui.tool !== "furniture") {
      app.els.customFurnitureTools.innerHTML = "";
      return;
    }

    const floorZone = app.getActiveFloor()?.kind === "site" ? "exterior" : "interior";

    app.els.presetHelperCopy.hidden = true;
    app.els.customFurnitureTools.innerHTML = `
      <div class="furniture-dock-actions">
        <span class="status-pill ${floorZone === "exterior" ? "requested" : "ok"}">${escapeHtml(floorZone === "exterior" ? "Exterior" : "Interior")}</span>
        <button type="button" class="soft-btn" data-custom-furniture-action="toggle">Nuevo mueble</button>
      </div>
    `;
  }

  function renderLayerList() {
    const counters = {
      rooms: app.getVisibleRooms().length,
      walls: app.getVisibleWalls().length,
      openings: app.getVisibleOpenings().length,
      fixtures: app.getVisibleFixtures().length,
      furniture: app.getVisibleFurniture().length,
      labels: app.getVisibleRooms().length,
    };

    app.els.layerList.innerHTML = LAYER_DEFINITIONS.map((layer) => {
      const active = app.state.ui.layers.has(layer.id) ? " active" : "";
      return `<button type="button" class="layer-toggle${active}" data-layer="${layer.id}"><span>${escapeHtml(layer.label)}</span><small>${counters[layer.id] || 0}</small></button>`;
    }).join("");

    [...app.els.layerList.querySelectorAll("[data-layer]")].forEach((button) => {
      button.addEventListener("click", () => {
        const layerId = button.dataset.layer;
        if (app.state.ui.layers.has(layerId)) {
          app.state.ui.layers.delete(layerId);
        } else {
          app.state.ui.layers.add(layerId);
        }
        render();
      });
    });
  }

  function renderFloorList() {
    app.els.floorList.innerHTML = app.state.data.floors.map((floor) => {
      const active = floor.id === app.state.data.project.activeFloorId ? " active" : "";
      const roomCount = app.state.data.rooms.filter((room) => room.floorId === floor.id).length;
      const wallCount = app.state.data.walls.filter((wall) => wall.floorId === floor.id).length;
      const label = floor.kind === "site" ? "Exterior" : `Nivel ${floor.level}`;

      return `
        <div class="floor-card-row" data-floor-id="${floor.id}">
          <button type="button" class="floor-card${active}" data-floor-id="${floor.id}">
            <div class="floor-top">
              <strong>${escapeHtml(floor.name)}</strong>
              <span class="status-pill ${floor.kind === "site" ? "requested" : "ok"}">${escapeHtml(label)}</span>
            </div>
            <small>${roomCount} estancias · ${wallCount} muros</small>
          </button>
          <button type="button" class="floor-edit-btn" data-floor-edit="${floor.id}" title="Editar nombre y tipo">✏</button>
        </div>
      `;
    }).join("");

    [...app.els.floorList.querySelectorAll(".floor-card[data-floor-id]")].forEach((button) => {
      button.addEventListener("click", () => {
        app.activateFloor?.(button.dataset.floorId);
      });
    });

    [...app.els.floorList.querySelectorAll("[data-floor-edit]")].forEach((button) => {
      button.addEventListener("click", () => {
        const floor = app.state.data.floors.find((entry) => entry.id === button.dataset.floorEdit);
        if (!floor) return;
        openFloorInlineEdit(button.closest(".floor-card-row"), floor);
      });
    });
  }

  function openFloorInlineEdit(rowEl, floor) {
    const interiorChecked = floor.kind !== "site" ? "checked" : "";
    const siteChecked = floor.kind === "site" ? "checked" : "";
    const interiorSelected = floor.kind !== "site" ? " selected" : "";
    const siteSelected = floor.kind === "site" ? " selected" : "";

    rowEl.innerHTML = `
      <form class="floor-inline-form" autocomplete="off">
        <label class="field">
          <span>Nombre</span>
          <input type="text" class="floor-edit-name" value="${escapeAttribute(floor.name)}" maxlength="40" />
        </label>
        <div class="floor-kind-toggle">
          <label class="floor-kind-opt${interiorSelected}">
            <input type="radio" name="floorKind" value="interior" ${interiorChecked} />
            Interior
          </label>
          <label class="floor-kind-opt${siteSelected}">
            <input type="radio" name="floorKind" value="site" ${siteChecked} />
            Exterior / Parcela
          </label>
        </div>
        <div class="floor-edit-actions">
          <button type="submit" class="soft-btn">Guardar</button>
          <button type="button" class="soft-btn floor-edit-cancel">Cancelar</button>
        </div>
      </form>
    `;

    const form = rowEl.querySelector("form");
    const nameInput = form.querySelector(".floor-edit-name");
    nameInput.focus();
    nameInput.select();

    form.querySelectorAll('input[name="floorKind"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        form.querySelectorAll(".floor-kind-opt").forEach((option) => option.classList.remove("selected"));
        radio.closest(".floor-kind-opt").classList.add("selected");
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const newName = nameInput.value.trim() || floor.name;
      const newKind = form.querySelector('input[name="floorKind"]:checked')?.value || floor.kind;
      app.commit(() => {
        floor.name = newName;
        floor.kind = newKind;
      });
      app.ensureValidPresetForTool("furniture");
    });

    form.querySelector(".floor-edit-cancel").addEventListener("click", () => {
      renderFloorList();
    });
  }

  function renderStageMeta() {
    const tool = TOOL_DEFINITIONS.find((entry) => entry.id === app.state.ui.tool);
    const isEditorRoute = app.state.ui.route === "editor";

    app.els.activeToolTitle.textContent = tool ? tool.label : "Editor";
    app.els.toolHint.textContent = isEditorRoute
      ? buildCanvasHint()
      : "En Inicio solo se muestra el plano. La edicion va en la pestaña Editor.";
    if (app.state.ui.route === "reforms") {
      app.els.toolHint.textContent = "La vista de reformas resume el trabajo pendiente, en curso y terminado.";
    }
    app.els.canvasHint.textContent = isEditorRoute
      ? buildCanvasHint()
      : "";
    app.els.canvasHint.hidden = !isEditorRoute;
    updateCanvasClassName();
  }

  function renderSupportFilters() {
    if (
      !app.els.stageFilterToggleBtn
      || !app.els.supportFiltersBox
      || !app.els.supportFiltersKicker
      || !app.els.supportFiltersCopy
      || !app.els.supportSearchLabel
      || !app.els.supportSearchInput
      || !app.els.supportSearchClearBtn
    ) {
      return;
    }

    const config = getStageFilterConfig();
    const isAvailable = Boolean(config);

    app.els.stageFilterToggleBtn.hidden = !isAvailable;
    app.els.supportFiltersBox.hidden = !isAvailable || !config.open;

    if (!isAvailable) return;

    app.els.stageFilterToggleBtn.setAttribute("aria-expanded", config.open ? "true" : "false");
    app.els.stageFilterToggleBtn.setAttribute("aria-label", config.buttonLabel);
    app.els.stageFilterToggleBtn.setAttribute("title", config.buttonLabel);
    app.els.stageFilterToggleBtn.classList.toggle("is-active", config.open || Boolean(config.value));
    app.els.stageFilterToggleBtn.classList.toggle("has-value", Boolean(config.value));
    app.els.supportFiltersBox.dataset.routeMode = config.routeMode;
    app.els.supportFiltersKicker.textContent = config.kicker;
    app.els.supportFiltersCopy.textContent = config.copy;
    app.els.supportSearchLabel.textContent = config.label;
    app.els.supportSearchInput.placeholder = config.placeholder;
    app.els.supportSearchInput.value = config.value;
    app.els.supportSearchClearBtn.disabled = !config.value;
  }

  function renderReformsHub() {
    if (!app.els.reformsHub) return;

    const isHubRoute = ["reforms", "budgets", "documents"].includes(app.state.ui.route);
    app.els.reformsHub.hidden = !isHubRoute;

    if (!isHubRoute) {
      app.els.reformsHub.innerHTML = "";
      return;
    }

    if (app.state.ui.route === "budgets") {
      renderBudgetsHub();
      return;
    }

    if (app.state.ui.route === "documents") {
      renderDocumentsHub();
      return;
    }

    const activeFloor = app.getActiveFloor();
    const reformsSearch = String(app.state.ui.reformsSearch || "").trim();
    const reforms = [...app.state.data.reforms]
      .filter((reform) => matchesReformsHubFilter(reform))
      .sort(compareReformsForHub);
    const summaryCards = [
      { label: "Total", value: reforms.length, tone: "requested" },
      { label: "Planificadas", value: reforms.filter((reform) => reform.status === "planned").length, tone: "planned" },
      { label: "En curso", value: reforms.filter((reform) => reform.status === "in_progress").length, tone: "in_progress" },
      { label: "Hechas", value: reforms.filter((reform) => reform.status === "done").length, tone: "done" },
    ];
    const columns = [
      { status: "planned", title: "Planificadas", copy: "Pendientes de arrancar." },
      { status: "in_progress", title: "En curso", copy: "Trabajo abierto ahora mismo." },
      { status: "done", title: "Hechas", copy: "Reformas cerradas o terminadas." },
    ];

    app.els.reformsHub.innerHTML = `
      <section class="reforms-hero-card">
        <div class="reforms-hero-copy">
          <p class="section-kicker">Seguimiento</p>
          <h3>Panel general de reformas</h3>
          <p class="panel-copy">
            ${reformsSearch
              ? `Mostrando ${escapeHtml(String(reforms.length))} reforma${reforms.length === 1 ? "" : "s"} con el filtro actual. Si das de alta una nueva, entrara en ${escapeHtml(activeFloor?.name || "la planta activa")}.`
              : `Aqui ves todas las reformas del proyecto, separadas por estado y con acceso directo al detalle. Si das de alta una nueva, entrara en ${escapeHtml(activeFloor?.name || "la planta activa")}.`}
          </p>
        </div>
        <button type="button" class="soft-btn active" data-support-modal-open="reforms" aria-haspopup="dialog">Nueva reforma</button>
      </section>

      <section class="reforms-summary-grid">
        ${summaryCards.map((card) => `
          <article class="reforms-summary-card">
            <span class="status-pill ${escapeAttribute(card.tone)}">${escapeHtml(card.label)}</span>
            <strong>${escapeHtml(String(card.value))}</strong>
          </article>
        `).join("")}
      </section>

      <section class="reforms-board">
        ${columns.map((column) => buildReformsHubColumnMarkup(column, reforms)).join("")}
      </section>
    `;
  }

  function buildReformsHubColumnMarkup(column, reforms) {
    const columnItems = reforms.filter((reform) => reform.status === column.status);
    const roomGroups = buildReformsHubRoomGroups(columnItems);

    return `
      <section class="reforms-column">
        <div class="reforms-column-head">
          <div>
            <strong>${escapeHtml(column.title)}</strong>
            <p>${escapeHtml(column.copy)}</p>
          </div>
          <span class="status-pill ${escapeAttribute(column.status)}">${escapeHtml(String(columnItems.length))}</span>
        </div>
        <div class="reforms-column-stack">
          ${roomGroups.length
            ? roomGroups.map((group) => buildReformsHubRoomGroupMarkup(group)).join("")
            : `<div class="empty-box">No hay reformas ${escapeHtml(column.title.toLowerCase())}.</div>`}
        </div>
      </section>
    `;
  }

  function buildReformsHubRoomGroups(reforms) {
    const groups = new Map();

    reforms.forEach((reform) => {
      const room = reform.roomId
        ? app.state.data.rooms.find((entry) => entry.id === reform.roomId) || null
        : null;
      const groupKey = room
        ? `room:${room.id}`
        : `floor:${reform.floorId}:unassigned`;

      if (!groups.has(groupKey)) {
        const floorName = getFloorNameById(reform.floorId);
        groups.set(groupKey, {
          key: `${reform.status}:${groupKey}`,
          label: room?.name || "Sin estancia",
          meta: room
            ? `${floorName} · ${room.type || "Estancia"}`
            : `${floorName} · Reforma sin estancia asignada`,
          zone: room?.zone || "neutral",
          items: [],
        });
      }

      groups.get(groupKey).items.push(reform);
    });

    return [...groups.values()].sort((left, right) => {
      if (left.label === "Sin estancia" && right.label !== "Sin estancia") return 1;
      if (right.label === "Sin estancia" && left.label !== "Sin estancia") return -1;
      const labelCompare = left.label.localeCompare(right.label, "es");
      if (labelCompare !== 0) return labelCompare;
      return left.meta.localeCompare(right.meta, "es");
    });
  }

  function buildReformsHubRoomGroupMarkup(group) {
    const preview = buildReformsGroupPreview(group.items);

    return `
      <details class="reforms-room-group ${escapeAttribute(group.zone)}">
        <summary class="reforms-room-summary">
          <div class="reforms-room-group-copy">
            <strong>${escapeHtml(group.label)}</strong>
            <small>${escapeHtml(group.meta)}</small>
            <p class="reforms-room-preview">${escapeHtml(preview)}</p>
          </div>
          <div class="reforms-room-group-side">
            <span class="reforms-room-group-count">${escapeHtml(String(group.items.length))}</span>
            <span class="reforms-room-group-chevron" aria-hidden="true"></span>
          </div>
        </summary>
        <div class="reforms-room-group-stack">
          ${group.items.map((reform) => wrapEditableEntryMarkup("reforms", reform.id, buildReformBoardCardMarkup(reform), "hub")).join("")}
        </div>
      </details>
    `;
  }

  function buildReformsGroupPreview(items) {
    const titles = items
      .slice(0, 2)
      .map((item) => item.title || "Reforma")
      .filter(Boolean);

    if (!titles.length) return "Sin reformas dentro de esta estancia.";
    if (items.length > 2) {
      return `${titles.join(" · ")} · +${items.length - 2} más`;
    }
    return titles.join(" · ");
  }

  function buildReformBoardCardMarkup(reform) {
    const floorName = getFloorNameById(reform.floorId);
    const roomName = getRoomNameById(reform.roomId);
    const kindLabel = REFORM_KIND_LABELS[reform.kind] || "Mejora";
    const priorityLabel = REFORM_PRIORITY_LABELS[reform.priority] || "Media";
    const statusLabel = REFORM_STATUS_LABELS[reform.status] || "Planificada";
    const notesCount = app.state.data.notes.filter((entry) => entry.reformId === reform.id).length;
    const budgetsCount = app.state.data.budgets.filter((entry) => entry.reformId === reform.id).length;
    const documentsCount = app.state.data.documents.filter((entry) => entry.reformId === reform.id).length;
    const detail = reform.notes || "Sin detalle todavia.";

    return `
      <button type="button" class="reform-board-card" data-panel-detail="reforms" data-item-id="${escapeAttribute(reform.id)}">
        <div class="reform-board-top">
          <span class="status-pill ${escapeAttribute(reform.status || "planned")}">${escapeHtml(statusLabel)}</span>
          <span class="status-pill ${escapeAttribute(reform.priority || "medium")}">${escapeHtml(priorityLabel)}</span>
        </div>
        <h4>${escapeHtml(reform.title || "Reforma")}</h4>
        <p class="reform-board-meta">${escapeHtml(`${floorName} · ${roomName} · ${kindLabel}`)}</p>
        <p class="reform-board-detail">${escapeHtml(detail)}</p>
        <div class="reform-board-links">
          <span>${escapeHtml(`${notesCount} nota${notesCount === 1 ? "" : "s"}`)}</span>
          <span>${escapeHtml(`${budgetsCount} presupuesto${budgetsCount === 1 ? "" : "s"}`)}</span>
          <span>${escapeHtml(`${documentsCount} documento${documentsCount === 1 ? "" : "s"}`)}</span>
        </div>
      </button>
    `;
  }

  function compareReformsForHub(left, right) {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const leftPriority = priorityOrder[left.priority] ?? 1;
    const rightPriority = priorityOrder[right.priority] ?? 1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;

    const leftFloor = app.state.data.floors.find((entry) => entry.id === left.floorId)?.name || "";
    const rightFloor = app.state.data.floors.find((entry) => entry.id === right.floorId)?.name || "";
    const floorCompare = leftFloor.localeCompare(rightFloor, "es");
    if (floorCompare !== 0) return floorCompare;

    const leftRoom = getRoomNameById(left.roomId);
    const rightRoom = getRoomNameById(right.roomId);
    const roomCompare = leftRoom.localeCompare(rightRoom, "es");
    if (roomCompare !== 0) return roomCompare;

    return String(left.title || "").localeCompare(String(right.title || ""), "es");
  }

  function renderBudgetsHub() {
    const activeFloor = app.getActiveFloor();
    const budgetsSearch = String(app.state.ui.budgetsSearch || "").trim();
    const budgets = [...app.state.data.budgets]
      .filter((budget) => matchesBudgetsHubFilter(budget))
      .sort(compareBudgetEntriesForHub);

    const summaryCards = [
      { label: "Total", value: budgets.length, tone: "requested" },
      { label: "Con reforma", value: budgets.filter((entry) => entry.reformId).length, tone: "approved" },
      { label: "Libres", value: budgets.filter((entry) => !entry.reformId).length, tone: "draft" },
      { label: "Con PDF", value: budgets.filter((entry) => entry.pdf?.dataUrl).length, tone: "done" },
    ];
    const columns = [
      {
        key: "linked",
        title: "Ligados a reforma",
        copy: "Presupuestos ya asignados a una reforma concreta.",
        items: budgets.filter((entry) => entry.reformId),
        emptyMessage: "No hay presupuestos ligados a reformas.",
      },
      {
        key: "free",
        title: "Libres",
        copy: "Presupuestos todavia sin colgar de ninguna reforma.",
        items: budgets.filter((entry) => !entry.reformId),
        emptyMessage: "No hay presupuestos libres.",
      },
    ];

    app.els.reformsHub.innerHTML = `
      <section class="reforms-hero-card">
        <div class="reforms-hero-copy">
          <p class="section-kicker">Control economico</p>
          <h3>Panel general de presupuestos</h3>
          <p class="panel-copy">
            ${budgetsSearch
              ? `Mostrando ${escapeHtml(String(budgets.length))} presupuesto${budgets.length === 1 ? "" : "s"} con el filtro actual. Si das de alta uno nuevo, entrara en ${escapeHtml(activeFloor?.name || "la planta activa")}.`
              : `Aqui ves todos los presupuestos del proyecto, ordenados para localizar rapido los que importan. Si das de alta uno nuevo, entrara en ${escapeHtml(activeFloor?.name || "la planta activa")}.`}
          </p>
        </div>
        <button type="button" class="soft-btn active" data-support-modal-open="budgets" aria-haspopup="dialog">Nuevo presupuesto</button>
      </section>

      <section class="reforms-summary-grid">
        ${summaryCards.map((card) => `
          <article class="reforms-summary-card">
            <span class="status-pill ${escapeAttribute(card.tone)}">${escapeHtml(card.label)}</span>
            <strong>${escapeHtml(String(card.value))}</strong>
          </article>
        `).join("")}
      </section>

      <section class="library-board library-board-double">
        ${columns.map((column) => buildSupportLibraryColumnMarkup({
          title: column.title,
          copy: column.copy,
          emptyMessage: column.emptyMessage,
          items: column.items,
          panelType: "budgets",
          renderItem: buildBudgetHubCardMarkup,
        })).join("")}
      </section>
    `;
  }

  function renderDocumentsHub() {
    const activeFloor = app.getActiveFloor();
    const documentsSearch = String(app.state.ui.documentsSearch || "").trim();
    const documents = [...app.state.data.documents]
      .filter((doc) => matchesDocumentsHubFilter(doc))
      .sort(compareDocumentEntriesForHub);

    const summaryCards = [
      { label: "Total", value: documents.length, tone: "requested" },
      { label: "Con reforma", value: documents.filter((entry) => entry.reformId).length, tone: "approved" },
      { label: "Libres", value: documents.filter((entry) => !entry.reformId).length, tone: "draft" },
      { label: "Con PDF", value: documents.filter((entry) => entry.pdf?.dataUrl).length, tone: "done" },
    ];
    const columns = [
      {
        key: "linked",
        title: "Ligados a reforma",
        copy: "Documentos ya enlazados a una reforma concreta.",
        items: documents.filter((entry) => entry.reformId),
        emptyMessage: "No hay documentos ligados a reformas.",
      },
      {
        key: "free",
        title: "Libres",
        copy: "Documentos todavia sin colgar de ninguna reforma.",
        items: documents.filter((entry) => !entry.reformId),
        emptyMessage: "No hay documentos libres.",
      },
    ];

    app.els.reformsHub.innerHTML = `
      <section class="reforms-hero-card">
        <div class="reforms-hero-copy">
          <p class="section-kicker">Archivo tecnico</p>
          <h3>Panel general de documentos</h3>
          <p class="panel-copy">
            ${documentsSearch
              ? `Mostrando ${escapeHtml(String(documents.length))} documento${documents.length === 1 ? "" : "s"} con el filtro actual. Si das de alta uno nuevo, entrara en ${escapeHtml(activeFloor?.name || "la planta activa")}.`
              : `Aqui ves todos los documentos del proyecto, agrupados para encontrar rapido cada referencia. Si das de alta uno nuevo, entrara en ${escapeHtml(activeFloor?.name || "la planta activa")}.`}
          </p>
        </div>
        <button type="button" class="soft-btn active" data-support-modal-open="documents" aria-haspopup="dialog">Nuevo documento</button>
      </section>

      <section class="reforms-summary-grid">
        ${summaryCards.map((card) => `
          <article class="reforms-summary-card">
            <span class="status-pill ${escapeAttribute(card.tone)}">${escapeHtml(card.label)}</span>
            <strong>${escapeHtml(String(card.value))}</strong>
          </article>
        `).join("")}
      </section>

      <section class="library-board library-board-double">
        ${columns.map((column) => buildSupportLibraryColumnMarkup({
          title: column.title,
          copy: column.copy,
          emptyMessage: column.emptyMessage,
          items: column.items,
          panelType: "documents",
          renderItem: buildDocumentHubCardMarkup,
        })).join("")}
      </section>
    `;
  }

  function buildSupportLibraryColumnMarkup(options) {
    const roomGroups = buildSupportLibraryRoomGroups(options.items);

    return `
      <section class="reforms-column library-column">
        <div class="reforms-column-head">
          <div>
            <strong>${escapeHtml(options.title)}</strong>
            <p>${escapeHtml(options.copy)}</p>
          </div>
          <span class="status-pill requested">${escapeHtml(String(options.items.length))}</span>
        </div>
        <div class="reforms-column-stack">
          ${roomGroups.length
            ? roomGroups.map((group) => buildSupportLibraryRoomGroupMarkup(group, options.panelType, options.renderItem)).join("")
            : `<div class="empty-box">${escapeHtml(options.emptyMessage)}</div>`}
        </div>
      </section>
    `;
  }

  function buildSupportLibraryRoomGroups(items) {
    const groups = new Map();

    items.forEach((item) => {
      const room = item.roomId
        ? app.state.data.rooms.find((entry) => entry.id === item.roomId) || null
        : null;
      const groupKey = room
        ? `room:${room.id}`
        : `floor:${item.floorId}:unassigned`;

      if (!groups.has(groupKey)) {
        const floorName = getFloorNameById(item.floorId);
        groups.set(groupKey, {
          key: groupKey,
          label: room?.name || "Sin estancia",
          meta: room
            ? `${floorName} - ${room.type || "Estancia"}`
            : `${floorName} - Elementos sin estancia asignada`,
          zone: room?.zone || "neutral",
          items: [],
        });
      }

      groups.get(groupKey).items.push(item);
    });

    return [...groups.values()].sort((left, right) => {
      if (left.label === "Sin estancia" && right.label !== "Sin estancia") return 1;
      if (right.label === "Sin estancia" && left.label !== "Sin estancia") return -1;
      const labelCompare = left.label.localeCompare(right.label, "es");
      if (labelCompare !== 0) return labelCompare;
      return left.meta.localeCompare(right.meta, "es");
    });
  }

  function buildSupportLibraryRoomGroupMarkup(group, panelType, renderItem) {
    const preview = buildSupportGroupPreview(panelType, group.items);

    return `
      <details class="reforms-room-group ${escapeAttribute(group.zone)}">
        <summary class="reforms-room-summary">
          <div class="reforms-room-group-copy">
            <strong>${escapeHtml(group.label)}</strong>
            <small>${escapeHtml(group.meta)}</small>
            <p class="reforms-room-preview">${escapeHtml(preview)}</p>
          </div>
          <div class="reforms-room-group-side">
            <span class="reforms-room-group-count">${escapeHtml(String(group.items.length))}</span>
            <span class="reforms-room-group-chevron" aria-hidden="true"></span>
          </div>
        </summary>
        <div class="reforms-room-group-stack">
          ${group.items.map((item) => wrapEditableEntryMarkup(panelType, item.id, renderItem(item), "hub")).join("")}
        </div>
      </details>
    `;
  }

  function buildBudgetHubCardMarkup(budget) {
    const roomName = getRoomNameById(budget.roomId);
    const floorName = getFloorNameById(budget.floorId);
    const reformLabel = getSupportReformLabel(budget.reformId);
    const pdfLabel = budget.pdf?.dataUrl ? "Con PDF" : "Sin PDF";

    return `
      <button type="button" class="reform-board-card" data-panel-detail="budgets" data-item-id="${escapeAttribute(budget.id)}">
        <div class="reform-board-top">
          <span class="status-pill ${escapeAttribute(budget.reformId ? "approved" : "requested")}">${escapeHtml(budget.reformId ? "Reforma" : "Libre")}</span>
          <span class="status-pill ${escapeAttribute(budget.pdf?.dataUrl ? "done" : "draft")}">${escapeHtml(pdfLabel)}</span>
        </div>
        <h4>${escapeHtml(budget.title || "Presupuesto")}</h4>
        <p class="reform-board-meta">${escapeHtml(`${floorName} - ${roomName}`)}</p>
        <p class="reform-board-detail">${escapeHtml(budget.notes || "Sin detalle todavia.")}</p>
        <div class="reform-board-links">
          <span>${escapeHtml(formatCurrency(budget.amount || 0))}</span>
          <span>${escapeHtml(reformLabel)}</span>
        </div>
      </button>
    `;
  }

  function buildDocumentHubCardMarkup(doc) {
    const roomName = getRoomNameById(doc.roomId);
    const floorName = getFloorNameById(doc.floorId);
    const reformLabel = getSupportReformLabel(doc.reformId);
    const pdfLabel = doc.pdf?.dataUrl ? "Con PDF" : "Sin PDF";

    return `
      <button type="button" class="reform-board-card" data-panel-detail="documents" data-item-id="${escapeAttribute(doc.id)}">
        <div class="reform-board-top">
          <span class="status-pill ${escapeAttribute(doc.reformId ? "approved" : "requested")}">${escapeHtml(doc.reformId ? "Reforma" : "Libre")}</span>
          <span class="status-pill ${escapeAttribute(doc.pdf?.dataUrl ? "done" : "draft")}">${escapeHtml(pdfLabel)}</span>
        </div>
        <h4>${escapeHtml(doc.title || "Documento")}</h4>
        <p class="reform-board-meta">${escapeHtml(`${floorName} - ${roomName} - ${doc.type || "General"}`)}</p>
        <p class="reform-board-detail">${escapeHtml(doc.notes || doc.reference || "Sin detalle todavia.")}</p>
        <div class="reform-board-links">
          <span>${escapeHtml(doc.reference || "Sin referencia")}</span>
          <span>${escapeHtml(reformLabel)}</span>
        </div>
      </button>
    `;
  }

  function matchesBudgetsHubFilter(budget) {
    const budgetsSearch = String(app.state.ui.budgetsSearch || "").trim().toLowerCase();
    if (!budgetsSearch) return true;
    return buildBudgetHubSearchText(budget).includes(budgetsSearch);
  }

  function buildBudgetHubSearchText(budget) {
    return [
      budget.title,
      budget.notes,
      String(budget.amount || ""),
      getFloorNameById(budget.floorId),
      getRoomNameById(budget.roomId),
      getSupportReformLabel(budget.reformId),
      budget.pdf?.name || "",
    ].join(" ").toLowerCase();
  }

  function compareBudgetEntriesForHub(left, right) {
    const amountDiff = (right.amount || 0) - (left.amount || 0);
    if (amountDiff !== 0) return amountDiff;

    const leftFloor = getFloorNameById(left.floorId);
    const rightFloor = getFloorNameById(right.floorId);
    const floorCompare = leftFloor.localeCompare(rightFloor, "es");
    if (floorCompare !== 0) return floorCompare;

    const leftRoom = getRoomNameById(left.roomId);
    const rightRoom = getRoomNameById(right.roomId);
    const roomCompare = leftRoom.localeCompare(rightRoom, "es");
    if (roomCompare !== 0) return roomCompare;

    return String(left.title || "").localeCompare(String(right.title || ""), "es");
  }

  function matchesDocumentsHubFilter(doc) {
    const documentsSearch = String(app.state.ui.documentsSearch || "").trim().toLowerCase();
    if (!documentsSearch) return true;
    return buildDocumentHubSearchText(doc).includes(documentsSearch);
  }

  function buildDocumentHubSearchText(doc) {
    return [
      doc.title,
      doc.type,
      doc.reference,
      doc.notes,
      getFloorNameById(doc.floorId),
      getRoomNameById(doc.roomId),
      getSupportReformLabel(doc.reformId),
      doc.pdf?.name || "",
    ].join(" ").toLowerCase();
  }

  function compareDocumentEntriesForHub(left, right) {
    const leftFloor = getFloorNameById(left.floorId);
    const rightFloor = getFloorNameById(right.floorId);
    const floorCompare = leftFloor.localeCompare(rightFloor, "es");
    if (floorCompare !== 0) return floorCompare;

    const leftRoom = getRoomNameById(left.roomId);
    const rightRoom = getRoomNameById(right.roomId);
    const roomCompare = leftRoom.localeCompare(rightRoom, "es");
    if (roomCompare !== 0) return roomCompare;

    return String(left.title || "").localeCompare(String(right.title || ""), "es");
  }

  function getStageFilterConfig() {
    if (app.state.ui.route === "home") {
      const value = String(app.state.ui.supportSearch || "").trim().toLowerCase();
      return {
        routeMode: "home",
        open: Boolean(app.state.ui.homeFilterOpen),
        value,
        kicker: "Filtros de apoyo",
        copy: "Busca texto dentro de reformas, notas, presupuestos, documentos e inventario.",
        label: "Contenido",
        placeholder: "Humedad, dormitorio, presupuesto, contrato...",
        buttonLabel: value ? "Abrir filtros de apoyo activos" : "Abrir filtros de apoyo",
      };
    }

    if (app.state.ui.route === "reforms") {
      const value = String(app.state.ui.reformsSearch || "").trim().toLowerCase();
      return {
        routeMode: "reforms",
        open: Boolean(app.state.ui.reformsFilterOpen),
        value,
        kicker: "Busqueda de reformas",
        copy: "Busca por titulo, estancia, planta, estado, prioridad o contenido vinculado a cada reforma.",
        label: "Buscar reforma",
        placeholder: "Foco central, sotano, planificada, presupuesto...",
        buttonLabel: value ? "Abrir busqueda de reformas activa" : "Abrir busqueda de reformas",
      };
    }

    if (app.state.ui.route === "budgets") {
      const value = String(app.state.ui.budgetsSearch || "").trim().toLowerCase();
      return {
        routeMode: "budgets",
        open: Boolean(app.state.ui.budgetsFilterOpen),
        value,
        kicker: "Busqueda de presupuestos",
        copy: "Busca por nombre, importe, estancia, planta, reforma vinculada o PDF adjunto.",
        label: "Buscar presupuesto",
        placeholder: "Cocina, 1200, reforma, instalacion, pdf...",
        buttonLabel: value ? "Abrir busqueda de presupuestos activa" : "Abrir busqueda de presupuestos",
      };
    }

    if (app.state.ui.route === "documents") {
      const value = String(app.state.ui.documentsSearch || "").trim().toLowerCase();
      return {
        routeMode: "documents",
        open: Boolean(app.state.ui.documentsFilterOpen),
        value,
        kicker: "Busqueda de documentos",
        copy: "Busca por nombre, tipo, referencia, estancia, reforma vinculada o PDF adjunto.",
        label: "Buscar documento",
        placeholder: "Contrato, plano, licencia, dormitorio, pdf...",
        buttonLabel: value ? "Abrir busqueda de documentos activa" : "Abrir busqueda de documentos",
      };
    }

    return null;
  }

  function matchesReformsHubFilter(reform) {
    const reformsSearch = String(app.state.ui.reformsSearch || "").trim().toLowerCase();
    if (!reformsSearch) return true;
    return buildReformsHubSearchText(reform).includes(reformsSearch);
  }

  function buildReformsHubSearchText(reform) {
    const linkedNotes = app.state.data.notes
      .filter((entry) => entry.reformId === reform.id)
      .flatMap((entry) => [entry.title, entry.notes]);
    const linkedBudgets = app.state.data.budgets
      .filter((entry) => entry.reformId === reform.id)
      .flatMap((entry) => [entry.title, entry.notes, String(entry.amount || ""), entry.pdf?.name || ""]);
    const linkedDocuments = app.state.data.documents
      .filter((entry) => entry.reformId === reform.id)
      .flatMap((entry) => [entry.title, entry.notes, entry.type, entry.reference, entry.pdf?.name || ""]);

    return [
      reform.title,
      reform.notes,
      getFloorNameById(reform.floorId),
      getRoomNameById(reform.roomId),
      REFORM_KIND_LABELS[reform.kind] || "",
      REFORM_PRIORITY_LABELS[reform.priority] || "",
      REFORM_STATUS_LABELS[reform.status] || "",
      ...linkedNotes,
      ...linkedBudgets,
      ...linkedDocuments,
    ].join(" ").toLowerCase();
  }

  function renderCanvas() {
    const viewport = getCanvasViewport();
    app.els.planCanvas.setAttribute("viewBox", `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`);
    app.els.planCanvas.innerHTML = buildCanvasMarkup(app.state.ui.route === "editor", viewport);
  }

  function buildCanvasMarkup(includeEditorOverlay, viewport = getCanvasViewport()) {
    const { width, height, grid, showGrid } = app.state.data.canvas;
    const shouldShowGrid = includeEditorOverlay && showGrid;
    const referenceLayer = getReferenceLayer();

    const roomMarkup = app.state.ui.layers.has("rooms") ? app.getVisibleRooms().map((room) => renderRoomSvg(room)).join("") : "";
    const wallMarkup = app.state.ui.layers.has("walls") ? app.getVisibleWalls().map((wall) => renderWallSvg(wall)).join("") : "";
    const openingMarkup = app.state.ui.layers.has("openings") ? app.getVisibleOpenings().map((opening) => renderOpeningSvg(opening)).join("") : "";
    const fixtureMarkup = app.state.ui.layers.has("fixtures") ? app.getVisibleFixtures().map((fixture) => renderFixtureSvg(fixture)).join("") : "";
    const furnitureMarkup = app.state.ui.layers.has("furniture") ? app.getVisibleFurniture().map((item) => renderFurnitureSvg(item)).join("") : "";
    const labelMarkup = app.state.ui.layers.has("labels") ? app.getVisibleRooms().map((room) => renderRoomLabelSvg(room)).join("") : "";
    const rulerMarkup = shouldShowGrid ? renderCanvasRulerMarkup(viewport) : "";
    const selectionMarkup = includeEditorOverlay ? renderSelectionOverlay() : "";
    const draftMarkup = includeEditorOverlay ? renderDraftOverlay() : "";

    return `
      <defs>
        <pattern id="majorGrid" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse">
          <path d="M ${grid} 0 L 0 0 0 ${grid}" fill="none" stroke="rgba(47, 78, 107, 0.12)" stroke-width="1" />
        </pattern>
        <pattern id="minorGrid" width="${grid / 2}" height="${grid / 2}" patternUnits="userSpaceOnUse">
          <path d="M ${grid / 2} 0 L 0 0 0 ${grid / 2}" fill="none" stroke="rgba(47, 78, 107, 0.05)" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="rgba(255,255,255,0.08)" />
      ${shouldShowGrid ? `<rect width="${width}" height="${height}" fill="url(#minorGrid)" />` : ""}
      ${shouldShowGrid ? `<rect width="${width}" height="${height}" fill="url(#majorGrid)" />` : ""}
      <rect width="${width}" height="${height}" fill="transparent" data-canvas-surface="1" />
      ${referenceLayer.backdropMarkup}
      <g>${roomMarkup}</g>
      <g>${labelMarkup}</g>
      <g>${wallMarkup}</g>
      <g>${openingMarkup}</g>
      <g>${fixtureMarkup}</g>
      <g>${furnitureMarkup}</g>
      ${referenceLayer.overlayMarkup}
      <g>${rulerMarkup}</g>
      <g>${selectionMarkup}</g>
      <g>${draftMarkup}</g>
    `;
  }

  function getReferenceLayer() {
    const activeFloor = app.getActiveFloor();
    if (!activeFloor) return { backdropMarkup: "", overlayMarkup: "" };

    if (activeFloor.kind !== "site") {
      const siteFloors = app.state.data.floors.filter((floor) => floor.kind === "site");
      if (!siteFloors.length) return { backdropMarkup: "", overlayMarkup: "" };

      return renderReferenceLayer({
        floorIds: new Set(siteFloors.map((floor) => floor.id)),
        tone: "site",
      });
    }

    const interiorFloor = app.getClosestInteriorReferenceFloor(activeFloor);
    if (!interiorFloor) return { backdropMarkup: "", overlayMarkup: "" };

    return renderReferenceLayer({
      floorIds: new Set([interiorFloor.id]),
      tone: "interior",
    });
  }

  function renderReferenceLayer(reference) {
    const referenceRooms = app.state.data.rooms
      .filter((room) => reference.floorIds.has(room.floorId));
    const referenceWalls = app.state.data.walls
      .filter((wall) => reference.floorIds.has(wall.floorId));

    const roomMarkup = referenceRooms
      .map((room) => {
        const points = room.points.map((point) => `${point.x},${point.y}`).join(" ");
        return `<polygon class="svg-reference-room ${reference.tone}" points="${points}" />`;
      }).join("");

    const labelMarkup = referenceRooms
      .map((room) => renderReferenceRoomLabel(room, reference.tone))
      .join("");

    const wallMarkup = referenceWalls
      .map((wall) => `<line class="svg-reference-wall ${reference.tone}" x1="${wall.x1}" y1="${wall.y1}" x2="${wall.x2}" y2="${wall.y2}" stroke-width="${wall.thickness}" />`)
      .join("");

    if (!roomMarkup && !wallMarkup && !labelMarkup) {
      return { backdropMarkup: "", overlayMarkup: "" };
    }

    return {
      backdropMarkup: `
      <g class="svg-reference-layer ${reference.tone}">
        ${roomMarkup}
        ${wallMarkup}
      </g>
    `,
      overlayMarkup: labelMarkup
        ? `
      <g class="svg-reference-layer svg-reference-layer-labels ${reference.tone}">
        ${labelMarkup}
      </g>
    `
        : "",
    };
  }

  function renderReferenceRoomLabel(room, tone) {
    const center = getPolygonCentroid(room.points);
    const label = getReferenceRoomLabelText(room, tone);
    if (!label) return "";

    return `
      <g class="svg-reference-label ${tone}">
        <text class="svg-reference-label-title" x="${center.x}" y="${center.y}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(label)}</text>
      </g>
    `;
  }

  function getReferenceRoomLabelText(room, tone) {
    const safeName = String(room.name || "").trim();
    const safeType = String(room.type || "").trim();

    if (tone === "site") {
      if (safeName && !["Parcela", "Exterior"].includes(safeName)) return safeName;
      if (safeType && safeType !== "Exterior") return safeType;
      return safeName || safeType || "Exterior";
    }

    return safeName || safeType || "Interior";
  }

  function renderCanvasRulerMarkup(viewport) {
    const { x, y, width, height } = viewport;
    const step = getAdaptiveRulerStep(width);
    const bandHeight = roundNumber(Math.max(16, Math.min(26, height * 0.018)), 1);
    const bandWidth = roundNumber(Math.max(28, Math.min(44, width * 0.018)), 1);
    const tickSize = roundNumber(Math.max(10, Math.min(18, bandHeight * 0.8)), 1);
    const verticalMarks = [];
    const horizontalMarks = [];

    const startX = Math.max(step, Math.ceil(x / step) * step);
    const startY = Math.max(step, Math.ceil(y / step) * step);

    for (let tickX = startX; tickX < x + width; tickX += step) {
      verticalMarks.push(`
        <line class="svg-ruler-tick" x1="${tickX}" y1="${y}" x2="${tickX}" y2="${y + tickSize}" />
        <text class="svg-ruler-text" x="${tickX}" y="${y + bandHeight - 4}" text-anchor="middle">${escapeHtml(formatPlanDistance(tickX))}</text>
      `);
    }

    for (let tickY = startY; tickY < y + height; tickY += step) {
      horizontalMarks.push(`
        <line class="svg-ruler-tick" x1="${x}" y1="${tickY}" x2="${x + bandWidth * 0.55}" y2="${tickY}" />
        <text class="svg-ruler-text" x="${x + bandWidth - 4}" y="${tickY + 4}" text-anchor="end">${escapeHtml(formatPlanDistance(tickY))}</text>
      `);
    }

    return `
      <g class="svg-ruler">
        <rect class="svg-ruler-band" x="${x}" y="${y}" width="${width}" height="${bandHeight}" />
        <rect class="svg-ruler-band" x="${x}" y="${y}" width="${bandWidth}" height="${height}" />
        ${verticalMarks.join("")}
        ${horizontalMarks.join("")}
      </g>
    `;
  }

  function getAdaptiveRulerStep(visibleWidth) {
    if (visibleWidth >= 2200) return 200;
    if (visibleWidth >= 1100) return 100;
    return 50;
  }

  function renderPanels() {
    const isHomeRoute = app.state.ui.route === "home";
    const isEditorRoute = app.state.ui.route === "editor";
    const routePanels = isHomeRoute
      ? ["reforms", "notes", "budgets", "documents", "inventory"]
      : isEditorRoute
        ? ["inspector"]
        : [];

    if (routePanels.length && !routePanels.includes(app.state.ui.panel)) {
      app.state.ui.panel = routePanels[0];
    } else if (!routePanels.length) {
      app.state.ui.panel = "";
    }

    const panelMap = {
      inspector: app.els.inspectorPanel,
      reforms: app.els.reformsPanel,
      notes: app.els.notesPanel,
      budgets: app.els.budgetsPanel,
      inventory: app.els.inventoryPanel,
      documents: app.els.documentsPanel,
    };

    Object.entries(panelMap).forEach(([panelName, element]) => {
      const isVisible = routePanels.includes(panelName);
      element.hidden = !isVisible;
      element.classList.toggle("active", isVisible && (isHomeRoute || panelName === app.state.ui.panel));
    });

    if (isEditorRoute) {
      renderInspectorPanel();
    }

    if (isHomeRoute) {
      renderReformsSupportPanel();
      renderNotesSupportPanel();
      renderBudgetsSupportPanel();
      renderInventorySupportPanel();
      renderDocumentsSupportPanel();
    }
  }

  function renderInspectorPanel() {
    if (app.state.ui.multiSelected.size > 1) {
      app.els.inspectorPanel.innerHTML = `
        <div class="panel-head">
          <p class="section-kicker">Inspector</p>
          <h3>${app.state.ui.multiSelected.size} elementos seleccionados</h3>
          <p class="panel-copy">Arrastra cualquiera de ellos para moverlos todos a la vez.</p>
        </div>
        <div class="action-row">
          <button type="button" class="soft-btn" data-inspector-action="delete-multi">Borrar seleccion</button>
          <button type="button" class="soft-btn" id="clearMultiBtn">Limpiar seleccion</button>
        </div>
      `;
      app.els.inspectorPanel.querySelector("#clearMultiBtn")?.addEventListener("click", () => app.clearSelection());
      app.els.inspectorPanel.querySelector("[data-inspector-action='delete-multi']")?.addEventListener("click", app.deleteMultiSelected);
      return;
    }

    const selected = app.getSelectedEntity();

    if (!selected) {
      app.els.inspectorPanel.innerHTML = `
        <div class="panel-head">
          <p class="section-kicker">Inspector</p>
          <h3>Sin seleccion</h3>
          <p class="panel-copy">Primero dibuja algo o pulsa sobre una pieza existente.</p>
        </div>
        <div class="muted-box">
          <strong>Como arrancar</strong>
          <p>${escapeHtml(buildCanvasHint())}</p>
        </div>
      `;
      return;
    }

    app.els.inspectorPanel.innerHTML = `
      <div class="panel-head">
        <p class="section-kicker">Inspector</p>
        <h3>${escapeHtml(describeEntity(selected.type, selected.entity))}</h3>
        <p class="panel-copy">${escapeHtml(getEntitySummary(selected.type, selected.entity))}</p>
      </div>
      ${renderInspectorFields(selected.type, selected.entity)}
    `;
  }

  function renderButtons() {
    const tool = TOOL_DEFINITIONS.find((entry) => entry.id === app.state.ui.tool);
    const roomInProgress = app.state.ui.draft.type === "room" && app.state.ui.draft.points.length >= 3;
    const anyDraft = app.state.ui.draft.points.length > 0;
    const stopMode = app.state.ui.tool !== "select" || anyDraft;
    const viewport = getCanvasViewport();
    const viewportLimits = getViewportLimits();
    const zoomBaseWidth = viewportLimits.bounds.width;
    const zoomValue = roundNumber(zoomBaseWidth / viewport.width, 2);
    const minViewportWidth = Math.max(300, app.state.data.canvas.width * 0.12);

    app.els.stopToolBtn.hidden = !stopMode;
    app.els.stopToolBtn.disabled = !stopMode;
    app.els.stopToolBtn.classList.toggle("active", stopMode);
    app.els.stopToolBtn.textContent = anyDraft ? "Parar dibujo" : `Salir de ${tool?.label || "modo"}`;

    app.els.finishRoomBtn.hidden = app.state.ui.draft.type !== "room";
    app.els.finishRoomBtn.disabled = !roomInProgress;
    app.els.cancelDraftBtn.hidden = !anyDraft;
    app.els.cancelDraftBtn.disabled = !anyDraft;
    app.els.clearSelectionBtn.hidden = !app.state.ui.selected && app.state.ui.multiSelected.size === 0;
    app.els.clearSelectionBtn.disabled = !app.state.ui.selected && app.state.ui.multiSelected.size === 0;
    app.els.gridToggleBtn.textContent = "Rejilla 0,5 m";
    app.els.gridToggleBtn.classList.toggle("active", app.state.data.canvas.showGrid);
    app.els.snapToggleBtn.classList.toggle("active", app.state.data.canvas.snap);
    app.els.layerModalToggleBtn?.classList.toggle("active", Boolean(app.els.layerModal?.open));
    app.els.layerModalToggleBtn?.setAttribute("aria-expanded", app.els.layerModal?.open ? "true" : "false");
    app.els.zoomOutBtn.disabled = viewport.width >= zoomBaseWidth - 1;
    app.els.zoomInBtn.disabled = viewport.width <= minViewportWidth + 1;
    app.els.zoomResetBtn.textContent = `${roundNumber(zoomValue * 100, 0)}%`;
    app.els.deleteFloorBtn.disabled = app.state.data.floors.length <= 1;
    app.els.undoBtn.disabled = app.history.past.length === 0;
    app.els.redoBtn.disabled = app.history.future.length === 0;
  }

  function renderHomeFloorStepper() {
    const activeFloor = app.getActiveFloor();
    const orderedFloors = app.getOrderedFloors();
    const canShow = app.state.ui.route === "home" && orderedFloors.length > 1 && activeFloor;

    if (!app.els.homeFloorStepper) return;

    app.els.homeFloorStepper.hidden = !canShow;
    if (!canShow) return;

    const nextHigherFloor = app.getAdjacentFloor(1, activeFloor.id);
    const nextLowerFloor = app.getAdjacentFloor(-1, activeFloor.id);
    const levelLabel = activeFloor.kind === "site" ? "Exterior" : `Nivel ${activeFloor.level}`;

    if (app.els.homeFloorLabel) {
      app.els.homeFloorLabel.textContent = activeFloor.name;
      app.els.homeFloorLabel.title = `${activeFloor.name} · ${levelLabel}`;
    }

    if (app.els.homeFloorUpBtn) {
      app.els.homeFloorUpBtn.disabled = !nextHigherFloor;
      app.els.homeFloorUpBtn.title = nextHigherFloor ? `Subir a ${nextHigherFloor.name}` : "No hay una planta superior";
    }

    if (app.els.homeFloorDownBtn) {
      app.els.homeFloorDownBtn.disabled = !nextLowerFloor;
      app.els.homeFloorDownBtn.title = nextLowerFloor ? `Bajar a ${nextLowerFloor.name}` : "No hay una planta inferior";
    }
  }

  function renderRoomSvg(room) {
    const points = room.points.map((point) => `${point.x},${point.y}`).join(" ");
    const selected = isSelected("room", room.id) ? " svg-selected" : "";
    return `
      <g class="svg-hit${selected}" data-entity-type="room" data-entity-id="${escapeAttribute(room.id)}">
        <polygon class="svg-room" points="${points}" fill="${hexToRgba(room.color || "#efe1d4", 0.92)}" />
      </g>
    `;
  }

  function renderRoomLabelSvg(room) {
    const center = getPolygonCentroid(room.points);
    return `
      <g>
        <text class="svg-room-text" x="${center.x}" y="${center.y - 6}" text-anchor="middle">${escapeHtml(room.name)}</text>
        <text class="svg-room-sub" x="${center.x}" y="${center.y + 18}" text-anchor="middle">${escapeHtml(room.type)} · ${formatArea(getRoomArea(room.points))}</text>
      </g>
    `;
  }

  function renderWallSvg(wall) {
    const selected = isSelected("wall", wall.id) ? " svg-selected" : "";
    return `
      <g class="svg-hit${selected}" data-entity-type="wall" data-entity-id="${escapeAttribute(wall.id)}">
        <line class="svg-wall-hit" x1="${wall.x1}" y1="${wall.y1}" x2="${wall.x2}" y2="${wall.y2}" />
        <line class="svg-wall" x1="${wall.x1}" y1="${wall.y1}" x2="${wall.x2}" y2="${wall.y2}" stroke-width="${wall.thickness}" />
      </g>
    `;
  }

  function renderOpeningSvg(opening) {
    const selected = isSelected("opening", opening.id) ? " svg-selected" : "";

    if (opening.type === "door") {
      const geometry = getDoorGeometry(opening);
      return `
        <g class="svg-hit${selected}" data-entity-type="opening" data-entity-id="${escapeAttribute(opening.id)}">
          <line class="svg-opening-door" x1="${geometry.hinge.x}" y1="${geometry.hinge.y}" x2="${geometry.leaf.x}" y2="${geometry.leaf.y}" />
          <path class="svg-opening-arc" d="${geometry.arc}" />
        </g>
      `;
    }

    const vector = getOpeningVector(opening.angle, opening.width / 2);
    const start = { x: opening.x - vector.x, y: opening.y - vector.y };
    const end = { x: opening.x + vector.x, y: opening.y + vector.y };
    return `
      <g class="svg-hit${selected}" data-entity-type="opening" data-entity-id="${escapeAttribute(opening.id)}">
        <line class="svg-opening-window" x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" />
        <line class="svg-opening-window-core" x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" />
      </g>
    `;
  }

  function renderFixtureSvg(fixture) {
    const selected = isSelected("fixture", fixture.id) ? " svg-selected" : "";
    const glyph = escapeHtml(fixture.glyph || "?");
    return `
      <g class="svg-hit svg-fixture ${escapeAttribute(fixture.system)}${selected}" data-entity-type="fixture" data-entity-id="${escapeAttribute(fixture.id)}" transform="translate(${fixture.x} ${fixture.y}) rotate(${fixture.angle || 0})">
        <circle class="svg-fixture-ring" cx="0" cy="0" r="20" />
        <circle class="svg-fixture-body" cx="0" cy="0" r="13" />
        <text class="svg-fixture-text" x="0" y="1">${glyph}</text>
      </g>
    `;
  }

  function renderFurnitureSvg(item) {
    const selected = isSelected("furniture", item.id) ? " svg-selected" : "";
    const className = item.shape === "round" ? " round" : "";
    const label = escapeHtml((item.name || "M").slice(0, 8).toUpperCase());
    return `
      <g class="svg-hit svg-furniture${className}${selected}" data-entity-type="furniture" data-entity-id="${escapeAttribute(item.id)}" transform="translate(${item.x} ${item.y}) rotate(${item.angle || 0})">
        <rect class="svg-furniture-shape" x="${-item.width / 2}" y="${-item.height / 2}" width="${item.width}" height="${item.height}" rx="${item.shape === "round" ? item.width / 2 : 18}" ry="${item.shape === "round" ? item.height / 2 : 18}" />
        <text class="svg-furniture-text" x="0" y="2">${label}</text>
      </g>
    `;
  }

  function renderSelectionOverlay() {
    const selected = app.getSelectedEntity();
    if (!selected) return "";

    if (selected.type === "room") {
      const points = selected.entity.points.map((point) => `${point.x},${point.y}`).join(" ");
      return `<polygon class="svg-boundary" points="${points}" />`;
    }

    if (selected.type === "wall") {
      const start = { x: selected.entity.x1, y: selected.entity.y1 };
      const end = { x: selected.entity.x2, y: selected.entity.y2 };
      return `
        <line class="svg-boundary" x1="${selected.entity.x1}" y1="${selected.entity.y1}" x2="${selected.entity.x2}" y2="${selected.entity.y2}" />
        ${renderMeasureLabel(start, end)}
      `;
    }

    return "";
  }

  function renderDraftOverlay() {
    if (app.state.ui.pointer.mode === "box-select" && app.state.ui.pointer.boxStart && app.state.ui.pointer.boxEnd) {
      const boxX = roundNumber(Math.min(app.state.ui.pointer.boxStart.x, app.state.ui.pointer.boxEnd.x), 1);
      const boxY = roundNumber(Math.min(app.state.ui.pointer.boxStart.y, app.state.ui.pointer.boxEnd.y), 1);
      const boxWidth = roundNumber(Math.abs(app.state.ui.pointer.boxEnd.x - app.state.ui.pointer.boxStart.x), 1);
      const boxHeight = roundNumber(Math.abs(app.state.ui.pointer.boxEnd.y - app.state.ui.pointer.boxStart.y), 1);
      return `<rect class="svg-box-select" x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" />`;
    }

    if (app.state.ui.draft.type === "wall" && app.state.ui.draft.points.length === 1) {
      const start = app.state.ui.draft.points[0];
      const end = app.state.ui.hoverPoint || start;
      return `
        <line class="svg-draft-line" x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" />
        <circle class="svg-draft-point" cx="${start.x}" cy="${start.y}" r="6" />
        ${renderMeasureLabel(start, end)}
      `;
    }

    if (app.state.ui.draft.type === "room" && app.state.ui.draft.points.length) {
      const points = [...app.state.ui.draft.points];
      if (app.state.ui.hoverPoint) {
        points.push(app.state.ui.hoverPoint);
      }
      const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
      const pointsMarkup = app.state.ui.draft.points
        .map((point) => `<circle class="svg-draft-point" cx="${point.x}" cy="${point.y}" r="6" />`)
        .join("");
      const currentSegment = app.state.ui.hoverPoint
        ? renderMeasureLabel(app.state.ui.draft.points[app.state.ui.draft.points.length - 1], app.state.ui.hoverPoint)
        : "";
      return `<polyline class="svg-draft-poly" points="${polyline}" />${pointsMarkup}${currentSegment}`;
    }

    return "";
  }

  function renderMeasureLabel(start, end) {
    const distance = distanceBetween(start, end);
    if (distance < 15) return "";

    const midpoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    };
    const normal = getNormalVector(start, end);
    const labelX = roundNumber(midpoint.x + normal.x * 26, 1);
    const labelY = roundNumber(midpoint.y + normal.y * 26, 1);

    return `
      <text class="svg-measure-text" x="${labelX}" y="${labelY}" text-anchor="middle">
        ${escapeHtml(formatPlanDistance(distance))}
      </text>
    `;
  }

  function getNormalVector(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;

    return {
      x: -dy / length,
      y: dx / length,
    };
  }

  function formatPlanDistance(valueInCentimeters) {
    return formatLength(valueInCentimeters / PLAN_CENTIMETERS_PER_METER);
  }

  function getCanvasViewport() {
    if (app.state.ui.route === "home") {
      return getHomeViewport();
    }

    return getViewport();
  }

  function createDefaultViewport() {
    return {
      x: 0,
      y: 0,
      width: app.state.data.canvas.width,
      height: app.state.data.canvas.height,
    };
  }

  function createPresentationViewport() {
    const activeFloor = app.getActiveFloor();
    if (!activeFloor) return createDefaultViewport();

    const bounds = getFloorContentBounds(activeFloor.id);
    if (!bounds) return createDefaultViewport();

    const aspectRatio = app.state.data.canvas.height / app.state.data.canvas.width;
    const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
    const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
    const padding = Math.max(90, Math.min(150, Math.max(contentWidth, contentHeight) * 0.09));
    const paddedWidth = contentWidth + padding * 2;
    const paddedHeight = contentHeight + padding * 2;
    const viewportWidth = Math.max(paddedWidth, paddedHeight / aspectRatio);

    return clampViewport({
      x: bounds.minX - ((viewportWidth - contentWidth) / 2),
      y: bounds.minY - (((viewportWidth * aspectRatio) - contentHeight) / 2),
      width: viewportWidth,
      height: viewportWidth * aspectRatio,
    });
  }

  function buildViewportKey(viewport, floorId = "default") {
    return [
      floorId,
      roundNumber(viewport.x || 0, 2),
      roundNumber(viewport.y || 0, 2),
      roundNumber(viewport.width || app.state.data.canvas.width, 2),
      roundNumber(viewport.height || app.state.data.canvas.height, 2),
    ].join(":");
  }

  function getPresentationViewportFrame() {
    const activeFloor = app.getActiveFloor();
    const viewport = createPresentationViewport();
    return {
      viewport,
      key: buildViewportKey(viewport, activeFloor?.id || "default"),
    };
  }

  function getFloorContentBounds(floorId) {
    if (!floorId) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const includePoint = (x, y) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };

    const includeRect = (x1, y1, x2, y2) => {
      includePoint(x1, y1);
      includePoint(x2, y2);
    };

    app.state.data.rooms
      .filter((room) => room.floorId === floorId)
      .forEach((room) => room.points.forEach((point) => includePoint(point.x, point.y)));

    app.state.data.walls
      .filter((wall) => wall.floorId === floorId)
      .forEach((wall) => includeRect(wall.x1, wall.y1, wall.x2, wall.y2));

    app.state.data.openings
      .filter((opening) => opening.floorId === floorId)
      .forEach((opening) => {
        const reach = Math.max(40, (opening.width || 0) / 2);
        includeRect(opening.x - reach, opening.y - reach, opening.x + reach, opening.y + reach);
      });

    app.state.data.fixtures
      .filter((fixture) => fixture.floorId === floorId)
      .forEach((fixture) => includeRect(fixture.x - 28, fixture.y - 28, fixture.x + 28, fixture.y + 28));

    app.state.data.furniture
      .filter((item) => item.floorId === floorId)
      .forEach((item) => {
        const reach = Math.hypot((item.width || 0) / 2, (item.height || 0) / 2) || 40;
        includeRect(item.x - reach, item.y - reach, item.x + reach, item.y + reach);
      });

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return null;
    }

    return { minX, minY, maxX, maxY };
  }

  function ensureViewport() {
    if (!app.state.ui.viewport) {
      app.state.ui.viewport = createDefaultViewport();
      return;
    }

    app.state.ui.viewport = clampViewport(app.state.ui.viewport);
  }

  function getViewport() {
    ensureViewport();
    return app.state.ui.viewport;
  }

  function ensureHomeViewport() {
    const frame = getPresentationViewportFrame();

    if (!app.state.ui.homeViewport || app.state.ui.homeViewportKey !== frame.key) {
      app.state.ui.homeViewport = { ...frame.viewport };
      app.state.ui.homeViewportKey = frame.key;
      return;
    }

    app.state.ui.homeViewport = clampViewport(app.state.ui.homeViewport, {
      bounds: frame.viewport,
      maxWidth: frame.viewport.width,
    });
  }

  function getHomeViewport() {
    ensureHomeViewport();
    return app.state.ui.homeViewport;
  }

  function getViewportLimits() {
    if (app.state.ui.route === "home") {
      const frame = getPresentationViewportFrame();
      return {
        bounds: frame.viewport,
        maxWidth: frame.viewport.width,
      };
    }

    return {
      bounds: createDefaultViewport(),
      maxWidth: app.state.data.canvas.width,
    };
  }

  function setCanvasViewport(viewport) {
    const limits = getViewportLimits();
    const clamped = clampViewport(viewport, limits);

    if (app.state.ui.route === "home") {
      app.state.ui.homeViewport = clamped;
      app.state.ui.homeViewportKey = buildViewportKey(limits.bounds, app.getActiveFloor()?.id || "default");
      return app.state.ui.homeViewport;
    }

    app.state.ui.viewport = clamped;
    return app.state.ui.viewport;
  }

  function clampViewport(viewport, options = {}) {
    const canvasWidth = app.state.data.canvas.width;
    const canvasHeight = app.state.data.canvas.height;
    const aspectRatio = canvasHeight / canvasWidth;
    const minWidth = Math.max(300, canvasWidth * 0.12);
    const bounds = options.bounds || createDefaultViewport();
    const maxWidth = Math.max(minWidth, Math.min(options.maxWidth || bounds.width || canvasWidth, canvasWidth));
    const safeWidth = Math.min(maxWidth, Math.max(minWidth, viewport.width || maxWidth));
    const safeHeight = roundNumber(safeWidth * aspectRatio, 2);
    const minX = bounds.x || 0;
    const minY = bounds.y || 0;
    const maxX = roundNumber(minX + Math.max(0, (bounds.width || canvasWidth) - safeWidth), 2);
    const maxY = roundNumber(minY + Math.max(0, (bounds.height || canvasHeight) - safeHeight), 2);

    return {
      x: roundNumber(Math.min(Math.max(viewport.x || minX, minX), maxX), 2),
      y: roundNumber(Math.min(Math.max(viewport.y || minY, minY), maxY), 2),
      width: roundNumber(safeWidth, 2),
      height: roundNumber(safeHeight, 2),
    };
  }

  function zoomIn() {
    zoomViewport(0.82);
  }

  function zoomOut() {
    zoomViewport(1.22);
  }

  function resetZoom() {
    if (app.state.ui.route === "home") {
      const frame = getPresentationViewportFrame();
      app.state.ui.homeViewport = { ...frame.viewport };
      app.state.ui.homeViewportKey = frame.key;
    } else {
      app.state.ui.viewport = createDefaultViewport();
    }
    renderCanvas();
    renderButtons();
  }

  function zoomViewport(factor, anchor = null) {
    const current = getCanvasViewport();
    const aspectRatio = app.state.data.canvas.height / app.state.data.canvas.width;
    const nextWidth = current.width * factor;
    const focus = anchor || {
      x: current.x + current.width / 2,
      y: current.y + current.height / 2,
    };
    const relX = (focus.x - current.x) / current.width;
    const relY = (focus.y - current.y) / current.height;

    setCanvasViewport({
      x: focus.x - relX * nextWidth,
      y: focus.y - relY * (nextWidth * aspectRatio),
      width: nextWidth,
      height: nextWidth * aspectRatio,
    });

    renderCanvas();
    renderButtons();
  }

  function updateCanvasClassName() {
    const classes = ["plan-canvas"];

    if (app.state.ui.route === "home") {
      classes.push("tool-select");
    } else {
      classes.push(`tool-${app.state.ui.tool}`);
    }

    if (app.state.ui.pointer.mode === "canvas" && app.state.ui.pointer.down && app.state.ui.pointer.moved) {
      classes.push("is-panning");
    }

    if (app.state.ui.route !== "home" && app.state.ui.tool === "select") {
      classes.push(`select-mode-${app.state.ui.selectMode}`);
    }

    app.els.planCanvas.setAttribute("class", classes.join(" "));
  }

  function renderInspectorFields(type, entity) {
    if (type === "room") {
      return `
        <div class="field-grid">
          <label class="field"><span>Nombre</span><input type="text" data-field="name" value="${escapeAttribute(entity.name)}" /></label>
          <label class="field"><span>Tipo</span><input type="text" data-field="type" value="${escapeAttribute(entity.type)}" /></label>
          <label class="field"><span>Zona</span><select data-field="zone"><option value="interior" ${entity.zone === "interior" ? "selected" : ""}>Interior</option><option value="exterior" ${entity.zone === "exterior" ? "selected" : ""}>Exterior</option></select></label>
          <label class="field"><span>Color</span><input type="color" data-field="color" value="${escapeAttribute(entity.color || "#efe1d4")}" /></label>
          <label class="field full"><span>Notas</span><textarea data-field="notes">${escapeHtml(entity.notes || "")}</textarea></label>
        </div>
        <div class="action-row"><button type="button" class="soft-btn" data-inspector-action="delete">Borrar estancia</button></div>
      `;
    }

    if (type === "wall") {
      return `
        <div class="field-grid">
          <label class="field"><span>Nombre</span><input type="text" data-field="name" value="${escapeAttribute(entity.name)}" /></label>
          <label class="field"><span>Tipo</span><input type="text" data-field="kind" value="${escapeAttribute(entity.kind)}" /></label>
          <label class="field"><span>Zona</span><select data-field="zone"><option value="interior" ${entity.zone === "interior" ? "selected" : ""}>Interior</option><option value="exterior" ${entity.zone === "exterior" ? "selected" : ""}>Exterior</option></select></label>
          <label class="field"><span>Grosor</span><input type="number" data-field="thickness" value="${entity.thickness}" /></label>
          <label class="field"><span>Inicio X</span><input type="number" data-field="x1" value="${entity.x1}" /></label>
          <label class="field"><span>Inicio Y</span><input type="number" data-field="y1" value="${entity.y1}" /></label>
          <label class="field"><span>Fin X</span><input type="number" data-field="x2" value="${entity.x2}" /></label>
          <label class="field"><span>Fin Y</span><input type="number" data-field="y2" value="${entity.y2}" /></label>
          <label class="field full"><span>Notas</span><textarea data-field="notes">${escapeHtml(entity.notes || "")}</textarea></label>
        </div>
        <div class="action-row"><button type="button" class="soft-btn" data-inspector-action="delete">Borrar muro</button></div>
      `;
    }

    if (type === "opening") {
      const flipButton = entity.type === "door"
        ? `<button type="button" class="soft-btn" data-inspector-action="flip-opening">Voltear sentido</button>`
        : "";

      return `
        <div class="field-grid">
          <label class="field"><span>Nombre</span><input type="text" data-field="name" value="${escapeAttribute(entity.name)}" /></label>
          <label class="field"><span>Anchura</span><input type="number" data-field="width" value="${entity.width}" min="50" /></label>
          <label class="field"><span>X</span><input type="number" data-field="x" value="${entity.x}" /></label>
          <label class="field"><span>Y</span><input type="number" data-field="y" value="${entity.y}" /></label>
          <label class="field"><span>Angulo</span><input type="number" data-field="angle" value="${entity.angle || 0}" /></label>
          <label class="field full"><span>Notas</span><textarea data-field="notes">${escapeHtml(entity.notes || "")}</textarea></label>
        </div>
        <div class="action-row">
          ${flipButton}
          <button type="button" class="soft-btn" data-inspector-action="delete">Borrar hueco</button>
        </div>
      `;
    }

    if (type === "fixture") {
      const variants = FIXTURE_PRESETS[entity.system] || [];

      return `
        <div class="field-grid">
          <label class="field"><span>Nombre</span><input type="text" data-field="name" value="${escapeAttribute(entity.name)}" /></label>
          <label class="field"><span>Sistema</span><select data-field="system"><option value="electricity" ${entity.system === "electricity" ? "selected" : ""}>Electricidad</option><option value="water" ${entity.system === "water" ? "selected" : ""}>Agua</option><option value="network" ${entity.system === "network" ? "selected" : ""}>Red</option></select></label>
          <label class="field"><span>Variante</span><select data-field="variant">${variants.map((entry) => `<option value="${entry.id}" ${entry.id === entity.variant ? "selected" : ""}>${escapeHtml(entry.label)}</option>`).join("")}</select></label>
          <label class="field"><span>Estado</span><select data-field="status"><option value="ok" ${entity.status === "ok" ? "selected" : ""}>Correcto</option><option value="attention" ${entity.status === "attention" ? "selected" : ""}>A revisar</option><option value="critical" ${entity.status === "critical" ? "selected" : ""}>Critico</option></select></label>
          <label class="field"><span>X</span><input type="number" data-field="x" value="${entity.x}" /></label>
          <label class="field"><span>Y</span><input type="number" data-field="y" value="${entity.y}" /></label>
          <label class="field full"><span>Notas</span><textarea data-field="notes">${escapeHtml(entity.notes || "")}</textarea></label>
        </div>
        <div class="action-row"><button type="button" class="soft-btn" data-inspector-action="delete">Borrar punto</button></div>
      `;
    }

    if (type === "furniture") {
      const furniturePresets = app.getAllFurniturePresets();
      return `
        <div class="field-grid">
          <label class="field"><span>Nombre</span><input type="text" data-field="name" value="${escapeAttribute(entity.name)}" /></label>
          <label class="field"><span>Preset</span><select data-field="preset">${furniturePresets.map((entry) => `<option value="${entry.id}" ${entry.id === entity.preset ? "selected" : ""}>${escapeHtml(entry.label)}</option>`).join("")}</select></label>
          <label class="field"><span>X</span><input type="number" data-field="x" value="${entity.x}" /></label>
          <label class="field"><span>Y</span><input type="number" data-field="y" value="${entity.y}" /></label>
          <label class="field"><span>Ancho</span><input type="number" data-field="width" value="${entity.width}" /></label>
          <label class="field"><span>Fondo</span><input type="number" data-field="height" value="${entity.height}" /></label>
          <label class="field"><span>Giro</span><input type="number" data-field="angle" value="${entity.angle || 0}" /></label>
          <label class="field full"><span>Notas</span><textarea data-field="notes">${escapeHtml(entity.notes || "")}</textarea></label>
        </div>
        <div class="action-row"><button type="button" class="soft-btn" data-inspector-action="delete">Borrar mueble</button></div>
      `;
    }

    return `<div class="empty-box">Sin campos disponibles.</div>`;
  }

  function buildSupportPanelSectionMarkup(options) {
    const activeFloorId = app.state.data.project.activeFloorId;
    const selectedRoom = options.groupByRoom ? app.getSelectedRoom?.() : null;
    const activeRoom = selectedRoom?.floorId === activeFloorId ? selectedRoom : null;
    const floorRooms = app.state.data.rooms.filter((room) => room.floorId === activeFloorId);
    const roomMap = new Map(floorRooms.map((room) => [room.id, room]));
    const items = options.items
      .filter((item) => item.floorId === activeFloorId)
      .filter((item) => matchesSupportPanelFilter(options.panelType, item, roomMap));
    const sectionClassName = options.sectionClassName ? ` ${options.sectionClassName}` : "";
    const roomContextMarkup = buildSupportPanelRoomContextMarkup(activeRoom, options.groupByRoom);
    const itemsMarkup = buildSupportPanelItemsMarkup({
      items,
      activeRoom,
      roomMap,
      floorRooms,
      emptyMessage: options.emptyMessage,
      emptySelectedMessage: options.emptySelectedMessage,
      groupByRoom: options.groupByRoom,
      panelType: options.panelType,
      supportSearch: app.state.ui.supportSearch,
      renderItem: options.renderItem,
    });

    return `
      <section class="support-panel-shell${sectionClassName}">
        <div class="support-panel-top">
          <div class="panel-head">
            <p class="section-kicker">${escapeHtml(options.kicker || "Apoyo")}</p>
            <h3>${escapeHtml(options.title)}</h3>
            ${roomContextMarkup}
          </div>
          <button type="button" class="panel-add-trigger" data-support-modal-open="${options.panelType}" aria-haspopup="dialog">
            + ${escapeHtml(options.addLabel)}
          </button>
        </div>
        <div class="support-panel-scroll">
          ${itemsMarkup}
        </div>
      </section>
    `;
  }

  function buildSupportPanelRoomContextMarkup(activeRoom, groupByRoom) {
    if (!groupByRoom) return "";
    if (activeRoom) {
      return `<span class="panel-context-pill">Solo ${escapeHtml(activeRoom.name)}</span>`;
    }
    return `<span class="panel-context-pill">Toda la planta</span>`;
  }

  function buildSupportPanelItemsMarkup(options) {
    if (!options.groupByRoom) {
      return options.items.length
        ? options.items.map(options.renderItem).join("")
        : buildSupportEmptyStateMarkup(options.emptyMessage, null, options.supportSearch);
    }

    if (options.activeRoom) {
      const roomItems = options.items.filter((item) => item.roomId === options.activeRoom.id);
      const emptyMessage = options.emptySelectedMessage || options.emptyMessage;
      return roomItems.length
        ? roomItems.map(options.renderItem).join("")
        : buildSupportEmptyStateMarkup(emptyMessage.replace("{room}", options.activeRoom.name), options.activeRoom.name, options.supportSearch);
    }

    const groups = options.floorRooms
      .map((room) => ({
        key: `${options.panelType || "support"}:${room.id}`,
        id: room.id,
        label: room.name,
        zone: room.zone || "interior",
        items: options.items.filter((item) => item.roomId === room.id),
      }))
      .filter((group) => group.items.length);

    const unassignedItems = options.items.filter((item) => !item.roomId || !options.roomMap.has(item.roomId));
    if (unassignedItems.length) {
      groups.push({
        key: `${options.panelType || "support"}:unassigned`,
        id: "",
        label: "Sin estancia",
        zone: "neutral",
        items: unassignedItems,
      });
    }

    if (!groups.length) {
      return buildSupportEmptyStateMarkup(options.emptyMessage, null, options.supportSearch);
    }

    return `
      <div class="support-tree">
        ${groups.map((group) => `
        <details class="support-room-group support-tree-node ${escapeAttribute(group.zone)}" ${options.supportSearch ? "open" : ""}>
          <summary class="support-room-summary">
            <div class="support-room-group-copy">
              <strong>${escapeHtml(group.label)}</strong>
            </div>
            <div class="support-room-group-side">
              <span class="support-room-group-count">${group.items.length} registros</span>
              <span class="support-room-group-chevron" aria-hidden="true"></span>
            </div>
          </summary>
          <div class="support-room-group-items">
            ${group.items.map(options.renderItem).join("")}
          </div>
        </details>
        `).join("")}
      </div>
    `;
  }

  function getSupportRoomGroupMeta(room) {
    const type = String(room.type || "").trim();
    const zone = room.zone === "exterior" ? "Exterior" : "Interior";
    if (!type) return zone;
    return `${type} · ${zone}`;
  }

  function buildSupportGroupPreview(panelType, items) {
    const titles = items
      .slice(0, 2)
      .map((item) => getSupportListItemTitle(panelType, item))
      .filter(Boolean);

    if (!titles.length) return "Sin elementos dentro de esta estancia.";
    if (items.length > 2) {
      return `${titles.join(" · ")} · +${items.length - 2} más`;
    }
    return titles.join(" · ");
  }

  function getSupportListItemTitle(panelType, item) {
    if (panelType === "inventory") return item.name || "Elemento";
    return item.title || "Elemento";
  }

  function buildSupportEmptyStateMarkup(defaultMessage, roomName = null, supportSearch = "") {
    if (!supportSearch) {
      return `<div class="empty-box">${escapeHtml(defaultMessage)}</div>`;
    }

    const roomCopy = roomName ? ` en ${roomName}` : " en esta planta";
    return `<div class="empty-box">No hay resultados${escapeHtml(roomCopy)} con el filtro actual.</div>`;
  }

  function matchesSupportPanelFilter(panelType, item, roomMap) {
    const supportSearch = String(app.state.ui.supportSearch || "").trim().toLowerCase();
    if (!supportSearch) return true;

    return buildSupportPanelSearchText(panelType, item, roomMap).includes(supportSearch);
  }

  function buildSupportPanelSearchText(panelType, item, roomMap) {
    const roomName = item.roomId
      ? roomMap.get(item.roomId)?.name || getRoomNameById(item.roomId)
      : "sin estancia";
    const reformLabel = item.reformId ? getSupportReformLabel(item.reformId) : "libre";

    if (panelType === "reforms") {
      return [
        item.title,
        item.notes,
        REFORM_KIND_LABELS[item.kind] || "",
        REFORM_PRIORITY_LABELS[item.priority] || "",
        REFORM_STATUS_LABELS[item.status] || "",
        roomName,
      ].join(" ").toLowerCase();
    }

    if (panelType === "notes") {
      return [
        item.title,
        item.notes,
        reformLabel,
        roomName,
      ].join(" ").toLowerCase();
    }

    if (panelType === "budgets") {
      return [
        item.title,
        item.notes,
        reformLabel,
        roomName,
        String(item.amount || ""),
        item.pdf?.name || "",
      ].join(" ").toLowerCase();
    }

    if (panelType === "inventory") {
      return [
        item.name,
        item.category,
        item.notes,
        roomName,
        String(item.value || ""),
        INVENTORY_STATE_LABELS[item.state] || "",
      ].join(" ").toLowerCase();
    }

    return [
      item.title,
      item.type,
      item.reference,
      item.notes,
      reformLabel,
      roomName,
      item.pdf?.name || "",
    ].join(" ").toLowerCase();
  }

  function renderSupportEntryModal() {
    if (!app.els.supportEntryModal) return;

    const panelType = app.state.ui.supportModalPanel;
    if (!panelType) {
      app.els.supportEntryModalTitle.textContent = "Nuevo elemento";
      app.els.supportEntryModalCopy.textContent = "Rellena los datos y guarda.";
      app.els.supportEntryModalBody.innerHTML = "";
      return;
    }

    const options = getSupportModalOptions(panelType);
    if (!options) return;

    const editingItemId = String(app.state.ui.supportModalItemId || "");
    const editingItem = editingItemId ? getSupportItem(panelType, editingItemId) : null;
    const modalFloorId = editingItem?.floorId || app.state.data.project.activeFloorId;
    const selectedRoom = options.groupByRoom ? app.getSelectedRoom?.() : null;
    const scopedSelectedRoom = selectedRoom?.floorId === modalFloorId ? selectedRoom : null;
    const activeRoom = editingItem?.roomId
      ? app.state.data.rooms.find((room) => room.id === editingItem.roomId) || scopedSelectedRoom || null
      : scopedSelectedRoom || null;
    const roomScopeInput = activeRoom
      ? `<input type="hidden" name="roomId" value="${escapeAttribute(activeRoom.id)}">`
      : "";
    const reformFieldMarkup = options.supportsReformLink
      ? buildSupportReformFieldMarkup(modalFloorId, activeRoom)
      : "";
    const currentAttachmentMarkup = buildSupportCurrentAttachmentMarkup(panelType, editingItem);
    const modalCopy = editingItem
      ? activeRoom
        ? `Estas editando ${editingItem.title || editingItem.name || "el elemento"} dentro de ${activeRoom.name}.`
        : `Estas editando ${editingItem.title || editingItem.name || "el elemento"} en ${getFloorNameById(modalFloorId)}.`
      : activeRoom
        ? `Se guardara dentro de ${activeRoom.name}.`
        : options.groupByRoom
          ? "Se guardara en la planta activa. Si luego quieres, podras reagruparlo por estancia."
          : "Se guardara en la planta activa.";

    app.els.supportEntryModalTitle.textContent = editingItem ? options.editTitle || options.modalTitle : options.modalTitle;
    app.els.supportEntryModalCopy.textContent = modalCopy;
    app.els.supportEntryModalBody.innerHTML = `
      <form class="add-form-body support-modal-form" data-add-panel="${options.panelType}">
        ${roomScopeInput}
        ${options.formMarkup}
        ${reformFieldMarkup}
        ${currentAttachmentMarkup}
        <div class="form-actions">
          <button type="submit" class="soft-btn active">${editingItem ? "Guardar cambios" : "Guardar"}</button>
        </div>
      </form>
    `;

    if (editingItem) {
      const modalForm = app.els.supportEntryModalBody.querySelector("form");
      if (modalForm) {
        populateSupportEntryForm(modalForm, panelType, editingItem);
      }
    }
  }

  function renderSupportDetailModal() {
    if (!app.els.supportDetailModal) return;

    const detailItem = app.state.ui.supportDetailItem;
    if (!detailItem) {
      app.els.supportDetailModalTitle.textContent = "Detalle";
      app.els.supportDetailModalCopy.textContent = "Informacion del elemento.";
      app.els.supportDetailModalBody.innerHTML = "";
      app.els.supportDetailModalEditBtn.hidden = true;
      app.els.supportDetailModalEditBtn.dataset.panelEdit = "";
      app.els.supportDetailModalEditBtn.dataset.itemId = "";
      app.els.supportDetailModalDeleteBtn.hidden = true;
      app.els.supportDetailModalDeleteBtn.dataset.panelDelete = "";
      app.els.supportDetailModalDeleteBtn.dataset.itemId = "";
      return;
    }

    const item = getSupportItem(detailItem.panelType, detailItem.itemId);
    if (!item) {
      app.els.supportDetailModalTitle.textContent = "Detalle";
      app.els.supportDetailModalCopy.textContent = "El elemento ya no existe.";
      app.els.supportDetailModalBody.innerHTML = "";
      app.els.supportDetailModalEditBtn.hidden = true;
      app.els.supportDetailModalDeleteBtn.hidden = true;
      return;
    }

    const content = buildSupportDetailContent(detailItem.panelType, item);
    app.els.supportDetailModalTitle.textContent = content.title;
    app.els.supportDetailModalCopy.textContent = content.copy;
    app.els.supportDetailModalBody.innerHTML = content.bodyMarkup;
    app.els.supportDetailModalEditBtn.hidden = !isEditableSupportPanelType(detailItem.panelType);
    app.els.supportDetailModalEditBtn.dataset.panelEdit = detailItem.panelType;
    app.els.supportDetailModalEditBtn.dataset.itemId = item.id;
    app.els.supportDetailModalDeleteBtn.hidden = false;
    app.els.supportDetailModalDeleteBtn.dataset.panelDelete = detailItem.panelType;
    app.els.supportDetailModalDeleteBtn.dataset.itemId = item.id;
  }

  function populateSupportEntryForm(form, panelType, item) {
    setFormFieldValue(form, "title", item.title || "");
    setFormFieldValue(form, "notes", item.notes || "");
    setFormFieldValue(form, "roomId", item.roomId || "");
    setFormFieldValue(form, "reformId", item.reformId || "");

    if (panelType === "reforms") {
      setFormFieldValue(form, "kind", item.kind || "improvement");
      setFormFieldValue(form, "priority", item.priority || "medium");
      setFormFieldValue(form, "status", item.status || "planned");
      return;
    }

    if (panelType === "budgets") {
      setFormFieldValue(form, "amount", item.amount ?? 0);
      setFormFieldValue(form, "status", item.status || "draft");
      setFormFieldValue(form, "supplier", item.supplier || "");
      return;
    }

    if (panelType === "documents") {
      setFormFieldValue(form, "type", item.type || "General");
      setFormFieldValue(form, "reference", item.reference || "");
    }
  }

  function setFormFieldValue(form, fieldName, value) {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLTextAreaElement) && !(field instanceof HTMLSelectElement)) {
      return;
    }

    field.value = String(value ?? "");
  }

  function buildSupportCurrentAttachmentMarkup(panelType, item) {
    if (!item || (panelType !== "budgets" && panelType !== "documents")) return "";
    if (!item.pdf?.dataUrl) return "";

    return `
      <div class="current-attachment-box">
        <strong>PDF actual</strong>
        <div class="current-attachment-row">
          <span>${escapeHtml(item.pdf.name || "adjunto.pdf")}</span>
          ${buildPdfActionLink(item.pdf, "Descargar")}
        </div>
      </div>
    `;
  }

  function isEditableSupportPanelType(panelType) {
    return EDITABLE_SUPPORT_PANEL_TYPES.includes(panelType);
  }

  function getSupportItem(panelType, itemId) {
    const collectionKey = SUPPORT_PANEL_COLLECTION_KEYS[panelType];
    if (!collectionKey || !itemId) return null;
    return app.state.data[collectionKey].find((entry) => entry.id === itemId) || null;
  }

  function buildSupportDetailContent(panelType, item) {
    if (panelType === "reforms") {
      return {
        title: item.title || "Reforma",
        copy: "Ficha completa de la reforma.",
        bodyMarkup: `
          <div class="detail-grid">
            ${buildDetailRow("Tipo", REFORM_KIND_LABELS[item.kind] || "Mejora")}
            ${buildDetailRow("Prioridad", REFORM_PRIORITY_LABELS[item.priority] || "Media")}
            ${buildDetailRow("Estado", REFORM_STATUS_LABELS[item.status] || "Planificada")}
            ${buildDetailRow("Estancia", getRoomNameById(item.roomId))}
            ${buildDetailRow("Notas ligadas", String(app.state.data.notes.filter((entry) => entry.reformId === item.id).length))}
            ${buildDetailRow("Presupuestos ligados", String(app.state.data.budgets.filter((entry) => entry.reformId === item.id).length))}
            ${buildDetailRow("Documentos ligados", String(app.state.data.documents.filter((entry) => entry.reformId === item.id).length))}
            ${buildDetailRow("Detalle", item.notes || "Sin detalle")}
          </div>
        `,
      };
    }

    if (panelType === "notes") {
      return {
        title: item.title || "Nota",
        copy: "Detalle de la nota.",
        bodyMarkup: `
          <div class="detail-grid">
            ${buildDetailRow("Reforma", getSupportReformLabel(item.reformId))}
            ${buildDetailRow("Estancia", getRoomNameById(item.roomId))}
            ${buildDetailRow("Detalle", item.notes || "Sin detalle")}
          </div>
        `,
      };
    }

    if (panelType === "budgets") {
      return {
        title: item.title || "Presupuesto",
        copy: "Detalle del presupuesto.",
        bodyMarkup: `
          <div class="detail-grid">
            ${buildDetailRow("Reforma", getSupportReformLabel(item.reformId))}
            ${buildDetailRow("Situacion", BUDGET_STATUS_LABELS[item.status] || "Borrador")}
            ${buildDetailRow("Proveedor", item.supplier || "Sin proveedor")}
            ${buildDetailRow("Estancia", getRoomNameById(item.roomId))}
            ${buildDetailRow("Precio", formatCurrency(item.amount || 0))}
            ${buildDetailRow("Detalle", item.notes || "Sin detalle")}
            ${buildDetailRow("PDF", item.pdf?.dataUrl ? buildPdfActionLink(item.pdf, "Descargar PDF") : "Sin PDF", { html: Boolean(item.pdf?.dataUrl) })}
          </div>
        `,
      };
    }

    if (panelType === "inventory") {
      return {
        title: item.name || "Elemento",
        copy: "Detalle del inventario.",
        bodyMarkup: `
          <div class="detail-grid">
            ${buildDetailRow("Estado", INVENTORY_STATE_LABELS[item.state] || "En uso")}
            ${buildDetailRow("Categoria", item.category || "General")}
            ${buildDetailRow("Estancia", getRoomNameById(item.roomId))}
            ${buildDetailRow("Valor", formatCurrency(item.value || 0))}
            ${buildDetailRow("Detalle", item.notes || "Sin detalle")}
          </div>
        `,
      };
    }

    return {
      title: item.title || "Documento",
      copy: "Detalle del documento.",
      bodyMarkup: `
        <div class="detail-grid">
          ${buildDetailRow("Reforma", getSupportReformLabel(item.reformId))}
          ${buildDetailRow("Tipo", item.type || "General")}
          ${buildDetailRow("Estancia", getRoomNameById(item.roomId))}
          ${buildDetailRow("Referencia", item.reference || "Sin referencia")}
          ${buildDetailRow("Observaciones", item.notes || "Sin observaciones")}
          ${buildDetailRow("PDF", item.pdf?.dataUrl ? buildPdfActionLink(item.pdf, "Descargar PDF") : "Sin PDF", { html: Boolean(item.pdf?.dataUrl) })}
        </div>
      `,
    };
  }

  function buildDetailRow(label, value, options = {}) {
    const safeValue = value || "Sin dato";
    const valueMarkup = options.html ? String(safeValue) : escapeHtml(safeValue);

    return `
      <div class="detail-row">
        <strong>${escapeHtml(label)}</strong>
        <div>${valueMarkup}</div>
      </div>
    `;
  }

  function getRoomNameById(roomId) {
    if (!roomId) return "Sin estancia";
    return app.state.data.rooms.find((entry) => entry.id === roomId)?.name || "Sin estancia";
  }

  function getFloorNameById(floorId) {
    if (!floorId) return "Sin planta";
    return app.state.data.floors.find((entry) => entry.id === floorId)?.name || "Sin planta";
  }

  function buildSupportReformFieldMarkup(floorId, activeRoom) {
    const reforms = app.state.data.reforms
      .filter((reform) => reform.floorId === floorId)
      .filter((reform) => !activeRoom || !reform.roomId || reform.roomId === activeRoom.id);

    const optionsMarkup = reforms.length
      ? reforms.map((reform) => `<option value="${escapeAttribute(reform.id)}">${escapeHtml(reform.title || "Reforma")}</option>`).join("")
      : "";

    return `
      <label class="field full">
        <span>Reforma vinculada</span>
        <select class="field-input" name="reformId">
          <option value="">Libre</option>
          ${optionsMarkup}
        </select>
      </label>
    `;
  }

  function getSupportModalOptions(panelType) {
    if (panelType === "notes") {
      return {
        panelType: "notes",
        modalTitle: "Nueva nota",
        groupByRoom: true,
        supportsReformLink: true,
        formMarkup: `
          <input class="field-input" name="title" placeholder="Titulo de la nota" required>
          <textarea class="field-input" name="notes" placeholder="Detalle" rows="4"></textarea>
        `,
      };
    }

    if (panelType === "reforms") {
      return {
        panelType: "reforms",
        modalTitle: "Nueva reforma",
        editTitle: "Editar reforma",
        groupByRoom: true,
        formMarkup: `
          <input class="field-input" name="title" placeholder="Titulo de la reforma" required>
          <select class="field-input" name="kind">
            <option value="issue">Incidencia</option>
            <option value="improvement">Mejora</option>
          </select>
          <select class="field-input" name="priority">
            <option value="medium">Prioridad media</option>
            <option value="high">Prioridad alta</option>
            <option value="low">Prioridad baja</option>
          </select>
          <select class="field-input" name="status">
            <option value="planned">Planificada</option>
            <option value="in_progress">En curso</option>
            <option value="done">Hecha</option>
          </select>
          <textarea class="field-input" name="notes" placeholder="Detalle" rows="4"></textarea>
        `,
      };
    }

    if (panelType === "budgets") {
      return {
        panelType: "budgets",
        modalTitle: "Nuevo presupuesto",
        editTitle: "Editar presupuesto",
        groupByRoom: true,
        supportsReformLink: true,
        formMarkup: `
          <input class="field-input" name="title" placeholder="Nombre del presupuesto" required>
          <input class="field-input" name="supplier" placeholder="Proveedor">
          <select class="field-input" name="status">
            <option value="draft">Borrador</option>
            <option value="requested">Pedido</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
          </select>
          <textarea class="field-input" name="notes" placeholder="Detalle" rows="4"></textarea>
          <input class="field-input" type="number" name="amount" placeholder="Precio (EUR)" min="0" step="0.01" value="0">
          <label class="field full">
            <span>PDF del presupuesto</span>
            <input class="field-input" type="file" name="pdfFile" accept="application/pdf,.pdf">
          </label>
        `,
      };
    }

    if (panelType === "inventory") {
      return {
        panelType: "inventory",
        modalTitle: "Nuevo elemento",
        groupByRoom: true,
        formMarkup: `
          <input class="field-input" name="name" placeholder="Nombre del elemento" required>
          <input class="field-input" name="category" placeholder="Categoria (ej. Electronica)">
          <input class="field-input" type="number" name="value" placeholder="Valor (€)" min="0" step="0.01" value="0">
          <select class="field-input" name="state">
            <option value="ok">En uso · ok</option>
            <option value="attention">Pendiente revision</option>
            <option value="critical">Para reemplazar</option>
          </select>
          <textarea class="field-input" name="notes" placeholder="Notas (opcional)" rows="3"></textarea>
        `,
      };
    }

    if (panelType === "documents") {
      return {
        panelType: "documents",
        modalTitle: "Nuevo documento",
        editTitle: "Editar documento",
        groupByRoom: true,
        supportsReformLink: true,
        formMarkup: `
          <input class="field-input" name="title" placeholder="Nombre del documento" required>
          <input class="field-input" name="type" placeholder="Tipo (ej. Contrato, Plano)">
          <input class="field-input" name="reference" placeholder="Referencia o ubicacion">
          <textarea class="field-input" name="notes" placeholder="Observaciones (opcional)" rows="3"></textarea>
          <label class="field full">
            <span>PDF adjunto</span>
            <input class="field-input" type="file" name="pdfFile" accept="application/pdf,.pdf">
          </label>
        `,
      };
    }

    return null;
  }

  function getNotesSupportPanelMarkup() {
    return buildSupportPanelSectionMarkup({
      panelType: "notes",
      title: "Notas de planta",
      addLabel: "Añadir nota",
      emptyMessage: "No hay notas en esta planta.",
      emptySelectedMessage: "No hay notas en {room}.",
      groupByRoom: true,
      items: app.state.data.notes,
      renderItem: renderNoteListItem,
    });
  }

  function getReformsSupportPanelMarkup() {
    return buildSupportPanelSectionMarkup({
      panelType: "reforms",
      title: "Reformas de planta",
      addLabel: "Anadir reforma",
      emptyMessage: "No hay reformas en esta planta.",
      emptySelectedMessage: "No hay reformas en {room}.",
      groupByRoom: true,
      items: app.state.data.reforms,
      renderItem: renderReformListItem,
    });
  }

  function getBudgetsSupportPanelMarkup() {
    return buildSupportPanelSectionMarkup({
      panelType: "budgets",
      title: "Presupuestos de planta",
      addLabel: "Añadir presupuesto",
      emptyMessage: "No hay presupuestos en esta planta.",
      emptySelectedMessage: "No hay presupuestos en {room}.",
      groupByRoom: true,
      items: app.state.data.budgets,
      renderItem: renderBudgetListItem,
    });
  }

  function getInventorySupportPanelMarkup() {
    return buildSupportPanelSectionMarkup({
      panelType: "inventory",
      title: "Inventario de planta",
      addLabel: "Añadir elemento",
      emptyMessage: "No hay inventario en esta planta.",
      emptySelectedMessage: "No hay inventario en {room}.",
      groupByRoom: true,
      items: app.state.data.inventory,
      renderItem: renderInventoryListItem,
    });
  }

  function getDocumentsSupportPanelMarkup(options = {}) {
    return buildSupportPanelSectionMarkup({
      panelType: "documents",
      title: "Documentos de planta",
      addLabel: "Añadir documento",
      emptyMessage: "No hay documentos en esta planta.",
      emptySelectedMessage: "No hay documentos en {room}.",
      groupByRoom: true,
      items: app.state.data.documents,
      renderItem: renderDocumentListItem,
      ...options,
    });
  }

  function renderReformsSupportPanel() {
    app.els.reformsPanel.innerHTML = getReformsSupportPanelMarkup();
  }

  function renderNotesSupportPanel() {
    app.els.notesPanel.innerHTML = getNotesSupportPanelMarkup();
  }

  function renderBudgetsSupportPanel() {
    app.els.budgetsPanel.innerHTML = getBudgetsSupportPanelMarkup();
  }

  function renderInventorySupportPanel() {
    app.els.inventoryPanel.innerHTML = getInventorySupportPanelMarkup();
  }

  function renderDocumentsSupportPanel() {
    app.els.documentsPanel.innerHTML = getDocumentsSupportPanelMarkup();
  }

  function renderReformListItem(reform) {
    const kindLabel = REFORM_KIND_LABELS[reform.kind] || "Mejora";
    const priorityLabel = REFORM_PRIORITY_LABELS[reform.priority] || "Media";
    const statusLabel = REFORM_STATUS_LABELS[reform.status] || "Planificada";

    return wrapEditableEntryMarkup("reforms", reform.id, `<button type="button" class="list-card list-card-button" data-panel-detail="reforms" data-item-id="${escapeAttribute(reform.id)}">
      <div class="list-top">
        <div><h4>${escapeHtml(reform.title || "Reforma")}</h4></div>
        <div class="list-card-actions">
          <span class="status-pill ${escapeAttribute(reform.status || "planned")}">${escapeHtml(statusLabel)}</span>
        </div>
      </div>
    </button>`);
  }

  function renderNoteListItem(note) {
    return `<button type="button" class="list-card list-card-button" data-panel-detail="notes" data-item-id="${escapeAttribute(note.id)}">
      <div class="list-top">
        <div><h4>${escapeHtml(note.title || "Nota")}</h4></div>
        <div class="list-card-actions">
          <span class="status-pill ${escapeAttribute(note.reformId ? "approved" : "requested")}">${escapeHtml(note.reformId ? "Reforma" : "Libre")}</span>
        </div>
      </div>
    </button>`;
  }

  function renderBudgetListItem(budget) {
    return wrapEditableEntryMarkup("budgets", budget.id, `<button type="button" class="list-card list-card-button" data-panel-detail="budgets" data-item-id="${escapeAttribute(budget.id)}">
      <div class="list-top">
        <div><h4>${escapeHtml(budget.title || "Presupuesto")}</h4></div>
        <div class="list-card-actions">
          <span class="status-pill ${escapeAttribute(budget.reformId ? "approved" : "requested")}">${escapeHtml(budget.reformId ? "Reforma" : "Libre")}</span>
        </div>
      </div>
    </button>`);
  }

  function renderInventoryListItem(item) {
    const stateLabel = INVENTORY_STATE_LABELS[item.state] || "En uso · ok";

    return `<button type="button" class="list-card list-card-button" data-panel-detail="inventory" data-item-id="${escapeAttribute(item.id)}">
      <div class="list-top">
        <div><h4>${escapeHtml(item.name || "Elemento")}</h4></div>
        <div class="list-card-actions">
          <span class="status-pill ${escapeAttribute(item.state || "ok")}">${escapeHtml(stateLabel)}</span>
        </div>
      </div>
    </button>`;
  }

  function renderDocumentListItem(doc) {
    return wrapEditableEntryMarkup("documents", doc.id, `<button type="button" class="list-card list-card-button" data-panel-detail="documents" data-item-id="${escapeAttribute(doc.id)}">
      <div class="list-top">
        <div><h4>${escapeHtml(doc.title || "Documento")}</h4></div>
        <div class="list-card-actions">
          <span class="status-pill ${escapeAttribute(doc.reformId ? "approved" : "requested")}">${escapeHtml(doc.reformId ? "Reforma" : "Libre")}</span>
        </div>
      </div>
    </button>`);
  }

  function wrapEditableEntryMarkup(panelType, itemId, contentMarkup, variant = "panel") {
    if (!isEditableSupportPanelType(panelType)) return contentMarkup;

    const variantClassName = variant === "hub" ? " entry-card-shell-hub" : "";
    const iconClassName = variant === "hub" ? " entry-edit-btn-hub" : "";

    return `
      <div class="entry-card-shell${variantClassName}">
        ${contentMarkup}
        <button type="button" class="entry-edit-btn${iconClassName}" data-support-edit="${escapeAttribute(panelType)}" data-item-id="${escapeAttribute(itemId)}" aria-label="Editar ${escapeAttribute(getEditablePanelLabel(panelType))}">
          ${getEntryEditIconMarkup()}
        </button>
      </div>
    `;
  }

  function getEditablePanelLabel(panelType) {
    if (panelType === "reforms") return "reforma";
    if (panelType === "budgets") return "presupuesto";
    if (panelType === "documents") return "documento";
    return "elemento";
  }

  function getEntryEditIconMarkup() {
    return `
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M4 20H8L18.2 9.8C19 9 19 7.8 18.2 7L17 5.8C16.2 5 15 5 14.2 5.8L4 16V20Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
        <path d="M12.8 7.2L16.8 11.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      </svg>
    `;
  }

  function getSupportReformLabel(reformId) {
    if (!reformId) return "Libre";

    const reform = app.state.data.reforms.find((entry) => entry.id === reformId);
    if (!reform) return "Reforma eliminada";

    return `Reforma: ${reform.title || "Sin titulo"}`;
  }

  function buildReformLinkedSummary(reform) {
    const notesCount = app.state.data.notes.filter((entry) => entry.reformId === reform.id).length;
    const budgetsCount = app.state.data.budgets.filter((entry) => entry.reformId === reform.id).length;
    const documentsCount = app.state.data.documents.filter((entry) => entry.reformId === reform.id).length;

    return [
      `${notesCount} nota${notesCount === 1 ? "" : "s"}`,
      `${budgetsCount} presupuesto${budgetsCount === 1 ? "" : "s"}`,
      `${documentsCount} documento${documentsCount === 1 ? "" : "s"}`,
    ].join(" · ");
  }

  function buildPdfActionLink(pdf, label) {
    if (!pdf?.dataUrl || !String(pdf.dataUrl).startsWith("data:application/pdf;base64,")) return "";

    return `<a class="micro-link" href="${escapeAttribute(pdf.dataUrl)}" download="${escapeAttribute(pdf.name || "adjunto.pdf")}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
  }

  function getEntitySummary(type, entity) {
    if (type === "room") return `${entity.type} · ${entity.zone} · ${formatArea(getRoomArea(entity.points))}`;
    if (type === "wall") return `${entity.kind} · ${entity.zone} · ${formatLength(getWallLength(entity))}`;
    if (type === "opening") return `${entity.type === "door" ? "Puerta" : "Ventana"} · ${entity.width} cm`;
    if (type === "fixture") return `${entity.system} · ${entity.variant}`;
    if (type === "furniture") return `${app.getFurniturePresetById(entity.preset)?.label || entity.preset} · ${entity.width} x ${entity.height} cm`;
    return entity.name || type;
  }

  function describeEntity(type, entity) {
    return entity.name || type;
  }

  function buildCanvasHint() {
    if (app.state.ui.tool === "wall" && app.state.ui.draft.type === "wall" && app.state.ui.draft.points.length === 1) {
      return "Muro en curso. Haz el segundo clic y el tramo se ajusta a horizontal o vertical. Si quieres salir, pulsa otra vez el icono o Parar dibujo.";
    }

    if (app.state.ui.tool === "room" && app.state.ui.draft.type === "room" && app.state.ui.draft.points.length) {
      return `Estancia en curso con ${app.state.ui.draft.points.length} vertices. Pulsa Enter para cerrarla. Si quieres salir, pulsa otra vez el icono o Parar dibujo.`;
    }

    if (app.state.ui.tool === "select") {
      if (app.state.ui.selectMode === "box") {
        return "Arrastra un recuadro sobre el plano para seleccionar varias piezas de una vez.";
      }
      if (app.state.ui.selectMode === "rotate") {
        return "Pulsa sobre una pieza y arrastra para girarla. Con la rueda haces ajustes rapidos de 15 grados.";
      }
      if (app.state.ui.selectMode === "scale") {
        return "Pulsa sobre un mueble y arrastra para cambiar su tamaño. La rueda suma o resta 10 cm.";
      }
      return "Haz clic sobre una pieza para seleccionarla. Arrastra desde una zona vacia para moverte por el plano. La rueda y los botones cambian el zoom.";
    }

    const tool = TOOL_DEFINITIONS.find((entry) => entry.id === app.state.ui.tool);
    if (!tool) return "Editor listo.";
    return `${tool.hint} Para salir, pulsa otra vez el icono o Salir de ${tool.label}.`;
  }

  function getPresetsForTool(tool) {
    if (tool === "room") return ROOM_PRESETS;
    if (tool === "wall") return WALL_PRESETS;
    if (tool === "door") return OPENING_PRESETS.door;
    if (tool === "window") return OPENING_PRESETS.window;
    if (tool === "electricity") return FIXTURE_PRESETS.electricity;
    if (tool === "water") return FIXTURE_PRESETS.water;
    if (tool === "network") return FIXTURE_PRESETS.network;
    if (tool === "furniture") return app.getFurniturePresetsForActiveFloor();
    return [];
  }

  function describePreset(tool, preset) {
    if (tool === "room") return `${preset.type} · ${preset.zone}`;
    if (tool === "wall") return `${preset.thickness} cm`;
    if (tool === "door" || tool === "window") return `${preset.width} cm`;
    if (tool === "furniture") return `${preset.width} x ${preset.height} cm`;
    return preset.name || preset.label;
  }

  function isSelected(type, id) {
    return (app.state.ui.selected?.type === type && app.state.ui.selected?.id === id)
      || app.state.ui.multiSelected.has(`${type}:${id}`);
  }

  function showToast(message, duration = 2400) {
    if (!app.els.toastContainer) return;

    const element = document.createElement("div");
    element.className = "toast";
    element.textContent = message;
    app.els.toastContainer.appendChild(element);

    void element.offsetWidth;

    setTimeout(() => {
      element.style.opacity = "0";
      element.style.transform = "translateY(8px)";
      element.style.transition = "opacity 0.25s, transform 0.25s";
      setTimeout(() => element.remove(), 280);
    }, duration);
  }

  function flashAutosave() {
    if (!app.els.autosaveBadge) return;

    app.els.autosaveBadge.classList.add("visible");
    clearTimeout(app.els.autosaveBadge._timer);
    app.els.autosaveBadge._timer = setTimeout(() => {
      app.els.autosaveBadge.classList.remove("visible");
    }, 1800);
  }

  return {
    render,
    renderRoute,
    renderHeader,
    renderToolRibbon,
    buildToolButtonMarkup,
    getToolIconMarkup,
    renderPresetPanel,
    renderCustomFurnitureTools,
    renderLayerList,
    renderFloorList,
    openFloorInlineEdit,
    renderStageMeta,
    renderCanvas,
    buildCanvasMarkup,
    renderCanvasRulerMarkup,
    getAdaptiveRulerStep,
    renderPanels,
    renderSupportEntryModal,
    renderSupportDetailModal,
    renderInspectorPanel,
    renderButtons,
    renderHomeFloorStepper,
    renderRoomSvg,
    renderRoomLabelSvg,
    renderWallSvg,
    renderOpeningSvg,
    renderFixtureSvg,
    renderFurnitureSvg,
    renderSelectionOverlay,
    renderDraftOverlay,
    renderMeasureLabel,
    getNormalVector,
    formatPlanDistance,
    getCanvasViewport,
    createDefaultViewport,
    ensureViewport,
    getViewport,
    getHomeViewport,
    setCanvasViewport,
    clampViewport,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomViewport,
    updateCanvasClassName,
    renderInspectorFields,
    renderReformsSupportPanel,
    renderReformListItem,
    renderNoteListItem,
    renderBudgetListItem,
    renderInventoryListItem,
    renderDocumentListItem,
    getEntitySummary,
    describeEntity,
    buildCanvasHint,
    getPresetsForTool,
    describePreset,
    isSelected,
    showToast,
    flashAutosave,
  };
}
