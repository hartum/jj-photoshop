# AGENTS.md - Proyecto JJ Photoshop

Este archivo contiene el contexto del proyecto, la arquitectura tecnológica, los requisitos funcionales y las directrices críticas de despliegue para asistentes de IA y desarrolladores.

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
* **Backend**: Node.js + TypeScript, Fastify, Prisma ORM, MariaDB (localhost:3306), Zod, dotenv.
* **Frontend**: Vue 3 (`<script setup lang="ts">`), Element Plus + PrimeVue, Pinia, Vue Router, Vite.
* **Estilo Arquitectónico**: Slices Verticales y Arquitectura Hexagonal.

---

## 📄 Requisitos Funcionales del Documento
- **Gestión de Agenda**: Registro de sesiones con límite configurable por hora/hotel y sincronización unidireccional a Google Calendar.
- **Ventas y Comisiones**: Registro de ventas asignando fotógrafo, supervisor y agendador, con cálculo automático de comisiones variables.
- **Metas y Objetivos**: Indicadores semafóricos (verde/rojo) del progreso de ventas vs metas mensuales por hotel y usuario.
- **Reporting y Auditoría**: Dashboards por rol y log de auditoría para cambios sensibles.

---

## ⚠️ Reglas Inviolables de Entornos y Despliegue (Local vs VPS Producción)

### 1. Gestión de `.env` (NUNCA SUBIR A GIT):
- Los archivos `.env` deben estar SIEMPRE en `.gitignore` tanto en `backend/` como en `frontend/`.
- **Local (Mac)**: `backend/.env` tiene `DATABASE_URL="mysql://root:@localhost:3306/jj_photoshop"`.
- **Producción (VPS)**: `backend/.env` tiene `DATABASE_URL="mysql://jjstudio_har:JJStudio2026Pass@127.0.0.1:3306/jjstudio_har"`.
- `backend/src/index.ts` y `backend/src/shared/db.ts` deben importar SIEMPRE `import 'dotenv/config'` como primera línea.

### 2. Configuración de Proxy Vite (Prevenir Error 502):
- En `frontend/vite.config.ts`, el target del proxy para `/api` debe ser SIEMPRE `http://127.0.0.1:3000` (IPv4 explícito) para evitar que macOS intente resolver por IPv6 `::1`.

### 3. Pipeline CI/CD GitHub Actions (`deploy.yml`):
- Debe incluir siempre `git config --global --add safe.directory $TARGET_DIR`.
- Debe ejecutar `npx prisma db push` en el backend para aplicar cambios de esquema a MariaDB automáticamente sin alterar datos existentes.

---

## 🛠️ Comandos Principales
```bash
# Servidor MariaDB en Mac (automático)
brew services start mariadb

# Backend (Fastify + Prisma)
cd backend && pnpm dev

# Frontend (Vue 3 + Vite)
cd frontend && pnpm dev
```
