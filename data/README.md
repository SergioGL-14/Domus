# Datos del proyecto

Esta carpeta guarda material técnico que acompaña al proyecto, pero no forma parte de la app que se ejecuta en el navegador.

## Contenido actual

- `sql/001_casabase_schema.sql`: primer esquema relacional de referencia para una fase posterior con base de datos.

## Uso real ahora mismo

Domus no lee estos archivos al arrancar. La app trabaja con `localStorage` en desarrollo y, cuando se publica con el servidor ASP.NET Core, con `App_Data/domus-project.json`.

El SQL sirve como punto de partida para diseñar la persistencia futura. No hace falta ejecutarlo para abrir la app, publicar en IIS ni guardar el proyecto compartido actual.

## Pendientes de modelo

El esquema encaja con buena parte del modelo del frontend, pero todavía no cubre todo. Faltan, como mínimo, una solución clara para `customFurniturePresets` y una estrategia real para documentos adjuntos.

Ahora los PDF pueden quedar dentro del JSON del proyecto con un límite de 2,5 MB por archivo. Eso vale para esta fase. Con base de datos, lo correcto será guardar metadatos en tabla y mover el archivo a un almacenamiento controlado.