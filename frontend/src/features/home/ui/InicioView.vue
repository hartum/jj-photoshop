<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { useGoalStore } from '@/features/goals/stores/goal.store'
import { useSessionStore } from '@/features/photo-sessions/stores/session.store'
import { useSaleStore } from '@/features/sales/stores/sale.store'
import type { FotografoProgreso, HotelProgresoResumen } from '@/features/goals/domain/goal.model'
import GoalProgressCard from '@/features/goals/ui/GoalProgressCard.vue'
import PhotographerHotelGoalCard from '@/features/goals/ui/PhotographerHotelGoalCard.vue'
import GoalEvolutionChart from '@/features/goals/ui/GoalEvolutionChart.vue'
import {
  User,
  Location,
  OfficeBuilding,
  Setting,
  Camera,
  Calendar,
  Edit,
  Money,
} from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()
const countryStore = useCountryStore()
const profileStore = useProfileStore()
const hotelStore = useHotelStore()
const goalStore = useGoalStore()
const sessionStore = useSessionStore()
const saleStore = useSaleStore()

const currentUser = computed(() => authStore.user)
const userRole = computed(() => currentUser.value?.roleCode?.toUpperCase() || '')

// Filtros temporales para análisis de metas
const now = new Date()
const selectedAnio = ref(now.getFullYear())
const selectedMes = ref(now.getMonth() + 1)
const selectedHotelFilter = ref<number | null>(null)

// Selector dinámico de años: 5 hacia atrás y 2 hacia adelante
const yearsOptions = computed(() => {
  const currentYear = now.getFullYear()
  const years: number[] = []
  for (let y = currentYear - 5; y <= currentYear + 2; y++) {
    years.push(y)
  }
  return years
})

const monthsOptions = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

async function loadGoalsData() {
  await Promise.all([
    goalStore.fetchProgreso({
      hotelId: selectedHotelFilter.value || undefined,
      anio: selectedAnio.value,
      mes: selectedMes.value,
    }),
    goalStore.fetchEvolucion({
      hotelId: selectedHotelFilter.value || undefined,
      anio: selectedAnio.value,
      mes: selectedMes.value,
    }),
  ])
}

onMounted(async () => {
  await Promise.all([
    countryStore.fetchCountries(),
    userStore.fetchUsers(),
    profileStore.fetchProfiles(),
    hotelStore.fetchHotels(),
  ])
  sessionStore.fetchSessions()
  saleStore.fetchCitasVenta()
  await loadGoalsData()
})

watch([selectedAnio, selectedMes, selectedHotelFilter], async () => {
  await loadGoalsData()
})

function getTodaySessionsForHotel(hotelId: number) {
  const today = new Date().toISOString().split('T')[0]
  return sessionStore.sessions.filter((s) => {
    if (s.hotelId !== hotelId) return false
    const sDate = s.fechaHoraInicio ? s.fechaHoraInicio.split('T')[0] : ''
    return sDate === today && s.estado !== 'CANCELADA'
  })
}

function getTodaySalesForHotel(hotelId: number) {
  const today = new Date().toISOString().split('T')[0]
  return saleStore.citasVenta.filter((c) => {
    if (c.hotelId !== hotelId) return false
    const cDate = c.fechaHoraCita ? c.fechaHoraCita.split('T')[0] : ''
    return cDate === today && c.estado !== 'CANCELADA'
  })
}

function formatTime(isoStr?: string): string {
  if (!isoStr) return '--:--'
  const timePart = isoStr.includes('T') ? isoStr.split('T')[1] : isoStr
  return timePart ? timePart.slice(0, 5) : '--:--'
}

// --- CÁLCULOS GLOBALES Y KPIS ---

const totalUsers = computed(() => userStore.usersWithProfile.length)
const activeUsers = computed(
  () => userStore.usersWithProfile.filter((u) => u.status === 'Activo').length,
)

const totalCountries = computed(() => countryStore.countries.length)

const totalAreas = computed(() => {
  return countryStore.countries.reduce((acc, c) => acc + (c.areas?.length || 0), 0)
})

const totalHotels = computed(() => {
  return countryStore.countries.reduce((acc, c) => {
    return acc + (c.areas?.reduce((areaAcc, a) => areaAcc + (a.hoteles?.length || 0), 0) || 0)
  }, 0)
})

// --- CÁLCULOS METAS CONSOLIDADAS ---

const currentHotelProgreso = computed(() => {
  if (selectedHotelFilter.value) {
    return goalStore.progresoHoteles.find((p) => p.hotelId === selectedHotelFilter.value) || null
  }
  return null
})

