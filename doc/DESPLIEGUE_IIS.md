# Despliegue en IIS

La forma recomendada de publicar Domus en una red local es usar el servidor ASP.NET Core incluido en `server/Domus.Server`. Así la web se sirve desde IIS y todos los equipos trabajan contra el mismo archivo `App_Data/domus-project.json`.

Publicar solo la parte estática funciona para ver la interfaz, pero cada navegador tendrá sus propios datos en `localStorage`.

## Requisitos

En el equipo donde publiques necesitas el SDK de .NET 8 para ejecutar `dotnet publish`.

En el servidor IIS necesitas el Hosting Bundle de ASP.NET Core compatible con `net8.0`. El App Pool debe estar configurado sin .NET CLR administrado, como corresponde a una app ASP.NET Core detrás del módulo de IIS.

## Publicar la carpeta correcta

Desde la raíz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Publish-DomusServer.ps1
```

El resultado queda en:

```text
publish\Domus.Server
```

Esa es la carpeta que debe apuntar IIS. No publiques la raíz del repositorio.

Dentro de `publish\Domus.Server` deben aparecer, entre otros:

```text
Domus.Server.dll
Domus.Server.exe
web.config
wwwroot\index.html
wwwroot\src\
wwwroot\styles\
App_Data\
```

No copies al servidor estas carpetas de desarrollo:

- `src\`
- `styles\`
- `doc\`
- `data\sql\`
- `scripts\`
- `server\`
- `node_modules\`
- `bin\`
- `obj\`
- `publish\` completo dentro de otra publicación

La publicación ya deja dentro su propio `wwwroot`. Copiar el proyecto completo solo añade archivos que IIS no necesita servir.

## Qué hace el servidor

`server/Domus.Server` sirve los estáticos de `wwwroot` y expone:

```text
GET /api/health
GET /api/project
PUT /api/project
```

El proyecto compartido se guarda en:

```text
publish\Domus.Server\App_Data\domus-project.json
```

El frontend intenta leer `api/project` al arrancar. Si responde, usa el proyecto del servidor. Si no responde, sigue con `localStorage`.

## Opción A: sitio propio

1. Publica con `scripts\Publish-DomusServer.ps1`.
2. En IIS, crea un sitio o aplicación apuntando a `publish\Domus.Server`.
3. Usa un App Pool sin .NET CLR administrado.
4. Da permiso de escritura al usuario del App Pool sobre `publish\Domus.Server\App_Data`.
5. Abre la app desde otro equipo, por ejemplo `http://SRVCORE/`.
6. Comprueba `http://SRVCORE/api/health`.

## Opción B: aplicación hija `/Domus`

Si Domus va debajo de Portal, créala como aplicación hija. No la copies como carpeta estática.

Configuración típica:

```text
Alias: Domus
Ruta física: publish\Domus.Server
App Pool: DomusPool
.NET CLR: No Managed Code
```

Pruebas:

```text
http://SRVCORE/Domus/
http://SRVCORE/Domus/api/health
```

También debería cargar sin barra final (`http://SRVCORE/Domus`), pero para accesos guardados es mejor usar la barra.

## Permisos de `App_Data`

El usuario del App Pool necesita escritura en:

```text
publish\Domus.Server\App_Data
```

Si `api/health` responde pero no se guarda el proyecto, revisa permisos ahí. El síntoma típico es que la app funciona en el navegador, pero otro equipo no ve los cambios porque el guardado se queda en `localStorage`.

No muevas `domus-project.json` a `wwwroot`, `src` ni `styles`. Es un archivo de datos del servidor, no un recurso público.

## Migrar datos desde desarrollo

Si ya tienes trabajo guardado en local:

1. Abre la versión local, por ejemplo `http://localhost:8080`.
2. Pulsa `Exportar`.
3. Guarda el JSON.
4. Abre la versión publicada, por ejemplo `http://SRVCORE/Domus/`.
5. Pulsa `Importar`.
6. Selecciona el JSON exportado.
7. Comprueba `http://SRVCORE/Domus/api/health`.

Después de importar, Domus guarda el proyecto en el navegador y también lo envía a `api/project`. Si `App_Data` tiene permisos correctos, se creará o actualizará `domus-project.json`.

## Publicación estática

La raíz mantiene un `web.config` para servir solo el frontend. Esa opción vale para una prueba rápida, pero no para trabajo compartido: cada navegador guarda en su propio `localStorage`.

Para una vivienda gestionada desde varios equipos, usa el servidor ASP.NET Core.

## Comprobaciones antes de publicar

Revisa sintaxis JavaScript:

```powershell
npm run check
```

Compila el servidor:

```powershell
dotnet build .\server\Domus.Server\Domus.Server.csproj
```

La compilación debe terminar sin errores.

## Límites actuales del despliegue

- No hay usuarios ni permisos por persona.
- No hay bloqueo de edición.
- Si dos equipos guardan a la vez, gana el último guardado.
- Los PDF siguen dentro del JSON y tienen límite de 2,5 MB por archivo.
- No hay base de datos conectada.

No expondría esta publicación a Internet sin login, HTTPS, copias de seguridad y una revisión de seguridad más seria. Para red local doméstica, el planteamiento actual es suficiente y fácil de mantener.