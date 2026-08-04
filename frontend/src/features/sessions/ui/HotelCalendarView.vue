<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { useSessionStore } from '../stores/session.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import type { CreateSesionPayload, SesionFotografica } from '../domain/session.model'
import { Plus, User, Message, Phone, Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
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
const sessionModalVisible = ref(false)
const isSaving = ref(false)

const formData = ref<CreateSesionPayload>({
  hotelId: 0,
  fotografoId: '',
  clienteNombre: '',
  clienteEmail: '',
  clienteTelefono: '',
  fechaHoraInicio: '',
  fechaHoraFin: '',
  notas: '',
})

// Current user context
const currentUser = computed(() => authStore.user)

// Hotels list accessible by current user
const userHotels = computed(() => {
  const user = currentUser.value
  if (!user) return hotelStore.hotels

  const roleCode = user.roleCode?.toUpperCase()
  if (roleCode === 'SUPERUSUARIO' || roleCode === 'ADMIN') {
    return hotelStore.hotels
  }

  const userHotelIds = new Set(user.hotelIds || [])
  return hotelStore.hotels.filter((h) => userHotelIds.has(h.id))
})

// Current active hotel name
const selectedHotelName = computed(() => {
  const target = hotelStore.hotels.find((h) => h.id === selectedHotelId.value)
  return target ? target.nombre : 'Todos los Hoteles'
})

// Photographers list for assignment
const photographers = computed(() => {
  return userStore.usersWithProfile.filter((u) => u.perfil?.code?.toUpperCase() === 'FOTOGRAFO')
})

// Filtered sessions for FullCalendar
const calendarEvents = computed(() => {
  let list = sessionStore.sessions

  if (selectedHotelId.value) {
    list = list.filter((s) => s.hotelId === selectedHotelId.value)
  }

  return list.map((session) => {
    const isCompleted = session.estado === 'COMPLETADA'
    const isCancelled = session.estado === 'CANCELADA'

    let color = '#3b82f6' // Programada (Azul)
    if (isCompleted) color = '#10b981' // Completada (Verde)
    if (isCancelled) color = '#ef4444' // Cancelada (Rojo)

    return {
      id: String(session.id),
      title: `${session.clienteNombre} (${session.estado})`,
      start: session.fechaHoraInicio,
      end: session.fechaHoraFin,
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        rawSession: session,
      },
    }
  })
})

// FullCalendar Configuration
const calendarOptions = ref({
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
})

onMounted(async () => {
  await Promise.all([
    hotelStore.fetchHotels(),
    userStore.fetchUsers(),
    sessionStore.fetchSessions(),
  ])

  // Initialize selected hotel from query param or user's first hotel
  const queryHotelId = route.query.hotelId ? Number(route.query.hotelId) : null
  if (queryHotelId && hotelStore.hotels.some((h) => h.id === queryHotelId)) {
    selectedHotelId.value = queryHotelId
  } else if (userHotels.value.length > 0) {
    selectedHotelId.value = userHotels.value[0]?.id ?? null
  }
})

function openNewSessionModal(defaultStartIso?: string, defaultEndIso?: string) {
  const defaultHotel = selectedHotelId.value || (userHotels.value[0]?.id ?? 0)
  const defaultPhotographer = currentUser.value?.id || (photographers.value[0]?.id ?? '')

  const now = new Date()
  const start = defaultStartIso || new Date(now.getTime() + 3600000).toISOString().slice(0, 16)
  const end = defaultEndIso || new Date(now.getTime() + 7200000).toISOString().slice(0, 16)

  formData.value = {
    hotelId: defaultHotel,
    fotografoId: defaultPhotographer,
    clienteNombre: '',
    clienteEmail: '',
    clienteTelefono: '',
    fechaHoraInicio: start,
    fechaHoraFin: end,
    notas: '',
  }

  sessionModalVisible.value = true
}

function handleDateSelect(selectInfo: { startStr: string; endStr: string }) {
  const startIso = new Date(selectInfo.startStr).toISOString().slice(0, 16)
  const endIso = new Date(selectInfo.endStr).toISOString().slice(0, 16)
  openNewSessionModal(startIso, endIso)
}

function handleEventClick(clickInfo: {
  event: { extendedProps: { rawSession?: SesionFotografica } }
}) {
  const session = clickInfo.event.extendedProps.rawSession
  if (session) {
    ElMessage.info(`Sesión de ${session.clienteNombre} - Estado: ${session.estado}`)
  }
}

