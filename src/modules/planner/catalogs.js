// -----------------------------------------------------------------------------
// BLOQUE 1. Catalogos del editor
// Aqui dejo todo lo que el editor puede colocar o mostrar. Es la parte que
// normalmente cambias primero cuando quieres adaptar el proyecto a otra casa.
// -----------------------------------------------------------------------------

export const TOOL_GROUP_DEFINITIONS = [
  { id: "editing", label: "Edicion" },
  { id: "building", label: "Construccion" },
  { id: "systems", label: "Instalaciones" },
  { id: "furniture", label: "Mobiliario" },
];

export const TOOL_DEFINITIONS = [
  { id: "select", group: "editing", icon: "pointer", label: "Seleccion", short: "Selecciona piezas para revisarlas o editarlas.", hint: "Pulsa sobre una pieza para seleccionarla. Supr la borra y Escape limpia la seleccion." },
  { id: "erase", group: "editing", icon: "eraser", label: "Goma", short: "Borra directamente la pieza sobre la que haces click.", hint: "Con la goma activa no editas nada. Haz click sobre un muro, estancia, hueco, punto o mueble y se elimina." },
  { id: "wall", group: "building", icon: "wall", label: "Muro", short: "Traza paredes rectas con apoyo a eje.", hint: "Primer click para arrancar el muro. El segundo punto se endereza a horizontal o vertical de forma automatica." },
  { id: "room", group: "building", icon: "room", label: "Estancia", short: "Cierra el contorno real de una zona interior o exterior.", hint: "Cada click mete un vertice. Pulsa Enter o usa el boton superior cuando cierres la estancia." },
  { id: "door", group: "building", icon: "door", label: "Puerta", short: "Coloca puertas sobre el muro mas cercano.", hint: "Haz click cerca de un muro y la puerta se orienta sola." },
  { id: "window", group: "building", icon: "window", label: "Ventana", short: "Inserta ventanas siguiendo la linea del muro.", hint: "Haz click cerca del muro y el hueco se alinea con ese tramo." },
  { id: "electricity", group: "systems", icon: "electricity", label: "Electricidad", short: "Enchufes, cuadros y luz.", hint: "Haz click donde quieres el punto electrico." },
  { id: "water", group: "systems", icon: "water", label: "Agua", short: "Tomas, llaves y desagues.", hint: "Haz click sobre el plano para dejar el punto de agua." },
  { id: "network", group: "systems", icon: "network", label: "Red", short: "Router, fibra y cobertura.", hint: "Haz click para colocar el punto de red." },
  { id: "furniture", group: "furniture", icon: "furniture", label: "Mueble", short: "Mobiliario tecnico o domestico.", hint: "Elige un preset y colocalo en la planta activa." },
];

export const LAYER_DEFINITIONS = [
  { id: "rooms", label: "Estancias" },
  { id: "walls", label: "Muros" },
  { id: "openings", label: "Puertas y ventanas" },
  { id: "fixtures", label: "Instalaciones" },
  { id: "furniture", label: "Mobiliario" },
  { id: "labels", label: "Rotulos" },
];

export const ROOM_PRESETS = [
  { id: "living", label: "Salon", type: "Comun", zone: "interior", name: "Salon", color: "#efe1d4" },
  { id: "kitchen", label: "Cocina", type: "Servicio", zone: "interior", name: "Cocina", color: "#e8ded1" },
  { id: "bathroom", label: "Bano", type: "Servicio", zone: "interior", name: "Bano", color: "#e3e8e0" },
  { id: "bedroom", label: "Dormitorio", type: "Descanso", zone: "interior", name: "Dormitorio", color: "#ead9de" },
  { id: "office", label: "Despacho", type: "Trabajo", zone: "interior", name: "Despacho", color: "#dde6ec" },
  { id: "storage", label: "Trastero", type: "Almacenaje", zone: "interior", name: "Trastero", color: "#ece1d6" },
  { id: "hall", label: "Entrada", type: "Acceso", zone: "interior", name: "Entrada", color: "#efe5d5" },
  { id: "circulation", label: "Pasillo", type: "Circulacion", zone: "interior", name: "Pasillo", color: "#efe8df" },
  { id: "garden", label: "Jardin", type: "Exterior", zone: "exterior", name: "Jardin", color: "#dfe7d3" },
  { id: "yard", label: "Patio", type: "Exterior", zone: "exterior", name: "Patio", color: "#e6dfd0" },
  { id: "terrace", label: "Terraza", type: "Exterior", zone: "exterior", name: "Terraza", color: "#e7ddcf" },
  { id: "garage", label: "Garaje", type: "Apoyo", zone: "interior", name: "Garaje", color: "#dfdfdf" },
];

export const WALL_PRESETS = [
  { id: "load", label: "Carga", name: "Muro de carga", thickness: 24, kind: "Estructural", zone: "interior" },
  { id: "partition", label: "Tabique", name: "Tabique interior", thickness: 16, kind: "Interior", zone: "interior" },
  { id: "outer", label: "Exterior", name: "Cierre exterior", thickness: 28, kind: "Exterior", zone: "exterior" },
];

