---
description: Reglas y contexto de negocio del proyecto JJ Photoshop (Gestión de Fotografía en Hoteles)
globs: "**/*"
---

# Proyecto JJ Photoshop - Contexto de Negocio y Arquitectura

Este archivo define el contexto obligatorio, la estructura de negocio, los roles y las pautas de arquitectura para el proyecto **JJ Photoshop**.

## 1. Naturaleza del Negocio
**JJ Photoshop** NO es el software de edición de fotos de Adobe. Es una plataforma SaaS/Web de gestión operativa para una empresa de servicios de fotografía profesional que opera en cadenas de hoteles distribuidos geográficamente.

### Estructura Jerárquica:
`País` ➔ `Destino / Área` ➔ `Hotel`

- Un **País** contiene múltiples **Destinos** (ej. Cancún, Punta Cana, Tenerife).
- Un **Destino** contiene múltiples **Hoteles**.
- Los **Supervisores** y **Fotógrafos** se asignan a uno o varios hoteles (`usuario_hotel_acceso`).

---

## 2. Roles de Usuario y Permisos (RBAC & Multi-Tenant Lógico)

1. **Administrador General / Dueño (`ADMIN`)**:
   - Acceso global a todos los países, destinos, hoteles, reportes y métricas.
   - Gestión de usuarios, asignaciones, configuración de comisiones y metas globales.
2. **Gerente de Área (`GERENTE`)**:
   - Control total de la operación de su país/área asignada.
3. **Supervisor de Hotel (`SUPERVISOR`)**:
   - Gestión de agenda de sesiones y fotógrafos de sus hoteles asignados.
   - Registro y edición de ventas del hotel.
   - Visualización de metas y comisiones de su equipo.
4. **Fotógrafo (`FOTOGRAFO`)**:
   - Acceso desde móvil/web para agendar sesiones y registrar sus ventas asociadas.
   - Visualización de su propia agenda, metas personales y rendimiento. Sin acceso a información de otros hoteles.
5. **Contable (`CONTABLE`)**:
   - Acceso a datos financieros: ventas, comisiones calculadas, pagos y conciliaciones. Sin métricas operativas sensibles.

---

## 3. Módulos Funcionales Clave

1. **Gestión de Agenda & Sesiones Fotográficas**:
   - Registro de sesiones por hotel, fecha y franja horaria.
   - **Control de Capacidad**: Validación del número máximo configurable de sesiones por hora/hotel.
   - **Sincronización externa**: Integración unidireccional con Google Calendar.
2. **Control de Ventas & Cálculo de Comisiones**:
   - Registro de ventas asociadas a sesiones, asignando fotógrafo, supervisor y agendador/captador.
   - Cálculo automático de comisiones personalizables por rol/persona.
3. **Metas y Objetivos (KPIs)**:
   - Definición de metas mensuales por hotel y usuario.
   - Indicadores semafóricos (verde/rojo) de progreso monetario y porcentaje de cumplimiento.
4. **Dashboards & Reporting**:
   - Métricas de ventas totales, promedio por sesión, número de ventas y rendimiento por fotógrafo.
   - Vistas comparativas y reportes de cierre diario/mensual.
5. **Auditoría de Eventos**:
   - Registro de trazabilidad para cambios sensibles en ventas, sesiones y comisiones.

---

## 4. Stack Tecnológico Acordado

* **Backend**: Node.js + TypeScript, Fastify framework, Prisma ORM, MariaDB (puerto 3306), Zod para validaciones.
* **Frontend**: Vue 3 (Composition API `<script setup lang="ts">`), PrimeVue v4 (Tema Aura), Pinia para estado, Vue Router, Vite.
* **Arquitectura**: Arquitectura Hexagonal y Slices Verticales (`backend/src/features/` y `frontend/src/features/`).

---

## 5. Instrucciones para el Agente AI
- Siempre mantén la separación de responsabilidades y la restricción de visibilidad por rol y por hotel.
- No borres ni simplifiques la lógica de negocio descrita en este documento.
- Asegúrate de que las consultas y mutaciones respeten el tipado estricto de TypeScript sin usar `any`.
