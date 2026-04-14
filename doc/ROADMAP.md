# Roadmap

Domus ya tiene una base útil: editor por plantas, parcela, muros, estancias, huecos, instalaciones, mobiliario, paneles de apoyo, guardado local y publicación en IIS con JSON compartido.

El riesgo ahora no es que falten ideas. El riesgo es seguir metiendo botones antes de cerrar bien lo que ya existe. El orden razonable es estabilizar editor, persistencia y datos antes de añadir funciones grandes.

## 1. Cerrar el editor

Prioridad alta:

- Prueba automática mínima que abra la app y valide acciones básicas.
- Edición de vértices en estancias.
- Ajuste fino de muros.
- Mejor `snap` a extremos, cruces y centros.
- Cotas y mediciones visibles.
- Estados de herramienta más claros durante dibujo, arrastre y borrado.

La selección sobre referencias entre plantas puede mejorar, pero no la pondría por delante de vértices, mediciones y pruebas básicas.

## 2. Completar paneles de apoyo

Trabajo pendiente:

- Edición completa de `Notas`.
- Edición completa de `Inventario`.
- Relación más clara entre notas, reformas, presupuestos y documentos.
- Inventario ligado a planta, estancia o entidad del plano.
- Filtros útiles por estado, prioridad, categoría y proveedor.

Estos paneles ya aportan valor. Falta que tengan el mismo nivel de edición y coherencia que `Reformas`, `Presupuestos` y `Documentos`.

## 3. Sacar documentos del JSON

Los PDF dentro del proyecto son una solución temporal. Antes de que haya muchos documentos, conviene moverlos a almacenamiento real.

Pasos recomendados:

- Guardar archivo fuera del JSON.
- Mantener en el proyecto solo metadatos.
- Añadir límite claro de tamaño por servidor.
- Preparar descarga segura desde la API.
- Definir copias de seguridad de documentos y JSON.

## 4. Consolidar persistencia

El `PUT /api/project` actual es simple y útil, pero guarda todo de golpe. La siguiente fase debería decidir si se mantiene como guardado por lote o si se separa por entidades.

Tareas concretas:

- Endurecer validación de entrada en servidor.
- Añadir copia de seguridad y restauración de `domus-project.json`.
- Definir ids internos y códigos de cliente.
- Preparar migración desde JSON actual.
- Decidir estrategia de conflictos antes de meter varios usuarios.

## 5. Base de datos

No conectaría una base de datos solo por tenerla. Tiene sentido cuando se quiera consultar por estancia, guardar historial, gestionar documentos de verdad o añadir permisos.

Antes de conectarla hay que cerrar:

- configuración de canvas
- presets personalizados de mobiliario
- relación entre entidades de backend e ids del frontend
- documentos fuera del JSON
- migración desde datos existentes

## 6. Uso compartido real

Cuando la persistencia esté ordenada, ya tendrá sentido añadir:

- usuarios
- permisos
- actividad reciente
- control de conflictos
- auditoría básica

El multiusuario en tiempo real no es urgente. Para este tipo de app, primero importa no perder datos y saber quién cambió qué.

## Lo que no metería ahora

- Dashboards pesados.
- Automatismos sin datos fiables detrás.
- Permisos complejos antes de tener usuarios básicos.
- Reescritura completa del editor.
- Colaboración en tiempo real antes de resolver conflictos simples.

El camino corto es mantener lo que ya funciona, cerrar huecos concretos y sacar la persistencia del navegador con calma.