const globalProgresoTotals = computed(() => {
  const list = goalStore.progresoHoteles
  const metaTotal = list.reduce((sum, h) => sum + h.metaImporte, 0)
  const ventasTotal = list.reduce((sum, h) => sum + h.ventasRealesUsd, 0)
  const metaEsperadaTotal = list.reduce((sum, h) => sum + h.metaEsperadaHoy, 0)
  const pct = metaTotal > 0 ? Math.round((ventasTotal / metaTotal) * 1000) / 10 : 0
  const desv = ventasTotal - metaEsperadaTotal

  let semaforo: 'VERDE' | 'AMARILLO' | 'ROJO' | 'SIN_META' = 'SIN_META'
  if (metaTotal <= 0) {
    semaforo = 'SIN_META'
  } else if (ventasTotal >= metaTotal) {
    semaforo = 'VERDE'
  } else if (metaEsperadaTotal > 0) {
    const ratio = ventasTotal / metaEsperadaTotal
    if (ratio >= 1.0) semaforo = 'VERDE'
    else if (ratio >= 0.8) semaforo = 'AMARILLO'
    else semaforo = 'ROJO'
  }

  return {
    metaTotal: Math.round(metaTotal * 100) / 100,
    ventasTotal: Math.round(ventasTotal * 100) / 100,
    porcentaje: pct,
    metaEsperadaTotal: Math.round(metaEsperadaTotal * 100) / 100,
    desviacion: Math.round(desv * 100) / 100,
    semaforo,
    numHoteles: list.length,
  }
})

function getSemaforoTagType(
  semaforo: string,
  metaImporte: number,
): 'success' | 'warning' | 'danger' | 'info' {
  if (metaImporte <= 0 || semaforo === 'SIN_META') return 'info'
  if (semaforo === 'VERDE') return 'success'
  if (semaforo === 'AMARILLO') return 'warning'
  return 'danger'
}

function getSemaforoText(semaforo: string, metaImporte: number): string {
  if (metaImporte <= 0 || semaforo === 'SIN_META') return 'Meta no definida'
  if (semaforo === 'VERDE') return 'En tiempo'
  if (semaforo === 'AMARILLO') return 'Alerta'
  return 'Atrasado'
}

function getProgressColor(semaforo: string, metaImporte: number): string {
  if (metaImporte <= 0 || semaforo === 'SIN_META') return '#94a3b8'
  if (semaforo === 'VERDE') return '#10b981'
  if (semaforo === 'AMARILLO') return '#f59e0b'
  return '#ef4444'
}

// --- CÁLCULO DE DATOS PARA GERENTE DE ÁREA ---

const managerAreaIds = computed(() => new Set(currentUser.value?.areaIds || []))

const managerAreas = computed(() => {
  const list: { id: number; nombre: string; paisNombre: string; hotelesCount: number }[] = []
  for (const pais of countryStore.countries) {
    for (const area of pais.areas || []) {
      if (managerAreaIds.value.has(area.id)) {
        list.push({
          id: area.id,
          nombre: area.nombre,
          paisNombre: pais.nombre,
          hotelesCount: area.hoteles?.length || 0,
        })
      }
    }
  }
  return list
})

const managerHotels = computed(() => {
  const list: { id: number; nombre: string; areaNombre: string; paisNombre: string }[] = []
  for (const pais of countryStore.countries) {
    for (const area of pais.areas || []) {
      if (managerAreaIds.value.has(area.id)) {
        for (const hotel of area.hoteles || []) {
          list.push({
            id: hotel.id,
            nombre: hotel.nombre,
            areaNombre: area.nombre,
            paisNombre: pais.nombre,
          })
        }
      }
    }
  }
  return list
})

const managerTeam = computed(() => {
  const mHotels = new Set(managerHotels.value.map((h) => h.id))
  return userStore.usersWithProfile.filter((u) => {
    const role = u.perfil?.code?.toUpperCase()
    if (role !== 'SUPERVISOR' && role !== 'FOTOGRAFO') return false
    return u.hotelIds?.some((hid) => mHotels.has(hid))
  })
})

// --- CÁLCULO DE DATOS PARA SUPERVISOR DE HOTEL ---

const supervisorHotelIds = computed(() => new Set(currentUser.value?.hotelIds || []))

const supervisorHotels = computed(() => {
  const list: {
    id: number
    nombre: string
    areaNombre: string
    paisNombre: string
    cadena?: string
    categoria?: number
  }[] = []
  for (const pais of countryStore.countries) {
    for (const area of pais.areas || []) {
      for (const hotel of area.hoteles || []) {
        if (supervisorHotelIds.value.has(hotel.id)) {
          const details = hotelStore.hotels.find((h) => h.id === hotel.id)
          list.push({
            id: hotel.id,
            nombre: hotel.nombre,
            areaNombre: area.nombre,
            paisNombre: pais.nombre,
            cadena: details?.cadenaHotelera,
            categoria: details?.estrellas,
          })
        }
      }
    }
  }
  return list
})

// --- CÁLCULO DE DATOS PARA FOTÓGRAFO ---

interface PhotographerHotelData {
  id: number
  nombre: string
  areaNombre: string
  paisNombre: string
  cadenaHotelera?: string
  categoriaEstrellas?: number
  personaContacto?: string
  telefonoContacto?: string
  emailContacto?: string
  direccion?: string
}

