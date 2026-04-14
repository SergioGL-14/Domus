# Base de datos prevista

Domus todavía no usa base de datos. En desarrollo guarda en `localStorage`. En IIS, si se publica con `server/Domus.Server`, guarda un único JSON en `App_Data/domus-project.json`.

El archivo `data/sql/001_casabase_schema.sql` es una referencia para la siguiente fase. No se ejecuta al abrir la app y no participa en el guardado actual.

## Qué cubre el SQL

El esquema actual incluye tablas para las piezas principales del proyecto:

- `projects`
- `floors`
- `rooms`
- `walls`
- `openings`
- `fixtures`
- `furniture`
- `inventory_items`
- `room_notes`
- `budgets`
- `documents`

La idea general es correcta: separar proyecto, plantas, escena y capas de apoyo. No metería todo el plano en una sola columna JSON salvo como copia de exportación o caché.

## Encaje con el frontend

El frontend trabaja hoy con estas colecciones:

- `floors`
- `rooms`
- `walls`
- `openings`
- `fixtures`
- `furniture`
- `customFurniturePresets`
- `inventory`
- `notes`
- `budgets`
- `documents`

El encaje es bueno, pero no es exacto. Antes de conectar una base de datos hay que resolver varios puntos.

## Diferencias a cerrar

### Identificadores

El frontend usa ids de cliente, por ejemplo `room-xxxx` o `floor-ground`. El SQL usa claves enteras autoincrementales y además campos `code`.

La solución limpia es mantener un identificador interno de base de datos y un código estable para el cliente. Si se mezclan sin criterio, las importaciones, duplicados y referencias entre entidades van a dar problemas.

### Canvas

El modelo del frontend tiene opciones de lienzo que el SQL no recoge todavía como tabla propia:

- `width`
- `height`
- `grid`
- `snap`
- `showGrid`
- `exteriorOnly`

Hay que decidir si van en `projects`, en una tabla separada o en un JSON acotado. Para una sola vivienda, guardarlo junto al proyecto puede valer. Si se quiere versionar configuración o soportar varias vistas, conviene separarlo.

### Presets personalizados

`customFurniturePresets` ya existe en el frontend y no tiene tabla en `001_casabase_schema.sql`.

Necesita modelo propio si los presets van a sobrevivir a recargas, importaciones y uso desde varios equipos.

### Documentos

Ahora los PDF se guardan como `dataUrl` dentro del proyecto, con límite de 2,5 MB por archivo. En servidor terminan dentro de `domus-project.json`.

Eso está bien para arrancar, pero no para base de datos. Lo razonable es guardar metadatos en `documents` y dejar el archivo real en una carpeta controlada o en un almacenamiento específico.

Campos mínimos:

- nombre original
- tipo MIME
- tamaño
- ruta o identificador de descarga
- relación con proyecto, planta y estancia
- fecha de alta y última modificación

### Relaciones entre capas de apoyo

El frontend ya permite enlaces como `roomId`, `reformId` y `linkedNoteId`. El SQL cubre parte de esa idea, pero hay que revisar bien las relaciones antes de migrar datos reales.

Si `budgets` puede depender de una nota o de una reforma, el modelo debe dejarlo claro. Si no se decide ahora, aparecerán referencias ambiguas en cuanto haya datos de verdad.

## Entidades principales

### `rooms`

Pertenecen a una planta y guardan geometría poligonal. Necesitan nombre, tipo, zona, color y notas.

La geometría puede mantenerse como JSON controlado si no se van a consultar vértices desde SQL. Si más adelante se hacen mediciones avanzadas desde backend, habrá que replantearlo.

### `walls`

Pertenecen a una planta y guardan dos puntos, grosor, tipo, zona y notas.

### `openings`

Pertenecen a una planta. Distinguen puerta y ventana, y guardan posición, giro, ancho, sentido de apertura y zona.

### `fixtures`

Pertenecen a una planta. El SQL ya prevé `room_id`, aunque el frontend todavía trabaja sobre todo por planta y zona.

### `furniture`

Pertenecen a una planta. Guardan preset, tamaño, posición, giro, forma y notas. También conviene conservar el código de cliente para no romper referencias al importar.

### Paneles de apoyo

`inventory_items`, `room_notes`, `budgets` y `documents` tienen sentido como tablas separadas. Son datos que se consultan por planta, estancia, estado, proveedor o categoría.

## Lo que no necesita tabla propia

La referencia visual entre plantas no debe guardarse. Se calcula con datos existentes:

- plantas (`floors`)
- estancias (`rooms`)
- elementos de escena por planta

Guardar una capa fantasma solo duplicaría información y abriría la puerta a incoherencias.

## Orden recomendado antes de conectar la base de datos

1. Definir ids internos y códigos públicos.
2. Decidir dónde vive la configuración de canvas.
3. Añadir modelo para `customFurniturePresets`.
4. Sacar documentos del JSON y guardar solo metadatos.
5. Revisar enlaces entre reformas, notas, presupuestos y documentos.
6. Elegir si la escena se guarda por entidad o por lote de planta.
7. Escribir migración desde el JSON actual.

No conectaría la base de datos antes de cerrar esos puntos. Se puede hacer rápido, pero saldrá caro en cuanto haya que migrar datos reales.