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
import { useProfileStore } from '@/features/users/stores/profile.store'
import type { SesionFotografica } from '../domain/session.model'
import type { CitaVenta } from '@/features/sales/domain/sale.model'
import type { EventContentArg } from '@fullcalendar/core'
import { Plus, Bell, Warning } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const saleStore = useSaleStore()
const hotelStore = useHotelStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const profileStore = useProfileStore()

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
  const ESTADOS_NO_PERMITIDOS = ['CANCELADA', 'NO_SHOW']
  return sessionStore.sessions.filter((s) => {
    if (!allowedHotelIds.has(Number(s.hotelId))) return false
    if (selectedHotelId.value && Number(s.hotelId) !== Number(selectedHotelId.value)) return false
    return !ESTADOS_NO_PERMITIDOS.includes(s.estado) && !s.citaVenta
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

  // 1. Photo Session events
  const sessionList = sessionStore.sessions.filter((s) => {
    if (!allowedHotelIds.has(Number(s.hotelId))) return false
    if (selectedHotelId.value) {
      return Number(s.hotelId) === Number(selectedHotelId.value)
    }
    return true
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

    const paxStr = `${session.numAdultos ?? 1}.${session.numNinos ?? 0} PAX`
    const roomStr = session.numeroHabitacion ? ` (Hab ${session.numeroHabitacion})` : ''
    const conceptoStr = session.concepto ? ` - ${session.concepto}` : ''

    return {
      id: `session-${session.id}`,
      title: `${session.clienteNombre}${roomStr} [${paxStr}]${conceptoStr}`,
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
    const parentSession = sessionStore.sessions.find((s) => s.id === c.sesionId)
    const effectiveHotelId = parentSession ? Number(parentSession.hotelId) : Number(c.hotelId)

    salesMap.set(c.id, {
      id: c.id,
      sesionId: c.sesionId,
      hotelId: effectiveHotelId,
      fotografoId: c.fotografoId || parentSession?.fotografoId || null,
      fechaHoraCita: c.fechaHoraCita,
      estado: c.estado,
      clienteNombre: c.clienteNombre || parentSession?.clienteNombre || 'Cliente',
      numeroHabitacion: c.numeroHabitacion || parentSession?.numeroHabitacion || undefined,
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
    if (!allowedHotelIds.has(Number(c.hotelId))) return false
    if (selectedHotelId.value) {
      return Number(c.hotelId) === Number(selectedHotelId.value)
    }
    return true
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
      title: `Cita Venta: ${sale.clienteNombre || 'Cliente'}${roomStr}`,
      start: sale.fechaHoraCita,
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        rawSale: sale,
        type: 'sale',
        iconType: 'money',
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
  eventContent: renderEventContent,
  events: calendarEvents.value,
}))

// SVGs extraídos directamente del paquete @element-plus/icons-vue compilado
const ICON_SVG: Record<string, string> = {
  // Filled: dos tarjetas/billetes apilados con círculo (icono proporcionado por el usuario)
  money: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" style="flex-shrink:0;vertical-align:middle;"><path fill-rule="evenodd" clip-rule="evenodd" d="M22 12.9342C22 12.956 22 12.978 22 13L22 15C22 15.022 22 15.044 22 15.0658C22 15.9523 22.0001 16.7161 21.9179 17.3278C21.8297 17.9833 21.631 18.6117 21.1213 19.1213C20.6117 19.631 19.9833 19.8297 19.3278 19.9179C18.7161 20.0001 17.9523 20.0001 17.0658 20L10.9342 20C10.0477 20.0001 9.28386 20.0001 8.6722 19.9179C8.01669 19.8297 7.38834 19.631 6.87867 19.1213C6.36901 18.6117 6.17027 17.9833 6.08214 17.3278C5.9999 16.7161 5.99994 15.9523 5.99999 15.0658L5.99999 12.9342C5.99994 12.0477 5.9999 11.2839 6.08214 10.6722C6.17027 10.0167 6.36901 9.38835 6.87867 8.87868C7.38834 8.36902 8.01669 8.17028 8.6722 8.08214C9.28386 7.99991 10.0477 7.99995 10.9342 8L17 8C17.022 8 17.044 8 17.0658 8C17.9523 7.99995 18.7161 7.99991 19.3278 8.08215C19.9833 8.17028 20.6117 8.36902 21.1213 8.87868C21.631 9.38835 21.8297 10.0167 21.9179 10.6722C22.0001 11.2839 22 12.0477 22 12.9342ZM11 14C11 12.3431 12.3432 11 14 11C15.6569 11 17 12.3431 17 14C17 15.6569 15.6569 17 14 17C12.3432 17 11 15.6569 11 14Z"/><path d="M17.9965 7.00391C17.7103 6.99994 17.4161 6.99997 17.1189 7.00001L10.8813 7.00001C10.0376 6.99992 9.21767 6.99983 8.53906 7.09107C7.77331 7.19402 6.89841 7.44484 6.17167 8.17158C5.44493 8.89832 5.19411 9.77323 5.09116 10.539C4.99992 11.2176 5 12.0375 5.00009 12.8813V15.1187C5.00006 15.4118 5.00003 15.702 5.00383 15.9844C4.93907 15.9812 4.87645 15.9774 4.81603 15.9727C4.44281 15.9439 4.07084 15.8804 3.70949 15.7082C3.08831 15.4122 2.58777 14.9117 2.29177 14.2905C2.11957 13.9291 2.05608 13.5572 2.02728 13.184C1.99998 12.8301 1.99999 12.4011 2.00001 11.9039L2 8.93415C1.99995 8.04768 1.99991 7.28385 2.08215 6.67219C2.17028 6.01668 2.36902 5.38833 2.87869 4.87866C3.38835 4.369 4.0167 4.17026 4.67221 4.08213C5.28387 3.99989 6.04769 3.99993 6.93418 3.99998L14.539 3.99993C14.9608 3.99956 15.3242 3.99924 15.6475 4.07069C16.7872 4.32262 17.6774 5.21276 17.9293 6.35249C17.9736 6.55277 17.9903 6.76846 17.9965 7.00391Z"/></svg>`,
  // Filled: reloj sólido sin anillo outline
  clock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor" style="flex-shrink:0;vertical-align:middle;"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm176.5 585.7l-28.6 39a7.99 7.99 0 0 1-11.2 1.7L483.3 569.8a7.92 7.92 0 0 1-3.3-6.5V288c0-4.4 3.6-8 8-8h48.1c4.4 0 8 3.6 8 8v247.5l142.6 103.1c3.6 2.5 4.4 7.5 1.8 11.1z"/></svg>`,
  // Filled: cámara sólida (ya era filled, se mantiene igual)
  camera: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor" style="flex-shrink:0;vertical-align:middle;"><path d="M704 192h160a64 64 0 0 1 64 64v512a64 64 0 0 1-64 64H160a64 64 0 0 1-64-64V256a64 64 0 0 1 64-64h160l48-64h304l48 64zm-192 128a192 192 0 1 0 0 384 192 192 0 0 0 0-384zm0 80a112 112 0 1 1 0 224 112 112 0 0 1 0-224z"/></svg>`,
  // Filled: triángulo sólido con exclamación dentro
  warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor" style="flex-shrink:0;vertical-align:middle;"><path d="M955.7 856l-416-720c-12.2-21.2-45.2-21.2-57.4 0l-416 720c-12.2 21.1 3 47.5 28.7 47.5h832c25.7.1 40.9-26.3 28.7-47.5zM480 416c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v184c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8zm32 352a48.01 48.01 0 0 1 0-96 48.01 48.01 0 0 1 0 96z"/></svg>`,
}

function renderEventContent(arg: EventContentArg) {
  const type = arg.event.extendedProps.type
  const title: string = arg.event.title
  const timeText: string = arg.timeText ?? ''

  const iconSvg = type === 'sale' ? (ICON_SVG.money ?? '') : (ICON_SVG.camera ?? '')

  const container = document.createElement('div')
  container.style.display = 'flex'
  container.style.alignItems = 'center'
  container.style.gap = '4px'
  container.style.width = '100%'
  container.style.overflow = 'hidden'
  container.style.whiteSpace = 'nowrap'

  let html = ''

  if (iconSvg) {
    html += iconSvg
  }
  if (timeText) {
    html += `<span style="font-weight:bold;flex-shrink:0;">${timeText}</span>`
  }
  html += `<span style="overflow:hidden;text-overflow:ellipsis;">${title}</span>`

  container.innerHTML = html
  return { domNodes: [container] }
}

const STORAGE_KEY = 'jj_selected_hotel_id'

function initSelectedHotel() {
  // 1. Si existe parámetro hotelId en la URL y es válido para el usuario, tiene máxima prioridad
  const queryHotelId = route.query.hotelId ? Number(route.query.hotelId) : null
  if (queryHotelId && userHotels.value.some((h) => Number(h.id) === queryHotelId)) {
    selectedHotelId.value = queryHotelId
    localStorage.setItem(STORAGE_KEY, String(queryHotelId))
    return
  }

  // 2. Si no hay parámetro en la URL, se restaura desde localStorage si existe y es válido
  const savedHotelIdStr = localStorage.getItem(STORAGE_KEY)
  if (savedHotelIdStr) {
    const savedHotelId = Number(savedHotelIdStr)
    if (!isNaN(savedHotelId) && userHotels.value.some((h) => Number(h.id) === savedHotelId)) {
      selectedHotelId.value = savedHotelId
      return
    }
  }

  // 3. Por defecto permanece vacío (null)
  selectedHotelId.value = null
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
      localStorage.setItem(STORAGE_KEY, String(newHotelId))
      saleStore.fetchCitasVenta(Number(newHotelId))
    } else {
      localStorage.removeItem(STORAGE_KEY)
      saleStore.fetchCitasVenta()
    }
  },
)

onMounted(async () => {
  await Promise.all([
    hotelStore.fetchHotels(),
    userStore.fetchUsers(),
    profileStore.fetchProfiles(),
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

function navigateToNewSaleForm() {
  const query: Record<string, string> = {}
  if (selectedHotelId.value) query.hotelId = String(selectedHotelId.value)
  router.push({ path: '/ventas/nueva', query })
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

        <!-- Botón Nueva Sesión Fotográfica -->
        <el-button type="primary" :icon="Plus" @click="navigateToNewSessionForm()">
          Nueva Sesión
        </el-button>

        <!-- Botón Nueva Cita de Venta -->
        <el-button type="success" :icon="Plus" @click="navigateToNewSaleForm()">
          Nueva Cita de Venta
        </el-button>
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
              <h4 class="section-title">
                <el-icon style="vertical-align: middle; margin-right: 4px"><Clock /></el-icon>
                Sesiones Vencidas ({{ overdueSessions.length }})
              </h4>
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
              <h4 class="section-title">
                <el-icon style="vertical-align: middle; margin-right: 4px"><Camera /></el-icon>
                Sesiones Sin Cita de Venta ({{ missingSaleSessions.length }})
              </h4>
              <div class="section-cards">
                <div v-for="s in missingSaleSessions" :key="s.id" class="alert-item-card">
                  <div class="item-details">
                    <span class="item-name">{{ s.clienteNombre }}</span>
                    <span class="item-sub"
                      >{{ s.estado === 'COMPLETADA' ? 'Completada' : 'Programada' }} —
                      {{ s.fechaHoraInicio }}</span
                    >
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
              <h4 class="section-title">
                <el-icon style="vertical-align: middle; margin-right: 4px"><Warning /></el-icon>
                No Show en Venta ({{ noShowSales.length }})
              </h4>
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
