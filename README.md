# Domus

Domus es una app web para dibujar, revisar y gestionar una vivienda por plantas, incluida la parcela. La app funciona como frontend estático y guarda datos en `localStorage` cuando se usa en local. Si se publica con el servidor ASP.NET Core incluido, varios equipos pueden trabajar contra el mismo proyecto guardado en un JSON del servidor.

No es un sistema de gestión completo. Hoy sirve para trabajar el plano, organizar información por planta o estancia y publicar una versión útil en IIS. No tiene usuarios, permisos, base de datos activa ni edición colaborativa con control de conflictos.

## Estado actual

Domus abre con un proyecto vacío y tres plantas base:

- `Parcela`, nivel `-1`, tipo `site`.
- `Planta baja`, nivel `0`, tipo `interior`.
- `Planta alta`, nivel `1`, tipo `interior`.

La app permite crear, duplicar, editar y borrar plantas. En el plano se pueden dibujar muros ortogonales y estancias poligonales, colocar puertas, ventanas, instalaciones y mobiliario, usar presets de muebles y guardar presets propios.

El editor incluye selección directa, selección por zona, rotación, escalado, goma, rejilla, `snap`, zoom, paneo, deshacer y rehacer. El inspector edita la pieza seleccionada y el modal de capas se abre desde el botón con icono de ojo junto al zoom.

También hay cinco colecciones de apoyo ligadas a planta y, cuando procede, a estancia:

- `Reformas`
- `Notas`
- `Presupuestos`
- `Documentos`
- `Inventario`

`Reformas`, `Presupuestos` y `Documentos` se pueden crear, consultar, editar y borrar. `Notas` e `Inventario` se pueden crear, consultar y borrar; su edición completa queda pendiente.

## Vistas principales

### Inicio

`Inicio` funciona como visor de trabajo. Muestra el plano grande, sin rejilla, con un encuadre distinto al del editor. Dentro del propio visor hay selector de planta, zoom y desplazamiento.

Los paneles de apoyo rodean el plano:

- izquierda: `Reformas` y `Notas`
- derecha: `Presupuestos` y `Documentos`
- debajo del plano: `Inventario`

Si haces clic en una estancia desde `Inicio`, los paneles muestran solo los registros de esa estancia. Si limpias la selección o haces clic fuera, vuelven a mostrar toda la planta agrupada por estancia. Los registros sin `roomId` aparecen en `Sin estancia`.

### Editor

`Editor` es la mesa de trabajo del plano. Tiene herramientas a la izquierda, listado de plantas a la derecha, SVG central y el `Inspector` en el bloque inferior.

Desde aquí se dibuja, se selecciona, se ajustan piezas y se gestionan plantas. Las referencias de otras plantas pueden verse como apoyo visual, pero no se tratan siempre como entidades activas independientes.

## Referencias entre plantas

La referencia visual entre plantas se calcula al renderizar. No se guarda como una colección aparte.

- Desde una planta interior se ve la parcela difuminada. Las estancias exteriores de la parcela conservan su nombre real, por ejemplo `Jardín`, `Patio` o `Terraza`.
- Desde `Parcela` se ve la planta interior superior inmediata. Si no existe, se usa la interior más cercana.
- La selección por zona y `Ctrl + A` pueden incluir referencias visibles de otra planta.

## Persistencia

Domus guarda siempre una copia local en el navegador. Además, si detecta `api/project` dentro de la ruta publicada, intenta leer y guardar también en el servidor.

- Desarrollo local: `localStorage` del navegador.
- IIS con servidor ASP.NET Core: `App_Data/domus-project.json`.
- Exportación e importación: JSON completo del proyecto.
- Adjuntos PDF: se guardan dentro del proyecto y se limitan a 2,5 MB por archivo.

Al cargar un proyecto, `normalizeProject()` limpia datos antiguos o incompletos: plantas inexistentes, enlaces rotos a estancias, reformas y notas, PDF inválidos y nombres heredados de versiones anteriores.

## Lo que no hace todavía

- No hay base de datos conectada.
- No hay login, permisos ni auditoría.
- No hay bloqueo de edición; si dos equipos guardan a la vez, gana el último guardado.
- No hay demo cargable.
- No hay edición de vértices ni ajuste fino de muros.
- No hay cotas de obra, mediciones avanzadas ni validaciones técnicas.
- No hay edición completa de `Notas` e `Inventario`.
- No hay almacenamiento real de adjuntos fuera del JSON.
- No hay tests automatizados.

## Estructura del proyecto

