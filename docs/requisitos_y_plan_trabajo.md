# Análisis de Requisitos y Plan de Trabajo - Proyecto JJ Studio

Documento de especificación funcional, arquitectura de base de datos, flujos de usuario y plan de trabajo por fases extraído de las reuniones de descubrimiento con el cliente.

---

## 1. Requisitos Funcionales

### A. Gestión de Estructura Organizativa
El sistema organiza la operación jerárquicamente:
`País` ➔ `Destino / Área` ➔ `Hotel`

#### Perfiles de Usuario:
1. **Administrador General / Dueño (`ADMIN`)**
2. **Gerente de Área (`GERENTE`)**
3. **Supervisor de Hotel (`SUPERVISOR`)**
4. **Fotógrafo (`FOTOGRAFO`)**
5. **Contable (`CONTABLE`)**

#### Funciones Clave:
* Crear y administrar países, destinos y hoteles.
* El Gerente ve toda la operación de su área asignada.
* El Supervisor ve únicamente sus hoteles asignados (puede supervisar más de un hotel).
* Un hotel puede tener uno o varios supervisores.
* El Fotógrafo sólo ve su trabajo, su rendimiento y el calendario de su hotel asignado.

### B. Gestión de Fotógrafos y Accesos
* Alta, baja y sustitución de fotógrafos sin depender del proveedor externo.
* Acceso independiente y credenciales para cada fotógrafo.
* El Administrador, Gerente y Supervisor pueden dar de alta fotógrafos.
* Un fotógrafo puede estar asignado a varios hoteles.

### C. Agenda de Sesiones Fotográficas
* Registrar sesiones de fotos por hotel, fecha y franja horaria.
* Visualizar agenda y calendario por hotel.
* Control de cupo/capacidad: Número máximo de sesiones agendables por hora y hotel (configurable).
* Sincronización automática unidireccional con **Google Calendar** (del sistema hacia los calendarios de Google).
* Acceso móvil y web para agendar sesiones.

### D. Control de Ventas
* Registrar ventas vinculadas a sesiones de fotos o eventos operativos.
* Asignación de fotógrafo, supervisor y agendador/captador a cada venta.
* Registro de importe total y moneda.
* Visualización de ventas en el calendario para coordinación.

### E. Cálculo de Comisiones
* Comisiones diferenciadas para:
  * Supervisor
  * Fotógrafo
  * Agendador / Vendedor / Captador
* Configuración de valores base y porcentajes por defecto en la sección de Ajustes (editable por Admin y Contable).
* El sistema calcula y muestra las comisiones automáticas acumuladas por venta y por mes.
* Módulo de revisión y liquidación por contabilidad.

### F. Metas y Objetivos
* Metas mensuales por hotel (definidas por Gerente/Admin).
* Metas personales para supervisor y fotógrafos.
* Barras de progreso semafóricas (Verde/Amarillo/Rojo) basadas en el ritmo diario (pacing).
* Cálculo del porcentaje de cumplimiento y desviación monetaria (+/- USD).

### G. Paneles de Control y Reporting
* **Panel de Dirección**: Vista global multi-hotel.
* **Panel de Supervisión**: Vista operativa del hotel.
* **Panel de Fotógrafo**: Calendario, metas e ingresos personales.
* **Panel de Contabilidad**: Consultas financieras, comisiones y cierres sin métricas operativas sensibles.
* Reportes de cierre diario y mensual (total vendido, promedio por sesión, número de sesiones, número de ventas, rendimiento por fotógrafo/supervisor).

### H. Restricciones de Visibilidad y Seguridad
* Separación estricta por hotel y por rol (Multi-tenant lógico).
* El supervisor no ve información de otros hoteles.
* El fotógrafo sólo ve su hotel asignado e información operativa básica.
* El contable ve datos monetarios y comisiones pero no datos operativos de competencia interna.

### I. Compatibilidad Móvil
* Diseño totalmente responsive optimizado para smartphones (iOS/Android).

---

## 2. Requisitos Técnicos y de Arquitectura

* **Tipo de App**: Aplicación web SPA con backend API REST/Fastify y paneles según rol.
* **Multi-tenancy**: Lógico por hotel o grupo de hoteles.
* **Integraciones**: Google Calendar (sincronización unidireccional desde la app), envío de emails.
* **Auditoría**: Log de auditoría de eventos para altas, bajas, modificaciones de sesiones, ventas y comisiones.

---

## 3. Diseño de Base de Datos (Propuesta de Entidades)