export const OPENING_PRESETS = {
  door: [
    { id: "micro-door",   label: "50 cm",     name: "Paso minimo",      width: 50,  swing: 1,  zone: "interior" },
    { id: "narrow-door",  label: "70 cm",     name: "Puerta estrecha",  width: 70,  swing: 1,  zone: "interior" },
    { id: "single-door",  label: "Simple",    name: "Puerta simple",    width: 90,  swing: 1,  zone: "interior" },
    { id: "double-door",  label: "Doble",     name: "Puerta doble",     width: 140, swing: 1,  zone: "interior" },
    { id: "sliding-door", label: "Corredera", name: "Puerta corredera", width: 120, swing: -1, zone: "interior" },
    { id: "garden-gate",  label: "Porton",    name: "Porton exterior",  width: 180, swing: 1,  zone: "exterior" },
  ],
  window: [
    { id: "window-50",   label: "50 cm",  name: "Ventana pequena", width: 50,  zone: "interior" },
    { id: "window-70",   label: "70 cm",  name: "Ventana",         width: 70,  zone: "interior" },
    { id: "window-100",  label: "100 cm", name: "Ventana",         width: 100, zone: "interior" },
    { id: "window-140",  label: "140 cm", name: "Ventana ancha",   width: 140, zone: "interior" },
    { id: "window-180",  label: "180 cm", name: "Ventanal",        width: 180, zone: "interior" },
    { id: "garden-open", label: "Apertura", name: "Hueco exterior", width: 220, zone: "exterior" },
  ],
};

export const FIXTURE_PRESETS = {
  electricity: [
    { id: "outlet", label: "Enchufe", name: "Enchufe", glyph: "E", status: "ok", zone: "interior" },
    { id: "light", label: "Luz", name: "Punto de luz", glyph: "L", status: "ok", zone: "interior" },
    { id: "panel", label: "Cuadro", name: "Cuadro electrico", glyph: "Q", status: "attention", zone: "interior" },
    { id: "garden-light", label: "Exterior", name: "Luz exterior", glyph: "X", status: "ok", zone: "exterior" },
  ],
  water: [
    { id: "water-point", label: "Toma", name: "Toma de agua", glyph: "A", status: "ok", zone: "interior" },
    { id: "drain", label: "Desague", name: "Desague", glyph: "D", status: "attention", zone: "interior" },
    { id: "shutoff", label: "Llave", name: "Llave de corte", glyph: "V", status: "ok", zone: "interior" },
    { id: "garden-tap", label: "Riego", name: "Toma de riego", glyph: "R", status: "ok", zone: "exterior" },
  ],
  network: [
    { id: "router", label: "Router", name: "Router", glyph: "R", status: "ok", zone: "interior" },
    { id: "fiber", label: "Fibra", name: "Entrada fibra", glyph: "N", status: "ok", zone: "interior" },
    { id: "wifi", label: "WiFi", name: "Cobertura WiFi", glyph: "W", status: "ok", zone: "interior" },
    { id: "camera", label: "Camara", name: "Camara exterior", glyph: "C", status: "ok", zone: "exterior" },
  ],
};

export const FURNITURE_PRESETS = [
  { id: "sofa", label: "Sofa", name: "Sofa 3 plazas", width: 180, height: 82, shape: "rounded", zone: "interior" },
  { id: "table", label: "Mesa", name: "Mesa comedor", width: 160, height: 90, shape: "rounded", zone: "interior" },
  { id: "desk", label: "Escritorio", name: "Escritorio tecnico", width: 180, height: 70, shape: "rounded", zone: "interior" },
  { id: "bed", label: "Cama", name: "Cama doble", width: 190, height: 150, shape: "rounded", zone: "interior" },
  { id: "wardrobe", label: "Armario", name: "Armario", width: 180, height: 60, shape: "rounded", zone: "interior" },
  { id: "fridge", label: "Frigo", name: "Frigorifico", width: 70, height: 70, shape: "round", zone: "interior" },
  { id: "washer", label: "Lavadora", name: "Lavadora", width: 76, height: 76, shape: "round", zone: "interior" },
  { id: "shelf", label: "Estante", name: "Estanteria", width: 140, height: 50, shape: "rounded", zone: "interior" },
  { id: "rack", label: "Rack", name: "Rack tecnico", width: 120, height: 52, shape: "rounded", zone: "interior" },
  { id: "bench", label: "Banco", name: "Banco exterior", width: 160, height: 54, shape: "rounded", zone: "exterior" },
  { id: "garden-table", label: "Mesa jardin", name: "Mesa de jardin", width: 180, height: 100, shape: "rounded", zone: "exterior" },
  { id: "lounger", label: "Tumbona", name: "Tumbona exterior", width: 190, height: 70, shape: "rounded", zone: "exterior" },
  { id: "planter", label: "Jardinera", name: "Jardinera", width: 110, height: 44, shape: "rounded", zone: "exterior" },
  { id: "plant-pot", label: "Maceta", name: "Maceta grande", width: 55, height: 55, shape: "round", zone: "exterior" },
  { id: "tree", label: "Arbol", name: "Arbol ornamental", width: 130, height: 130, shape: "round", zone: "exterior" },
];

export const FLOOR_TEMPLATES = [
  { id: "ground", label: "Planta baja", kind: "interior" },
  { id: "upper", label: "Planta alta", kind: "interior" },
  { id: "site", label: "Parcela", kind: "site" },
];
