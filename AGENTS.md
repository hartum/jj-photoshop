# AGENTS.md - Proyecto JJ Photoshop

Este archivo contiene el contexto del proyecto, la arquitectura tecnológica y los requisitos funcionales para asistentes de IA y desarrolladores.

## 📌 Resumen del Proyecto
**JJ Photoshop** es un sistema Web/SaaS de gestión operativa y comercial para una empresa de servicios de fotografía en cadenas hoteleras.

### Estructura Jerárquica:
`País` ➔ `Destino / Área` ➔ `Hotel`

---

## 👥 Roles y Niveles de Acceso
1. **Administrador (`ADMIN`)**: Acceso total global (países, destinos, hoteles, reportes, usuarios, comisiones, metas).
2. **Gerente de Área (`GERENTE`)**: Gestión y supervisión de su zona/país asignado.
3. **Supervisor de Hotel (`SUPERVISOR`)**: Agenda, fotógrafos, ventas y metas de su hotel.
4. **Fotógrafo (`FOTOGRAFO`)**: Acceso móvil/web a su agenda, ventas registradas y metas personales.
5. **Contable (`CONTABLE`)**: Consulta de ventas, comisiones y liquidación de pagos.

---

## 🚀 Stack Tecnológico
* **Backend**: Node.js + TypeScript, Fastify, Prisma ORM, MariaDB (localhost:3306), Zod.
* **Frontend**: Vue 3 (`<script setup lang="ts">`), PrimeVue v4 (Tema Aura), Pinia, Vue Router, Vite.
* **Estilo Arquitectónico**: Slices Verticales y Arquitectura Hexagonal.

---

## 📄 Requisitos Funcionales del Documento
- **Gestión de Agenda**: Registro de sesiones con límite configurable por hora/hotel y sincronización unidireccional a Google Calendar.
- **Ventas y Comisiones**: Registro de ventas asignando fotógrafo, supervisor y agendador, con cálculo automático de comisiones variables.
- **Metas y Objetivos**: Indicadores semafóricos (verde/rojo) del progreso de ventas vs metas mensuales por hotel y usuario.
- **Reporting y Auditoría**: Dashboards por rol y log de auditoría para cambios sensibles.

---

## 🛠️ Comandos Principales
```bash
# Servidor MariaDB en Mac (automático)
brew services start mariadb

# Backend (Fastify + Prisma)
cd backend && pnpm dev

# Frontend (Vue 3 + PrimeVue Aura)
cd frontend && pnpm dev
```
