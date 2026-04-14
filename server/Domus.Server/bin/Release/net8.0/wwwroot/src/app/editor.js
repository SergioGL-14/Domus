import {
  FIXTURE_PRESETS,
  FLOOR_TEMPLATES,
  OPENING_PRESETS,
  ROOM_PRESETS,
  TOOL_DEFINITIONS,
  WALL_PRESETS,
} from "../modules/planner/catalogs.js";
import {
  distanceBetween,
  getNearestWall,
  getOrthogonalPoint,
  getPolygonCentroid,
  pointInPolygon,
} from "../modules/planner/geometry.js";
import {
  buildNewFloor,
  cloneFloorContent,
} from "../modules/project/projectData.js";
import {
  clone,
  createId,
  escapeHtml,
  roundNumber,
} from "../utils/common.js";
import {
  EDITABLE_SUPPORT_PANEL_TYPES,
  MAX_PDF_ATTACHMENT_BYTES,
  SUPPORT_PANEL_COLLECTION_KEYS,
} from "./constants.js";

// -----------------------------------------------------------------------------
// BLOQUE 1. Interaccion y operaciones
// Este archivo se queda con eventos, edicion y cambios de datos. La parte de
// pintar vive aparte para que la interfaz no vuelva a ser un bloque monolitico.
// -----------------------------------------------------------------------------

