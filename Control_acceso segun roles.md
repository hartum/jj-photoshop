# Resumen de Implementación de Permisos y Matriz RBAC Multi-Tenant

Se ha diseñado e implementado con éxito el motor completo de permisos, autorización y visibilidad granular basado en la matriz de roles para la aplicación de gestión hotelera.

## Cambios Realizados

### 1. Módulo Core de Permisos y Auth Store
- **`frontend/src/shared/permissions.ts`**: Define la matriz central de roles (`SUPERUSUARIO`, `ADMIN`, `GERENTE`, `SUPERVISOR`, `FOTOGRAFO`, `CONTABLE`), sus rutas de navegación permitidas, la matriz de visibilidad de roles, los perfiles asignables en el desplegable y las funciones auxiliares de comprobación de permisos (`canAccessRoute`, `canEditUser`, `canDeleteUser`).
- **`frontend/src/features/auth/stores/auth.store.ts`**: Se han añadido las propiedades opcionales `areaIds?: number[]` y `hotelIds?: number[]` a la interfaz `AuthUser` para corregir los errores de compilación TypeScript al acceder al usuario en sesión.
- **`backend/src/shared/permissions.ts`**: Replicación exacta del módulo de permisos en el backend para la autorización en servidor.

### 2. Capa de Frontend
- **Barra de Navegación Lateral y Árbol (`App.vue`)**:
  - Los menús `/configuracion` y `/usuarios` se muestran o se ocultan dinámicamente según el rol.
  - El árbol de navegación (`País → Área → Hotel`) filtra los nodos según el ámbito del usuario autenticado:
    - **Gerente**: Solo visualiza las áreas que tiene asignadas y sus hoteles asociados.
    - **Supervisor / Fotógrafo**: Solo visualiza los hoteles que supervisa o tiene asignados.
- **Guardas de Navegación del Router (`router/index.ts`)**:
  - `router.beforeEach` comprueba los permisos de acceso a las rutas en tiempo real y redirige a `/inicio` a cualquier usuario sin autorización suficiente (ej. Fotógrafo intentando acceder a `/usuarios`).
- **Vista de Usuarios (`UsuariosView.vue`)**:
  - Mantiene el botón "Nuevo Usuario" accesible.
  - Filtra las filas de usuarios mostradas en la tabla combinando la matriz de roles visibles y la relación por áreas/hoteles asignados.
  - Muestra u oculta los botones de acción ("Editar" y "Eliminar") en cada fila de usuario según las reglas de permisos.
- **Formulario de Usuario (`UsuarioFormView.vue`)**:
  - Filtra dinámicamente el desplegable "Perfil / Rol" para mostrar únicamente las opciones autorizadas para el rol del usuario autenticado.
  - **Restricción granular en desplegables de asignación**:
    - **Gerente**: Al crear/editar un usuario, en el desplegable de áreas únicamente ve los países y áreas que él mismo tiene asignados.
    - **Supervisor**: Al crear/editar un usuario, en el desplegable de hoteles únicamente ve los países, áreas y hoteles que él mismo tiene asignados.
  - Se corrigió el tipado en las líneas 130, 156 y 169 al extender la interfaz `AuthUser`.

### 3. Capa de Backend
- **Rutas de Usuarios (`user.routes.ts`)**:
  - Extrae y valida las credenciales JWT del usuario ejecutor en los endpoints protegidos.
  - `GET /api/usuarios`: Aplica filtrado por matriz de permisos y ámbito geográfico/hotelero antes de responder.
  - `POST /api/usuarios`, `PUT /api/usuarios/:id`, `DELETE /api/usuarios/:id`: Verifican la autorización de la operación y el rol ejecutor mediante HTTP 403 en caso de violación de políticas.

---

## Verificación

- **Verificación Automática de Tipos**:
  - `backend`: `tsc --noEmit` completado con 0 errores.
  - `frontend`: `vue-tsc --noEmit` completado con 0 errores.
