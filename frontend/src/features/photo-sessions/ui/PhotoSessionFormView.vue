<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import type { CreateSesionPayload } from '../domain/session.model'
import {
  User,
  Message,
  Phone,
  Check,
  ArrowLeft,
  OfficeBuilding,
  Close,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { IosDatepicker } from 'vue-ios-style-datepicker'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const hotelStore = useHotelStore()
const authStore = useAuthStore()
const userStore = useUserStore()

const sessionId = computed(() => route.params.id as string | undefined)
const isEditing = computed(() => !!sessionId.value)

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
  notas: '',
})

// Current user context
const currentUser = computed(() => authStore.user)

// Formatted PAX display String (ej. "2.2 PAX")
const paxDisplay = computed(() => {
  const adultos = formData.value.numAdultos ?? 0
  const ninos = formData.value.numNinos ?? 0
  return `${adultos}.${ninos} PAX`
})

// Hotels list accessible by current user
const userHotels = computed(() => {
  const user = authStore.user
  if (!user) return []

  const roleCode = user.roleCode?.toUpperCase()
  if (roleCode === 'SUPERUSUARIO' || roleCode === 'ADMIN' || roleCode === 'GERENTE') {
    return hotelStore.hotels
  }

  const userHotelIds = new Set(user.hotelIds || [])
  return hotelStore.hotels.filter((h) => userHotelIds.has(h.id))
})

// Photographers list for assignment (filtered by selected hotel)
const photographers = computed(() => {
  const selectedHotelId = Number(formData.value.hotelId)
  if (!selectedHotelId) return []

  return userStore.usersWithProfile.filter((u) => {
    const isFotografo = u.perfil?.code?.toUpperCase() === 'FOTOGRAFO'
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

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  await Promise.all([hotelStore.fetchHotels(), userStore.fetchUsers(), sessionStore.fetchSessions()])

  if (isEditing.value && sessionId.value) {
    const existing = sessionStore.sessions.find((s) => String(s.id) === String(sessionId.value))
    if (existing) {
      const ALLOWED_PAST_EDIT_ROLES = ['SUPERUSUARIO', 'ADMIN', 'GERENTE', 'CONTABLE']
      const isPast = new Date(existing.fechaHoraInicio) < new Date()
      const role = currentUser.value?.roleCode?.toUpperCase() || ''
      if (isPast && !ALLOWED_PAST_EDIT_ROLES.includes(role)) {
        ElMessage.warning('No tienes permisos para editar sesiones cuya fecha ya ha pasado')
        handleGoBack()
        return
      }

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
        notas: existing.notas || '',
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

    // Prefill start date/time if provided in query
    const queryStart = route.query.start ? String(route.query.start) : ''

    const getLocalIsoString = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    formData.value.fechaHoraInicio =
      queryStart || getLocalIsoString(new Date(Date.now() + 3600000))
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function handleGoBack() {
  const hotelIdParam = formData.value.hotelId ? `?hotelId=${formData.value.hotelId}` : ''
  router.push(`/agenda${hotelIdParam}`)
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

  isSaving.value = true
  try {
    if (isEditing.value && sessionId.value) {
      await sessionStore.updateSession(Number(sessionId.value), {
        hotelId: formData.value.hotelId,
        fotografoId: formData.value.fotografoId || null,
        clienteNombre: formData.value.clienteNombre.trim(),
        clienteEmail: formData.value.clienteEmail ? formData.value.clienteEmail.trim() : null,
        clienteTelefono: formData.value.clienteTelefono ? formData.value.clienteTelefono.trim() : null,
        numeroHabitacion: formData.value.numeroHabitacion ? formData.value.numeroHabitacion.trim() : null,
        numAdultos: formData.value.numAdultos,
        numNinos: formData.value.numNinos,
        fechaSalida: formData.value.fechaSalida ? formData.value.fechaSalida : null,
        concepto: formData.value.concepto ? formData.value.concepto.trim() : null,
        fechaHoraInicio: formData.value.fechaHoraInicio,
        notas: formData.value.notas ? formData.value.notas.trim() : null,
      })
      ElMessage.success('Sesión fotográfica actualizada correctamente')
    } else {
      await sessionStore.addSession({
        ...formData.value,
        creadorId: currentUser.value?.id,
      })
      ElMessage.success('Sesión fotográfica agendada correctamente')
    }
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

    <!-- Card Principal del Formulario -->
    <el-card class="form-card" shadow="never">
      <el-form
        :model="formData"
        label-position="top"
        :size="isMobile ? 'large' : 'default'"
        class="session-form"
      >
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
          <el-form-item label="Nombre del Cliente *" required>
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
              :prefix-icon="OfficeBuilding"
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
        <div class="pax-box">
          <div class="pax-title">
            <span>Nº de Personas</span>
            <el-tag type="info" effect="dark" class="pax-badge">{{ paxDisplay }}</el-tag>
          </div>
          <div class="form-row-2">
            <el-form-item label="Adultos">
              <el-input-number
                v-model="formData.numAdultos"
                :min="0"
                :step="1"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="Niños">
              <el-input-number v-model="formData.numNinos" :min="0" :step="1" style="width: 100%" />
            </el-form-item>
          </div>
        </div>

        <!-- Fila 5: Fechas (Inicio, Salida) -->
        <div class="form-row-2">
          <el-form-item label="Inicio de sesión" required>
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

            <!-- Selector para Desktop (Element Plus) -->
            <el-date-picker
              v-else
              v-model="formData.fechaHoraInicio"
              type="datetime"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm"
              placeholder="Selecciona fecha y hora"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="Fecha de checkout">
            <!-- Selector para Móvil (vue-ios-style-datepicker) -->
            <div v-if="isMobile" class="ios-datepicker-container">
              <IosDatepicker v-model="mobileFechaSalidaValue" mode="date" locale="es" />
            </div>

            <!-- Selector para Desktop (Element Plus) -->
            <el-date-picker
              v-else
              v-model="formData.fechaSalida"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="aaaa-mm-dd"
              style="width: 100%"
            />
          </el-form-item>
        </div>

        <!-- Fila 6: Concepto -->
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

        <!-- Fila 7: Notas Adicionales -->
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

.pax-box {
  background-color: var(--el-fill-color-blank, #f8fafc);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 6px;
  padding: 1rem 1rem 0.25rem 1rem;
  margin-bottom: 1rem;
}

.pax-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--heading-color, #334155);
  margin-bottom: 0.75rem;
}

.pax-badge {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.5px;
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
