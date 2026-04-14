# Arquitectura

Domus es un frontend estático con módulos ES. No usa framework ni router externo. El navegador carga `index.html`, `src/main.js` arranca la app y el estado vive en memoria mientras se trabaja.

La persistencia por defecto está en `localStorage`. Cuando se publica con `server/Domus.Server`, el mismo frontend usa `api/project` para leer y guardar un proyecto compartido en `App_Data/domus-project.json`.

## Flujo de arranque

1. `index.html` carga la estructura base de la interfaz.
2. `src/main.js` importa `createApp()` y llama a `boot()`.
3. `src/app/createApp.js` une estado, render e interacción.
4. `boot()` intenta cargar datos desde `api/project` si la app está en `http` o `https`.
5. Si no hay API o no hay proyecto remoto, usa `localStorage`.
6. Los datos pasan por `normalizeProject()` antes de usarse.
7. Se preparan planta activa, viewports, formularios, eventos y primer render.

No hay capa de estado externa. El coste es que el render y la interacción dependen bastante de las estructuras internas. La ventaja es que el proyecto sigue siendo fácil de abrir y publicar.

## Reparto de archivos

### Raíz

- `index.html`: cabecera, vistas, SVG, modales y paneles.
- `styles/main.css`: layout, apariencia, estados visuales, SVG y modales.
- `web.config`: configuración para servir la versión estática.
- `package.json`: comando `npm run check` para revisar sintaxis JavaScript.
- `scripts/Start-DomusLocal.ps1`: servidor local con Python.
- `scripts/Publish-DomusServer.ps1`: publicación del servidor ASP.NET Core.

### Frontend

- `src/main.js`: entrada mínima de la app.
- `src/app/createApp.js`: montaje general.
- `src/app/state.js`: estado, historial, persistencia, selección, viewports y helpers.
- `src/app/render.js`: pintado de interfaz, SVG, paneles, modales y referencias entre plantas.
- `src/app/editor.js`: eventos, herramientas, dibujo, arrastre, atajos y altas de paneles.
- `src/app/dom.js`: referencias a nodos del DOM.
- `src/app/constants.js`: claves de persistencia, endpoint remoto, límites y listas compartidas.

### Dominio

- `src/modules/planner/catalogs.js`: herramientas, capas, instalaciones y presets.
- `src/modules/planner/geometry.js`: cálculos geométricos.
- `src/modules/project/projectData.js`: proyecto vacío, normalización y operaciones entre plantas.
- `src/utils/common.js`: clonado, ids, formato y redondeos.

### Servidor

`server/Domus.Server` es una app ASP.NET Core mínima. Hace cuatro cosas:

- añade cabeceras básicas de seguridad
- sirve los archivos estáticos del frontend
- expone `GET /api/health`
- expone `GET` y `PUT` sobre `/api/project`

El servidor no conoce entidades internas como habitaciones o muros. Guarda el proyecto completo como JSON.

## Modelo de datos

`createEmptyProject()` define la forma base del proyecto:

- `project`: nombre, dirección, notas, planta activa y fecha de actualización.
- `canvas`: tamaño, rejilla, `snap`, visibilidad de rejilla y filtro `Solo exterior`.
- `floors`: plantas con `id`, `name`, `level` y `kind` (`interior` o `site`).
- `rooms`: estancias poligonales con zona, tipo, color y notas.
- `walls`: muros con dos puntos, grosor, tipo, zona y notas.
- `openings`: puertas y ventanas con posición, giro, ancho y sentido de apertura.
- `fixtures`: electricidad, agua y red.
- `furniture`: muebles colocados en el plano.
- `customFurniturePresets`: presets creados desde la interfaz.
- `reforms`, `notes`, `budgets`, `documents`, `inventory`: paneles de apoyo por planta, con `roomId` opcional.

El modelo no separa todavía datos por usuario ni por versión. Cada guardado serializa el proyecto completo.

## Normalización

`normalizeProject()` permite abrir datos antiguos, incompletos o importados a mano sin romper la interfaz.

Corrige o descarta, entre otras cosas:

- plantas sin forma válida
- entidades que apuntan a una planta inexistente
- enlaces a estancias borradas
- enlaces rotos entre reformas, notas y presupuestos
- presets de mobiliario incompletos
- PDF que no sean `data:application/pdf` válido o superen 2,5 MB
- nombres heredados de versiones anteriores que ya no encajan con Domus

