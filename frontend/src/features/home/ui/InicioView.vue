<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useUserStore } from '@/features/users/stores/user.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import {
  User,
  Location,
  OfficeBuilding,
  Setting,
  Camera,
  Phone,
  Message,
  Star,
} from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()
const countryStore = useCountryStore()
const profileStore = useProfileStore()
const hotelStore = useHotelStore()

const currentUser = computed(() => authStore.user)
const userRole = computed(() => currentUser.value?.roleCode?.toUpperCase() || '')

onMounted(async () => {
  await Promise.all([
    countryStore.fetchCountries(),
    userStore.fetchUsers(),
    profileStore.fetchProfiles(),
    hotelStore.fetchHotels(),
  ])
})

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

const usersByRole = computed(() => {
  const counts: Record<string, number> = {}
  userStore.usersWithProfile.forEach((u) => {
    const roleName = u.perfil?.name || 'Sin rol'
    counts[roleName] = (counts[roleName] || 0) + 1
  })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
})

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

const supervisorPhotographers = computed(() => {
  return userStore.usersWithProfile.filter((u) => {
    const role = u.perfil?.code?.toUpperCase()
    if (role !== 'FOTOGRAFO') return false
    return u.hotelIds?.some((hid) => supervisorHotelIds.value.has(hid))
  })
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

// --- NAVEGACIÓN ---

function goToConfig() {
  router.push('/configuracion')
}

function goToUsers() {
  router.push('/usuarios')
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

    <!-- 1. VISTA SUPERUSUARIO Y ADMIN -->
    <div v-if="userRole === 'SUPERUSUARIO' || userRole === 'ADMIN'" class="dashboard-section">
      <h2 class="section-title">Resumen de la plataforma</h2>

      <!-- Tarjetas de Estadísticas Rápidas -->
      <el-row :gutter="20" class="stats-row">
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-primary">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Usuarios Activos</span>
              <span class="stat-value">{{ activeUsers }} <small>/ {{ totalUsers }}</small></span>
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
              <span class="stat-value">{{ totalCountries }} <small>p / {{ totalAreas }} á</small></span>
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
                <el-button size="small" type="primary" link @click="goToConfig">Configuración</el-button>
                <el-button size="small" type="primary" link @click="goToUsers">Usuarios</el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Distribución de Roles e Información Detallada -->
      <el-row :gutter="20" class="details-row">
        <el-col :xs="24" :md="12">
          <el-card class="dashboard-card" header="Distribución de Personal por Perfil" shadow="hover">
            <div class="roles-list">
              <div v-for="role in usersByRole" :key="role.name" class="role-item">
                <span class="role-name-text">{{ role.name }}</span>
                <el-tag size="small" type="info" effect="plain">{{ role.value }}</el-tag>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-card class="dashboard-card" header="Últimos Hoteles Registrados" shadow="hover">
            <el-table :data="hotelStore.hotels.slice(0, 5)" style="width: 100%" size="small">
              <el-table-column prop="nombre" label="Hotel" />
              <el-table-column prop="cadenaHotelera" label="Cadena">
                <template #default="{ row }">
                  <span>{{ row.cadenaHotelera || '—' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Categoría" width="100" align="center">
                <template #default="{ row }">
                  <span v-if="row.categoriaEstrellas">
                    {{ row.categoriaEstrellas }} <el-icon class="star-icon"><Star /></el-icon>
                  </span>
                  <span v-else>—</span>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 2. VISTA GERENTE -->
    <div v-else-if="userRole === 'GERENTE'" class="dashboard-section">
      <h2 class="section-title">Control de Áreas Asignadas</h2>

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
              <span class="stat-label">Personal en tus Áreas</span>
              <span class="stat-value">{{ managerTeam.length }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="details-row">
        <el-col :xs="24" :md="12">
          <el-card class="dashboard-card" header="Estructura de Hoteles por Área" shadow="hover">
            <el-collapse>
              <el-collapse-item
                v-for="area in managerAreas"
                :key="area.id"
                :title="`${area.paisNombre} — ${area.nombre} (${area.hotelesCount} hoteles)`"
              >
                <div class="collapse-hotel-list">
                  <div
                    v-for="hotel in managerHotels.filter(h => h.areaNombre === area.nombre)"
                    :key="hotel.id"
                    class="collapse-hotel-item"
                  >
                    <el-icon><OfficeBuilding /></el-icon>
                    <span>{{ hotel.nombre }}</span>
                  </div>
                  <span v-if="area.hotelesCount === 0" class="empty-hint">Sin hoteles en esta área.</span>
                </div>
              </el-collapse-item>
            </el-collapse>
          </el-card>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-card class="dashboard-card" header="Personal a tu Cargo en estas Áreas" shadow="hover">
            <el-table :data="managerTeam" style="width: 100%" size="small">
              <el-table-column prop="nombre" label="Nombre">
                <template #default="{ row }">
                  <span>{{ row.nombre }} {{ row.apellidos }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="perfil.name" label="Rol" />
              <el-table-column prop="email" label="Contacto" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 3. VISTA SUPERVISOR -->
    <div v-else-if="userRole === 'SUPERVISOR'" class="dashboard-section">
      <h2 class="section-title">Control de Hoteles y Fotógrafos</h2>

      <el-row :gutter="20" class="stats-row">
        <el-col :xs="24" :sm="12">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-success">
              <el-icon><OfficeBuilding /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Tus Hoteles Asignados</span>
              <span class="stat-value">{{ supervisorHotels.length }}</span>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12">
          <el-card class="dashboard-card stat-card" shadow="hover">
            <div class="card-icon bg-primary">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Fotógrafos en tus Hoteles</span>
              <span class="stat-value">{{ supervisorPhotographers.length }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="details-row">
        <el-col :xs="24" :md="12">
          <el-card class="dashboard-card" header="Lista de Hoteles de tu Alcance" shadow="hover">
            <el-table :data="supervisorHotels" style="width: 100%" size="small">
              <el-table-column prop="nombre" label="Hotel" />
              <el-table-column prop="areaNombre" label="Área" />
              <el-table-column prop="paisNombre" label="País" />
              <el-table-column prop="categoria" label="Cat." width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.categoria">
                    {{ row.categoria }} <el-icon class="star-icon"><Star /></el-icon>
                  </span>
                  <span v-else>—</span>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-card class="dashboard-card" header="Fotógrafos Asignados" shadow="hover">
            <el-table :data="supervisorPhotographers" style="width: 100%" size="small">
              <el-table-column prop="nombre" label="Nombre">
                <template #default="{ row }">
                  <span>{{ row.nombre }} {{ row.apellidos }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="email" label="Contacto" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 4. VISTA FOTÓGRAFO -->
    <div v-else-if="userRole === 'FOTOGRAFO'" class="dashboard-section">
      <h2 class="section-title">Tus Hoteles y Destinos</h2>

      <el-row :gutter="20" class="photographer-grid">
        <el-col :xs="24" :md="16">
          <div class="hotels-cards-container">
            <el-card
              v-for="hotel in photographerHotels"
              :key="hotel.id"
              class="dashboard-card hotel-detail-card"
              shadow="hover"
            >
              <template #header>
                <div class="hotel-card-header">
                  <div class="hotel-title-area">
                    <el-icon class="hotel-header-icon"><OfficeBuilding /></el-icon>
                    <span class="hotel-name">{{ hotel.nombre }}</span>
                  </div>
                  <el-tag size="small" type="success" effect="plain" v-if="hotel.cadenaHotelera">
                    {{ hotel.cadenaHotelera }}
                  </el-tag>
                </div>
              </template>

              <div class="hotel-card-body">
                <div class="info-row">
                  <el-icon><Location /></el-icon>
                  <span>{{ hotel.paisNombre }} — {{ hotel.areaNombre }}</span>
                </div>
                <div class="info-row" v-if="hotel.direccion">
                  <el-icon><Notebook /></el-icon>
                  <span class="address-text">{{ hotel.direccion }}</span>
                </div>
                <div class="info-row" v-if="hotel.categoriaEstrellas">
                  <el-icon><Star /></el-icon>
                  <span>
                    Categoría:
                    <el-icon
                      v-for="star in hotel.categoriaEstrellas"
                      :key="star"
                      class="star-icon"
                    ><Star /></el-icon>
                  </span>
                </div>

                <div class="contact-box" v-if="hotel.personaContacto || hotel.telefonoContacto">
                  <span class="contact-title">Persona de Contacto:</span>
                  <p class="contact-name" v-if="hotel.personaContacto">
                    {{ hotel.personaContacto }}
                  </p>
                  <div class="contact-links">
                    <span v-if="hotel.telefonoContacto">
                      <el-icon><Phone /></el-icon> {{ hotel.telefonoContacto }}
                    </span>
                    <span v-if="hotel.emailContacto">
                      <el-icon><Message /></el-icon> {{ hotel.emailContacto }}
                    </span>
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
                <el-icon class="instructions-icon"><Camera /></el-icon>
                <span>Instrucciones del Fotógrafo</span>
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

    <!-- 5. VISTA CONTABLE -->
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
          <el-card class="dashboard-card" header="Catálogo de Hoteles por Países y Áreas" shadow="hover">
            <el-collapse>
              <el-collapse-item
                v-for="pais in countryStore.countries"
                :key="pais.id"
                :title="`${pais.nombre} (${pais.areas?.length || 0} áreas)`"
              >
                <div class="pais-collapse-content">
                  <div v-for="area in pais.areas" :key="area.id" class="area-item-box">
                    <span class="area-title">{{ area.nombre }}</span>
                    <el-table :data="area.hoteles || []" style="width: 100%; margin-top: 0.5rem" size="small">
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
  background-image: radial-gradient(circle at 80% 20%, rgba(64, 158, 255, 0.15) 0%, transparent 50%);
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

/* SECCIONES Y TARJETAS */
.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0 0 1.25rem 0;
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
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
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

/* FILAS DE DETALLE */
.details-row {
  margin-bottom: 1.5rem;
}

.roles-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background-color: var(--app-bg, #f8fafc);
  border: 1px solid var(--el-border-color-extra-light, #f2f6fc);
}

.role-name-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--app-text, #0f172a);
}

.star-icon {
  color: #f7ba2a;
  vertical-align: middle;
}

/* ACCORDIONS / COLLAPSE DE GERENTE */
.collapse-hotel-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 0.75rem;
}

.collapse-hotel-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--nav-link-color, #475569);
}

.empty-hint {
  font-size: 0.85rem;
  color: var(--nav-link-color, #94a3b8);
  font-style: italic;
}

/* PORTAL FOTÓGRAFO */
.photographer-grid {
  margin-top: 0.5rem;
}

.hotels-cards-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.hotel-detail-card :deep(.el-card__header) {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
}

.hotel-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hotel-title-area {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.hotel-header-icon {
  font-size: 1.25rem;
  color: #409eff;
}

.hotel-name {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--heading-color, #0f172a);
}

.hotel-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--app-text, #334155);
}

.info-row .el-icon {
  margin-top: 0.2rem;
  color: var(--nav-link-color, #64748b);
  flex-shrink: 0;
}

.address-text {
  line-height: 1.4;
}

.contact-box {
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background-color: var(--app-bg, #f8fafc);
  border: 1px solid var(--el-border-color-extra-light, #f2f6fc);
}

.contact-title {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--nav-link-color, #64748b);
  margin-bottom: 0.25rem;
  letter-spacing: 0.05em;
}

.contact-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
  margin: 0 0 0.5rem 0;
}

.contact-links {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--nav-link-color, #475569);
}

.contact-links span {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* TARJETA INSTRUCCIONES */
.instructions-card :deep(.el-card__header) {
  padding: 1rem 1.25rem;
}

.instructions-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.instructions-icon {
  font-size: 1.25rem;
  color: #e6a23c;
}

.instructions-body {
  padding: 0.5rem 0;
}

.instructions-list {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.instructions-list li {
  font-size: 0.9rem;
  color: var(--app-text, #334155);
  line-height: 1.5;
}

/* PORTAL CONTABLE */
.pais-collapse-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem 0;
}

.area-item-box {
  background-color: var(--app-bg, #f8fafc);
  border: 1px solid var(--el-border-color-extra-light, #f2f6fc);
  border-radius: 8px;
  padding: 1rem;
}

.area-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--heading-color, #0f172a);
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 1rem;
  }

  .welcome-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .welcome-avatar-wrapper {
    margin-right: 0;
  }

  .stats-row .el-col {
    margin-bottom: 0.75rem;
  }
}
</style>
