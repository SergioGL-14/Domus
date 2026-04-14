# API local y API prevista

Domus tiene dos niveles distintos de API documentados aquí:

- La API real de `server/Domus.Server`, que ya funciona y guarda un único proyecto compartido.
- La API recomendada para una fase posterior, cuando el proyecto deje de guardar todo en un solo JSON.

## API disponible hoy

El servidor actual es intencionadamente pequeño. Sirve la web, expone una comprobación de salud y guarda el proyecto completo en `App_Data/domus-project.json`.

El frontend puede funcionar sin servidor. Si `api/project` no responde, sigue usando `localStorage` en el navegador.

### `GET /api/health`

Devuelve el estado básico del servidor y del almacenamiento local.

Respuesta esperada:

```json
{
  "status": "ok",
  "storage": "json-file",
  "projectFile": "App_Data/domus-project.json",
  "storageReady": true
}
```

`storageReady` indica si existe la carpeta `App_Data`. Si aparece en `false`, el servidor puede estar levantado, pero todavía no tiene preparada la carpeta donde guarda el proyecto.

### `GET /api/project`

Devuelve el JSON completo del proyecto guardado en servidor.

Si todavía no existe `App_Data/domus-project.json`, responde `204 No Content`. En ese caso el frontend sigue con el proyecto local o con un proyecto vacío normalizado.

### `PUT /api/project`

Guarda el proyecto completo.

Condiciones actuales:

- exige `Content-Type: application/json`
- rechaza cuerpos mayores de 30 MB
- valida que el JSON tenga `project`, `canvas` y `floors`
- escribe primero en un temporal y después reemplaza `domus-project.json`
- usa un bloqueo interno para evitar dos escrituras simultáneas sobre el archivo

Errores previstos:

| Caso | Respuesta |
| --- | --- |
| `Content-Type` incorrecto | `400` con `json-content-type-required` |
| JSON inválido | `400` con `invalid-json` |
| Forma mínima incorrecta | `400` con `invalid-project-shape` |
| Proyecto mayor de 30 MB | `413` |
| Sin permisos de escritura | `500` con aviso sobre `App_Data` |

No hay control de conflictos. Si dos equipos guardan a la vez, gana el último guardado que llega al servidor.

## Rutas cuando Domus cuelga de otra aplicación

Si publicas Domus en la raíz del sitio, las rutas son:

```text
/api/health
/api/project
```

Si lo publicas como aplicación hija, por ejemplo `/Domus`, las rutas pasan a ser:

```text
/Domus/api/health
/Domus/api/project
```

El frontend calcula la ruta base desde `window.location.pathname`, así que no hace falta cambiar código para esos dos casos.

## Payload mínimo aceptado

El servidor no valida todo el modelo. Solo comprueba una forma mínima para evitar guardar cualquier archivo que no sea un proyecto de Domus.

```json
{
  "project": {
    "name": "Domus",
    "address": "Plano vacío listo para empezar",
    "notes": "Notas generales",
    "activeFloorId": "floor-ground",
    "updatedAt": "2026-04-06T10:00:00.000Z"
  },
  "canvas": {
    "width": 2600,
    "height": 1600,
    "grid": 50,
    "snap": true,
    "showGrid": true,
    "exteriorOnly": false
  },
  "floors": [
    {
      "id": "floor-ground",
      "name": "Planta baja",
      "level": 0,
      "kind": "interior"
    }
  ],
  "rooms": [],
  "walls": [],
  "openings": [],
  "fixtures": [],
  "furniture": [],
  "customFurniturePresets": [],
  "reforms": [],
  "inventory": [],
  "notes": [],
  "budgets": [],
  "documents": []
}
```

La limpieza fina la hace el frontend con `normalizeProject()` al cargar o importar.

## API recomendada para la siguiente fase

Cuando entre base de datos, no conviene mantener un único `PUT /api/project` como pieza principal. Para proyectos pequeños funciona, pero se queda corto en cuanto quieras historial, permisos, adjuntos reales o consultas por estancia.

La API debería respetar cómo trabaja el frontend ahora:

- proyecto y opciones generales
- plantas
- escena de una planta
- paneles de apoyo con `roomId` opcional
- presets personalizados de mobiliario
- documentos fuera del JSON principal

