<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { useSessionStore } from '../stores/session.store'
import { useSaleStore } from '@/features/sales/stores/sale.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import type { SesionFotografica } from '../domain/session.model'
import type { CitaVenta } from '@/features/sales/domain/sale.model'
import { Plus, Bell, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const saleStore = useSaleStore()
const hotelStore = useHotelStore()
const authStore = useAuthStore()
const userStore = useUserStore()

// Localización en Español para FullCalendar
const esLocale = {
  code: 'es',
  week: {
    dow: 1,
    doy: 4,
  },
  buttonText: {
    prev: 'Ant',
    next: 'Sig',
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
    list: 'Agenda',
  },
  weekText: 'Sm',
  allDayText: 'Todo el día',
  moreLinkText: 'más',
  noEventsText: 'No hay sesiones registradas',
}

// State
const selectedHotelId = ref<number | null>(null)
const activeAlertPanels = ref<string[]>([])

// Current user context
const currentUser = computed(() => authStore.user)

// Hotels list accessible by current user based on role matrix
const userHotels = computed(() => {
  const user = currentUser.value
  if (!user) return hotelStore.hotels

  const roleCode = user.roleCode?.toUpperCase()
  // SUPERUSUARIO, ADMIN, CONTABLE have global access to all hotels
  if (roleCode === 'SUPERUSUARIO' || roleCode === 'ADMIN' || roleCode === 'CONTABLE') {
    return hotelStore.hotels
  }

  // GERENTE has access to all hotels within their assigned area(s)
  if (roleCode === 'GERENTE') {
    const areaIds = new Set(user.areaIds || [])
    return hotelStore.hotels.filter((h) => areaIds.has(h.areaId))
  }

  // SUPERVISOR, FOTOGRAFO, AGENDADOR have access only to explicitly assigned hotels
  const userHotelIds = new Set(user.hotelIds || [])
  return hotelStore.hotels.filter((h) => userHotelIds.has(h.id))
})

// Current active hotel name
const selectedHotelName = computed(() => {
  const target = hotelStore.hotels.find((h) => h.id === selectedHotelId.value)
  return target ? target.nombre : 'Todos los Hoteles'
})

// --- COMPUTED ALERTS FOR PHOTOGRAPHER PANEL ---

const overdueSessions = computed(() => {
  const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
  const now = new Date()
  return sessionStore.sessions.filter((s) => {
    if (!allowedHotelIds.has(Number(s.hotelId))) return false
    if (selectedHotelId.value && Number(s.hotelId) !== Number(selectedHotelId.value)) return false
    return s.estado === 'PROGRAMADA' && new Date(s.fechaHoraInicio) < now
  })
})

const missingSaleSessions = computed(() => {
  const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
  return sessionStore.sessions.filter((s) => {
    if (!allowedHotelIds.has(Number(s.hotelId))) return false
    if (selectedHotelId.value && Number(s.hotelId) !== Number(selectedHotelId.value)) return false
    return s.estado === 'COMPLETADA' && !s.citaVenta
  })
})

const noShowSales = computed(() => {
  const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
  return sessionStore.sessions.filter((s) => {
    if (!allowedHotelIds.has(Number(s.hotelId))) return false
    if (selectedHotelId.value && Number(s.hotelId) !== Number(selectedHotelId.value)) return false
    return s.citaVenta?.estado === 'NO_SHOW'
  })
})

const totalAlertsCount = computed(() => {
  return overdueSessions.value.length + missingSaleSessions.value.length + noShowSales.value.length
})

// Filtered events for FullCalendar (Photo Sessions + Sales Appointments)
const calendarEvents = computed(() => {
  const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
  const now = new Date()

  // 1. Photo Session events
  const sessionList = sessionStore.sessions.filter((s) => {
    if (selectedHotelId.value) {
      return Number(s.hotelId) === Number(selectedHotelId.value)
    }
    return allowedHotelIds.has(Number(s.hotelId))
  })

  const sessionEvents = sessionList.map((session) => {
    let color = '#9ca3af' // Gris por defecto si no hay fotógrafo asignado
    if (session.fotografoId) {
      const fotografo = userStore.users.find((u) => String(u.id) === String(session.fotografoId))
      if (fotografo && fotografo.color) {
        color = fotografo.color
      } else if (fotografo) {
        color = '#3b82f6'
      }
    }

    // Prefix emoji for alert conditions
    let prefix = ''
    if (session.estado === 'PROGRAMADA' && new Date(session.fechaHoraInicio) < now) {
      prefix = '⏰ '
    } else if (session.estado === 'COMPLETADA' && !session.citaVenta) {
      prefix = '📸 '
    } else if (session.citaVenta?.estado === 'NO_SHOW') {
      prefix = '🚫 '
    }

    const paxStr = `${session.numAdultos ?? 1}.${session.numNinos ?? 0} PAX`
    const roomStr = session.numeroHabitacion ? ` (Hab ${session.numeroHabitacion})` : ''
    const conceptoStr = session.concepto ? ` - ${session.concepto}` : ''

    return {
      id: `session-${session.id}`,
      title: `${prefix}${session.clienteNombre}${roomStr} [${paxStr}]${conceptoStr}`,
      start: session.fechaHoraInicio,
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        rawSession: session,
        type: 'session',
      },
    }
  })

  // 2. Sales Appointment events (merged from saleStore and sessionStore)
  const salesMap = new Map<
    number,
    {
      id: number
      sesionId: number
      hotelId: number
      fotografoId?: string | null
      fechaHoraCita: string
      estado: string
      clienteNombre: string
      numeroHabitacion?: string
    }
  >()

  // Add from saleStore
  saleStore.citasVenta.forEach((c) => {
    salesMap.set(c.id, {
      id: c.id,
      sesionId: c.sesionId,
      hotelId: Number(c.hotelId),
      fotografoId: c.fotografoId || null,
      fechaHoraCita: c.fechaHoraCita,
      estado: c.estado,
      clienteNombre: c.clienteNombre || 'Cliente',
      numeroHabitacion: c.numeroHabitacion || undefined,
    })
  })

  // Add from embedded session citaVenta
  sessionStore.sessions.forEach((s) => {
    if (s.citaVenta && s.citaVenta.id) {
      if (!salesMap.has(s.citaVenta.id)) {
        salesMap.set(s.citaVenta.id, {
          id: s.citaVenta.id,
          sesionId: s.id,
          hotelId: Number(s.hotelId),
          fotografoId: s.fotografoId || null,
          fechaHoraCita: s.citaVenta.fechaHoraCita,
          estado: s.citaVenta.estado,
          clienteNombre: s.clienteNombre || 'Cliente',
          numeroHabitacion: s.numeroHabitacion || undefined,
        })
      }
    }
  })

  const salesList = Array.from(salesMap.values()).filter((c) => {
    if (selectedHotelId.value) {
      return Number(c.hotelId) === Number(selectedHotelId.value)
    }
    return allowedHotelIds.has(Number(c.hotelId))
  })

  const salesEvents = salesList.map((sale) => {
    let fotografoId: string | null = sale.fotografoId || null
    if (!fotografoId && sale.sesionId) {
      const parentSession = sessionStore.sessions.find((s) => s.id === sale.sesionId)
      if (parentSession) {
        fotografoId = parentSession.fotografoId || null
      }
    }

    let color = '#9ca3af' // Gris si no hay fotógrafo asignado
    if (fotografoId) {
      const fotografo = userStore.users.find((u) => String(u.id) === String(fotografoId))
      if (fotografo && fotografo.color) {
        color = fotografo.color
      } else if (fotografo) {
        color = '#3b82f6'
      }
    }

    const roomStr = sale.numeroHabitacion ? ` (Hab ${sale.numeroHabitacion})` : ''

    return {
      id: `sale-${sale.id}`,
      title: `💰 Cita Venta: ${sale.clienteNombre || 'Cliente'}${roomStr}`,
      start: sale.fechaHoraCita,
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        rawSale: sale,
        type: 'sale',
      },
    }
  })

  return [...sessionEvents, ...salesEvents]
})