```sql
-- Estructura Geográfica y Organizativa
paises (id, nombre, codigo, activo, created_at, updated_at)
destinos (id, pais_id, nombre, activo, created_at, updated_at)
hoteles (id, destino_id, nombre, codigo, direccion, activo, meta_mensual_default, max_sesiones_hora_default, created_at, updated_at)

-- Usuarios y Accesos
usuarios (id, nombre, apellidos, email, telefono, password_hash, rol, activo, idioma, last_login_at, created_at, updated_at)
roles (id, codigo, nombre, descripcion) -- ADMIN, GERENTE, SUPERVISOR, FOTOGRAFO, CONTABLE
usuario_hotel_acceso (id, usuario_id, hotel_id, permiso_tipo, activo, created_at)

-- Operativa y Agenda
sesiones_fotograficas (id, hotel_id, fotografo_id, creador_id, cliente_nombre, cliente_email, cliente_telefono, fecha_hora_inicio, fecha_hora_fin, estado, origen, notas, google_calendar_event_id, created_at, updated_at)

-- Ventas y Comisiones
ventas (id, hotel_id, sesion_id, fotografo_id, supervisor_id, agendador_id, cliente_nombre, fecha_hora_venta, importe_total, moneda, estado, notas, created_at, updated_at)
comisiones (id, venta_id, usuario_id, tipo, porcentaje, importe_calculado, estado, created_at, updated_at)

-- Metas
metas (id, alcance_tipo, hotel_id, usuario_id, periodo, anio, mes, importe_objetivo, sesiones_objetivo, ventas_objetivo, activo, created_at, updated_at)

-- Integraciones y Auditoría
integraciones_google_calendar (id, usuario_id_o_hotel_id, access_token_encriptado, refresh_token_encriptado, calendar_id, token_expira_at, estado, created_at, updated_at)
auditoria_eventos (id, usuario_id, entidad_tipo, entidad_id, accion, payload_antes, payload_despues, created_at)
```

---

## 4. Flujos de Usuario Detallados

1. **Flujo 1: Alta de Hotel** (Admin crea País ➔ Destino ➔ Hotel ➔ Asigna Supervisor y reglas base).
2. **Flujo 2: Alta de Fotógrafo** (Supervisor o Admin crea Fotógrafo ➔ Asocia a hotel/es ➔ Genera credenciales).
3. **Flujo 3: Creación de Sesión** (Fotógrafo/Supervisor selecciona hotel, fecha, hora ➔ Valida cupo por hora ➔ Guarda sesión ➔ Sincroniza con Google Calendar).
4. **Flujo 4: Registro de Venta** (Registra venta vinculada a sesión o directa ➔ Asigna fotógrafo, supervisor, agendador ➔ Calcula comisiones automáticas).
5. **Flujo 5: Seguimiento de Metas** (Acumula ventas del período ➔ Compara con la meta mensual ➔ Muestra indicador verde/rojo según pacing diario).
6. **Flujo 6: Consulta de Reportes** (Dashboard filtrado por rol y hotel con métricas globales, promedio por sesión y rendimiento).
7. **Flujo 7: Sincronización con Google Calendar** (Creación de evento local ➔ Encola sync ➔ Envía a API de Google Calendar ➔ Registra `event_id`).

---

## 5. Plan de Trabajo por Fases

| Fase | Nombre | Descripción de Tareas Clave |
| :--- | :--- | :--- |
| **Fase 1** | **Descubrimiento y Definición** | Confirmar jerarquías, roles, reglas de tope por hora y modelo exacto de comisiones. |
| **Fase 2** | **Diseño Funcional y UX** | Diseñar navegación por jerarquía, agenda calendario, vista de ventas y layout móvil. |
| **Fase 3** | **Diseño de Base de Datos** | Modelar esquema en Prisma, restricciones únicas, tablas de auditoría y relaciones. |
| **Fase 4** | **Backend (API REST)** | Autenticación JWT, CRUDs de entidades, validaciones de agenda/solapamiento, cálculo de comisiones y sync de Google Calendar. |
| **Fase 5** | **Frontend (Vue 3)** | Login, vistas por rol, agenda interactiva responsive, barras semafóricas de metas y dashboards. |
| **Fase 6** | **Integraciones & Automatización**| Robustecer la sincronización con Google Calendar, reintentos y alertas. |
| **Fase 7** | **Pruebas Integrales** | Pruebas de permisos RBAC, pruebas de carga, seguridad cross-hotel y test móvil. |
| **Fase 8** | **Despliegue y Operación** | Configurar entorno dev/staging/prod en VPS, migraciones Prisma `db push`, PM2 y monitorización. |

---

## 6. Consideraciones Especiales de Negocio
* **Edición de Comisiones**: Las comisiones deben ser configurables mediante panel de administración sin modificar código.
* **Google Calendar**: La sincronización es **unidireccional** desde la aplicación hacia Google Calendar.
* **Prioridad**: La fase inicial de desarrollo se enfoca en el flujo operativo del fotógrafo y del supervisor.
