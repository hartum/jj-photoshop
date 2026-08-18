<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session.store'
import { useSaleStore } from '@/features/sales/stores/sale.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import { useCalendarioLaboralStore } from '@/features/users/stores/calendario-laboral.store'
import type { CreateSesionPayload, EstadoSesion, SesionFotografica } from '../domain/session.model'
import type { ConflictoCitaVenta } from '@/features/sales/domain/sale.model'
import type { CalendarioLaboralFotografo } from '@/features/users/domain/calendario-laboral.model'
import {
  User,
  Message,
  Phone,
  Check,
  ArrowLeft,
  Close,
  WarnTriangleFilled,
  Camera,
  Money,
  Calendar,
  Edit,
} from '@element-plus/icons-vue'
import { Building2, PlaneTakeoff, CircleUserRound, Baby, UserX } from '@lucide/vue'
import { ElMessage } from 'element-plus'
import { IosDatepicker } from 'vue-ios-style-datepicker'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const saleStore = useSaleStore()
const hotelStore = useHotelStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const profileStore = useProfileStore()
const calendarioLaboralStore = useCalendarioLaboralStore()

const sessionId = computed(() => route.params.id as string | undefined)
const isEditing = computed(() => !!sessionId.value)
const loadedSession = ref<SesionFotografica | null>(null)

const fechaHoraCitaVenta = ref('')
const conflictsCitaVenta = ref<ConflictoCitaVenta[]>([])

const estadoSesionOptions: {
  value: EstadoSesion
  label: string
  color: string
  icon: Component
}[] = [
  { value: 'PROGRAMADA', label: 'Programada', color: '#409eff', icon: Calendar },
  { value: 'NO_SHOW', label: 'No se presentó', color: '#e6a23c', icon: UserX },
  { value: 'CANCELADA', label: 'Cancelada', color: '#f56c6c', icon: Close },
  { value: 'COMPLETADA', label: 'Completada', color: '#67c23a', icon: Check },
]

const alertOverdue = computed(() => {
  if (!isEditing.value || !loadedSession.value) return false
  const s = loadedSession.value
  return s.estado === 'PROGRAMADA' && new Date(s.fechaHoraInicio) < new Date()
})

// Role-based edit lock (only locks if session was already saved in DB with status other than PROGRAMADA)
const isReadOnly = computed(() => {
  if (!isEditing.value || !loadedSession.value) return false
  if (loadedSession.value.estado === 'PROGRAMADA') return false
  const role = currentUser.value?.roleCode?.toUpperCase() || ''
  return !['SUPERVISOR', 'GERENTE', 'ADMIN', 'SUPERUSUARIO'].includes(role)
})

const alertNoSaleAppointment = computed(() => {
  if (!isEditing.value || !loadedSession.value) return false
  const s = loadedSession.value
  return s.estado === 'COMPLETADA' && !s.citaVenta
})

const alertSaleNoShow = computed(() => {
  if (!isEditing.value || !loadedSession.value) return false
  const s = loadedSession.value
  return s.citaVenta?.estado === 'NO_SHOW'
})

const isSaving = ref(false)

const defaultConceptos = [
  'Cumpleaños',
  'Foto familiar',
  'Pedida de matrimonio',
  'Revelación de género',
]

const formData = ref<CreateSesionPayload>({
  hotelId: 0,
  fotografoId: '',
  clienteNombre: '',
  numeroHabitacion: '',
  clienteEmail: '',
  clienteTelefono: '',
  numAdultos: 2,
  numNinos: 0,
  fechaHoraInicio: '',
  fechaSalida: '',
  concepto: '',
  estado: 'PROGRAMADA',
  notas: '',
})

// Watch sales appointment date for conflict check
watch(
  () => fechaHoraCitaVenta.value,
  async (newVal) => {
    if (!newVal || !formData.value.hotelId) {
      conflictsCitaVenta.value = []
      return
    }
    const existingCitaId = loadedSession.value?.citaVenta?.id
    conflictsCitaVenta.value = await saleStore.checkConflictos(
      formData.value.hotelId,
      newVal,
      existingCitaId,
    )
  },
)

interface HotelDisponibilidad {
  hotelId: number
  fechaHora: string
  totalFotografos: number
  ausentes: number
  disponibles: number
  sesionesSimultaneas: number
  cupoLibre: number
  topeAlcanzado: boolean
  fotografos: {
    id: string
    nombre: string
    disponible: boolean
    motivoAusencia: string | null
  }[]
}

const disponibilidadHotel = ref<HotelDisponibilidad | null>(null)
const isCheckingDisponibilidad = ref(false)