export function createEditor(app) {
  function bindBaseEvents() {
    [...app.els.pageNav.querySelectorAll("[data-route]")].forEach((button) => {
      button.addEventListener("click", () => {
        const nextRoute = ["home", "editor", "reforms", "budgets", "documents"].includes(button.dataset.route)
          ? button.dataset.route
          : "home";
        app.state.ui.route = nextRoute;
        if (["reforms", "budgets", "documents"].includes(nextRoute)) {
          app.state.ui.selected = null;
          app.state.ui.multiSelected.clear();
        }
        app.render();
      });
    });

    app.els.globalSearch.addEventListener("input", handleGlobalSearchInput);
    app.els.globalSearch.addEventListener("focus", handleGlobalSearchFocus);
    app.els.globalSearch.addEventListener("keydown", handleGlobalSearchKeydown);
    app.els.globalSearchClearBtn?.addEventListener("click", clearGlobalSearch);
    app.els.globalSearchResults?.addEventListener("click", handleGlobalSearchResultsClick);
    app.els.stageFilterToggleBtn?.addEventListener("click", toggleStageFilters);
    app.els.supportSearchInput?.addEventListener("input", (event) => {
      const nextValue = String(event.target.value || "").trim().toLowerCase();
      if (app.state.ui.route === "reforms") {
        app.state.ui.reformsSearch = nextValue;
      } else if (app.state.ui.route === "budgets") {
        app.state.ui.budgetsSearch = nextValue;
      } else if (app.state.ui.route === "documents") {
        app.state.ui.documentsSearch = nextValue;
      } else {
        app.state.ui.supportSearch = nextValue;
      }
      app.render();
    });
    app.els.supportSearchClearBtn?.addEventListener("click", () => {
      const currentValue = getActiveStageFilterValue();
      if (!currentValue && !app.els.supportSearchInput?.value) return;
      clearActiveStageFilter();
      if (app.els.supportSearchInput) {
        app.els.supportSearchInput.value = "";
      }
      app.render();
    });
    app.els.appShell?.addEventListener("click", handleHomeOutsideClick);
    app.els.appShell?.addEventListener("click", handleGlobalSearchOutsideClick);

    app.els.floorTemplateInput.addEventListener("change", () => syncFloorFormWithTemplate(true));
    app.els.submitFloorBtn.addEventListener("click", createFloor);
    app.els.duplicateFloorBtn.addEventListener("click", duplicateFloor);
    app.els.renameFloorBtn.addEventListener("click", renameFloor);
    app.els.deleteFloorBtn.addEventListener("click", deleteFloor);
    app.els.exteriorOnlyBtn.addEventListener("click", toggleExteriorOnly);

    app.els.stopToolBtn.addEventListener("click", stopActiveTool);
    app.els.finishRoomBtn.addEventListener("click", finishRoomDraft);
    app.els.cancelDraftBtn.addEventListener("click", cancelDraft);
    app.els.gridToggleBtn.addEventListener("click", toggleGrid);
    app.els.snapToggleBtn.addEventListener("click", app.toggleSnap);
    app.els.clearSelectionBtn.addEventListener("click", () => app.clearSelection());
    app.els.layerModalToggleBtn?.addEventListener("click", toggleLayerModal);
    app.els.zoomOutBtn.addEventListener("click", app.zoomOut);
    app.els.zoomResetBtn.addEventListener("click", app.resetZoom);
    app.els.zoomInBtn.addEventListener("click", app.zoomIn);
    app.els.homeFloorUpBtn?.addEventListener("click", () => stepActiveFloor(1));
    app.els.homeFloorDownBtn?.addEventListener("click", () => stepActiveFloor(-1));
    app.els.customFurnitureTools.addEventListener("click", handleCustomFurnitureClick);

    if (app.els.layerModal) {
      app.els.layerModal.addEventListener("click", handleLayerModalClick);
      app.els.layerModal.addEventListener("close", () => app.renderButtons());
      document.getElementById("layerModalCloseBtn")?.addEventListener("click", closeLayerModal);
    }

    if (app.els.furnitureModal) {
      app.els.furnitureModal.addEventListener("click", handleCustomFurnitureClick);
      document.getElementById("furnitureModalCloseBtn")?.addEventListener("click", () => app.els.furnitureModal.close());
      document.getElementById("furnitureModalCancelBtn")?.addEventListener("click", () => app.els.furnitureModal.close());
    }

    if (app.els.floorDuplicateModal) {
      app.els.floorDuplicateForm?.addEventListener("submit", handleDuplicateFloorSubmit);
      app.els.floorDuplicateModal.addEventListener("click", handleFloorDuplicateModalClick);
      document.getElementById("floorDuplicateModalCloseBtn")?.addEventListener("click", closeDuplicateFloorModal);
      document.getElementById("floorDuplicateCancelBtn")?.addEventListener("click", closeDuplicateFloorModal);
    }

    if (app.els.supportEntryModal) {
      app.els.supportEntryModal.addEventListener("click", handleSupportEntryModalClick);
      app.els.supportEntryModal.addEventListener("close", () => {
        app.state.ui.supportModalPanel = "";
        app.state.ui.supportModalItemId = "";
        app.renderSupportEntryModal?.();
      });
      app.els.supportEntryModal.addEventListener("submit", handleSupportPanelSubmit);
      document.getElementById("supportEntryModalCloseBtn")?.addEventListener("click", closeSupportEntryModal);
      document.getElementById("supportEntryModalCancelBtn")?.addEventListener("click", closeSupportEntryModal);
    }

    if (app.els.supportDetailModal) {
      app.els.supportDetailModal.addEventListener("click", handleSupportDetailModalClick);
      app.els.supportDetailModal.addEventListener("close", () => {
        app.state.ui.supportDetailItem = null;
        app.renderSupportDetailModal?.();
      });
      document.getElementById("supportDetailModalCloseBtn")?.addEventListener("click", closeSupportDetailModal);
      document.getElementById("supportDetailModalCancelBtn")?.addEventListener("click", closeSupportDetailModal);
      document.getElementById("supportDetailModalEditBtn")?.addEventListener("click", handleSupportDetailEdit);
      document.getElementById("supportDetailModalDeleteBtn")?.addEventListener("click", handleSupportDetailDelete);
    }

    app.els.inspectorPanel.addEventListener("change", handleInspectorChange);
    app.els.inspectorPanel.addEventListener("click", handleInspectorClick);

    app.els.planCanvas.addEventListener("pointerdown", handleCanvasPointerDown);
    app.els.planCanvas.addEventListener("pointermove", handleCanvasPointerMove);
    app.els.planCanvas.addEventListener("pointerup", handleCanvasPointerUp);
    app.els.planCanvas.addEventListener("pointerleave", handleCanvasPointerLeave);
    app.els.planCanvas.addEventListener("pointercancel", handleCanvasPointerLeave);
    app.els.planCanvas.addEventListener("wheel", handleCanvasWheel, { passive: false });

    window.addEventListener("keydown", handleKeydown);

    app.els.undoBtn.addEventListener("click", app.undo);
    app.els.redoBtn.addEventListener("click", app.redo);

    app.els.notesPanel.addEventListener("submit", handleSupportPanelSubmit);
    app.els.reformsPanel.addEventListener("submit", handleSupportPanelSubmit);
    app.els.budgetsPanel.addEventListener("submit", handleSupportPanelSubmit);
    app.els.inventoryPanel.addEventListener("submit", handleSupportPanelSubmit);
    app.els.documentsPanel.addEventListener("submit", handleSupportPanelSubmit);
    app.els.reformsPanel.addEventListener("click", handleSupportPanelClick);
    app.els.notesPanel.addEventListener("click", handleSupportPanelClick);
    app.els.budgetsPanel.addEventListener("click", handleSupportPanelClick);
    app.els.inventoryPanel.addEventListener("click", handleSupportPanelClick);
    app.els.documentsPanel.addEventListener("click", handleSupportPanelClick);
    app.els.reformsHub?.addEventListener("click", handleSupportPanelClick);
  }

  function setupFloorForm() {
    app.els.floorTemplateInput.innerHTML = FLOOR_TEMPLATES.map((template) => (
      `<option value="${template.id}">${escapeHtml(template.label)}</option>`
    )).join("");
    app.els.floorTemplateInput.value = FLOOR_TEMPLATES[0]?.id || "";
    syncFloorFormWithTemplate(true);
  }

  function syncFloorFormWithTemplate(forceName = false) {
    const template = app.getSelectedFloorTemplate();
    if (!template) return;

    if (forceName || !app.els.floorNameInput.value.trim()) {
      app.els.floorNameInput.value = template.label;
    }

    app.els.floorLevelInput.value = String(app.getSuggestedFloorLevel(template.kind));
  }

  function isStageFilterRoute(route = app.state.ui.route) {
    return route === "home" || route === "reforms" || route === "budgets" || route === "documents";
  }

  function isStageFilterOpen(route = app.state.ui.route) {
    if (route === "home") return Boolean(app.state.ui.homeFilterOpen);
    if (route === "reforms") return Boolean(app.state.ui.reformsFilterOpen);
    if (route === "budgets") return Boolean(app.state.ui.budgetsFilterOpen);
    if (route === "documents") return Boolean(app.state.ui.documentsFilterOpen);
    return false;
  }

  function setStageFilterOpen(nextOpen, route = app.state.ui.route) {
    if (route === "home") {
      app.state.ui.homeFilterOpen = Boolean(nextOpen);
      return;
    }

    if (route === "reforms") {
      app.state.ui.reformsFilterOpen = Boolean(nextOpen);
      return;
    }

    if (route === "budgets") {
      app.state.ui.budgetsFilterOpen = Boolean(nextOpen);
      return;
    }

    if (route === "documents") {
      app.state.ui.documentsFilterOpen = Boolean(nextOpen);
    }
  }

  function getActiveStageFilterValue(route = app.state.ui.route) {
    if (route === "reforms") {
      return String(app.state.ui.reformsSearch || "").trim().toLowerCase();
    }

    if (route === "budgets") {
      return String(app.state.ui.budgetsSearch || "").trim().toLowerCase();
    }

    if (route === "documents") {
      return String(app.state.ui.documentsSearch || "").trim().toLowerCase();
    }

    if (route === "home") {
      return String(app.state.ui.supportSearch || "").trim().toLowerCase();
    }

    return "";
  }

  function clearActiveStageFilter(route = app.state.ui.route) {
    if (route === "reforms") {
      app.state.ui.reformsSearch = "";
      return;
    }

    if (route === "budgets") {
      app.state.ui.budgetsSearch = "";
      return;
    }

    if (route === "documents") {
      app.state.ui.documentsSearch = "";
      return;
    }

    if (route === "home") {
      app.state.ui.supportSearch = "";
    }
  }

  function toggleStageFilters() {
    if (!isStageFilterRoute()) return;

    const nextOpen = !isStageFilterOpen();
    setStageFilterOpen(nextOpen);
    app.render();

    if (nextOpen && app.els.supportSearchInput) {
      window.requestAnimationFrame(() => {
        app.els.supportSearchInput?.focus();
        app.els.supportSearchInput?.select();
      });
    }
  }

  function handleGlobalSearchInput(event) {
    app.state.ui.search = String(event.target.value || "");
    app.state.ui.globalSearchOpen = Boolean(app.state.ui.search.trim());
    app.state.ui.globalSearchActiveIndex = 0;
    app.render();
  }

  function handleGlobalSearchFocus() {
    if (!String(app.state.ui.search || "").trim()) return;
    app.state.ui.globalSearchOpen = true;
    app.render();
  }

  function clearGlobalSearch() {
    if (!app.state.ui.search && !app.state.ui.globalSearchOpen) return;
    app.state.ui.search = "";
    app.state.ui.globalSearchOpen = false;
    app.state.ui.globalSearchActiveIndex = -1;
    if (app.els.globalSearch) {
      app.els.globalSearch.value = "";
      app.els.globalSearch.focus();
    }
    app.render();
  }

  function handleGlobalSearchKeydown(event) {
    const resultButtons = getGlobalSearchResultButtons();
    if (!resultButtons.length) {
      if (event.key === "Escape" && app.state.ui.globalSearchOpen) {
        event.preventDefault();
        closeGlobalSearch();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      app.state.ui.globalSearchOpen = true;
      app.state.ui.globalSearchActiveIndex = app.state.ui.globalSearchActiveIndex >= resultButtons.length - 1
        ? 0
        : Math.max(0, app.state.ui.globalSearchActiveIndex + 1);
      app.render();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      app.state.ui.globalSearchOpen = true;
      app.state.ui.globalSearchActiveIndex = app.state.ui.globalSearchActiveIndex <= 0
        ? resultButtons.length - 1
        : app.state.ui.globalSearchActiveIndex - 1;
      app.render();
      return;
    }

    if (event.key === "Enter") {
      const activeButton = resultButtons[
        app.state.ui.globalSearchActiveIndex >= 0 ? app.state.ui.globalSearchActiveIndex : 0
      ];
      if (!activeButton) return;
      event.preventDefault();
      activateGlobalSearchResult(activeButton);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeGlobalSearch();
    }
  }

  function handleGlobalSearchResultsClick(event) {
    const button = event.target instanceof Element ? event.target.closest("[data-global-search-result]") : null;
    if (!button) return;
    activateGlobalSearchResult(button);
  }

  function handleGlobalSearchOutsideClick(event) {
    if (!app.state.ui.globalSearchOpen) return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(".global-search-box")) return;
    closeGlobalSearch();
  }

  function getGlobalSearchResultButtons() {
    if (!app.els.globalSearchResults) return [];
    return [...app.els.globalSearchResults.querySelectorAll("[data-global-search-result]")];
  }

  function closeGlobalSearch(options = {}) {
    app.state.ui.globalSearchOpen = false;
    app.state.ui.globalSearchActiveIndex = -1;
    if (options.render !== false) {
      app.render();
    }
  }

  function activateGlobalSearchResult(button) {
    const nextRoute = ["home", "editor", "reforms", "budgets", "documents"].includes(button.dataset.route)
      ? button.dataset.route
      : "home";
    const floorId = String(button.dataset.floorId || "");
    const selectType = String(button.dataset.selectType || "");
    const selectId = String(button.dataset.selectId || "");
    const focusRoomId = String(button.dataset.focusRoomId || "");
    const panelType = String(button.dataset.panelType || "");
    const itemId = String(button.dataset.itemId || "");
    const canOpenDetail = panelType && itemId && ["home", "reforms", "budgets", "documents"].includes(nextRoute);

    if (floorId && app.state.data.floors.some((floor) => floor.id === floorId)) {
      app.state.data.project.activeFloorId = floorId;
    }

    app.state.ui.route = nextRoute;
    app.state.ui.multiSelected.clear();
    app.state.ui.panel = "inspector";
    app.state.ui.globalSearchOpen = false;
    app.state.ui.globalSearchActiveIndex = -1;

    if (nextRoute === "editor" && selectType && selectId) {
      app.state.ui.selected = { type: selectType, id: selectId };
    } else if (nextRoute === "home" && focusRoomId) {
      app.state.ui.selected = { type: "room", id: focusRoomId };
    } else {
      app.state.ui.selected = null;
    }

    app.state.ui.supportDetailItem = canOpenDetail ? { panelType, itemId } : null;

    app.render();

    if (canOpenDetail && app.els.supportDetailModal && !app.els.supportDetailModal.open) {
      app.els.supportDetailModal.showModal();
    }
  }

  function selectTool(toolId) {
    const nextTool = toolId || "select";

    if (nextTool === app.state.ui.tool && nextTool !== "select") {
      stopActiveTool();
      return;
    }

    app.state.ui.tool = nextTool;

    if (app.state.ui.tool !== "wall" && app.state.ui.draft.type === "wall") {
      app.state.ui.draft = { type: null, points: [] };
      app.state.ui.hoverPoint = null;
    }

    if (app.state.ui.tool !== "room" && app.state.ui.draft.type === "room") {
      app.state.ui.draft = { type: null, points: [] };
      app.state.ui.hoverPoint = null;
    }

    resetPointerState();
    app.render();
  }

  function stopActiveTool() {
    app.state.ui.tool = "select";
    app.state.ui.draft = { type: null, points: [] };
    app.state.ui.hoverPoint = null;
    resetPointerState();
    app.render();
  }

  function beginPointerInteraction(mode, event, options = {}) {
    app.state.ui.pointer.down = true;
    app.state.ui.pointer.moved = false;
    app.state.ui.pointer.mode = mode;
    app.state.ui.pointer.pointerId = Number.isFinite(event.pointerId) ? event.pointerId : null;
    app.state.ui.pointer.startClient = {
      x: Number(event.clientX || 0),
      y: Number(event.clientY || 0),
    };
    app.state.ui.pointer.viewStart = options.viewStart || null;
    app.state.ui.pointer.dragSnapshots = options.dragSnapshots || null;
    app.state.ui.pointer.dragHistoryPushed = false;
    app.state.ui.pointer.rotateCenter = options.rotateCenter || null;
    app.state.ui.pointer.rotatePointerStartAngle = options.rotatePointerStartAngle || 0;
    app.state.ui.pointer.rotateEntityStartAngle = options.rotateEntityStartAngle || 0;
    app.state.ui.pointer.boxStart = options.boxStart || null;
    app.state.ui.pointer.boxEnd = options.boxEnd || null;

    if (options.preventDefault !== false) {
      event.preventDefault();
    }

    if (options.capture !== false && typeof app.els.planCanvas.setPointerCapture === "function" && app.state.ui.pointer.pointerId !== null) {
      try {
        app.els.planCanvas.setPointerCapture(app.state.ui.pointer.pointerId);
      } catch {
        // Si el navegador no deja capturar el puntero, sigo adelante sin romper la edicion.
      }
    }

    app.updateCanvasClassName();
  }

  function handleCanvasPointerDown(event) {
    if (event.button !== 0) return;

    if (app.state.ui.route === "home") {
      beginPointerInteraction("canvas", event, {
        viewStart: { ...app.getCanvasViewport() },
        preventDefault: true,
        capture: true,
      });
      return;
    }

    if (app.state.ui.route !== "editor") return;

    const target = getEntityTarget(event.target);

    if (event.ctrlKey && app.state.ui.tool === "select" && target) {
      const key = `${target.type}:${target.id}`;
      if (app.state.ui.multiSelected.has(key)) {
        app.state.ui.multiSelected.delete(key);
        if (app.state.ui.selected?.type === target.type && app.state.ui.selected?.id === target.id) {
          if (app.state.ui.multiSelected.size > 0) {
            const [nextType, nextId] = [...app.state.ui.multiSelected][0].split(":");
            app.state.ui.selected = { type: nextType, id: nextId };
          } else {
            app.state.ui.selected = null;
          }
        }
      } else {
        app.state.ui.multiSelected.add(key);
        app.state.ui.selected = { type: target.type, id: target.id };
        app.state.ui.panel = "inspector";
      }
      app.render();
      return;
    }

    if (app.state.ui.tool === "select" && app.state.ui.selectMode === "box") {
      const svgPoint = getSvgPoint(event);
      beginPointerInteraction("box-select", event, {
        boxStart: svgPoint,
        boxEnd: { ...svgPoint },
      });
      return;
    }

    if (app.state.ui.tool === "select" && app.state.ui.selectMode === "select" && app.state.ui.multiSelected.size > 0) {
      const key = target ? `${target.type}:${target.id}` : null;
      if (!key || app.state.ui.multiSelected.has(key)) {
        beginPointerInteraction("drag-selected", event, {
          dragSnapshots: captureMultiSelectSnapshots(),
        });
        return;
      }
    }

    if (app.state.ui.tool === "select" && app.state.ui.selectMode === "rotate" && target) {
      const entity = app.getCollectionForType(target.type).find((entry) => entry.id === target.id);
      if (entity) {
        const svgPoint = getSvgPoint(event);
        const center = getEntityCenter(entity, target.type);
        const startAngle = Math.atan2(svgPoint.y - center.y, svgPoint.x - center.x) * (180 / Math.PI);

        app.state.ui.selected = { type: target.type, id: target.id };
        app.state.ui.multiSelected.clear();
        app.state.ui.panel = "inspector";

        beginPointerInteraction("rotate-entity", event, {
          dragSnapshots: [{ ...clone(entity), type: target.type, id: target.id }],
          rotateCenter: center,
          rotatePointerStartAngle: startAngle,
          rotateEntityStartAngle: entity.angle || 0,
        });
        app.render();
        return;
      }
    }

    if (app.state.ui.tool === "select" && app.state.ui.selectMode === "scale" && target) {
      const entity = app.getCollectionForType(target.type).find((entry) => entry.id === target.id);
      if (entity && "width" in entity) {
        app.state.ui.selected = { type: target.type, id: target.id };
        app.state.ui.multiSelected.clear();
        app.state.ui.panel = "inspector";

        beginPointerInteraction("scale-entity", event, {
          dragSnapshots: [{ ...clone(entity), type: target.type, id: target.id }],
        });
        app.render();
        return;
      }
    }

    if (app.state.ui.tool === "select" && app.state.ui.selectMode === "select" && target) {
      const entity = app.getCollectionForType(target.type).find((entry) => entry.id === target.id);
      if (entity) {
        app.state.ui.selected = { type: target.type, id: target.id };
        app.state.ui.multiSelected.clear();
        app.state.ui.panel = "inspector";

        beginPointerInteraction("drag-entity", event, {
          dragSnapshots: captureEntityWithRelated(target.type, entity),
        });
        app.render();
        return;
      }
    }

    const mode = app.state.ui.tool === "select" && !target ? "canvas" : "action";
    beginPointerInteraction(mode, event, {
      viewStart: mode === "canvas" ? { ...app.getCanvasViewport() } : null,
      preventDefault: mode === "canvas",
      capture: mode === "canvas",
    });
  }

  function handleCanvasPointerMove(event) {
    const isEditorRoute = app.state.ui.route === "editor";
    const isHomeRoute = app.state.ui.route === "home";
    if (!isEditorRoute && !isHomeRoute) return;

    if (app.state.ui.pointer.down && app.state.ui.pointer.startClient) {
      const deltaX = Number(event.clientX || 0) - app.state.ui.pointer.startClient.x;
      const deltaY = Number(event.clientY || 0) - app.state.ui.pointer.startClient.y;

      if (!app.state.ui.pointer.moved && Math.hypot(deltaX, deltaY) > 4) {
        app.state.ui.pointer.moved = true;
      }

      if ((app.state.ui.pointer.mode === "drag-selected" || app.state.ui.pointer.mode === "drag-entity")
        && app.state.ui.pointer.moved
        && app.state.ui.pointer.dragSnapshots) {
        if (!app.state.ui.pointer.dragHistoryPushed) {
          app.pushHistory();
          app.state.ui.pointer.dragHistoryPushed = true;
        }

        const rect = app.els.planCanvas.getBoundingClientRect();
        const viewport = app.getCanvasViewport();
        if (rect.width && rect.height) {
          const svgDelta = {
            x: (deltaX * viewport.width) / rect.width,
            y: (deltaY * viewport.height) / rect.height,
          };
          applyDragDelta(app.state.ui.pointer.dragSnapshots, svgDelta);
          app.renderCanvas();
        }
        return;
      }

      if (app.state.ui.pointer.mode === "box-select") {
        app.state.ui.pointer.boxEnd = getSvgPoint(event);
        app.renderCanvas();
        return;
      }

      if (app.state.ui.pointer.mode === "rotate-entity" && app.state.ui.pointer.moved && app.state.ui.pointer.dragSnapshots) {
        if (!app.state.ui.pointer.dragHistoryPushed) {
          app.pushHistory();
          app.state.ui.pointer.dragHistoryPushed = true;
        }

        const svgPoint = getSvgPoint(event);
        const center = app.state.ui.pointer.rotateCenter;
        if (center) {
          const currentAngle = Math.atan2(svgPoint.y - center.y, svgPoint.x - center.x) * (180 / Math.PI);
          const angleDelta = currentAngle - app.state.ui.pointer.rotatePointerStartAngle;
          const rawAngle = app.state.ui.pointer.rotateEntityStartAngle + angleDelta;
          const snap = event.shiftKey ? 45 : 5;
          const snapped = Math.round(rawAngle / snap) * snap;
          const [snapshot] = app.state.ui.pointer.dragSnapshots;
          const entity = app.getCollectionForType(snapshot.type).find((entry) => entry.id === snapshot.id);
          if (entity) {
            entity.angle = roundNumber(((snapped % 360) + 360) % 360);
          }
          app.renderCanvas();
        }
        return;
      }

      if (app.state.ui.pointer.mode === "scale-entity" && app.state.ui.pointer.moved && app.state.ui.pointer.dragSnapshots) {
        if (!app.state.ui.pointer.dragHistoryPushed) {
          app.pushHistory();
          app.state.ui.pointer.dragHistoryPushed = true;
        }

        const rect = app.els.planCanvas.getBoundingClientRect();
        const viewport = app.getCanvasViewport();
        const [snapshot] = app.state.ui.pointer.dragSnapshots;
        const entity = app.getCollectionForType(snapshot.type).find((entry) => entry.id === snapshot.id);
        if (entity && rect.width && rect.height) {
          const svgDeltaX = (deltaX * viewport.width) / rect.width;
          const svgDeltaY = (deltaY * viewport.height) / rect.height;
          entity.width = Math.max(20, roundNumber(snapshot.width + svgDeltaX * 2));
          entity.height = Math.max(20, roundNumber(snapshot.height + svgDeltaY * 2));
          app.renderCanvas();
        }
        return;
      }

      if (app.state.ui.pointer.mode === "canvas" && app.state.ui.pointer.viewStart) {
        if (app.state.ui.pointer.moved) {
          const rect = app.els.planCanvas.getBoundingClientRect();
          if (rect.width && rect.height) {
            app.setCanvasViewport({
              x: app.state.ui.pointer.viewStart.x - (deltaX * app.state.ui.pointer.viewStart.width) / rect.width,
              y: app.state.ui.pointer.viewStart.y - (deltaY * app.state.ui.pointer.viewStart.height) / rect.height,
              width: app.state.ui.pointer.viewStart.width,
              height: app.state.ui.pointer.viewStart.height,
            });
            app.updateCanvasClassName();
            app.renderCanvas();
          }
        }
        return;
      }
    }

    if (!isEditorRoute) return;

    const point = snapPoint(getSvgPoint(event));

    if (app.state.ui.tool === "wall" && app.state.ui.draft.type === "wall" && app.state.ui.draft.points.length === 1) {
      app.state.ui.hoverPoint = getOrthogonalPoint(app.state.ui.draft.points[0], point);
      app.renderCanvas();
      return;
    }

    if (app.state.ui.tool === "room" && app.state.ui.draft.type === "room" && app.state.ui.draft.points.length) {
      app.state.ui.hoverPoint = point;
      app.renderCanvas();
    }
  }

  function handleCanvasPointerUp(event) {
    const isEditorRoute = app.state.ui.route === "editor";
    const isHomeRoute = app.state.ui.route === "home";
    if ((!isEditorRoute && !isHomeRoute) || event.button !== 0) return;

    const point = isEditorRoute ? snapPoint(getSvgPoint(event)) : null;
    const target = isEditorRoute ? getEntityTarget(event.target) : null;
    const pointerMode = app.state.ui.pointer.mode;
    const pointerMoved = app.state.ui.pointer.moved;
    const boxStart = app.state.ui.pointer.boxStart ? { ...app.state.ui.pointer.boxStart } : null;
    const boxEnd = app.state.ui.pointer.boxEnd ? { ...app.state.ui.pointer.boxEnd } : null;

    releaseCanvasPointerCapture();
    resetPointerState();

    if (pointerMode === "drag-selected") {
      if (pointerMoved) {
        app.saveData(false);
        app.render();
      } else {
        app.clearSelection();
      }
      return;
    }

    if (pointerMode === "drag-entity") {
      if (pointerMoved) {
        app.saveData(false);
      }
      app.render();
      return;
    }

    if (pointerMode === "box-select") {
      if (pointerMoved && boxStart && boxEnd) {
        const x1 = Math.min(boxStart.x, boxEnd.x);
        const y1 = Math.min(boxStart.y, boxEnd.y);
        const x2 = Math.max(boxStart.x, boxEnd.x);
        const y2 = Math.max(boxStart.y, boxEnd.y);
        if (x2 - x1 > 5 || y2 - y1 > 5) {
          selectEntitiesInBox(x1, y1, x2, y2);
        } else {
          app.clearSelection({ render: false });
        }
      } else {
        app.clearSelection({ render: false });
      }
      app.render();
      return;
    }

    if (pointerMode === "rotate-entity" || pointerMode === "scale-entity") {
      if (pointerMoved) {
        app.saveData(false);
      }
      app.render();
      return;
    }

    if (pointerMode === "canvas") {
      if (isHomeRoute && !pointerMoved) {
        const finalTarget = document.elementFromPoint(Number(event.clientX || 0), Number(event.clientY || 0));
        const homeTarget = getEntityTarget(finalTarget);
        if (homeTarget?.type === "room") {
          app.selectEntity(homeTarget.type, homeTarget.id);
        } else {
          app.clearSelection();
        }
        return;
      }

      if (isEditorRoute && app.state.ui.tool === "select" && !pointerMoved) {
        app.clearSelection();
      } else {
        app.renderCanvas();
      }
      return;
    }

    if (!isEditorRoute) return;

    if (app.state.ui.tool === "select") {
      if (target) {
        app.selectEntity(target.type, target.id);
      } else {
        app.clearSelection();
      }
      return;
    }

    if (app.state.ui.tool === "erase") {
      if (target) {
        app.commit(() => {
          app.deleteEntity(target.type, target.id);
        });
      }
      return;
    }

    if (app.state.ui.tool === "wall") {
      extendWallDraft(point);
      return;
    }

    if (app.state.ui.tool === "room") {
      extendRoomDraft(point);
      return;
    }

    if (app.state.ui.tool === "door" || app.state.ui.tool === "window") {
      placeOpening(app.state.ui.tool, point);
      return;
    }

    if (app.state.ui.tool === "electricity" || app.state.ui.tool === "water" || app.state.ui.tool === "network") {
      placeFixture(app.state.ui.tool, point);
      return;
    }

    if (app.state.ui.tool === "furniture") {
      placeFurniture(point);
    }
  }

  function handleCanvasPointerLeave() {
    releaseCanvasPointerCapture();
    resetPointerState();

    if (app.state.ui.draft.type !== "wall" && app.state.ui.draft.type !== "room") {
      app.state.ui.hoverPoint = null;
      app.renderCanvas();
    }
  }

  function handleHomeOutsideClick(event) {
    if (app.state.ui.route !== "home") return;
    if (!app.getSelectedRoom()) return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(".canvas-wrap")) return;
    if (event.target.closest(".support-panel-shell")) return;
    if (event.target.closest(".stage-top-actions")) return;
    if (event.target.closest(".support-filters-box")) return;
    app.clearSelection();
  }

  function openSupportEntryModal(panelType, itemId = "") {
    if (!panelType || !app.els.supportEntryModal) return;
    app.state.ui.supportModalPanel = panelType;
    app.state.ui.supportModalItemId = itemId || "";
    app.renderSupportEntryModal?.();
    if (!app.els.supportEntryModal.open) {
      app.els.supportEntryModal.showModal();
    }
  }

  function closeSupportEntryModal() {
    if (!app.els.supportEntryModal?.open) {
      app.state.ui.supportModalPanel = "";
      app.state.ui.supportModalItemId = "";
      app.renderSupportEntryModal?.();
      return;
    }
    app.els.supportEntryModal.close();
  }

  function handleSupportEntryModalClick(event) {
    if (event.target === app.els.supportEntryModal) {
      closeSupportEntryModal();
    }
  }

  function openSupportDetailModal(panelType, itemId) {
    if (!panelType || !itemId || !app.els.supportDetailModal) return;
    app.state.ui.supportDetailItem = { panelType, itemId };
    app.renderSupportDetailModal?.();
    if (!app.els.supportDetailModal.open) {
      app.els.supportDetailModal.showModal();
    }
  }

  function closeSupportDetailModal() {
    if (!app.els.supportDetailModal?.open) {
      app.state.ui.supportDetailItem = null;
      app.renderSupportDetailModal?.();
      return;
    }
    app.els.supportDetailModal.close();
  }

  function handleSupportDetailModalClick(event) {
    if (event.target === app.els.supportDetailModal) {
      closeSupportDetailModal();
    }
  }

  function handleSupportDetailDelete(event) {
    const button = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    const panelType = button?.dataset.panelDelete || app.state.ui.supportDetailItem?.panelType || "";
    const itemId = button?.dataset.itemId || app.state.ui.supportDetailItem?.itemId || "";
    if (!panelType || !itemId) return;

    deleteSupportItem(panelType, itemId);
    closeSupportDetailModal();
    app.showToast("Elemento eliminado");
  }

  function handleSupportDetailEdit() {
    const detailItem = app.state.ui.supportDetailItem;
    if (!detailItem || !isEditableSupportPanel(detailItem.panelType)) return;

    closeSupportDetailModal();
    openSupportEntryModal(detailItem.panelType, detailItem.itemId);
  }

  function handleKeydown(event) {
    if (app.state.ui.route !== "editor") return;

    if (event.key === "Escape") {
      event.preventDefault();
      if (app.state.ui.draft.points.length) cancelDraft();
      else app.clearSelection();
      return;
    }

    if (event.key === "Enter" && app.state.ui.tool === "room" && app.state.ui.draft.points.length >= 3) {
      event.preventDefault();
      finishRoomDraft();
      return;
    }

    if ((event.key === "Delete" || event.key === "Backspace") && (app.state.ui.selected || app.state.ui.multiSelected.size > 0)) {
      if (app.isTypingTarget(event.target)) return;
      event.preventDefault();
      if (app.state.ui.multiSelected.size > 1) {
        deleteMultiSelected();
      } else {
        app.deleteSelected();
      }
      return;
    }

    if (event.ctrlKey && event.key === "a") {
      if (app.isTypingTarget(event.target)) return;
      event.preventDefault();
      if (app.state.ui.tool === "select") selectAll();
      return;
    }

    if (app.isTypingTarget(event.target)) return;

    if (event.ctrlKey && event.key === "z" && !event.shiftKey) {
      event.preventDefault();
      app.undo();
      return;
    }

    if (event.ctrlKey && (event.key === "y" || (event.key === "z" && event.shiftKey))) {
      event.preventDefault();
      app.redo();
      return;
    }

    if (event.ctrlKey && event.key === "d") {
      event.preventDefault();
      duplicateSelected();
      return;
    }

    const toolKeys = { s: "select", w: "wall", r: "room", d: "door", v: "window", e: "erase", f: "furniture", x: "electricity" };
    if (!event.ctrlKey && !event.altKey && !event.metaKey && toolKeys[event.key]) {
      event.preventDefault();
      selectTool(toolKeys[event.key]);
    }
  }

  function handleInspectorChange(event) {
    const field = event.target?.dataset?.field;
    const selected = app.getSelectedEntity();
    if (!field || !selected) return;

    app.commit(() => app.applyInspectorField(selected.type, selected.entity, field, event.target.value));
  }

  function handleInspectorClick(event) {
    const button = event.target instanceof Element ? event.target.closest("[data-inspector-action]") : null;
    if (!button) return;

    if (button.dataset.inspectorAction === "delete") {
      app.deleteSelected();
      return;
    }

    if (button.dataset.inspectorAction === "flip-opening") {
      const selected = app.getSelectedEntity();
      if (selected?.type === "opening") {
        app.commit(() => {
          selected.entity.swing = (selected.entity.swing || 1) === 1 ? -1 : 1;
        });
      }
    }
  }

  function handleCustomFurnitureClick(event) {
    const button = event.target instanceof Element ? event.target.closest("[data-custom-furniture-action]") : null;
    if (!button) return;

    if (button.dataset.customFurnitureAction === "toggle") {
      app.els.furnitureModal?.showModal();
      return;
    }

    if (button.dataset.customFurnitureAction === "create") {
      createCustomFurniturePreset();
    }
  }

  function extendWallDraft(point) {
    const floor = app.getActiveFloor();
    if (!floor) return;

    if (app.state.ui.draft.type !== "wall" || app.state.ui.draft.points.length === 0) {
      app.state.ui.draft = { type: "wall", points: [point] };
      app.state.ui.hoverPoint = point;
      app.render();
      return;
    }

    const start = app.state.ui.draft.points[0];
    const end = getOrthogonalPoint(start, point);
    if (distanceBetween(start, end) < 8) return;

    const preset = WALL_PRESETS.find((entry) => entry.id === app.state.ui.presets.wall) || WALL_PRESETS[0];

    app.commit(() => {
      const wall = {
        id: createId("wall"),
        floorId: floor.id,
        zone: preset.zone || app.inferZoneFromPoint(start),
        name: preset.name,
        kind: preset.kind,
        x1: roundNumber(start.x),
        y1: roundNumber(start.y),
        x2: roundNumber(end.x),
        y2: roundNumber(end.y),
        thickness: preset.thickness,
        notes: "",
      };

      app.state.data.walls.push(wall);
      app.state.ui.selected = { type: "wall", id: wall.id };
    });

    app.state.ui.draft = { type: "wall", points: [end] };
    app.state.ui.hoverPoint = end;
    app.render();
  }

  function extendRoomDraft(point) {
    if (app.state.ui.draft.type !== "room") {
      app.state.ui.draft = { type: "room", points: [point] };
      app.state.ui.hoverPoint = point;
      app.render();
      return;
    }

    const lastPoint = app.state.ui.draft.points[app.state.ui.draft.points.length - 1];
    if (distanceBetween(lastPoint, point) < 8) return;

    app.state.ui.draft.points.push(point);
    app.state.ui.hoverPoint = point;
    app.render();
  }

  function finishRoomDraft() {
    if (app.state.ui.draft.type !== "room" || app.state.ui.draft.points.length < 3) return;

    const floor = app.getActiveFloor();
    if (!floor) return;

    const preset = ROOM_PRESETS.find((entry) => entry.id === app.state.ui.presets.room) || ROOM_PRESETS[0];

    app.commit(() => {
      const room = {
        id: createId("room"),
        floorId: floor.id,
        zone: preset.zone || "interior",
        name: preset.name,
        type: preset.type,
        color: preset.color,
        points: app.state.ui.draft.points.map((entry) => ({ x: roundNumber(entry.x), y: roundNumber(entry.y) })),
        notes: "",
      };

      app.state.data.rooms.push(room);
      app.state.ui.selected = { type: "room", id: room.id };
    });

    app.state.ui.draft = { type: null, points: [] };
    app.state.ui.hoverPoint = null;
    app.render();
  }

  function cancelDraft() {
    app.state.ui.draft = { type: null, points: [] };
    app.state.ui.hoverPoint = null;
    app.render();
  }

  function placeOpening(tool, point) {
    const floor = app.getActiveFloor();
    if (!floor) return;

    const options = tool === "door" ? OPENING_PRESETS.door : OPENING_PRESETS.window;
    const preset = options.find((entry) => entry.id === app.state.ui.presets[tool]) || options[0];
    const nearestWall = getNearestWall(point, app.getVisibleWalls());
    const snapToWall = nearestWall && nearestWall.distance <= 150;
    const anchor = snapToWall ? nearestWall.point : point;
    const angle = snapToWall ? nearestWall.angle : 0;

    app.commit(() => {
      const opening = {
        id: createId("opening"),
        floorId: floor.id,
        zone: preset.zone || app.inferZoneFromPoint(anchor),
        type: tool === "door" ? "door" : "window",
        name: preset.name,
        x: roundNumber(anchor.x),
        y: roundNumber(anchor.y),
        angle: roundNumber(angle),
        width: preset.width,
        swing: preset.swing || 1,
        notes: "",
      };

      app.state.data.openings.push(opening);
      app.state.ui.selected = { type: "opening", id: opening.id };
    });
  }

  function placeFixture(system, point) {
    const floor = app.getActiveFloor();
    if (!floor) return;

    const preset = (FIXTURE_PRESETS[system] || []).find((entry) => entry.id === app.state.ui.presets[system]) || FIXTURE_PRESETS[system][0];

    app.commit(() => {
      const fixture = {
        id: createId("fixture"),
        floorId: floor.id,
        zone: preset.zone || app.inferZoneFromPoint(point),
        system,
        variant: preset.id,
        name: preset.name,
        glyph: preset.glyph,
        x: roundNumber(point.x),
        y: roundNumber(point.y),
        angle: 0,
        status: preset.status,
        notes: "",
      };

      app.state.data.fixtures.push(fixture);
      app.state.ui.selected = { type: "fixture", id: fixture.id };
    });
  }

  function placeFurniture(point) {
    const floor = app.getActiveFloor();
    if (!floor) return;

    const preset = app.getFurniturePresetById(app.state.ui.presets.furniture) || app.getPresetsForTool("furniture")[0];
    if (!preset) return;

    app.commit(() => {
      const item = {
        id: createId("furniture"),
        floorId: floor.id,
        zone: preset.zone || app.inferZoneFromPoint(point),
        preset: preset.id,
        name: preset.name,
        x: roundNumber(point.x),
        y: roundNumber(point.y),
        width: preset.width,
        height: preset.height,
        angle: 0,
        shape: preset.shape,
        notes: "",
      };

      app.state.data.furniture.push(item);
      app.state.ui.selected = { type: "furniture", id: item.id };
    });
  }

  function createCustomFurniturePreset() {
    const nameInput = document.getElementById("customFurnitureName");
    const widthInput = document.getElementById("customFurnitureWidth");
    const heightInput = document.getElementById("customFurnitureHeight");
    const shapeInput = document.getElementById("customFurnitureShape");
    const zoneInput = document.getElementById("customFurnitureZone");

    const name = String(nameInput?.value || "").trim();
    const width = Math.max(20, roundNumber(Number(widthInput?.value || 100)));
    const height = Math.max(20, roundNumber(Number(heightInput?.value || 100)));
    const shape = shapeInput?.value === "round" ? "round" : "rounded";
    const zone = zoneInput?.value === "exterior" ? "exterior" : "interior";

    if (!name) {
      app.showToast("Pon un nombre para el mueble");
      nameInput?.focus();
      return;
    }

    app.commit(() => {
      const preset = {
        id: createId("furnpreset"),
        label: name,
        name,
        width,
        height,
        shape,
        zone,
        isCustom: true,
      };

      app.state.data.customFurniturePresets = app.state.data.customFurniturePresets || [];
      app.state.data.customFurniturePresets.push(preset);
      app.state.ui.presets.furniture = preset.id;
    });

    app.els.furnitureModal?.close();
  }

  function createFloor() {
    const template = app.getSelectedFloorTemplate();
    if (!template) return;

    const name = app.els.floorNameInput.value.trim() || template.label;
    const level = Number(app.els.floorLevelInput.value || app.getSuggestedFloorLevel(template.kind));

    app.commit(() => {
      const floor = buildNewFloor(name, level, template.kind);
      app.state.data.floors.push(floor);
      app.state.data.project.activeFloorId = floor.id;
      app.state.ui.selected = null;
      app.state.ui.draft = { type: null, points: [] };
      app.state.ui.viewport = app.createDefaultViewport();
    });

    syncFloorFormWithTemplate(true);
  }

  function activateFloor(floorId) {
    if (!floorId || floorId === app.state.data.project.activeFloorId) return false;
    const floor = app.state.data.floors.find((entry) => entry.id === floorId);
    if (!floor) return false;

    releaseCanvasPointerCapture();
    resetPointerState();
    app.state.data.project.activeFloorId = floor.id;
    app.state.ui.selected = null;
    app.state.ui.multiSelected.clear();
    app.state.ui.draft = { type: null, points: [] };
    app.state.ui.hoverPoint = null;
    app.state.ui.viewport = app.createDefaultViewport();
    app.state.ui.homeViewport = null;
    app.state.ui.homeViewportKey = "";
    app.saveData(false);
    app.render();
    return true;
  }

  function stepActiveFloor(offset) {
    const nextFloor = app.getAdjacentFloor(offset);
    if (!nextFloor) return false;
    return activateFloor(nextFloor.id);
  }

  function duplicateFloor() {
    const floor = app.getActiveFloor();
    if (!floor) return;

    if (!app.els.floorDuplicateModal) return;

    if (app.els.floorDuplicateNameInput) {
      app.els.floorDuplicateNameInput.value = `${floor.name} copia`;
    }

    if (app.els.floorDuplicateLevelInput) {
      app.els.floorDuplicateLevelInput.value = String(floor.level + 1);
    }

    if (app.els.floorDuplicateModalCopy) {
      app.els.floorDuplicateModalCopy.textContent = `Se copiara todo el contenido de ${floor.name}.`;
    }

    app.els.floorDuplicateModal.showModal();
    app.els.floorDuplicateNameInput?.focus();
  }

  function handleDuplicateFloorSubmit(event) {
    event.preventDefault();

    const floor = app.getActiveFloor();
    if (!floor) return;

    const name = String(app.els.floorDuplicateNameInput?.value || "").trim() || `${floor.name} copia`;
    const level = Number(app.els.floorDuplicateLevelInput?.value || floor.level + 1);

    app.commit(() => {
      app.state.data = cloneFloorContent(app.state.data, floor.id, createId("floor"), name, level);
      app.state.data.project.activeFloorId = app.state.data.floors[app.state.data.floors.length - 1].id;
      app.state.ui.selected = null;
      app.state.ui.multiSelected.clear();
      app.state.ui.draft = { type: null, points: [] };
      app.state.ui.hoverPoint = null;
      app.state.ui.viewport = app.createDefaultViewport();
      app.state.ui.homeViewport = null;
      app.state.ui.homeViewportKey = "";
    });

    closeDuplicateFloorModal();
    syncFloorFormWithTemplate(false);
  }

  function closeDuplicateFloorModal() {
    if (!app.els.floorDuplicateModal?.open) return;
    app.els.floorDuplicateModal.close();
  }

  function handleFloorDuplicateModalClick(event) {
    if (event.target === app.els.floorDuplicateModal) {
      closeDuplicateFloorModal();
    }
  }

  function renameFloor() {
    const floor = app.getActiveFloor();
    if (!floor) return;
    const rowElement = app.els.floorList.querySelector(`.floor-card-row[data-floor-id="${floor.id}"]`);
    if (rowElement) {
      app.openFloorInlineEdit(rowElement, floor);
    }
  }

  function deleteFloor() {
    const floor = app.getActiveFloor();
    if (!floor || app.state.data.floors.length <= 1) return;

    app.commit(() => {
      app.state.data.floors = app.state.data.floors.filter((entry) => entry.id !== floor.id);
      app.state.data.rooms = app.state.data.rooms.filter((entry) => entry.floorId !== floor.id);
      app.state.data.walls = app.state.data.walls.filter((entry) => entry.floorId !== floor.id);
      app.state.data.openings = app.state.data.openings.filter((entry) => entry.floorId !== floor.id);
      app.state.data.fixtures = app.state.data.fixtures.filter((entry) => entry.floorId !== floor.id);
      app.state.data.furniture = app.state.data.furniture.filter((entry) => entry.floorId !== floor.id);
      app.state.data.reforms = app.state.data.reforms.filter((entry) => entry.floorId !== floor.id);
      app.state.data.notes = app.state.data.notes.filter((entry) => entry.floorId !== floor.id);
      app.state.data.budgets = app.state.data.budgets.filter((entry) => entry.floorId !== floor.id);
      app.state.data.inventory = app.state.data.inventory.filter((entry) => entry.floorId !== floor.id);
      app.state.data.documents = app.state.data.documents.filter((entry) => entry.floorId !== floor.id);
      app.state.data.project.activeFloorId = app.state.data.floors[0]?.id || "";
      app.state.ui.selected = null;
      app.state.ui.draft = { type: null, points: [] };
      app.state.ui.hoverPoint = null;
      app.state.ui.viewport = app.createDefaultViewport();
    });

    syncFloorFormWithTemplate(false);
  }

  function toggleExteriorOnly() {
    app.state.data.canvas.exteriorOnly = !app.state.data.canvas.exteriorOnly;
    app.state.ui.selected = null;
    app.state.ui.draft = { type: null, points: [] };
    app.state.ui.hoverPoint = null;
    app.saveData(false);
    app.render();
  }

  function toggleGrid() {
    app.state.data.canvas.showGrid = !app.state.data.canvas.showGrid;
    app.saveData(false);
    app.render();
  }

  function toggleLayerModal() {
    if (!app.els.layerModal) return;

    if (app.els.layerModal.open) {
      app.els.layerModal.close();
      return;
    }

    app.els.layerModal.showModal();
    app.renderButtons();
  }

  function closeLayerModal() {
    if (!app.els.layerModal?.open) return;
    app.els.layerModal.close();
  }

  function handleLayerModalClick(event) {
    if (event.target === app.els.layerModal) {
      closeLayerModal();
    }
  }

  function selectAll() {
    const visibleSelections = new Set([
      ...app.getVisibleRooms().map((entity) => `room:${entity.id}`),
      ...app.getVisibleWalls().map((entity) => `wall:${entity.id}`),
      ...app.getVisibleOpenings().map((entity) => `opening:${entity.id}`),
      ...app.getVisibleFixtures().map((entity) => `fixture:${entity.id}`),
      ...app.getVisibleFurniture().map((entity) => `furniture:${entity.id}`),
      ...app.getReferenceRooms().map((entity) => `room:${entity.id}`),
      ...app.getReferenceWalls().map((entity) => `wall:${entity.id}`),
    ]);

    app.state.ui.multiSelected = visibleSelections;
    app.state.ui.selected = null;
    app.state.ui.panel = "inspector";
    app.render();
  }

  function deleteMultiSelected() {
    if (!app.state.ui.multiSelected.size) return;

    app.commit(() => {
      [...app.state.ui.multiSelected].forEach((key) => {
        const [type, id] = key.split(":");
        app.deleteEntity(type, id);
      });
      app.state.ui.multiSelected.clear();
      app.state.ui.selected = null;
    });
  }

  function getEntityCenter(entity, type) {
    if (type === "room") return getPolygonCentroid(entity.points);
    if (type === "wall") return { x: (entity.x1 + entity.x2) / 2, y: (entity.y1 + entity.y2) / 2 };
    return { x: entity.x || 0, y: entity.y || 0 };
  }

  function captureEntityWithRelated(type, entity) {
    const snapshot = (entityType, value) => ({ ...clone(value), type: entityType, id: value.id });

    if (type !== "room") return [snapshot(type, entity)];

    const points = entity.points;
    const floorId = entity.floorId;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const tolerance = Math.max(30, Math.hypot(maxX - minX, maxY - minY) * 0.04);
    const seen = new Set([entity.id]);
    const snapshots = [snapshot("room", entity)];

    const isInsideRoom = (point) => pointInPolygon(point, points);
    const isNearRoom = (point) => (
      point.x >= minX - tolerance && point.x <= maxX + tolerance
      && point.y >= minY - tolerance && point.y <= maxY + tolerance
    );

    const addSnapshot = (entityType, value) => {
      if (!seen.has(value.id)) {
        seen.add(value.id);
        snapshots.push(snapshot(entityType, value));
      }
    };

    app.state.data.walls.filter((wall) => wall.floorId === floorId).forEach((wall) => {
      const midpoint = { x: (wall.x1 + wall.x2) / 2, y: (wall.y1 + wall.y2) / 2 };
      const start = { x: wall.x1, y: wall.y1 };
      const end = { x: wall.x2, y: wall.y2 };
      if (isInsideRoom(midpoint) || (isNearRoom(start) && isNearRoom(end))) {
        addSnapshot("wall", wall);
      }
    });

    app.state.data.openings.filter((opening) => opening.floorId === floorId).forEach((opening) => {
      const anchor = { x: opening.x, y: opening.y };
      if (isInsideRoom(anchor) || isNearRoom(anchor)) {
        addSnapshot("opening", opening);
      }
    });

    app.state.data.fixtures.filter((fixture) => fixture.floorId === floorId).forEach((fixture) => {
      if (isInsideRoom({ x: fixture.x, y: fixture.y })) {
        addSnapshot("fixture", fixture);
      }
    });

    app.state.data.furniture.filter((furniture) => furniture.floorId === floorId).forEach((furniture) => {
      if (isInsideRoom({ x: furniture.x, y: furniture.y })) {
        addSnapshot("furniture", furniture);
      }
    });

    return snapshots;
  }

  function selectEntitiesInBox(x1, y1, x2, y2) {
    app.state.ui.multiSelected.clear();
    app.state.ui.selected = null;

    const visit = (type, entities) => {
      entities.forEach((entity) => {
        const center = getEntityCenter(entity, type);
        if (center.x >= x1 && center.x <= x2 && center.y >= y1 && center.y <= y2) {
          app.state.ui.multiSelected.add(`${type}:${entity.id}`);
        }
      });
    };

    visit("room", app.getVisibleRooms());
    visit("wall", app.getVisibleWalls());
    visit("opening", app.getVisibleOpenings());
    visit("fixture", app.getVisibleFixtures());
    visit("furniture", app.getVisibleFurniture());
    visit("room", app.getReferenceRooms());
    visit("wall", app.getReferenceWalls());

    if (app.state.ui.multiSelected.size === 1) {
      const [type, id] = [...app.state.ui.multiSelected][0].split(":");
      const entity = app.getCollectionForType(type).find((entry) => entry.id === id);
      const isReferenceEntity = entity?.floorId && entity.floorId !== app.state.data.project.activeFloorId;

      app.state.ui.selected = { type, id };
      if (!isReferenceEntity) {
        app.state.ui.multiSelected.clear();
      }
      app.state.ui.panel = "inspector";
    }
  }

  function captureMultiSelectSnapshots() {
    return [...app.state.ui.multiSelected]
      .map((key) => {
        const [type, id] = key.split(":");
        const entity = app.getCollectionForType(type).find((entry) => entry.id === id);
        if (!entity) return null;
        return { ...clone(entity), type, id };
      })
      .filter(Boolean);
  }

  function applyDragDelta(snapshots, delta) {
    snapshots.forEach((snapshot) => {
      const entity = app.getCollectionForType(snapshot.type).find((entry) => entry.id === snapshot.id);
      if (!entity) return;

      if (snapshot.type === "room") {
        entity.points = snapshot.points.map((point) => ({
          x: roundNumber(point.x + delta.x),
          y: roundNumber(point.y + delta.y),
        }));
        return;
      }

      if (snapshot.type === "wall") {
        entity.x1 = roundNumber(snapshot.x1 + delta.x);
        entity.y1 = roundNumber(snapshot.y1 + delta.y);
        entity.x2 = roundNumber(snapshot.x2 + delta.x);
        entity.y2 = roundNumber(snapshot.y2 + delta.y);
        return;
      }

      entity.x = roundNumber(snapshot.x + delta.x);
      entity.y = roundNumber(snapshot.y + delta.y);
    });
  }

  function resetPointerState() {
    app.state.ui.pointer.down = false;
    app.state.ui.pointer.moved = false;
    app.state.ui.pointer.mode = null;
    app.state.ui.pointer.pointerId = null;
    app.state.ui.pointer.startClient = null;
    app.state.ui.pointer.viewStart = null;
    app.state.ui.pointer.dragSnapshots = null;
    app.state.ui.pointer.dragHistoryPushed = false;
    app.state.ui.pointer.rotateCenter = null;
    app.state.ui.pointer.rotateEntityStartAngle = 0;
    app.state.ui.pointer.rotatePointerStartAngle = 0;
    app.state.ui.pointer.boxStart = null;
    app.state.ui.pointer.boxEnd = null;
    app.updateCanvasClassName();
  }

  function releaseCanvasPointerCapture() {
    const pointerId = app.state.ui.pointer.pointerId;
    if (pointerId === null || typeof app.els.planCanvas.releasePointerCapture !== "function") return;

    try {
      if (!app.els.planCanvas.hasPointerCapture || app.els.planCanvas.hasPointerCapture(pointerId)) {
        app.els.planCanvas.releasePointerCapture(pointerId);
      }
    } catch {
      // Si el navegador no mantiene la captura, no hago nada mas.
    }
  }

  function handleCanvasWheel(event) {
    const isEditorRoute = app.state.ui.route === "editor";
    const isHomeRoute = app.state.ui.route === "home";
    if (!isEditorRoute && !isHomeRoute) return;
    event.preventDefault();

    if (isEditorRoute && app.state.ui.tool === "select" && app.state.ui.selectMode === "scale") {
      const selected = app.getSelectedEntity();
      if (selected && "width" in selected.entity) {
        const delta = event.deltaY < 0 ? 10 : -10;
        app.commit(() => {
          const entity = app.getCollectionForType(selected.type).find((entry) => entry.id === selected.entity.id);
          if (entity) {
            entity.width = Math.max(20, roundNumber(entity.width + delta));
            entity.height = Math.max(20, roundNumber(entity.height + delta));
          }
        });
        return;
      }
    }

    if (isEditorRoute && app.state.ui.tool === "select" && app.state.ui.selectMode === "rotate") {
      const selected = app.getSelectedEntity();
      if (selected && "angle" in selected.entity) {
        const delta = event.deltaY < 0 ? 15 : -15;
        app.commit(() => {
          const entity = app.getCollectionForType(selected.type).find((entry) => entry.id === selected.entity.id);
          if (entity) {
            entity.angle = roundNumber(((((entity.angle || 0) + delta) % 360) + 360) % 360);
          }
        });
        return;
      }
    }

    const anchor = getSvgPoint(event);
    const factor = event.deltaY < 0 ? 0.88 : 1.14;
    app.zoomViewport(factor, anchor);
  }

  function getSvgPoint(event) {
    const rect = app.els.planCanvas.getBoundingClientRect();
    const viewBox = app.els.planCanvas.viewBox?.baseVal;

    if (!rect.width || !rect.height) {
      return { x: 0, y: 0 };
    }

    const ctm = typeof app.els.planCanvas.getScreenCTM === "function" ? app.els.planCanvas.getScreenCTM() : null;

    if (ctm && typeof app.els.planCanvas.createSVGPoint === "function") {
      try {
        const point = app.els.planCanvas.createSVGPoint();
        point.x = Number(event.clientX || 0);
        point.y = Number(event.clientY || 0);
        const transformed = point.matrixTransform(ctm.inverse());
        return { x: transformed.x, y: transformed.y };
      } catch {
        // Si el SVG no devuelve bien la matriz, hago la conversion a mano.
      }
    }

    const width = viewBox?.width || app.state.data.canvas.width;
    const height = viewBox?.height || app.state.data.canvas.height;

    return {
      x: (viewBox?.x || 0) + ((Number(event.clientX || 0) - rect.left) / rect.width) * width,
      y: (viewBox?.y || 0) + ((Number(event.clientY || 0) - rect.top) / rect.height) * height,
    };
  }

  function snapPoint(point) {
    if (!app.state.data.canvas.snap) {
      return { x: roundNumber(point.x), y: roundNumber(point.y) };
    }

    const grid = app.state.data.canvas.grid;
    return {
      x: roundNumber(Math.round(point.x / grid) * grid),
      y: roundNumber(Math.round(point.y / grid) * grid),
    };
  }

  function getEntityTarget(target) {
    let current = target instanceof Node ? target : null;

    while (current) {
      if (current instanceof Element && current.dataset.entityType && current.dataset.entityId) {
        return {
          type: current.dataset.entityType,
          id: current.dataset.entityId,
        };
      }
      current = current.parentNode;
    }

    return null;
  }

  async function handleSupportPanelSubmit(event) {
    event.preventDefault();
    const form = event.target instanceof Element ? event.target.closest("[data-add-panel]") : null;
    if (!form) return;

    const panelType = form.dataset.addPanel;
    const editingItemId = String(app.state.ui.supportModalItemId || "");
    const existingItem = editingItemId ? getSupportCollectionItem(panelType, editingItemId) : null;
    const floorId = existingItem?.floorId || app.state.data.project.activeFloorId;
    const formData = new FormData(form);
    const selectedRoom = app.getSelectedRoom?.();
    const scopedRoomId = String(formData.get("roomId") || (selectedRoom?.floorId === floorId ? selectedRoom.id : existingItem?.roomId || ""));
    const reformId = String(formData.get("reformId") || "");
    const linkedReform = reformId
      ? app.state.data.reforms.find((entry) => entry.id === reformId && entry.floorId === floorId) || null
      : null;
    const roomId = String(linkedReform?.roomId || scopedRoomId || existingItem?.roomId || "");
    const safeReformId = linkedReform ? linkedReform.id : "";
    let pdfAttachment = null;

    try {
      pdfAttachment = await readPdfAttachmentFromForm(form);
    } catch (error) {
      app.showToast(getPdfReadErrorMessage(error));
      return;
    }

    app.commit(() => {
      if (panelType === "reforms" && existingItem) {
        existingItem.title = String(formData.get("title") || existingItem.title || "Reforma");
        existingItem.kind = String(formData.get("kind") || existingItem.kind || "improvement");
        existingItem.priority = String(formData.get("priority") || existingItem.priority || "medium");
        existingItem.status = String(formData.get("status") || existingItem.status || "planned");
        existingItem.notes = String(formData.get("notes") || "");
        existingItem.roomId = roomId || existingItem.roomId || "";
        return;
      }

      if (panelType === "reforms") {
        app.state.data.reforms.push({
          id: createId("reform"),
          floorId,
          roomId,
          priority: String(formData.get("priority") || "medium"),
          title: String(formData.get("title") || "Reforma"),
          kind: String(formData.get("kind") || "improvement"),
          status: String(formData.get("status") || "planned"),
          notes: String(formData.get("notes") || ""),
        });
        return;
      }

      if (panelType === "notes") {
        app.state.data.notes.push({
          id: createId("note"),
          floorId,
          roomId,
          reformId: safeReformId,
          kind: "issue",
          priority: "medium",
          status: "open",
          title: String(formData.get("title") || "Nueva nota"),
          estimatedCost: 0,
          notes: String(formData.get("notes") || ""),
        });
        return;
      }

      if (panelType === "budgets" && existingItem) {
        existingItem.title = String(formData.get("title") || existingItem.title || "Presupuesto");
        existingItem.amount = Number(formData.get("amount") || 0);
        existingItem.status = String(formData.get("status") || existingItem.status || "draft");
        existingItem.supplier = String(formData.get("supplier") || "");
        existingItem.notes = String(formData.get("notes") || "");
        existingItem.roomId = roomId || existingItem.roomId || "";
        existingItem.reformId = safeReformId;
        existingItem.pdf = pdfAttachment || existingItem.pdf || null;
        return;
      }

      if (panelType === "budgets") {
        app.state.data.budgets.push({
          id: createId("budget"),
          floorId,
          roomId,
          reformId: safeReformId,
          linkedNoteId: "",
          title: String(formData.get("title") || "Presupuesto"),
          amount: Number(formData.get("amount") || 0),
          status: String(formData.get("status") || "draft"),
          supplier: String(formData.get("supplier") || ""),
          notes: String(formData.get("notes") || ""),
          pdf: pdfAttachment,
        });
        return;
      }

      if (panelType === "inventory") {
        app.state.data.inventory.push({
          id: createId("inventory"),
          floorId,
          roomId,
          linkedId: "",
          name: String(formData.get("name") || "Elemento"),
          category: String(formData.get("category") || "General"),
          state: String(formData.get("state") || "ok"),
          value: Number(formData.get("value") || 0),
          notes: String(formData.get("notes") || ""),
        });
        return;
      }

      if (panelType === "documents" && existingItem) {
        existingItem.title = String(formData.get("title") || existingItem.title || "Documento");
        existingItem.type = String(formData.get("type") || existingItem.type || "General");
        existingItem.reference = String(formData.get("reference") || "");
        existingItem.notes = String(formData.get("notes") || "");
        existingItem.roomId = roomId || existingItem.roomId || "";
        existingItem.reformId = safeReformId;
        existingItem.pdf = pdfAttachment || existingItem.pdf || null;
        return;
      }

      if (panelType === "documents") {
        app.state.data.documents.push({
          id: createId("doc"),
          floorId,
          roomId,
          reformId: safeReformId,
          title: String(formData.get("title") || "Documento"),
          type: String(formData.get("type") || "General"),
          reference: String(formData.get("reference") || ""),
          notes: String(formData.get("notes") || ""),
          pdf: pdfAttachment,
        });
      }
    });

    form.reset();
    form.closest("details")?.removeAttribute("open");
    if (form.closest("dialog")) {
      closeSupportEntryModal();
    }
    if (existingItem) {
      app.showToast("Elemento actualizado");
      return;
    }
    app.showToast("Elemento añadido");
  }

  async function readPdfAttachmentFromForm(form) {
    const input = form.querySelector('input[name="pdfFile"]');
    const file = input instanceof HTMLInputElement ? input.files?.[0] || null : null;
    if (!file) return null;

    const fileName = String(file.name || "").toLowerCase();
    const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
    if (!isPdf) {
      throw new Error("invalid-pdf");
    }

    if (file.size > MAX_PDF_ATTACHMENT_BYTES) {
      throw new Error("pdf-too-large");
    }

    const dataUrl = await readFileAsDataUrl(file);
    return {
      name: file.name || "adjunto.pdf",
      mimeType: file.type || "application/pdf",
      size: Number(file.size || 0),
      dataUrl,
    };
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(normalizePdfDataUrl(String(reader.result || "")));
      reader.onerror = () => reject(new Error("file-read-error"));
      reader.readAsDataURL(file);
    });
  }

  function normalizePdfDataUrl(dataUrl) {
    if (dataUrl.startsWith("data:application/pdf;base64,")) return dataUrl;
    if (dataUrl.startsWith("data:;base64,")) {
      return dataUrl.replace("data:;base64,", "data:application/pdf;base64,");
    }

    return dataUrl;
  }

  function getPdfReadErrorMessage(error) {
    if (error?.message === "invalid-pdf") {
      return "El adjunto tiene que ser un PDF.";
    }

    if (error?.message === "pdf-too-large") {
      return `El PDF supera ${formatFileSize(MAX_PDF_ATTACHMENT_BYTES)}. Ahora mismo se guarda en el navegador.`;
    }

    return "No pude leer el PDF.";
  }

  function formatFileSize(bytes) {
    if (bytes >= 1_000_000) {
      return `${roundNumber(bytes / 1_000_000, 1)} MB`;
    }

    return `${roundNumber(bytes / 1_000, 0)} KB`;
  }

  function handleSupportPanelClick(event) {
    const openButton = event.target instanceof Element ? event.target.closest("[data-support-modal-open]") : null;
    if (openButton?.dataset.supportModalOpen) {
      openSupportEntryModal(openButton.dataset.supportModalOpen);
      return;
    }

    const editButton = event.target instanceof Element ? event.target.closest("[data-support-edit]") : null;
    if (editButton?.dataset.supportEdit && editButton.dataset.itemId) {
      openSupportEntryModal(editButton.dataset.supportEdit, editButton.dataset.itemId);
      return;
    }

    const detailButton = event.target instanceof Element ? event.target.closest("[data-panel-detail]") : null;
    if (detailButton?.dataset.panelDetail && detailButton.dataset.itemId) {
      openSupportDetailModal(detailButton.dataset.panelDetail, detailButton.dataset.itemId);
      return;
    }

    const button = event.target instanceof Element ? event.target.closest("[data-panel-delete]") : null;
    if (!button) return;

    deleteSupportItem(button.dataset.panelDelete, button.dataset.itemId);
    app.showToast("Elemento eliminado");
  }

  function deleteSupportItem(panelType, itemId) {
    const collectionKey = SUPPORT_PANEL_COLLECTION_KEYS[panelType];
    if (!collectionKey || !itemId) return;

    app.commit(() => {
      const collection = app.state.data[collectionKey];
      const index = collection.findIndex((entry) => entry.id === itemId);
      if (index >= 0) {
        collection.splice(index, 1);
      }

      if (collectionKey === "reforms") {
        [app.state.data.notes, app.state.data.budgets, app.state.data.documents].forEach((entries) => {
          entries.forEach((entry) => {
            if (entry.reformId === itemId) {
              entry.reformId = "";
            }
          });
        });
      }
    });
  }

  function getSupportCollectionItem(panelType, itemId) {
    const collectionKey = SUPPORT_PANEL_COLLECTION_KEYS[panelType];
    if (!collectionKey || !itemId) return null;
    return app.state.data[collectionKey].find((entry) => entry.id === itemId) || null;
  }

  function isEditableSupportPanel(panelType) {
    return EDITABLE_SUPPORT_PANEL_TYPES.includes(panelType);
  }

  function duplicateSelected() {
    const selected = app.getSelectedEntity();
    if (!selected) return;

    app.commit(() => {
      const original = selected.entity;
      const copy = clone(original);
      copy.id = createId(selected.type);

      if ("x" in copy) copy.x = roundNumber(original.x + 50);
      if ("y" in copy) copy.y = roundNumber(original.y + 50);

      if ("x1" in copy) {
        copy.x1 = roundNumber(original.x1 + 50);
        copy.y1 = roundNumber(original.y1 + 50);
        copy.x2 = roundNumber(original.x2 + 50);
        copy.y2 = roundNumber(original.y2 + 50);
      }

      if (copy.points) {
        copy.points = copy.points.map((point) => ({
          x: roundNumber(point.x + 50),
          y: roundNumber(point.y + 50),
        }));
      }

      app.getCollectionForType(selected.type).push(copy);
      app.state.ui.selected = { type: selected.type, id: copy.id };
    });

    app.showToast("Elemento duplicado");
  }

  return {
    bindBaseEvents,
    setupFloorForm,
    syncFloorFormWithTemplate,
    selectTool,
    stopActiveTool,
    beginPointerInteraction,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerLeave,
    handleKeydown,
    handleInspectorChange,
    handleInspectorClick,
    handleCustomFurnitureClick,
    extendWallDraft,
    extendRoomDraft,
    finishRoomDraft,
    cancelDraft,
    placeOpening,
    placeFixture,
    placeFurniture,
    createCustomFurniturePreset,
    createFloor,
    duplicateFloor,
    renameFloor,
    deleteFloor,
    toggleExteriorOnly,
    toggleGrid,
    toggleLayerModal,
    closeLayerModal,
    handleLayerModalClick,
    selectAll,
    deleteMultiSelected,
    getEntityCenter,
    captureEntityWithRelated,
    selectEntitiesInBox,
    captureMultiSelectSnapshots,
    applyDragDelta,
    resetPointerState,
    releaseCanvasPointerCapture,
    handleCanvasWheel,
    getSvgPoint,
    snapPoint,
    getEntityTarget,
    handleSupportPanelSubmit,
      handleSupportPanelClick,
      openSupportEntryModal,
      closeSupportEntryModal,
      duplicateSelected,
      activateFloor,
      stepActiveFloor,
    };
  }