const photographerHotels = computed(() => {
  const list: PhotographerHotelData[] = []
  const photographerHotelIds = new Set(currentUser.value?.hotelIds || [])

  for (const pais of countryStore.countries) {
    for (const area of pais.areas || []) {
      for (const hotel of area.hoteles || []) {
        if (photographerHotelIds.has(hotel.id)) {
          const details = hotelStore.hotels.find((h) => h.id === hotel.id)
          list.push({
            ...hotel,
            areaNombre: area.nombre,
            paisNombre: pais.nombre,
            cadenaHotelera: details?.cadenaHotelera,
            categoriaEstrellas: details?.estrellas,
            personaContacto: details?.personaContacto,
            telefonoContacto: details?.telefono,
            emailContacto: details?.email,
            direccion: details?.direccion,
          })
        }
      }
    }
  }
  return list
})

// Photographer individual goal and hotel goal summaries
const photographerPersonalGoals = computed(() => {
  const myId = currentUser.value?.id
  if (!myId) return []

  const results: Array<{
    hotelId: number
    hotelNombre: string
    personal: FotografoProgreso
    hotel: HotelProgresoResumen
  }> = []

  for (const prog of goalStore.progresoHoteles) {
    const foto = prog.fotografos.find((f) => f.usuarioId === myId)
    if (foto) {
      results.push({
        hotelId: prog.hotelId,
        hotelNombre: prog.hotelNombre,
        personal: foto,
        hotel: prog,
      })
    }
  }
  return results
})

// --- NAVEGACIÓN ---

function goToConfig(tab = 'paises') {
  router.push(`/configuracion?tab=${tab}`)
}

function goToUsers() {
  router.push('/usuarios')
}

function goToAgenda() {
  router.push('/agenda')
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val)
}

// Navegar directamente al formulario de metas con hotel, mes y año preseleccionados
function handleNavigateToGoalForm(hotelId?: number | null) {
  const query: Record<string, string | number> = { tab: 'metas' }
  if (hotelId) query.hotelId = hotelId
  if (selectedMes.value) query.mes = selectedMes.value
  if (selectedAnio.value) query.anio = selectedAnio.value
  router.push({ path: '/configuracion', query })
}
</script>