// FullCalendar Configuration computed so reactivity works seamlessly
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
  initialView: window.innerWidth < 768 ? 'listWeek' : 'timeGridWeek',
  locale: esLocale,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
  },
  selectable: true,
  selectMirror: true,
  editable: false,
  dayMaxEvents: true,
  height: 'auto',
  select: handleDateSelect,
  eventClick: handleEventClick,
  events: calendarEvents.value,
}))

function initSelectedHotel() {
  const queryHotelId = route.query.hotelId ? Number(route.query.hotelId) : null
  if (queryHotelId && userHotels.value.some((h) => h.id === queryHotelId)) {
    selectedHotelId.value = queryHotelId
  } else if (selectedHotelId.value === null && userHotels.value.length > 0) {
    selectedHotelId.value = userHotels.value[0]?.id ?? null
  }
}

watch(
  () => route.query.hotelId,
  () => {
    initSelectedHotel()
  },
)

watch(
  () => selectedHotelId.value,
  (newHotelId) => {
    if (newHotelId) {
      saleStore.fetchCitasVenta(Number(newHotelId))
    } else {
      saleStore.fetchCitasVenta()
    }
  },
)

onMounted(async () => {
  await Promise.all([
    hotelStore.fetchHotels(),
    userStore.fetchUsers(),
    sessionStore.fetchSessions(),
    saleStore.fetchCitasVenta(),
  ])
  initSelectedHotel()
})

