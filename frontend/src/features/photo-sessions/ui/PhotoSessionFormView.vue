<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import type { CreateSesionPayload } from '../domain/session.model'
import { User, Message, Phone, Check, ArrowLeft, OfficeBuilding } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { IosDatepicker } from 'vue-ios-style-datepicker'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const hotelStore = useHotelStore()
const authStore = useAuthStore()
const userStore = useUserStore()

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
  clienteEmail: '',
  clienteTelefono: '',
  numeroHabitacion: '',
  numAdultos: 2,
  numNinos: 0,
  fechaSalida: '',
  concepto: '',
  fechaHoraInicio: '',
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
  const user = currentUser.value
  if (!user) return hotelStore.hotels

  const roleCode = user.roleCode?.toUpperCase()
  if (roleCode === 'SUPERUSUARIO' || roleCode === 'ADMIN') {
    return hotelStore.hotels
  }

  const userHotelIds = new Set(user.hotelIds || [])
  return hotelStore.hotels.filter((h) => userHotelIds.has(h.id))
})

// Photographers list for assignment
const photographers = computed(() => {
  return userStore.usersWithProfile.filter((u) => u.perfil?.code?.toUpperCase() === 'FOTOGRAFO')
})

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

  await Promise.all([hotelStore.fetchHotels(), userStore.fetchUsers()])

  // Prefill hotelId from route query or default to user's first hotel
  const queryHotelId = route.query.hotelId ? Number(route.query.hotelId) : 0
  if (queryHotelId && userHotels.value.some((h) => h.id === queryHotelId)) {
    formData.value.hotelId = queryHotelId
  } else if (userHotels.value.length > 0) {
    formData.value.hotelId = userHotels.value[0]?.id ?? 0
  }

  // Prefill photographer (current user if photographer, or first photographer in list)
  const isPhotographer = currentUser.value?.roleCode?.toUpperCase() === 'FOTOGRAFO'
  if (isPhotographer && currentUser.value) {
    formData.value.fotografoId = currentUser.value.id
  } else if (photographers.value.length > 0) {
    formData.value.fotografoId = photographers.value[0]?.id ?? ''
  }

  // Prefill start date/time if provided in query
  const queryStart = route.query.start ? String(route.query.start) : ''

  const now = new Date()
  formData.value.fechaHoraInicio =
    queryStart || new Date(now.getTime() + 3600000).toISOString().slice(0, 16)
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

  if (!formData.value.fotografoId) {
    ElMessage.warning('Debes asignar un fotógrafo')
    return
  }

  if (!formData.value.fechaHoraInicio) {
    ElMessage.warning('Debes seleccionar la fecha y hora de inicio')
    return
  }

  isSaving.value = true
  try {
    await sessionStore.addSession(formData.value)
    ElMessage.success('Sesión fotográfica agendada correctamente')
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
    <!-- Header con botón Volver -->
    <div class="form-header">
      <el-button class="back-btn" @click="handleGoBack">
        <el-icon><ArrowLeft /></el-icon>
        Volver a la Agenda
      </el-button>
      <h1 class="page-title">Agendar Nueva Sesión Fotográfica</h1>
    </div>

    <!-- Card Principal del Formulario -->
    <el-card class="form-card" shadow="never">
      <el-form :model="formData" label-position="top" class="session-form">
        <!-- Fila 1: Hotel y Fotógrafo -->
        <div class="form-row-2">
          <el-form-item label="Hotel *" required>
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

          <el-form-item label="Fotógrafo Asignado *" required>
            <el-select
              v-model="formData.fotografoId"
              style="width: 100%"
              placeholder="Selecciona fotógrafo"
            >
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
          <el-form-item label="Fecha y Hora Inicio *" required>
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

          <el-form-item label="Fecha de Salida (Hotel)">
            <!-- Selector para Móvil (vue-ios-style-datepicker) -->
            <div v-if="isMobile" class="ios-datepicker-container">
              <IosDatepicker
                v-model="mobileFechaSalidaValue"
                mode="date"
                locale="es"
              />
            </div>

            <!-- Selector para Desktop (Element Plus) -->
            <el-date-picker
              v-else
              v-model="formData.fechaSalida"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="yyyy-mm-dd"
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
          <el-button size="large" @click="handleGoBack">Cancelar</el-button>
          <el-button
            type="primary"
            size="large"
            :icon="Check"
            :loading="isSaving"
            @click="handleSaveSession"
          >
            Agendar Sesión
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

.form-header {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
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
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--toolbar-border, #f1f5f9);
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
  }

  .form-actions .el-button {
    width: 100%;
  }
}
</style>