La referencia visual entre plantas no necesita endpoint propio. Se calcula cruzando plantas, estancias y escena.

## Endpoints propuestos

### Proyecto

```text
GET /api/projects/{projectId}
PUT /api/projects/{projectId}
```

El `GET` devuelve cabecera, opciones de canvas y resumen. El `PUT` actualiza nombre, dirección, notas y ajustes generales.

### Plantas

```text
GET    /api/projects/{projectId}/floors
POST   /api/projects/{projectId}/floors
PUT    /api/floors/{floorId}
DELETE /api/floors/{floorId}
```

### Escena por planta

```text
GET /api/floors/{floorId}/scene
PUT /api/floors/{floorId}/scene
```

La escena debería viajar por lote de planta, al menos al principio. Para este editor es más práctico guardar `rooms`, `walls`, `openings`, `fixtures` y `furniture` juntos que lanzar una petición por cada clic.

Payload esperado:

```json
{
  "floor": {
    "id": "floor-ground",
    "name": "Planta baja",
    "level": 0,
    "kind": "interior"
  },
  "rooms": [],
  "walls": [],
  "openings": [],
  "fixtures": [],
  "furniture": []
}
```

### Presets personalizados de mobiliario

```text
GET    /api/projects/{projectId}/furniture-presets
POST   /api/projects/{projectId}/furniture-presets
PUT    /api/furniture-presets/{presetId}
DELETE /api/furniture-presets/{presetId}
```

### Paneles de apoyo

Las cinco colecciones comparten dos reglas: pertenecen a una planta y pueden quedar ligadas a una estancia con `roomId`.

```text
GET    /api/floors/{floorId}/reforms
GET    /api/floors/{floorId}/reforms?roomId={roomId}
POST   /api/floors/{floorId}/reforms
PUT    /api/reforms/{reformId}
DELETE /api/reforms/{reformId}

GET    /api/floors/{floorId}/notes
GET    /api/floors/{floorId}/notes?roomId={roomId}
POST   /api/floors/{floorId}/notes
PUT    /api/notes/{noteId}
DELETE /api/notes/{noteId}

GET    /api/floors/{floorId}/budgets
GET    /api/floors/{floorId}/budgets?roomId={roomId}
POST   /api/floors/{floorId}/budgets
PUT    /api/budgets/{budgetId}
DELETE /api/budgets/{budgetId}

GET    /api/floors/{floorId}/inventory
GET    /api/floors/{floorId}/inventory?roomId={roomId}
POST   /api/floors/{floorId}/inventory
PUT    /api/inventory/{itemId}
DELETE /api/inventory/{itemId}

GET    /api/floors/{floorId}/documents
GET    /api/floors/{floorId}/documents?roomId={roomId}
POST   /api/floors/{floorId}/documents
PUT    /api/documents/{documentId}
DELETE /api/documents/{documentId}
```

Payload base para una nota:

```json
{
  "id": "note-1",
  "floorId": "floor-ground",
  "roomId": "room-3",
  "title": "Revisar humedad",
  "kind": "issue",
  "priority": "high",
  "status": "open",
  "estimatedCost": 0,
  "notes": "Sale mancha junto al tabique norte"
}
```

`roomId` puede venir vacío o `null` si el registro es general de planta.

## Documentos adjuntos

Los PDF no deberían viajar como `dataUrl` cuando haya backend. Esa solución está bien para la fase local, pero no para datos compartidos a largo plazo.

La API debería subir el archivo aparte y devolver metadatos claros:

```json
{
  "id": "document-1",
  "name": "presupuesto-electricidad.pdf",
  "mimeType": "application/pdf",
  "size": 248000,
  "downloadUrl": "/api/documents/document-1/file"
}
```

## Lo que dejaría fuera de la primera versión con base de datos

- Multiusuario en tiempo real.
- Bloqueo por entidad.
- Versionado fino por vértice.
- Auditoría detallada.
- Permisos avanzados.

Primero hay que cerrar bien proyecto, plantas, escena, paneles de apoyo y documentos. Meter colaboración avanzada antes de eso complicaría una base que aún no está asentada.