function navigateToNewSessionForm(startIso?: string) {
  const query: Record<string, string> = {}
  if (selectedHotelId.value) query.hotelId = String(selectedHotelId.value)
  if (startIso) query.start = startIso

  router.push({ path: '/agenda/nueva', query })
}

function handleDateSelect(selectInfo: { startStr: string }) {
  const startIso = selectInfo.startStr.slice(0, 16)
  navigateToNewSessionForm(startIso)
}

function handleEventClick(clickInfo: {
  event: { extendedProps: { rawSession?: SesionFotografica; rawSale?: CitaVenta; type?: string } }
}) {
  const { rawSession, rawSale, type } = clickInfo.event.extendedProps

  if (type === 'sale' && rawSale) {
    router.push(`/ventas/${rawSale.id}/editar`)
    return
  }

  if (rawSession) {
    router.push(`/agenda/${rawSession.id}/editar`)
  }
}
</script>

<template>
  <div class="calendar-container">
    <!-- Header principal -->
    <div class="calendar-header">
      <div class="header-info">
        <h1 class="page-title">Agenda de Sesiones Fotográficas</h1>
        <p class="page-subtitle">
          Hotel: <strong>{{ selectedHotelName }}</strong>
        </p>
      </div>

      <div class="header-actions">
        <!-- Selector de Hotel -->
        <el-select
          v-model="selectedHotelId"
          placeholder="Filtrar por Hotel"
          class="hotel-selector"
          filterable
          clearable
        >
          <el-option
            v-for="hotel in userHotels"
            :key="hotel.id"
            :label="hotel.nombre"
            :value="hotel.id"
          />
        </el-select>

        <!-- Botón Nueva Sesión (Navega a /agenda/nueva) -->
      </div>
    </div>

    <!-- Panel de Alertas Colapsable del Fotógrafo -->
    <div v-if="totalAlertsCount > 0" class="alerts-panel-wrapper">
      <el-collapse v-model="activeAlertPanels" class="alerts-collapse">
        <el-collapse-item name="alerts">
          <template #title>
            <div class="alerts-panel-header">
              <el-icon class="alerts-header-icon"><Bell /></el-icon>
              <span class="alerts-header-title">Panel de Alertas Pendientes</span>
              <el-tag type="danger" effect="dark" round size="small" class="alerts-count-badge">
                {{ totalAlertsCount }}
              </el-tag>
            </div>
          </template>

          <div class="alerts-sections-grid">
            <!-- 1. Sesiones Vencidas -->
            <div v-if="overdueSessions.length > 0" class="alert-section section-overdue">
              <h4 class="section-title">⏰ Sesiones Vencidas ({{ overdueSessions.length }})</h4>
              <div class="section-cards">
                <div v-for="s in overdueSessions" :key="s.id" class="alert-item-card">
                  <div class="item-details">
                    <span class="item-name">{{ s.clienteNombre }}</span>
                    <span class="item-sub"
                      >{{ s.fechaHoraInicio }} —
                      {{ s.numeroHabitacion ? `Hab ${s.numeroHabitacion}` : '' }}</span
                    >
                  </div>
                  <el-button
                    type="warning"
                    size="small"
                    @click="router.push(`/agenda/${s.id}/editar`)"
                  >
                    Cambiar Estado
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 2. Sesiones Sin Cita de Venta -->
            <div v-if="missingSaleSessions.length > 0" class="alert-section section-missing">
              <h4 class="section-title">📸 Sin Cita de Venta ({{ missingSaleSessions.length }})</h4>
              <div class="section-cards">
                <div v-for="s in missingSaleSessions" :key="s.id" class="alert-item-card">
                  <div class="item-details">
                    <span class="item-name">{{ s.clienteNombre }}</span>
                    <span class="item-sub">Completada el {{ s.fechaHoraInicio }}</span>
                  </div>
                  <el-button
                    type="primary"
                    size="small"
                    @click="router.push(`/ventas/nueva?sesionId=${s.id}`)"
                  >
                    Agendar Venta
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 3. No Show en Cita de Venta -->
            <div v-if="noShowSales.length > 0" class="alert-section section-noshow">
              <h4 class="section-title">🚫 No Show en Venta ({{ noShowSales.length }})</h4>
              <div class="section-cards">
                <div v-for="s in noShowSales" :key="s.id" class="alert-item-card">
                  <div class="item-details">
                    <span class="item-name">{{ s.clienteNombre }}</span>
                    <span class="item-sub">Cita: {{ s.citaVenta?.fechaHoraCita }}</span>
                  </div>
                  <el-button
                    type="danger"
                    size="small"
                    @click="router.push(`/ventas/${s.citaVenta?.id}/editar`)"
                  >
                    Reprogramar
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- Calendario de FullCalendar -->
    <div class="calendar-card">
      <FullCalendar :options="calendarOptions" :events="calendarEvents" />
    </div>

    <!-- Botón Flotante para Móvil (+ Agendar) -->
    <el-button
      type="primary"
      circle
      size="large"
      class="fab-btn"
      :icon="Plus"
      @click="navigateToNewSessionForm()"
      aria-label="Agendar nueva sesión"
    />
  </div>