Esta normalización no sustituye a una validación de backend. Es una defensa útil para el estado actual del proyecto.

## Vistas

### Inicio

`Inicio` es un visor operativo, no una portada decorativa. Tiene su propio viewport y no usa la misma presentación que el editor.

Comportamiento actual:

- muestra el plano grande y sin rejilla
- permite zoom y desplazamiento dentro del visor
- incluye selector de planta dentro del cuadro
- usa referencias entre plantas igual que el editor
- filtra paneles de apoyo al hacer clic sobre una estancia

Los paneles se reparten alrededor del plano:

- `Reformas` y `Notas` a la izquierda
- `Presupuestos` y `Documentos` a la derecha
- `Inventario` debajo

Cuando no hay estancia seleccionada, los registros se agrupan por estancia. Los que no tienen `roomId` salen como `Sin estancia`.

### Editor

`Editor` concentra las herramientas de dibujo y edición:

- herramientas a la izquierda
- plano SVG en el centro
- plantas a la derecha
- `Inspector` en el bloque inferior
- modal de capas accesible desde el icono de ojo junto al zoom

El editor trabaja con una planta activa, pero puede mostrar referencias de otra planta como apoyo visual.

## Render del plano

El plano se pinta en un único `svg` con `viewBox`. El orden de pintado importa:

1. fondo
2. rejilla, cuando la vista la usa
3. superficie de captura
4. referencia de otra planta
5. entidades de la planta activa
6. rótulos de referencia
7. selección, caja y borradores

En `Inicio` se desactivan rejilla y reglas, y el `viewBox` sale del viewport propio de esa vista. En `Editor`, el viewport se orienta al trabajo de precisión.

## Referencias entre plantas

Las referencias son derivadas. No se guardan en el proyecto.

- Si la planta activa es interior, se dibuja la parcela como fondo difuminado.
- Si la planta activa es `site`, se dibuja una planta interior de referencia.
- Primero se busca la planta interior inmediatamente superior por `level`.
- Si no existe, se usa la interior más cercana.

La selección por zona y `Ctrl + A` pueden incluir referencias visibles. El clic directo sigue priorizando la planta activa.

## Selección y edición

Hay dos tipos de selección que conviene no mezclar:

- Selección de entidades del plano: se usa para mover, duplicar, borrar, rotar o escalar piezas.
- Selección de estancia en `Inicio`: se usa para filtrar paneles de apoyo.

El arrastre conjunto aplica el mismo desplazamiento a todas las entidades seleccionadas, incluso si la selección incluye referencias visibles de otra planta.

## Paneles de apoyo

Los paneles actuales son:

- `Reformas`
- `Notas`
- `Presupuestos`
- `Documentos`
- `Inventario`

Todos filtran por planta activa. También pueden filtrar por estancia desde `Inicio` y guardar `roomId` si el alta se hace con una estancia seleccionada.

La creación se hace desde un modal. El panel muestra el botón `Añadir...` y el formulario cambia según la colección. Ahora mismo hay edición completa para `Reformas`, `Presupuestos` y `Documentos`. `Notas` e `Inventario` todavía no tienen edición completa.

## Persistencia e historial

La app guarda por dos vías:

- `localStorage`: siempre disponible en el navegador.
- `api/project`: disponible si se publica con `server/Domus.Server`.

Al arrancar, si la app está en `http` o `https`, intenta leer `api/project`. Si responde con proyecto, lo normaliza y lo usa. Si no responde, continúa con `localStorage`.

Cada cambio confirmado pasa por `commit()`. El historial guarda clones completos del proyecto, con un límite de 50 snapshots. Es suficiente para el tamaño actual, pero no escalará bien si el proyecto crece mucho o si se añaden documentos pesados.

## Límites técnicos

- Sin tests automatizados.
- Sin validación completa del modelo en backend.
- Sin usuarios ni permisos.
- Sin control de conflictos.
- Sin edición completa de `Notas` e `Inventario`.
- Sin almacenamiento real de documentos fuera del JSON.
- Sin base de datos conectada.

El siguiente paso técnico con más impacto es cerrar persistencia, validación y documentos antes de seguir ampliando interfaz.