<template>
  <div class="inicio-container">
    <!-- CABECERA PRINCIPAL -->
    <div class="welcome-banner">
      <div class="banner-overlay"></div>
      <div class="welcome-text">
        <h1 class="welcome-title">¡Hola, {{ currentUser?.nombre }}!</h1>
        <p class="welcome-subtitle">
          Bienvenido a tu panel de control personalizado de <strong>JJ Studio</strong>. Perfil:
          <el-tag effect="dark" type="primary" size="large" class="role-badge">
            {{ currentUser?.roleName }}
          </el-tag>
        </p>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 1. VISTA SUPERUSUARIO Y ADMIN -->
    <!-- ========================================== -->
    <div v-if="userRole === 'SUPERUSUARIO' || userRole === 'ADMIN'" class="dashboard-section">
      <!-- Filtro y Controles de Metas -->
      <div class="section-header-row">
        <h2 class="section-title">Panel Ejecutivo y Metas Globales</h2>
        <div class="controls-bar">
          <el-select
            v-model="selectedHotelFilter"
            placeholder="Todos los Hoteles"
            clearable
            size="default"
            style="width: 220px"
          >
            <el-option v-for="h in hotelStore.hotels" :key="h.id" :label="h.nombre" :value="h.id" />
          </el-select>
          <el-select v-model="selectedMes" size="default" style="width: 140px">
            <el-option
              v-for="m in monthsOptions"
              :key="m.value"
              :label="m.label"
              :value="m.value"
            />
          </el-select>
          <el-select v-model="selectedAnio" size="default" style="width: 100px">
            <el-option v-for="y in yearsOptions" :key="y" :label="String(y)" :value="y" />
          </el-select>
          <el-button
            type="primary"
            :icon="Setting"
            size="default"
            @click="handleNavigateToGoalForm(selectedHotelFilter)"
          >
            Configurar Metas
          </el-button>
        </div>
      </div>

      <!-- Barra de Progreso Semafórica Global / Hotel Seleccionado -->
      <div class="goals-summary-block">
        <GoalProgressCard
          v-if="!selectedHotelFilter"
          titulo="Objetivo Comercial Global de la Cadena"
          :subtitulo="`Mes de ${monthsOptions.find((m) => m.value === selectedMes)?.label} ${selectedAnio} — Consolidado de ${globalProgresoTotals.numHoteles} hoteles`"
          :meta-importe="globalProgresoTotals.metaTotal"
          :ventas-reales-usd="globalProgresoTotals.ventasTotal"
          :porcentaje-cumplimiento="globalProgresoTotals.porcentaje"
          :meta-esperada-hoy="globalProgresoTotals.metaEsperadaTotal"
          :desviacion-monetaria="globalProgresoTotals.desviacion"
          :semaforo="globalProgresoTotals.semaforo"
        />

        <GoalProgressCard
          v-else-if="currentHotelProgreso"
          :titulo="`Meta Mensual: ${currentHotelProgreso.hotelNombre}`"
          :subtitulo="`${currentHotelProgreso.areaNombre} (${currentHotelProgreso.paisNombre}) — ${monthsOptions.find((m) => m.value === selectedMes)?.label} ${selectedAnio}`"
          :meta-importe="currentHotelProgreso.metaImporte"
          :ventas-reales-usd="currentHotelProgreso.ventasRealesUsd"
          :porcentaje-cumplimiento="currentHotelProgreso.porcentajeCumplimiento"
          :meta-esperada-hoy="currentHotelProgreso.metaEsperadaHoy"
          :desviacion-monetaria="currentHotelProgreso.desviacionMonetaria"
          :semaforo="currentHotelProgreso.semaforo"
          :num-ventas="currentHotelProgreso.numVentas"
          :num-sesiones="currentHotelProgreso.numSesiones"
        />
      </div>

      <!-- Gráficas de Línea (Line Charts): Mes a Día y Año a Mes -->
      <GoalEvolutionChart
        :data="goalStore.evolucion"
        :loading="goalStore.isLoading"
        :hotel-name="currentHotelProgreso?.hotelNombre"
      />

      <!-- Tabla Comparativa de Hoteles con Semáforos -->
      <el-card
        class="dashboard-card mb-4"
        header="Desglose y Estado de Metas por Hotel"
        shadow="hover"
      >
        <el-table :data="goalStore.progresoHoteles" style="width: 100%" size="small" stripe>
          <el-table-column prop="hotelNombre" label="Hotel" min-width="160" />
          <el-table-column prop="areaNombre" label="Área" min-width="120" />
          <el-table-column label="Meta Mensual" width="130" align="right">
            <template #default="{ row }">
              <span class="font-semibold">{{ formatCurrency(row.metaImporte) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Ventas Reales" width="130" align="right">
            <template #default="{ row }">
              <span class="font-bold text-primary">{{ formatCurrency(row.ventasRealesUsd) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Ritmo a Hoy" width="120" align="right">
            <template #default="{ row }">
              <span>{{ formatCurrency(row.metaEsperadaHoy) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Avance" min-width="170">
            <template #default="{ row }">
              <div class="table-progress-cell">
                <el-progress
                  :percentage="Math.min(100, Math.max(0, row.porcentajeCumplimiento))"
                  :color="getProgressColor(row.semaforo, row.metaImporte)"
                  :stroke-width="8"
                />
                <span class="progress-pct-label">{{ row.porcentajeCumplimiento }}%</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="Semáforo" width="130" align="center">
            <template #default="{ row }">
              <el-tag
                size="small"
                effect="dark"
                :type="getSemaforoTagType(row.semaforo, row.metaImporte)"
              >
                {{ getSemaforoText(row.semaforo, row.metaImporte) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- Tarjetas de Estadísticas Rápidas de la Plataforma -->
      <h3 class="subsection-title">Estructura y Personal</h3>
      <el-row :gutter="20" class="stats-row">
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-primary">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Usuarios Activos</span>
              <span class="stat-value"
                >{{ activeUsers }} <small>/ {{ totalUsers }}</small></span
              >
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-warning">
              <el-icon><Location /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Países y Áreas</span>
              <span class="stat-value"
                >{{ totalCountries }} <small>p / {{ totalAreas }} á</small></span
              >
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-success">
              <el-icon><OfficeBuilding /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Hoteles</span>
              <span class="stat-value">{{ totalHotels }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-info">
              <el-icon><Setting /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Enlaces Rápidos</span>
              <div class="quick-actions">
                <el-button size="small" type="primary" link @click="goToConfig()"
                  >Configuración</el-button
                >
                <el-button size="small" type="primary" link @click="goToUsers">Usuarios</el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- ========================================== -->
    <!-- 2. VISTA GERENTE -->
    <!-- ========================================== -->
    <div v-else-if="userRole === 'GERENTE'" class="dashboard-section">
      <div class="section-header-row">
        <h2 class="section-title">Control de Áreas y Metas</h2>
        <div class="controls-bar">
          <el-select
            v-model="selectedHotelFilter"
            placeholder="Todos tus Hoteles"
            clearable
            size="default"
            style="width: 220px"
          >
            <el-option v-for="h in managerHotels" :key="h.id" :label="h.nombre" :value="h.id" />
          </el-select>
          <el-select v-model="selectedMes" size="default" style="width: 140px">
            <el-option
              v-for="m in monthsOptions"
              :key="m.value"
              :label="m.label"
              :value="m.value"
            />
          </el-select>
          <el-button
            type="primary"
            :icon="Edit"
            size="default"
            @click="handleNavigateToGoalForm(selectedHotelFilter)"
          >
            Establecer Meta
          </el-button>
        </div>
      </div>

      <!-- Barra de Progreso Semafórica Consolidada de las Áreas -->
      <div class="goals-summary-block">
        <GoalProgressCard
          v-if="!selectedHotelFilter"
          titulo="Objetivo Comercial de tus Áreas"
          :subtitulo="`Mes de ${monthsOptions.find((m) => m.value === selectedMes)?.label} ${selectedAnio}`"
          :meta-importe="globalProgresoTotals.metaTotal"
          :ventas-reales-usd="globalProgresoTotals.ventasTotal"
          :porcentaje-cumplimiento="globalProgresoTotals.porcentaje"
          :meta-esperada-hoy="globalProgresoTotals.metaEsperadaTotal"
          :desviacion-monetaria="globalProgresoTotals.desviacion"
          :semaforo="globalProgresoTotals.semaforo"
        />
        <GoalProgressCard
          v-else-if="currentHotelProgreso"
          :titulo="`Meta Mensual: ${currentHotelProgreso.hotelNombre}`"
          :subtitulo="`${currentHotelProgreso.areaNombre} — ${monthsOptions.find((m) => m.value === selectedMes)?.label} ${selectedAnio}`"
          :meta-importe="currentHotelProgreso.metaImporte"
          :ventas-reales-usd="currentHotelProgreso.ventasRealesUsd"
          :porcentaje-cumplimiento="currentHotelProgreso.porcentajeCumplimiento"
          :meta-esperada-hoy="currentHotelProgreso.metaEsperadaHoy"
          :desviacion-monetaria="currentHotelProgreso.desviacionMonetaria"
          :semaforo="currentHotelProgreso.semaforo"
        />
      </div>

      <!-- Gráficas de Línea (Line Charts): Mes a Día y Año a Mes -->
      <GoalEvolutionChart
        :data="goalStore.evolucion"
        :loading="goalStore.isLoading"
        :hotel-name="currentHotelProgreso?.hotelNombre"
      />

      <!-- Tabla de Hoteles en tus Áreas con Semáforos y Acción de Establecer Meta -->
      <el-card
        class="dashboard-card mb-4"
        header="Rendimiento de Hoteles en tus Áreas"
        shadow="hover"
      >
        <el-table :data="goalStore.progresoHoteles" style="width: 100%" size="small" stripe>
          <el-table-column prop="hotelNombre" label="Hotel" min-width="160" />
          <el-table-column prop="areaNombre" label="Área" min-width="120" />
          <el-table-column label="Meta Mensual" width="130" align="right">
            <template #default="{ row }">
              <span class="font-semibold">{{ formatCurrency(row.metaImporte) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Ventas Reales" width="130" align="right">
            <template #default="{ row }">
              <span class="font-bold text-primary">{{ formatCurrency(row.ventasRealesUsd) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Avance" min-width="170">
            <template #default="{ row }">
              <div class="table-progress-cell">
                <el-progress
                  :percentage="Math.min(100, Math.max(0, row.porcentajeCumplimiento))"
                  :color="getProgressColor(row.semaforo, row.metaImporte)"
                  :stroke-width="8"
                />
                <span class="progress-pct-label">{{ row.porcentajeCumplimiento }}%</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="Semáforo" width="130" align="center">
            <template #default="{ row }">
              <el-tag
                size="small"
                effect="dark"
                :type="getSemaforoTagType(row.semaforo, row.metaImporte)"
              >
                {{ getSemaforoText(row.semaforo, row.metaImporte) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Acción" width="130" align="center">
            <template #default="{ row }">
              <el-button
                size="small"
                type="primary"
                link
                :icon="Edit"
                @click="handleNavigateToGoalForm(row.hotelId)"
              >
                Establecer Meta
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- Resumen Operativo de Áreas y Personal -->
      <el-row :gutter="20" class="stats-row">
        <el-col :xs="24" :sm="8">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-primary">
              <el-icon><Location /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Tus Áreas</span>
              <span class="stat-value">{{ managerAreas.length }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-success">
              <el-icon><OfficeBuilding /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Hoteles Asociados</span>
              <span class="stat-value">{{ managerHotels.length }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-warning">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Personal a tu Cargo</span>
              <span class="stat-value">{{ managerTeam.length }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- ========================================== -->
    <!-- 3. VISTA SUPERVISOR -->
    <!-- ========================================== -->
    <div v-else-if="userRole === 'SUPERVISOR'" class="dashboard-section">
      <div class="section-header-row">
        <h2 class="section-title">Control de Metas de tus Hoteles</h2>
        <div class="controls-bar">
          <el-select
            v-model="selectedHotelFilter"
            placeholder="Selecciona un Hotel"
            clearable
            size="default"
            style="width: 220px"
          >
            <el-option v-for="h in supervisorHotels" :key="h.id" :label="h.nombre" :value="h.id" />
          </el-select>
          <el-select v-model="selectedMes" size="default" style="width: 140px">
            <el-option
              v-for="m in monthsOptions"
              :key="m.value"
              :label="m.label"
              :value="m.value"
            />
          </el-select>
        </div>
      </div>

      <!-- Barra de Progreso del Hotel -->
      <div class="goals-summary-block">
        <div v-for="hotelProg in goalStore.progresoHoteles" :key="hotelProg.hotelId">
          <GoalProgressCard
            :titulo="`Meta del Hotel: ${hotelProg.hotelNombre}`"
            :subtitulo="`${hotelProg.areaNombre} — ${monthsOptions.find((m) => m.value === selectedMes)?.label} ${selectedAnio}`"
            :meta-importe="hotelProg.metaImporte"
            :ventas-reales-usd="hotelProg.ventasRealesUsd"
            :porcentaje-cumplimiento="hotelProg.porcentajeCumplimiento"
            :meta-esperada-hoy="hotelProg.metaEsperadaHoy"
            :desviacion-monetaria="hotelProg.desviacionMonetaria"
            :semaforo="hotelProg.semaforo"
            :num-ventas="hotelProg.numVentas"
            :num-sesiones="hotelProg.numSesiones"
            class="mb-4"
          />

          <!-- Tabla de Desglose por Fotógrafo en este Hotel -->
          <el-card
            class="dashboard-card mb-4"
            :header="`Rendimiento Individual de Fotógrafos — ${hotelProg.hotelNombre}`"
            shadow="hover"
          >
            <div v-if="hotelProg.fotografos.length === 0" class="empty-hint p-3">
              No hay fotógrafos asignados a este hotel.
            </div>
            <el-table v-else :data="hotelProg.fotografos" style="width: 100%" size="small" stripe>
              <el-table-column prop="nombreCompleto" label="Fotógrafo" min-width="160" />
              <el-table-column label="Meta Asignada" width="130" align="right">
                <template #default="{ row }">
                  <span class="font-semibold">{{ formatCurrency(row.metaImporte) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Ventas Reales" width="130" align="right">
                <template #default="{ row }">
                  <span class="font-bold text-primary">{{
                    formatCurrency(row.ventasRealesUsd)
                  }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Ritmo a Hoy" width="120" align="right">
                <template #default="{ row }">
                  <span>{{ formatCurrency(row.metaEsperadaHoy) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Avance" min-width="170">
                <template #default="{ row }">
                  <div class="table-progress-cell">
                    <el-progress
                      :percentage="Math.min(100, Math.max(0, row.porcentajeCumplimiento))"
                      :color="getProgressColor(row.semaforo, row.metaImporte)"
                      :stroke-width="8"
                    />
                    <span class="progress-pct-label">{{ row.porcentajeCumplimiento }}%</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="Semáforo" width="130" align="center">
                <template #default="{ row }">
                  <el-tag
                    size="small"
                    effect="dark"
                    :type="getSemaforoTagType(row.semaforo, row.metaImporte)"
                  >
                    {{ getSemaforoText(row.semaforo, row.metaImporte) }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </div>

      <!-- Gráficas de Línea (Line Charts): Mes a Día y Año a Mes -->
      <GoalEvolutionChart
        :data="goalStore.evolucion"
        :loading="goalStore.isLoading"
        :hotel-name="currentHotelProgreso?.hotelNombre"
      />
    </div>

    <!-- ========================================== -->
    <!-- 4. VISTA FOTÓGRAFO -->
    <!-- ========================================== -->
    <div v-else-if="userRole === 'FOTOGRAFO'" class="dashboard-section">
      <div class="section-header-row photographer-header-row">
        <h2 class="section-title">Tus Metas del Mes</h2>
        <div class="controls-bar photographer-controls">
          <el-button
            type="primary"
            :icon="Calendar"
            size="large"
            class="btn-agenda-hotel"
            @click="goToAgenda"
          >
            Ir a la Agenda del Hotel
          </el-button>
        </div>
      </div>

      <!-- Tarjetas de Metas Agrupadas por Hotel (Meta Colectiva + Meta Personal) -->
      <div v-if="photographerPersonalGoals.length === 0" class="mb-4">
        <el-card class="dashboard-card" shadow="hover">
          <el-empty
            description="Aún no tienes metas registradas para este mes en tus hoteles asignados."
          />
        </el-card>
      </div>

      <div v-else class="photographer-goals-container mb-4">
        <el-row :gutter="20">
          <el-col
            v-for="g in photographerPersonalGoals"
            :key="g.hotelId"
            :xs="24"
            :md="12"
            :lg="12"
          >
            <PhotographerHotelGoalCard
              :hotel-nombre="g.hotelNombre"
              :hotel-progreso="g.hotel"
              :personal-progreso="g.personal"
              :month-label="monthsOptions.find((m) => m.value === selectedMes)?.label || ''"
            />
          </el-col>
        </el-row>
      </div>

      <!-- Trabajo de hoy por hotel e instrucciones -->
      <h3 class="subsection-title mt-4">Tu trabajo para hoy</h3>
      <el-row :gutter="20" class="photographer-grid">
        <el-col :xs="24" :md="16">
          <div class="hotels-cards-container">
            <el-card
              v-for="hotel in photographerHotels"
              :key="hotel.id"
              class="dashboard-card hotel-work-card mb-4"
              shadow="hover"
            >
              <template #header>
                <div class="hotel-card-header">
                  <div class="hotel-title-area">
                    <el-icon class="hotel-header-icon"><OfficeBuilding /></el-icon>
                    <span class="hotel-name font-bold">{{ hotel.nombre }}</span>
                  </div>
                  <span class="hotel-sub-info text-muted">
                    {{ hotel.paisNombre }} — {{ hotel.areaNombre }}
                  </span>
                </div>
              </template>

              <div class="hotel-work-body">
                <!-- 1. Sesiones Fotográficas de Hoy -->
                <div class="work-block mb-3">
                  <div class="work-block-header">
                    <el-icon class="work-icon text-primary"><Camera /></el-icon>
                    <span class="work-block-title font-semibold">
                      Sesiones Fotográficas de Hoy ({{ getTodaySessionsForHotel(hotel.id).length }})
                    </span>
                  </div>

                  <div v-if="getTodaySessionsForHotel(hotel.id).length > 0" class="work-list mt-2">
                    <div
                      v-for="s in getTodaySessionsForHotel(hotel.id)"
                      :key="s.id"
                      class="work-item-row"
                    >
                      <div class="work-time-badge">
                        <el-icon><Calendar /></el-icon>
                        <span>{{ formatTime(s.fechaHoraInicio) }}</span>
                      </div>
                      <div class="client-name font-semibold">{{ s.clienteNombre }}</div>
                      <div v-if="s.numeroHabitacion" class="room-tag">
                        Hab: {{ s.numeroHabitacion }}
                      </div>
                      <el-tag
                        size="small"
                        :type="s.estado === 'COMPLETADA' ? 'success' : 'primary'"
                      >
                        {{ s.estado }}
                      </el-tag>
                    </div>
                  </div>
                  <div v-else class="work-empty-hint mt-1">
                    <span class="text-muted">Sin sesiones fotográficas agendadas para hoy.</span>
                  </div>
                </div>

                <!-- Divider -->
                <div class="work-block-divider"></div>

                <!-- 2. Citas de Venta de Hoy -->
                <div class="work-block mt-3">
                  <div class="work-block-header">
                    <el-icon class="work-icon text-success"><Money /></el-icon>
                    <span class="work-block-title font-semibold">
                      Citas de Venta de Hoy ({{ getTodaySalesForHotel(hotel.id).length }})
                    </span>
                  </div>

                  <div v-if="getTodaySalesForHotel(hotel.id).length > 0" class="work-list mt-2">
                    <div
                      v-for="c in getTodaySalesForHotel(hotel.id)"
                      :key="c.id"
                      class="work-item-row"
                    >
                      <div class="work-time-badge">
                        <el-icon><Calendar /></el-icon>
                        <span>{{ formatTime(c.fechaHoraCita) }}</span>
                      </div>
                      <div class="client-name font-semibold">
                        {{ c.clienteNombre || 'Cliente' }}
                      </div>
                      <div v-if="c.numeroHabitacion" class="room-tag">
                        Hab: {{ c.numeroHabitacion }}
                      </div>
                      <el-tag
                        size="small"
                        :type="c.estado === 'COMPLETADA' ? 'success' : 'warning'"
                      >
                        {{ c.estado }}
                      </el-tag>
                    </div>
                  </div>
                  <div v-else class="work-empty-hint mt-1">
                    <span class="text-muted">Sin citas de venta agendadas para hoy.</span>
                  </div>
                </div>
              </div>
            </el-card>

            <el-empty
              v-if="photographerHotels.length === 0"
              description="No tienes ningún hotel asignado actualmente."
            />
          </div>
        </el-col>

        <el-col :xs="24" :md="8">
          <el-card class="dashboard-card instructions-card" shadow="hover">
            <template #header>
              <div class="instructions-header">
                <div class="instructions-title-area">
                  <el-icon class="instructions-icon"><Camera /></el-icon>
                  <span class="instructions-name font-bold">Instrucciones del Fotógrafo</span>
                </div>
              </div>
            </template>
            <div class="instructions-body">
              <ol class="instructions-list">
                <li>Acude al hotel asignado en las horas de mayor afluencia.</li>
                <li>Mantén tu equipo de fotografía calibrado y limpio.</li>
                <li>Reporta cualquier incidencia al supervisor de la zona.</li>
                <li>Sigue estrictamente las políticas de privacidad de los huéspedes.</li>
              </ol>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- ========================================== -->
    <!-- 5. VISTA CONTABLE -->
    <!-- ========================================== -->
    <div v-else-if="userRole === 'CONTABLE'" class="dashboard-section">
      <h2 class="section-title">Destinos y Red Hotelera</h2>

      <el-row :gutter="20" class="stats-row">
        <el-col :xs="24" :sm="8">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-primary">
              <el-icon><Location /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Países Conectados</span>
              <span class="stat-value">{{ totalCountries }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-warning">
              <el-icon><Location /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Áreas de Operación</span>
              <span class="stat-value">{{ totalAreas }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-success">
              <el-icon><OfficeBuilding /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Destinos (Hoteles)</span>
              <span class="stat-value">{{ totalHotels }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="details-row">
        <el-col :span="24">
          <el-card
            class="dashboard-card"
            header="Catálogo de Hoteles por Países y Áreas"
            shadow="hover"
          >
            <el-collapse>
              <el-collapse-item
                v-for="pais in countryStore.countries"
                :key="pais.id"
                :title="`${pais.nombre} (${pais.areas?.length || 0} áreas)`"
              >
                <div class="pais-collapse-content">
                  <div v-for="area in pais.areas" :key="area.id" class="area-item-box">
                    <span class="area-title">{{ area.nombre }}</span>
                    <el-table
                      :data="area.hoteles || []"
                      style="width: 100%; margin-top: 0.5rem"
                      size="small"
                    >
                      <el-table-column prop="nombre" label="Hotel" />
                      <el-table-column label="Cadena / Características">
                        <template #default="{ row }">
                          <span>{{ row.cadenaHotelera || 'Hotel Independiente' }}</span>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped>
.inicio-container {
  padding: 1.5rem;
}

/* BANNER DE BIENVENIDA */
.welcome-banner {
  position: relative;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 12px;
  padding: 2rem 2.5rem;
  margin-bottom: 2rem;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.15);
}

.banner-overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-image: radial-gradient(
    circle at 80% 20%,
    rgba(64, 158, 255, 0.15) 0%,
    transparent 50%
  );
  pointer-events: none;
}

.welcome-text {
  position: relative;
  z-index: 1;
}

.welcome-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.025em;
}

.welcome-subtitle {
  font-size: 1rem;
  color: #94a3b8;
  margin: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.role-badge {
  font-weight: 700;
  letter-spacing: 0.05em;
}

/* SECCIONES Y CONTROLES */
.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

.subsection-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 1.5rem 0 1rem 0;
}

.controls-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.goals-summary-block {
  margin-bottom: 1.5rem;
}

/* TABLA PROGRESO CELDA */
.table-progress-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.table-progress-cell :deep(.el-progress) {
  flex: 1;
}

.progress-pct-label {
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 40px;
  color: var(--heading-color, #0f172a);
}

.stats-row {
  margin-bottom: 1.5rem;
}

.dashboard-card {
  border-radius: 10px;
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  background-color: var(--el-bg-color-overlay, #ffffff);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.01);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 1rem;
}

.dashboard-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.mb-4 {
  margin-bottom: 1.5rem;
}

.mt-4 {
  margin-top: 1.5rem;
}

/* TARJETAS DE ESTADÍSTICAS RÁPIDAS */
.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #ffffff;
  flex-shrink: 0;
}

.bg-primary {
  background-color: #409eff;
}
.bg-warning {
  background-color: #e6a23c;
}
.bg-success {
  background-color: #67c23a;
}
.bg-info {
  background-color: #909399;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stat-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nav-link-color, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.stat-value small {
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--nav-link-color, #64748b);
}

.quick-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

/* FOTÓGRAFO GRID */
.hotel-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hotel-title-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hotel-header-icon {
  color: #409eff;
}

.hotel-name {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--heading-color, #0f172a);
}

.instructions-header {
  display: flex;
  align-items: center;
}

.instructions-title-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.instructions-icon {
  color: #409eff;
  font-size: 1.15rem;
}

.instructions-name {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--heading-color, #0f172a);
}

.info-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--nav-link-color, #64748b);
  margin-bottom: 0.4rem;
}

.contact-box {
  margin-top: 0.75rem;
  padding: 0.65rem;
  background-color: var(--app-bg, #f8fafc);
  border-radius: 6px;
  font-size: 0.8rem;
}

.contact-title {
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}

.contact-name {
  margin: 0.2rem 0;
  font-weight: 500;
}

.contact-links {
  display: flex;
  gap: 1rem;
  color: var(--nav-link-color, #64748b);
}

.instructions-list {
  padding-left: 1.25rem;
  font-size: 0.85rem;
  color: var(--nav-link-color, #475569);
  line-height: 1.6;
}

.hotel-sub-info {
  font-size: 0.8rem;
}

.hotel-work-body {
  padding: 0.25rem 0;
}

.work-block-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  margin-bottom: 0.5em;
}

.work-icon {
  font-size: 1.1rem;
}

.work-block-title {
  color: var(--heading-color, #0f172a);
}

.work-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.work-item-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background-color: var(--app-bg, #f8fafc);
  border-radius: 8px;
  font-size: 0.85rem;
  border: 1px solid var(--el-border-color-lighter, #f1f5f9);
  gap: 1.25rem;
}

.work-time-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: #3b82f6;
  font-size: 0.85rem;
}

.client-name {
  color: var(--heading-color, #0f172a);
}

.room-tag {
  background-color: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.work-empty-hint {
  font-size: 0.82rem;
  padding-left: 1.6rem;
}

.work-block-divider {
  height: 1px;
  background-color: var(--el-border-color-lighter, #f1f5f9);
  margin: 0.85rem 0;
}

.text-muted {
  color: #94a3b8;
}

.text-success {
  color: #10b981;
}

.text-primary {
  color: #3b82f6;
}
.font-semibold {
  font-weight: 600;
}
.font-bold {
  font-weight: 700;
}

.btn-agenda-hotel {
  font-weight: 600;
}

@media (max-width: 768px) {
  .photographer-header-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .photographer-controls,
  .btn-agenda-hotel {
    width: 100%;
  }

  .work-item-row {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.85rem 1rem;
    gap: 0.35rem;
  }
}
</style>