</template>

<style scoped>
.calendar-container {
  padding: 1.5rem;
  max-width: 1300px;
  margin: 0 auto;
  position: relative;
}

/* Alerts Panel Styling */
.alerts-panel-wrapper {
  margin-bottom: 1.25rem;
}

.alerts-collapse {
  border: 1px solid var(--el-color-warning-light-5, #fde68a);
  border-radius: var(--el-card-border-radius, 8px);
  background-color: var(--el-color-warning-light-9, #fffbeb);
  overflow: hidden;
}

:deep(.alerts-collapse .el-collapse-item__header) {
  background-color: var(--el-color-warning-light-9, #fffbeb);
  border-bottom: none;
  padding: 0 1.25rem;
  height: 48px;
}

:deep(.alerts-collapse .el-collapse-item__wrap) {
  background-color: var(--el-color-warning-light-9, #fffbeb);
  border-bottom: none;
}

:deep(.alerts-collapse .el-collapse-item__content) {
  padding: 0 1.25rem 1.25rem 1.25rem;
}

.alerts-panel-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 600;
  color: var(--el-color-warning-dark-2, #b45309);
}

.alerts-header-icon {
  font-size: 1.1rem;
  color: var(--el-color-warning, #e6a23c);
}

.alerts-header-title {
  font-size: 0.95rem;
}

.alerts-sections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.alert-section {
  background-color: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 6px;
  padding: 1rem;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  color: var(--heading-color, #334155);
}

.section-cards {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.alert-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--el-fill-color-blank, #f8fafc);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 4px;
}

.item-details {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.item-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.item-sub {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0 0 0.25rem 0;
}

.page-subtitle {
  font-size: 0.9rem;
  color: var(--nav-link-color, #64748b);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.hotel-selector {
  width: 220px;
}

.calendar-card {
  background: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: var(--el-card-border-radius, 4px);
  padding: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

:deep(.fc) {
  font-family: inherit;
}

:deep(.fc-toolbar-title) {
  font-size: 1.15rem;
  font-weight: 500;
  text-transform: capitalize;
  color: var(--el-input-text-color, var(--el-text-color-regular));
}

:deep(.fc-col-header-cell),
:deep(.fc-col-header-cell-cushion) {
  font-weight: 400 !important;
  text-transform: capitalize;
  color: var(--el-input-text-color, var(--el-text-color-regular));
}

:deep(.fc-button-primary) {
  background-color: var(--el-color-primary, #409eff) !important;
  border-color: var(--el-color-primary, #409eff) !important;
  color: #ffffff !important;
  font-size: var(--el-font-size-base, 14px) !important;
  font-weight: 500 !important;
  border-radius: var(--el-border-radius-base, 4px) !important;
  padding: 19px 26px !important;
  height: 32px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: none !important;
  transition: all 0.2s ease-in-out !important;
}

:deep(.fc-button-primary:hover) {
  background-color: var(--el-color-primary-light-3, #66b1ff) !important;
  border-color: var(--el-color-primary-light-3, #66b1ff) !important;
  color: #ffffff !important;
}

:deep(.fc-button-primary:not(:disabled).fc-button-active),
:deep(.fc-button-primary:not(:disabled):active) {
  background-color: var(--el-color-primary-dark-2, #337ecc) !important;
  border-color: var(--el-color-primary-dark-2, #337ecc) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
}

:deep(.fc-button-primary:disabled) {
  background-color: var(--el-color-primary-light-5, #a0cfff) !important;
  border-color: var(--el-color-primary-light-5, #a0cfff) !important;
  opacity: 0.6;
}

:deep(.fc-button-group) {
  gap: 2px;
}

/* Estilo base para todos los botones del grupo */
:deep(.fc-button-group .fc-button) {
  border-radius: 0 !important;
}

/* Redondea solo el primer botón (Mes) */
:deep(.fc-button-group .fc-button:first-child) {
  border-top-left-radius: 4px !important;
  border-bottom-left-radius: 4px !important;
}

/* Redondea solo el último botón (Agenda) */
:deep(.fc-button-group .fc-button:last-child) {
  border-top-right-radius: 4px !important;
  border-bottom-right-radius: 4px !important;
}

:deep(.fc-button-group > .fc-button) {
  margin-right: 0;
}

.fab-btn {
  display: none;
  position: fixed;
  bottom: 2rem;
  right: 1.5rem;
  width: 56px;
  height: 56px;
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  z-index: 99;
}

@media (max-width: 768px) {
  .calendar-container {
    padding: 1rem;
  }

  .calendar-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .hotel-selector {
    width: 100%;
  }

  .fab-btn {
    display: inline-flex;
  }

  /* ── FullCalendar toolbar: stack sections vertically on mobile ── */
  :deep(.fc .fc-toolbar.fc-header-toolbar) {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }

  :deep(.fc-toolbar.fc-header-toolbar .fc-toolbar-chunk) {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
  }

  /* Compact buttons on narrow viewports so all 4 views fit cleanly */
  :deep(.fc-button-primary) {
    padding: 14px 18px !important;
    font-size: 0.75rem !important;
    height: 28px !important;
  }

  :deep(.fc-toolbar-title) {
    font-size: 1rem;
    text-align: center;
  }

  .calendar-card {
    padding: 0.75rem 0 0;
  }
}
</style>