async function handleSaveSession() {
  if (!formData.value.clienteNombre.trim()) {
    ElMessage.warning('El nombre del cliente es obligatorio')
    return
  }

  if (!formData.value.hotelId) {
    ElMessage.warning('Debes seleccionar un hotel')
    return
  }

  if (!formData.value.fechaHoraInicio || !formData.value.fechaHoraFin) {
    ElMessage.warning('Debes seleccionar las fechas de inicio y fin')
    return
  }

  isSaving.value = true
  try {
    await sessionStore.addSession(formData.value)
    ElMessage.success('Sesión fotográfica agendada correctamente')
    sessionModalVisible.value = false
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al guardar la sesión'
    ElMessage.error(msg)
  } finally {
    isSaving.value = false
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
          clearable
        >
          <el-option
            v-for="hotel in userHotels"
            :key="hotel.id"
            :label="hotel.nombre"
            :value="hotel.id"
          />
        </el-select>

        <!-- Botón Nueva Sesión -->
        <el-button type="primary" :icon="Plus" size="large" @click="openNewSessionModal()">
          Agendar Sesión
        </el-button>
      </div>
    </div>

    <!-- Calendario de FullCalendar -->
    <div class="calendar-card">
      <FullCalendar :options="{ ...calendarOptions, events: calendarEvents }" />
    </div>

    <!-- Botón Flotante para Móvil (+ Agendar) -->
    <el-button
      type="primary"
      circle
      size="large"
      class="fab-btn"
      :icon="Plus"
      @click="openNewSessionModal()"
      aria-label="Agendar nueva sesión"
    />

    <!-- Modal Formulario: Agendar Sesión Fotográfica -->
    <el-dialog
      v-model="sessionModalVisible"
      title="Agendar Nueva Sesión Fotográfica"
      width="560px"
      class="session-modal"
    >
      <el-form :model="formData" label-position="top" class="session-form">
        <el-form-item label="Hotel *" required>
          <el-select v-model="formData.hotelId" style="width: 100%">
            <el-option
              v-for="hotel in userHotels"
              :key="hotel.id"
              :label="hotel.nombre"
              :value="hotel.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Fotógrafo Asignado *" required>
          <el-select v-model="formData.fotografoId" style="width: 100%">
            <el-option
              v-for="photographer in photographers"
              :key="photographer.id"
              :label="`${photographer.nombre} ${photographer.apellidos}`"
              :value="photographer.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Nombre del Cliente *" required>
          <el-input
            v-model="formData.clienteNombre"
            placeholder="Ej. Familia López / Pareja Smith"
            :prefix-icon="User"
          />
        </el-form-item>

        <div class="form-row-2">
          <el-form-item label="Email del Cliente">
            <el-input
              v-model="formData.clienteEmail"
              placeholder="cliente@ejemplo.com"
              :prefix-icon="Message"
            />
          </el-form-item>

          <el-form-item label="Teléfono del Cliente">
            <el-input
              v-model="formData.clienteTelefono"
              placeholder="+34 600 000 000"
              :prefix-icon="Phone"
            />
          </el-form-item>
        </div>

        <div class="form-row-2">
          <el-form-item label="Fecha y Hora Inicio *" required>
            <el-input
              v-model="formData.fechaHoraInicio"
              type="datetime-local"
              class="datetime-input"
            />
          </el-form-item>

          <el-form-item label="Fecha y Hora Fin *" required>
            <el-input
              v-model="formData.fechaHoraFin"
              type="datetime-local"
              class="datetime-input"
            />
          </el-form-item>
        </div>

        <el-form-item label="Notas Adicionales">
          <el-input
            v-model="formData.notas"
            type="textarea"
            :rows="3"
            placeholder="Ej. Fotos en la playa al atardecer, vestidos de blanco."
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="sessionModalVisible = false">Cancelar</el-button>
          <el-button type="primary" :icon="Check" :loading="isSaving" @click="handleSaveSession">
            Agendar Sesión
          </el-button>
        </div>
      </template>
    </el-dialog>
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

/*--------------------------------_*/

/* Estilo base para todos los botones del grupo */
:deep(.fc-button-group .fc-button) {
  border-radius: 0 !important; /* Quita el redondeado por defecto */
}

/* Redondea solo el primer botón (Mes en tu imagen) */
:deep(.fc-button-group .fc-button:first-child) {
  border-top-left-radius: 4px !important;
  border-bottom-left-radius: 4px !important;
}

/* Redondea solo el último botón (Agenda en tu imagen) */
:deep(.fc-button-group .fc-button:last-child) {
  border-top-right-radius: 4px !important;
  border-bottom-right-radius: 4px !important;
}
/*--------------------------------_*/

:deep(.fc-button-group > .fc-button) {
  margin-right: 0;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
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

  .form-row-2 {
    grid-template-columns: 1fr;
    gap: 0;
  }

  :deep(.session-modal .el-dialog) {
    width: 92% !important;
  }
}
</style>