async function checkDisponibilidad() {
  const hotelId = Number(formData.value.hotelId)
  const fecha = formData.value.fechaHoraInicio?.trim()
  if (!hotelId || !fecha || fecha.length < 10) {
    disponibilidadHotel.value = null
    return
  }

  isCheckingDisponibilidad.value = true
  try {
    const excludeId = isEditing.value && sessionId.value ? sessionId.value : ''
    const url = `/api/hoteles/${hotelId}/disponibilidad?fecha=${encodeURIComponent(fecha)}${excludeId ? `&excludeSessionId=${excludeId}` : ''}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    })
    if (res.ok) {
      disponibilidadHotel.value = await res.json()
    } else {
      disponibilidadHotel.value = null
    }
  } catch (err) {
    console.warn('Error al verificar disponibilidad:', err)
    disponibilidadHotel.value = null
  } finally {
    isCheckingDisponibilidad.value = false
  }
}

watch(
  [() => formData.value.hotelId, () => formData.value.fechaHoraInicio],
  () => {
    checkDisponibilidad()
  },
  { immediate: true },
)

const isTopeAlcanzado = computed(() => {
  if (formData.value.estado !== 'PROGRAMADA') return false
  if (!formData.value.fechaHoraInicio?.trim()) return false
  if (!disponibilidadHotel.value) return false
  return disponibilidadHotel.value.topeAlcanzado || disponibilidadHotel.value.disponibles === 0
})

// Current user context
const currentUser = computed(() => authStore.user)

// Hotels list accessible by current user based on role matrix
const userHotels = computed(() => {
  const user = currentUser.value
  if (!user) return hotelStore.hotels

  const roleCode = user.roleCode?.toUpperCase()
  if (roleCode === 'SUPERUSUARIO' || roleCode === 'ADMIN' || roleCode === 'CONTABLE') {
    return hotelStore.hotels
  }

  if (roleCode === 'GERENTE') {
    const areaIds = new Set(user.areaIds || [])
    return hotelStore.hotels.filter((h) => areaIds.has(h.areaId))
  }

  const userHotelIds = new Set(user.hotelIds || [])
  return hotelStore.hotels.filter((h) => userHotelIds.has(h.id))
})

// Photographers list for assignment (filtered by selected hotel)
const photographers = computed(() => {
  const selectedHotelId = Number(formData.value.hotelId)
  if (!selectedHotelId) return []

  return userStore.usersWithProfile.filter((u) => {
    const perfilCode =
      u.perfil?.code?.toUpperCase() || profileStore.getProfileById(u.profileId)?.code?.toUpperCase()
    const isFotografo = perfilCode === 'FOTOGRAFO'
    if (!isFotografo) return false
    const assignedHotelIds = u.hotelIds || []
    return assignedHotelIds.some((hId) => Number(hId) === selectedHotelId)
  })
})

// Reset photographer selection when hotel changes if selected photographer is not in the new hotel
watch(
  () => formData.value.hotelId,
  () => {
    if (!formData.value.fotografoId) return
    const isAvailable = photographers.value.some(
      (p) => String(p.id) === String(formData.value.fotografoId),
    )
    if (!isAvailable) {
      formData.value.fotografoId = ''
    }
  },
)

// Ausencias laborales del fotógrafo seleccionado
const fotografoAusencias = ref<CalendarioLaboralFotografo[]>([])

watch(
  () => formData.value.fotografoId,
  async (newFotografoId) => {
    if (!newFotografoId) {
      fotografoAusencias.value = []
      return
    }
    try {
      await calendarioLaboralStore.fetchRegistros(newFotografoId)
      fotografoAusencias.value = [...calendarioLaboralStore.registros]
    } catch (err) {
      console.warn('Error al obtener ausencias del fotógrafo:', err)
      fotografoAusencias.value = []
    }
  },
  { immediate: true },
)

const selectedPhotographerName = computed(() => {
  if (!formData.value.fotografoId) return ''
  const p = photographers.value.find((x) => String(x.id) === String(formData.value.fotografoId))
  return p ? `${p.nombre} ${p.apellidos}`.trim() : 'El fotógrafo'
})

const ausenciaFotografoActual = computed<CalendarioLaboralFotografo | null>(() => {
  const fotografoId = formData.value.fotografoId
  const fecha = formData.value.fechaHoraInicio?.trim()
  if (!fotografoId || !fecha || fecha.length < 10) return null
  const dateStr = fecha.slice(0, 10)

  const match = fotografoAusencias.value.find(
    (a) => dateStr >= a.fechaInicio && dateStr <= a.fechaFin,
  )
  return match || null
})

const isFotografoAusente = computed(() => {
  if (formData.value.estado !== 'PROGRAMADA') return false
  if (!formData.value.fechaHoraInicio?.trim()) return false
  return !!ausenciaFotografoActual.value
})

// Mes visible actualmente en el panel del calendario
const currentVisibleMonth = ref<Date>(new Date())

function handlePanelChange(date: Date) {
  if (date && date instanceof Date && !isNaN(date.getTime())) {
    currentVisibleMonth.value = date
  }
}

watch(
  () => formData.value.fechaHoraInicio,
  (newVal) => {
    if (newVal && newVal.length >= 10) {
      const d = new Date(newVal)
      if (!isNaN(d.getTime())) {
        currentVisibleMonth.value = d
      }
    }
  },
)

const hasAusenciasInVisibleMonth = computed(() => {
  if (!formData.value.fotografoId || !fotografoAusencias.value.length) return false
  const d = currentVisibleMonth.value || new Date()
  const year = d.getFullYear()
  const month = d.getMonth() // 0-indexed
  const lastDay = new Date(year, month + 1, 0).getDate()

  const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return fotografoAusencias.value.some((reg) => {
    return reg.fechaInicio <= endOfMonth && reg.fechaFin >= startOfMonth
  })
})

function formatDateIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getFotografoCellClassName(cellDate: Date): string {
  if (!formData.value.fotografoId || !fotografoAusencias.value.length) return ''
  const cellIso = formatDateIso(cellDate)

  for (const reg of fotografoAusencias.value) {
    if (cellIso >= reg.fechaInicio && cellIso <= reg.fechaFin) {
      if (reg.motivo === 'BAJA') return 'cell-highlight-baja'
      if (reg.motivo === 'VACACIONES') return 'cell-highlight-vacaciones'
      if (reg.motivo === 'PERMISO') return 'cell-highlight-permiso'
      return 'cell-highlight-otro'
    }
  }
  return ''
}

// Mobile detection state
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

// Computed Date object adapter for IosDatepicker (for mobile)
const mobileDateValue = computed<Date>({
  get() {
    if (!formData.value.fechaHoraInicio) return new Date()
    const d = new Date(formData.value.fechaHoraInicio)
    return isNaN(d.getTime()) ? new Date() : d
  },
  set(val: Date | null | undefined) {
    if (val && val instanceof Date && !isNaN(val.getTime())) {
      const year = val.getFullYear()
      const month = String(val.getMonth() + 1).padStart(2, '0')
      const day = String(val.getDate()).padStart(2, '0')
      const hours = String(val.getHours()).padStart(2, '0')
      const minutes = String(val.getMinutes()).padStart(2, '0')
      formData.value.fechaHoraInicio = `${year}-${month}-${day}T${hours}:${minutes}`
    }
  },
})

// Computed Date object adapter for IosDatepicker (fechaSalida for mobile)
const mobileFechaSalidaValue = computed<Date>({
  get() {
    if (!formData.value.fechaSalida) return new Date()
    const d = new Date(formData.value.fechaSalida)
    return isNaN(d.getTime()) ? new Date() : d
  },
  set(val: Date | null | undefined) {
    if (val && val instanceof Date && !isNaN(val.getTime())) {
      const year = val.getFullYear()
      const month = String(val.getMonth() + 1).padStart(2, '0')
      const day = String(val.getDate()).padStart(2, '0')
      formData.value.fechaSalida = `${year}-${month}-${day}`
    }
  },
})

// Computed Date object adapter for IosDatepicker (fechaHoraCitaVenta for mobile)
const mobileCitaVentaValue = computed<Date>({
  get() {
    if (!fechaHoraCitaVenta.value) return new Date()
    const d = new Date(fechaHoraCitaVenta.value)
    return isNaN(d.getTime()) ? new Date() : d
  },
  set(val: Date | null | undefined) {
    if (val && val instanceof Date && !isNaN(val.getTime())) {
      const year = val.getFullYear()
      const month = String(val.getMonth() + 1).padStart(2, '0')
      const day = String(val.getDate()).padStart(2, '0')
      const hours = String(val.getHours()).padStart(2, '0')
      const minutes = String(val.getMinutes()).padStart(2, '0')
      fechaHoraCitaVenta.value = `${year}-${month}-${day}T${hours}:${minutes}`
    }
  },
})

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  await Promise.all([
    hotelStore.fetchHotels(),
    userStore.fetchUsers(),
    profileStore.fetchProfiles(),
    sessionStore.fetchSessions(),
    saleStore.fetchCitasVenta(),
  ])

  if (isEditing.value && sessionId.value) {
    const existing = await sessionStore.fetchSession(Number(sessionId.value))
    if (existing) {
      const roleCode = currentUser.value?.roleCode?.toUpperCase()
      const isGlobalAccess =
        roleCode === 'SUPERUSUARIO' || roleCode === 'ADMIN' || roleCode === 'CONTABLE'
      const allowedHotelIds = new Set(userHotels.value.map((h) => Number(h.id)))

      if (
        !isGlobalAccess &&
        userHotels.value.length > 0 &&
        !allowedHotelIds.has(Number(existing.hotelId))
      ) {
        ElMessage.error('No tienes acceso a las sesiones fotográficas de este hotel')
        handleGoBack()
        return
      }

      loadedSession.value = existing

      formData.value = {
        hotelId: existing.hotelId,
        fotografoId: existing.fotografoId || '',
        clienteNombre: existing.clienteNombre,
        numeroHabitacion: existing.numeroHabitacion || '',
        clienteEmail: existing.clienteEmail || '',
        clienteTelefono: existing.clienteTelefono || '',
        numAdultos: existing.numAdultos ?? 1,
        numNinos: existing.numNinos ?? 0,
        fechaHoraInicio: existing.fechaHoraInicio,
        fechaSalida: existing.fechaSalida || '',
        concepto: existing.concepto || '',
        estado: (existing.estado as EstadoSesion) || 'PROGRAMADA',
        notas: existing.notas || '',
      }

      if (existing.citaVenta) {
        fechaHoraCitaVenta.value = existing.citaVenta.fechaHoraCita || ''
      }
    } else {
      ElMessage.error('Sesión fotográfica no encontrada')
      handleGoBack()
    }
  } else {
    // Prefill hotelId from route query or default to user's first hotel
    const queryHotelId = route.query.hotelId ? Number(route.query.hotelId) : 0
    if (queryHotelId && userHotels.value.some((h) => h.id === queryHotelId)) {
      formData.value.hotelId = queryHotelId
    } else if (userHotels.value.length > 0) {
      formData.value.hotelId = userHotels.value[0]?.id ?? 0
    }

    // Prefill photographer (current user if photographer and assigned to selected hotel)
    const isPhotographer = currentUser.value?.roleCode?.toUpperCase() === 'FOTOGRAFO'
    if (isPhotographer && currentUser.value) {
      const isAssigned = currentUser.value.hotelIds?.some(
        (hId) => Number(hId) === Number(formData.value.hotelId),
      )
      if (isAssigned) {
        formData.value.fotografoId = currentUser.value.id
      }
    }

    // Prefill start date/time only if explicitly provided with time in route query (e.g. from calendar slot click)
    const queryStart = route.query.start ? String(route.query.start) : ''
    if (queryStart && queryStart.includes('T') && queryStart.length >= 16) {
      formData.value.fechaHoraInicio = queryStart.slice(0, 16)
    } else {
      formData.value.fechaHoraInicio = ''
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function handleGoBack() {
  router.push('/agenda')
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

  if (!formData.value.fechaHoraInicio) {
    ElMessage.warning('Debes seleccionar la fecha y hora de inicio')
    return
  }

  if (conflictsCitaVenta.value.length > 0) {
    ElMessage.warning('Atención: Hay conflictos de horario con otras citas de venta')
  }

  if (formData.value.estado === 'PROGRAMADA' && isTopeAlcanzado.value) {
    ElMessage.error(
      'Tope alcanzado: no se pueden agendar más sesiones a esta misma hora en este hotel.',
    )
    return
  }

  if (
    formData.value.estado === 'PROGRAMADA' &&
    isFotografoAusente.value &&
    ausenciaFotografoActual.value
  ) {
    ElMessage.error(
      `${selectedPhotographerName.value} no está disponible en la fecha seleccionada (${ausenciaFotografoActual.value.motivo}).`,
    )
    return
  }

  isSaving.value = true
  try {
    let savedSessionId: number

    if (isEditing.value && sessionId.value) {
      savedSessionId = Number(sessionId.value)
      await sessionStore.updateSession(savedSessionId, {
        hotelId: formData.value.hotelId,
        fotografoId: formData.value.fotografoId || null,
        clienteNombre: formData.value.clienteNombre.trim(),
        clienteEmail: formData.value.clienteEmail ? formData.value.clienteEmail.trim() : null,
        clienteTelefono: formData.value.clienteTelefono
          ? formData.value.clienteTelefono.trim()
          : null,
        numeroHabitacion: formData.value.numeroHabitacion
          ? formData.value.numeroHabitacion.trim()
          : null,
        numAdultos: formData.value.numAdultos,
        numNinos: formData.value.numNinos,
        fechaSalida: formData.value.fechaSalida ? formData.value.fechaSalida : null,
        concepto: formData.value.concepto ? formData.value.concepto.trim() : null,
        fechaHoraInicio: formData.value.fechaHoraInicio,
        estado: formData.value.estado,
        notas: formData.value.notas ? formData.value.notas.trim() : null,
      })
      ElMessage.success('Sesión fotográfica actualizada correctamente')
    } else {
      const created = await sessionStore.addSession({
        ...formData.value,
        creadorId: currentUser.value?.id,
      })
      savedSessionId = created.id
      ElMessage.success('Sesión fotográfica agendada correctamente')
    }

    // Process Cita de Venta if fechaHoraCitaVenta is provided AND changed
    if (fechaHoraCitaVenta.value) {
      const existingCita = loadedSession.value?.citaVenta
      if (existingCita) {
        if (fechaHoraCitaVenta.value !== (existingCita.fechaHoraCita || '')) {
          await saleStore.updateCitaVenta(existingCita.id, {
            fechaHoraCita: fechaHoraCitaVenta.value,
          })
        }
      } else {
        await saleStore.addCitaVenta({
          sesionId: savedSessionId,
          hotelId: formData.value.hotelId,
          fechaHoraCita: fechaHoraCitaVenta.value,
        })
      }
    }

    await Promise.all([sessionStore.fetchSessions(), saleStore.fetchCitasVenta()])
    handleGoBack()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al guardar la sesión'
    ElMessage.error(msg)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="session-form-container">
    <!-- Header con botón Volver y Título -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" circle class="back-btn" @click="handleGoBack" />
        <div>
          <h1 class="page-title">
            {{ isEditing ? 'Editar Sesión Fotográfica' : 'Agendar Nueva Sesión Fotográfica' }}
          </h1>
        </div>
      </div>
    </div>

    <!-- Banner de Alertas -->
    <div v-if="alertOverdue || alertNoSaleAppointment || alertSaleNoShow" class="alerts-container">
      <el-alert
        v-if="alertOverdue"
        type="warning"
        show-icon
        :closable="false"
        class="form-alert-banner"
      >
        <template #title>
          Sesión Vencida — Esta sesión estaba programada para la fecha elegida y ya ha pasado. Por
          favor actualiza su estado.
        </template>
      </el-alert>

      <el-alert
        v-if="alertNoSaleAppointment"
        type="info"
        show-icon
        :closable="false"
        class="form-alert-banner"
      >
        <template #title>
          Sin Cita de Venta — Esta sesión está completada pero aún no tiene una cita de venta
          programada.
        </template>
        <template #default>
          <div style="margin-top: 0.5rem">
            <el-button
              type="primary"
              size="small"
              @click="router.push(`/ventas/nueva?sesionId=${loadedSession?.id}`)"
            >
              Agendar Cita de Venta
            </el-button>
          </div>
        </template>
      </el-alert>

      <el-alert
        v-if="alertSaleNoShow"
        type="error"
        show-icon
        :closable="false"
        class="form-alert-banner"
      >
        <template #title>
          No Show en Venta — El cliente no se presentó a la cita de venta. Puedes reprogramarla.
        </template>
        <template #default>
          <div style="margin-top: 0.5rem">
            <el-button
              type="danger"
              size="small"
              @click="router.push(`/ventas/${loadedSession?.citaVenta?.id}/editar`)"
            >
              Reprogramar Cita de Venta
            </el-button>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- Read-only lock banner -->
    <el-alert v-if="isReadOnly" type="warning" :closable="false" show-icon class="lock-banner">
      Esta sesión no está en estado programada. Para editarla contacta con tu supervisor o gerente
      de area.
    </el-alert>

    <!-- Card Principal del Formulario -->
    <el-card class="form-card" shadow="never">
      <el-form
        :model="formData"
        label-position="top"
        :size="isMobile ? 'large' : 'default'"
        :disabled="isReadOnly"
        class="session-form"
      >
        <!-- Fila 0: Estado de la Sesión (Radio Buttons centrados con colores e iconos por estado) -->
        <el-form-item label="Estado de la Sesión" class="status-form-item">
          <div class="status-radio-container">
            <el-radio-group v-model="formData.estado" class="status-radio-group" size="large">
              <el-radio-button
                v-for="opt in estadoSesionOptions"
                :key="opt.value"
                :value="opt.value"
                :class="['status-radio-btn', `status-radio-btn--${opt.value.toLowerCase()}`]"
              >
                <span class="status-btn-content">
                  <el-icon class="status-btn-icon"><component :is="opt.icon" /></el-icon>
                  <span>{{ opt.label }}</span>
                </span>
              </el-radio-button>
            </el-radio-group>
          </div>
        </el-form-item>

        <el-divider border-style="dashed">
          <el-icon> <User /></el-icon>
        </el-divider>

        <!-- Fila 1: Hotel y Fotógrafo -->
        <div class="form-row-2">
          <el-form-item label="Hotel" required>
            <el-select
              v-model="formData.hotelId"
              style="width: 100%"
              placeholder="Selecciona hotel"
            >
              <el-option
                v-for="hotel in userHotels"
                :key="hotel.id"
                :label="hotel.nombre"
                :value="hotel.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="Fotógrafo Asignado">
            <el-select
              v-model="formData.fotografoId"
              style="width: 100%"
              placeholder="Sin fotógrafo asignado"
              clearable
            >
              <el-option label="Sin fotógrafo asignado" value="" />
              <el-option
                v-for="photographer in photographers"
                :key="photographer.id"
                :label="`${photographer.nombre} ${photographer.apellidos}`"
                :value="photographer.id"
              />
            </el-select>
          </el-form-item>
        </div>

        <!-- Fila 2: Cliente y Nº de Habitación -->
        <div class="form-row-2">
          <el-form-item label="Nombre del Cliente" required>
            <el-input
              v-model="formData.clienteNombre"
              placeholder="Ej. Familia López / Pareja Smith"
              :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item label="Nº de Habitación">
            <el-input
              v-model="formData.numeroHabitacion"
              placeholder="Ej. 304B / Villa 12"
              :prefix-icon="Building2"
            />
          </el-form-item>
        </div>

        <!-- Fila 3: Email y Teléfono -->
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

        <!-- Fila 4: Nº de Personas (Adultos y Niños) y Nomenclatura PAX -->
        <div class="form-row-2">
          <el-form-item label="Adultos">
            <el-input-number v-model="formData.numAdultos" :min="0" :step="1" style="width: 100%">
              <template #prefix>
                <el-icon><CircleUserRound /></el-icon>
              </template>
            </el-input-number>
          </el-form-item>

          <el-form-item label="Niños">
            <el-input-number v-model="formData.numNinos" :min="0" :step="1" style="width: 100%">
              <template #prefix>
                <el-icon><Baby /></el-icon>
              </template>
            </el-input-number>
          </el-form-item>
        </div>

        <el-divider border-style="dashed">
          <el-icon> <Calendar /></el-icon>
        </el-divider>

        <!-- Fila 5: Fechas de Sesión y Cita de Ventas -->
        <div class="form-row-2">
          <el-form-item required>
            <template #label>
              <span class="calendar-item-label">
                <el-icon class="calendar-label-icon icon-camera"><Camera /></el-icon>
                <span>Fecha/Hora sesión de fotos</span>
              </span>
            </template>
            <!-- Selector para Móvil (vue-ios-style-datepicker) -->
            <div v-if="isMobile" class="ios-datepicker-container">
              <IosDatepicker
                v-model="mobileDateValue"
                mode="datetime"
                locale="es"
                :use24-hour="true"
                confirm-text="Confirmar"
                cancel-text="Cancelar"
              />
            </div>

            <!-- Selector para Desktop (Element Plus DatePickerPanel) -->
            <div v-else class="desktop-picker-panel-wrapper">
              <el-date-picker-panel
                :border="false"
                v-model="formData.fechaHoraInicio"
                type="datetime"
                value-format="YYYY-MM-DDTHH:mm"
                date-format="YYYY-MM-DD"
                time-format="HH:mm"
                :cell-class-name="getFotografoCellClassName"
                @panel-change="handlePanelChange"
              />
            </div>

            <!-- Contenedor unificado de Avisos e Información -->
            <div class="calendar-info-boxes">
              <!-- 1. Leyenda de colores de ausencias del fotógrafo seleccionado -->
              <div
                v-if="formData.fotografoId && hasAusenciasInVisibleMonth"
                class="fotografo-absence-legend uniform-box"
              >
                <span class="legend-label">Ausencias de {{ selectedPhotographerName }}:</span>
                <div class="calendar-legend">
                  <div class="legend-item">
                    <span class="legend-dot dot-baja"></span>
                    <span>Baja Médica</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-dot dot-vacaciones"></span>
                    <span>Vacaciones</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-dot dot-permiso"></span>
                    <span>Permiso</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-dot dot-otro"></span>
                    <span>Otro</span>
                  </div>
                </div>
              </div>

              <!-- 2. Alerta de Bloqueo por Ausencia Individual del Fotógrafo -->
              <el-alert
                v-if="formData.fechaHoraInicio && isFotografoAusente && ausenciaFotografoActual"
                type="error"
                show-icon
                :closable="false"
                class="fotografo-absence-alert uniform-box"
              >
                <template #title>
                  <span>
                    <strong>{{ selectedPhotographerName }}</strong> tiene una ausencia registrada
                    (<strong>{{ ausenciaFotografoActual.motivo }}</strong
                    >) en la fecha seleccionada. No es posible asignarlo a esta sesión.
                  </span>
                </template>
              </el-alert>

              <!-- 3. Indicador de Disponibilidad y Cupo del Hotel -->
              <div
                v-if="formData.fechaHoraInicio && disponibilidadHotel"
                class="disponibilidad-indicator-card uniform-box"
                :class="{ 'quota-full': isTopeAlcanzado }"
              >
                <div class="disponibilidad-header">
                  <div class="disponibilidad-title">
                    <span
                      class="status-indicator-dot"
                      :class="isTopeAlcanzado ? 'dot-danger' : 'dot-success'"
                    ></span>
                    <span>Sesiones disponibiles:</span>
                  </div>
                  <div class="disponibilidad-badge">
                    <el-tag
                      :type="isTopeAlcanzado ? 'danger' : 'success'"
                      effect="light"
                      size="small"
                      round
                    >
                      {{
                        isTopeAlcanzado
                          ? 'Tope alcanzado'
                          : `${disponibilidadHotel.cupoLibre} ${
                              disponibilidadHotel.cupoLibre === 1
                                ? 'sesión libre'
                                : 'sesiones libres'
                            }`
                      }}
                    </el-tag>
                  </div>
                </div>
                <div class="disponibilidad-details">
                  <span class="detail-item">
                    <strong>{{ disponibilidadHotel.disponibles }}</strong> /
                    {{ disponibilidadHotel.totalFotografos }} fotógrafos activos
                  </span>
                  <span class="detail-separator">•</span>
                  <span class="detail-item">
                    <strong>{{ disponibilidadHotel.sesionesSimultaneas }}</strong> sesiones a esta
                    hora
                  </span>
                </div>

                <!-- Alerta de Bloqueo si no hay cupo -->
                <el-alert
                  v-if="isTopeAlcanzado"
                  type="error"
                  show-icon
                  :closable="false"
                  class="quota-alert"
                >
                  <template #title>
                    <span v-if="disponibilidadHotel.disponibles === 0">
                      No hay fotógrafos disponibles en este hotel para la fecha seleccionada (todos
                      ausentes o sin fotógrafos asignados).
                    </span>
                    <span v-else>
                      Tope de {{ disponibilidadHotel.disponibles }} sesiones simultáneas alcanzado
                      para esta hora.
                    </span>
                  </template>
                </el-alert>
              </div>
            </div>
          </el-form-item>

          <el-form-item>
            <template #label>
              <span class="calendar-item-label">
                <el-icon class="calendar-label-icon icon-money"><Money /></el-icon>
                <el-button
                  v-if="loadedSession?.citaVenta?.id"
                  text
                  type="primary"
                  :disabled="false"
                  class="calendar-label-btn"
                  @click="router.push(`/ventas/${loadedSession?.citaVenta?.id}/editar`)"
                >
                  Fecha/Hora Cita de Ventas
                </el-button>
                <span v-else>Fecha/Hora Cita de Ventas</span>
              </span>
            </template>
            <!-- Selector para Móvil (vue-ios-style-datepicker) -->
            <div v-if="isMobile" class="ios-datepicker-container">
              <IosDatepicker
                v-model="mobileCitaVentaValue"
                mode="datetime"
                locale="es"
                :use24-hour="true"
                confirm-text="Confirmar"
                cancel-text="Cancelar"
              />
            </div>

            <!-- Selector para Desktop (Element Plus DatePickerPanel) -->
            <div v-else class="desktop-picker-panel-wrapper">
              <el-date-picker-panel
                :border="false"
                v-model="fechaHoraCitaVenta"
                type="datetime"
                value-format="YYYY-MM-DDTHH:mm"
                date-format="YYYY-MM-DD"
                time-format="HH:mm"
              />
            </div>
            <div v-if="conflictsCitaVenta.length > 0" class="conflict-inline-warning">
              <el-icon style="vertical-align: middle; margin-right: 4px; color: #e6a23c"
                ><WarnTriangleFilled
              /></el-icon>
              {{ conflictsCitaVenta.length }} cita(s) de venta en el mismo hotel en esta franja
              (±1h)
            </div>
          </el-form-item>
        </div>

        <!-- Fila 6: Checkout y Concepto -->
        <div class="form-row-2">
          <el-form-item>
            <template #label>
              <span class="calendar-item-label">
                <el-icon class="calendar-label-icon icon-checkout"
                  ><PlaneTakeoff :size="16"
                /></el-icon>
                <span>Fecha de checkout</span>
              </span>
            </template>
            <!-- Selector para Móvil (vue-ios-style-datepicker) -->
            <div v-if="isMobile" class="ios-datepicker-container">
              <IosDatepicker v-model="mobileFechaSalidaValue" mode="date" locale="es" />
            </div>

            <!-- Selector para Desktop (Element Plus DatePickerPanel) -->
            <div v-else class="desktop-picker-panel-wrapper">
              <el-date-picker-panel
                :border="false"
                v-model="formData.fechaSalida"
                type="date"
                value-format="YYYY-MM-DD"
                date-format="YYYY-MM-DD"
              />
            </div>
          </el-form-item>
        </div>

        <el-divider border-style="dashed">
          <el-icon> <Edit /></el-icon>
        </el-divider>

        <!-- Fila 7: Concepto / Motivo de la Sesión -->
        <el-form-item label="Concepto / Motivo de la Sesión">
          <el-select
            v-model="formData.concepto"
            filterable
            allow-create
            default-first-option
            placeholder="Selecciona o escribe un concepto personalizado"
            style="width: 100%"
            clearable
          >
            <el-option v-for="item in defaultConceptos" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>

        <!-- Fila 8: Notas Adicionales -->
        <el-form-item label="Notas Adicionales">
          <el-input
            v-model="formData.notas"
            type="textarea"
            :rows="3"
            placeholder="Ej. Fotos en la playa al atardecer, vestidos de blanco."
          />
        </el-form-item>

        <!-- Botones de Acción -->
        <div class="form-actions">
          <el-button
            type="primary"
            :size="isMobile ? 'large' : 'default'"
            :icon="Check"
            :loading="isSaving"
            :disabled="isReadOnly || isTopeAlcanzado || isFotografoAusente"
            @click="handleSaveSession"
          >
            {{ isEditing ? 'Guardar Cambios' : 'Agendar Sesión' }}
          </el-button>
          <el-button :size="isMobile ? 'large' : 'default'" :icon="Close" @click="handleGoBack">
            Cancelar
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.session-form-container {
  padding: 1.5rem;
  max-width: 840px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.lock-banner {
  margin-bottom: 1.25rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  font-size: 1.1rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

.form-card {
  border-radius: var(--el-card-border-radius, 8px);
  border: 1px solid var(--toolbar-border, #e2e8f0);
}

.session-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-row-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.ios-datepicker-container {
  width: 100%;
  display: flex;
  justify-content: center;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--toolbar-border, #e2e8f0);
  background-color: var(--el-fill-color-blank, #ffffff);
}
:deep(.ios-selector-option) {
  color: unset !important;
}
.ios-datepicker-container :deep(.ios-datepicker__actions) {
  display: none !important;
}

.alerts-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.form-alert-banner {
  border-radius: var(--el-border-radius-base, 6px);
}

.conflict-inline-warning {
  font-size: 0.78rem;
  color: var(--el-color-warning-dark-2, #b45309);
  margin-top: 0.35rem;
  line-height: 1.25;
}

.status-form-item :deep(.el-form-item__label) {
  width: 100%;
  text-align: center;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.status-radio-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.status-radio-group {
  display: inline-flex;
  justify-content: center;
  flex-wrap: wrap;
}

:deep(.status-radio-btn .el-radio-button__inner) {
  font-weight: 600;
  transition: all 0.2s ease;
}

.status-btn-content {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.status-btn-icon {
  font-size: 1.05rem;
}

/* Colores personalizados por estado */
:deep(.status-radio-btn--programada.is-active .el-radio-button__inner) {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: #ffffff !important;
  box-shadow: -1px 0 0 0 #409eff !important;
}

:deep(.status-radio-btn--completada.is-active .el-radio-button__inner) {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: #ffffff !important;
  box-shadow: -1px 0 0 0 #67c23a !important;
}

:deep(.status-radio-btn--no_show.is-active .el-radio-button__inner) {
  background-color: #e6a23c !important;
  border-color: #e6a23c !important;
  color: #ffffff !important;
  box-shadow: -1px 0 0 0 #e6a23c !important;
}

:deep(.status-radio-btn--cancelada.is-active .el-radio-button__inner) {
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  color: #ffffff !important;
  box-shadow: -1px 0 0 0 #f56c6c !important;
}

/* Hover sin activar */
:deep(.status-radio-btn--programada:not(.is-active) .el-radio-button__inner:hover) {
  color: #409eff !important;
}
:deep(.status-radio-btn--completada:not(.is-active) .el-radio-button__inner:hover) {
  color: #67c23a !important;
}
:deep(.status-radio-btn--no_show:not(.is-active) .el-radio-button__inner:hover) {
  color: #e6a23c !important;
}
:deep(.status-radio-btn--cancelada:not(.is-active) .el-radio-button__inner:hover) {
  color: #f56c6c !important;
}

.calendar-item-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 600;
}

.calendar-label-icon {
  font-size: 1.05rem;
}
/*
.calendar-label-icon.icon-camera {
  color: #3b82f6;
}

.calendar-label-icon.icon-money {
  color: #10b981;
}

.calendar-label-icon.icon-checkout {
  color: #f59e0b;
}
*/
.calendar-label-icon.icon-camera,
.calendar-label-icon.icon-money,
.calendar-label-icon.icon-checkout {
  color: var(--el-input-icon-color, var(--el-text-color-placeholder));
}
.desktop-picker-panel-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.desktop-picker-panel-wrapper :deep(.el-picker-panel) {
  border-radius: 8px;
}

.calendar-info-boxes {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  margin-top: 0.75rem;
}

.uniform-box {
  width: 100% !important;
  box-sizing: border-box !important;
  margin: 0 !important;
}

.fotografo-absence-legend {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  background: var(--el-fill-color-light, #f8fafc);
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 8px;
}

.fotografo-absence-alert {
  border-radius: 8px !important;
  padding: 0.75rem 1rem !important;
}

.disponibilidad-indicator-card {
  background: var(--el-fill-color-light, #f8fafc);
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.disponibilidad-indicator-card.quota-full {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.3);
}

.disponibilidad-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.disponibilidad-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--heading-color, #0f172a);
}

.status-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-success {
  background-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.dot-danger {
  background-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.disponibilidad-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--el-text-color-regular, #64748b);
}

.detail-separator {
  color: var(--el-border-color, #cbd5e1);
}

.quota-alert {
  margin-top: 0.25rem;
}

.legend-label {
  font-weight: 600;
  color: var(--el-text-color-regular, #475569);
}

.calendar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  font-size: 0.825rem;
  color: var(--el-text-color-secondary, #64748b);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  display: inline-block;
  flex-shrink: 0;
}

.dot-baja {
  background-color: #f87171;
}

.dot-vacaciones {
  background-color: #60a5fa;
}

.dot-permiso {
  background-color: #fbbf24;
}

.dot-otro {
  background-color: #94a3b8;
}

@media (max-width: 768px) {
  .session-form-container {
    padding: 1rem;
  }

  .form-row-2,
  .form-row-3 {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .form-actions {
    flex-direction: column-reverse;
    gap: 0.75rem;
  }

  .form-actions .el-button {
    width: 100%;
    margin-left: 0 !important;
  }
}
</style>

<style>
/* Global CSS for DatePickerPanel highlighted absence cells in PhotoSessionFormView */
.el-date-table td.cell-highlight-baja .el-date-table-cell {
  background-color: rgba(239, 68, 68, 0.18) !important;
  color: #b91c1c !important;
  font-weight: 700;
  border-radius: 4px;
}

.el-date-table td.cell-highlight-vacaciones .el-date-table-cell {
  background-color: rgba(59, 130, 246, 0.18) !important;
  color: #1d4ed8 !important;
  font-weight: 700;
  border-radius: 4px;
}

.el-date-table td.cell-highlight-permiso .el-date-table-cell {
  background-color: rgba(245, 158, 11, 0.2) !important;
  color: #b45309 !important;
  font-weight: 700;
  border-radius: 4px;
}

.el-date-table td.cell-highlight-otro .el-date-table-cell {
  background-color: rgba(148, 163, 184, 0.2) !important;
  color: #334155 !important;
  font-weight: 700;
  border-radius: 4px;
}

html.dark .el-date-table td.cell-highlight-baja .el-date-table-cell {
  background-color: rgba(239, 68, 68, 0.35) !important;
  color: #fca5a5 !important;
}

html.dark .el-date-table td.cell-highlight-vacaciones .el-date-table-cell {
  background-color: rgba(59, 130, 246, 0.35) !important;
  color: #93c5fd !important;
}

html.dark .el-date-table td.cell-highlight-permiso .el-date-table-cell {
  background-color: rgba(245, 158, 11, 0.35) !important;
  color: #fde68a !important;
}
</style>