```text
index.html                         Interfaz principal, modales y reparto base de vistas
styles/main.css                    Estilos globales, layout y SVG
src/main.js                        Entrada del frontend
src/app/createApp.js               Montaje de estado, render e interacción
src/app/state.js                   Estado, historial, persistencia y viewports
src/app/render.js                  Pintado de interfaz, SVG, paneles, modales y referencias
src/app/editor.js                  Eventos, herramientas, dibujo, atajos y gestión de paneles
src/app/dom.js                     Referencias al DOM
src/app/constants.js               Claves, límites y constantes compartidas
src/modules/planner/catalogs.js    Herramientas, capas y presets
src/modules/planner/geometry.js    Cálculos geométricos del plano
src/modules/project/projectData.js Proyecto vacío y normalización de datos
src/utils/common.js                Utilidades comunes
scripts/Start-DomusLocal.ps1       Servidor estático local con Python
scripts/Publish-DomusServer.ps1    Publicación del servidor para IIS
server/Domus.Server/               Servidor ASP.NET Core con API mínima
data/sql/001_casabase_schema.sql   SQL de referencia para una fase posterior
web.config                         Apoyo para publicación estática
```

## Requisitos

Para desarrollo local basta con un navegador moderno y Python si usas el script de servidor estático. Para revisar sintaxis necesitas Node.js. Para publicar el servidor en IIS necesitas el SDK de .NET 8 en el equipo de publicación y el Hosting Bundle de ASP.NET Core compatible con `net8.0` en el servidor IIS.

## Abrir en local

No abras `index.html` con `file://`. La app usa módulos ES y necesita servidor local.

Opción recomendada en Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Start-DomusLocal.ps1
```

Después entra en:

```text
http://localhost:8080
```

Opción manual:

```powershell
py -m http.server 8080
```

## Comprobación rápida

No hay suite de tests. Lo que sí puedes revisar ahora mismo es la sintaxis de los módulos JavaScript:

```powershell
npm run check
```

Para compilar el servidor:

```powershell
dotnet build .\server\Domus.Server\Domus.Server.csproj
```

## Publicar en IIS

Para compartir el mismo proyecto entre equipos, publica el servidor incluido:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Publish-DomusServer.ps1
```

La carpeta que debes apuntar desde IIS es:

```text
publish\Domus.Server
```

El usuario del App Pool necesita permiso de escritura sobre:

```text
publish\Domus.Server\App_Data
```

Puedes montarlo como sitio propio (`http://SRVCORE/`) o como aplicación hija (`http://SRVCORE/Domus/`). Si va debajo de Portal, crea una aplicación hija con alias `Domus`; no copies archivos sueltos dentro de una carpeta estática.

## Pasar datos de desarrollo a IIS

1. Abre la app donde tengas el trabajo, por ejemplo `http://localhost:8080`.
2. Pulsa `Exportar`.
3. Guarda el JSON.
4. Abre la app publicada, por ejemplo `http://SRVCORE/Domus/`.
5. Pulsa `Importar` y selecciona el JSON.
6. Comprueba `http://SRVCORE/Domus/api/health`.

Si `App_Data` tiene permisos correctos, el servidor escribirá `domus-project.json`. Si no, la app seguirá funcionando con `localStorage`, pero otros equipos no verán esos cambios.

## Atajos del editor

| Atajo | Acción |
| --- | --- |
| `S` | Selección |
| `W` | Muro |
| `R` | Estancia |
| `D` | Puerta |
| `V` | Ventana |
| `E` | Goma |
| `F` | Mueble |
| `X` | Electricidad |
| `Enter` | Cerrar una estancia con al menos tres puntos |
| `Escape` | Cancelar borrador o limpiar selección |
| `Supr` / `Backspace` | Borrar selección |
| `Ctrl + A` | Seleccionar el alcance visible del editor |
| `Ctrl + D` | Duplicar pieza seleccionada |
| `Ctrl + Z` | Deshacer |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Rehacer |

## Documentación relacionada

- [Guía de documentación](./doc/README.md)
- [Arquitectura](./doc/ARQUITECTURA.md)
- [API local y API prevista](./doc/API.md)
- [Base de datos prevista](./doc/BASE_DE_DATOS.md)
- [Despliegue en IIS](./doc/DESPLIEGUE_IIS.md)
- [Roadmap](./doc/ROADMAP.md)

## Criterio de mantenimiento

La documentación debe seguir al código real. Si algo existe solo como idea, se marca como pendiente. Si una función desaparece, se elimina de estos documentos.