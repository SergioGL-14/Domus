# Documentación de Domus

Esta carpeta recoge la documentación técnica mantenida a mano. La raíz del proyecto tiene la guía rápida; aquí queda el detalle necesario para revisar arquitectura, API, despliegue, base de datos y siguientes pasos.

## Lectura recomendada

Empieza por `../README.md` si solo quieres abrir la app, entender qué hace hoy y publicar una versión básica.

Después usa estos documentos según lo que necesites:

- `ARQUITECTURA.md`: cómo está montado el frontend, qué estado guarda y cómo se comportan `Inicio`, `Editor`, las referencias entre plantas y los paneles de apoyo.
- `DESPLIEGUE_IIS.md`: publicación recomendada en IIS con el servidor ASP.NET Core y datos compartidos en `App_Data`.
- `API.md`: endpoints reales del servidor actual y contrato razonable para una API por entidades.
- `BASE_DE_DATOS.md`: relación entre el modelo del frontend y el SQL de referencia.
- `ROADMAP.md`: orden de trabajo propuesto desde el estado actual del proyecto.

## Separación importante

Hay una API real en `server/Domus.Server`, pero es mínima: sirve la web y guarda un proyecto completo en un JSON. La API por entidades, los usuarios, los permisos y la base de datos siguen pendientes.

Si quieres comprobar algo que ya se puede probar hoy, usa `../README.md`, `ARQUITECTURA.md` y `DESPLIEGUE_IIS.md`. Si estás preparando la siguiente fase de persistencia, lee `API.md` y `BASE_DE_DATOS.md` sabiendo que todavía son guía de diseño, no código conectado.

## Ejecutar la app para revisar documentación

Desde la raíz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Start-DomusLocal.ps1
```

Luego abre:

```text
http://localhost:8080
```

Evita `file://`. Los módulos ES necesitan servidor local y los errores que aparecen al abrir el HTML directamente no sirven para diagnosticar la app.