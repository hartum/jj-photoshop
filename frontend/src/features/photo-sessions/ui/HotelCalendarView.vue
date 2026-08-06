<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { useSessionStore } from '../stores/session.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import type { SesionFotografica } from '../domain/session.model'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
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

// Filtered sessions for FullCalendar
const calendarEvents = computed(() => {
  let list = sessionStore.sessions

  if (selectedHotelId.value) {
    list = list.filter((s) => Number(s.hotelId) === Number(selectedHotelId.value))
  } else {
    // SECURITY FIX: When no specific hotel filter is selected ("Todos los Hoteles"),
    // restrict sessions strictly to the hotels accessible by the current user!
    const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))
    list = list.filter((s) => allowedHotelIds.has(Number(s.hotelId)))
  }

  return list.map((session) => {
    let color = '#9ca3af' // Gris si no hay fotógrafo asignado
    if (session.fotografoId) {
      const fotografo = userStore.users.find((u) => String(u.id) === String(session.fotografoId))
      if (fotografo && fotografo.color) {
        color = fotografo.color
      } else if (fotografo) {
        color = '#3b82f6' // Azul por defecto si tiene fotógrafo asignado pero sin color personalizado
      }
    }

    const paxStr = `${session.numAdultos ?? 1}.${session.numNinos ?? 0} PAX`
    const roomStr = session.numeroHabitacion ? ` (Hab ${session.numeroHabitacion})` : ''
    const conceptoStr = session.concepto ? ` - ${session.concepto}` : ''

    return {
      id: String(session.id),
      title: `${session.clienteNombre}${roomStr} [${paxStr}]${conceptoStr}`,
      start: session.fechaHoraInicio,
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        rawSession: session,
      },
    }
  })
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

onMounted(async () => {
  await Promise.all([
    hotelStore.fetchHotels(),
    userStore.fetchUsers(),
    sessionStore.fetchSessions(),
  ])
  initSelectedHotel()
})

function navigateToNewSessionForm(startIso?: string) {
  const query: Record<string, string> = {}
  if (selectedHotelId.value) query.hotelId = String(selectedHotelId.value)
  if (startIso) query.start = startIso

  router.push({ path: '/agenda/nueva', query })
}

const ALLOWED_PAST_EDIT_ROLES = ['SUPERUSUARIO', 'ADMIN', 'GERENTE', 'CONTABLE']

function canEditPastSession(session: SesionFotografica, userRoleCode?: string): boolean {
  const sessionDate = new Date(session.fechaHoraInicio)
  const isPast = sessionDate < new Date()
  if (!isPast) return true

  const role = userRoleCode?.toUpperCase() || ''
  return ALLOWED_PAST_EDIT_ROLES.includes(role)
}

function handleDateSelect(selectInfo: { startStr: string }) {
  const startIso = selectInfo.startStr.slice(0, 16)
  navigateToNewSessionForm(startIso)
}

function handleEventClick(clickInfo: {
  event: { extendedProps: { rawSession?: SesionFotografica } }
}) {
  const session = clickInfo.event.extendedProps.rawSession
  if (!session) return

  const roleCode = currentUser.value?.roleCode
  if (!canEditPastSession(session, roleCode)) {
    ElMessage.warning('No tienes permisos para editar sesiones cuya fecha ya ha pasado')
    return
  }

  router.push(`/agenda/${session.id}/editar`)
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
        <el-button type="primary" :icon="Plus" size="large" @click="navigateToNewSessionForm()">
          Agendar Sesión
        </el-button>
      </div>
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
