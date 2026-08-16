<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import { getDefaultAvatar } from '@/features/users/utils/user-avatar'
import { canAccessRoute, getRolePermissions } from '@/shared/permissions'
import logoJJ from '@/assets/logoJJ.png'
import es from 'element-plus/es/locale/lang/es'
import {
  House,
  Setting,
  User,
  Sunny,
  Moon,
  SwitchButton,
  Location,
  Menu,
  Close,
  Calendar,
} from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const countryStore = useCountryStore()

const isLoginPage = computed(() => route.path === '/login')
const isDark = ref(false)
const isMobileDrawerOpen = ref(false)

const userAvatar = computed(() => {
  if (authStore.user?.imagen) {
    return authStore.user.imagen
  }
  return getDefaultAvatar()
})

const canSeeAgenda = computed(() => canAccessRoute(authStore.user?.roleCode, '/agenda'))
const canSeeConfig = computed(() => canAccessRoute(authStore.user?.roleCode, '/configuracion'))
const canSeeUsers = computed(() => canAccessRoute(authStore.user?.roleCode, '/usuarios'))

function handleSelectHotelNode(hotelId: number) {
  closeMobileDrawer()
  router.push({ path: '/agenda', query: { hotelId } })
}

const filteredCountriesTree = computed(() => {
  const user = authStore.user
  if (!user) return []

  const roleCode = user.roleCode?.toUpperCase()
  const perm = getRolePermissions(roleCode)

  if (perm.scopeType === 'GLOBAL') {
    return countryStore.countries
  }

  if (perm.scopeType === 'AREAS') {
    const userAreaIds = new Set(user.areaIds || [])
    return countryStore.countries
      .map((pais) => {
        const allowedAreas = (pais.areas || []).filter((area) => userAreaIds.has(area.id))
        return {
          ...pais,
          areas: allowedAreas,
        }
      })
      .filter((pais) => (pais.areas || []).length > 0)
  }

  if (perm.scopeType === 'HOTELS') {
    const userHotelIds = new Set(user.hotelIds || [])
    return countryStore.countries
      .map((pais) => {
        const allowedAreas = (pais.areas || [])
          .map((area) => {
            const allowedHotels = (area.hoteles || []).filter((hotel) => userHotelIds.has(hotel.id))
            return {
              ...area,
              hoteles: allowedHotels,
            }
          })
          .filter((area) => (area.hoteles || []).length > 0)
        return {
          ...pais,
          areas: allowedAreas,
        }
      })
      .filter((pais) => (pais.areas || []).length > 0)
  }

  return []
})

function toggleTheme() {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

function closeMobileDrawer() {
  isMobileDrawerOpen.value = false
}

onMounted(async () => {
  isDark.value = document.documentElement.classList.contains('dark')
  await countryStore.fetchCountries()
})
</script>

<template>
  <el-config-provider :locale="es">
    <!-- Vista de Login sin Sidebar/Toolbar -->
    <div v-if="isLoginPage" class="full-screen-wrapper">
      <RouterView />
    </div>

    <!-- Vista Principal de la App con Sidebar y Toolbar -->
    <div v-else class="app-container">
      <!-- Menú lateral izquierdo (Desktop) -->
      <aside class="sidebar desktop-sidebar">
        <div class="brand">
          <div class="brand-info">
            <img :src="logoJJ" alt="Logo JJ Studio" class="brand-logo" />
            <span class="brand-title">JJ Studio</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <RouterLink to="/inicio" class="nav-link">
            <el-icon :size="18"><House /></el-icon>
            <span>Inicio</span>
          </RouterLink>

          <RouterLink v-if="canSeeAgenda" to="/agenda" class="nav-link">
            <el-icon :size="18"><Calendar /></el-icon>
            <span>Agenda</span>
          </RouterLink>

          <RouterLink v-if="canSeeConfig" to="/configuracion" class="nav-link">
            <el-icon :size="18"><Setting /></el-icon>
            <span>Configuración</span>
          </RouterLink>

          <RouterLink v-if="canSeeUsers" to="/usuarios" class="nav-link">
            <el-icon :size="18"><User /></el-icon>
            <span>Usuarios</span>
          </RouterLink>

          <!-- Línea de separación -->
          <div class="sidebar-divider" v-if="filteredCountriesTree.length > 0"></div>

          <!-- Estructura Jerárquica: Países -> Áreas -> Hoteles (filtrado por rol) -->
          <div class="sidebar-tree" v-if="filteredCountriesTree.length > 0">
            <div v-for="pais in filteredCountriesTree" :key="pais.id" class="tree-country-group">
              <!-- Nivel 1: País (sin bandera) -->
              <div class="tree-node node-country">
                <span class="node-text">{{ pais.nombre }}</span>
              </div>

              <!-- Nivel 2: Áreas -->
              <div v-for="area in pais.areas" :key="area.id" class="tree-area-group">
                <div class="tree-node node-area">
                  <el-icon :size="18" class="node-icon area-icon"><Location /></el-icon>
                  <span class="node-text">{{ area.nombre }}</span>
                </div>

                <!-- Nivel 3: Hoteles (Clicables) -->
                <div
                  v-for="hotel in area.hoteles"
                  :key="hotel.id"
                  class="tree-node node-hotel clickable-node"
                  title="Ver agenda del hotel"
                  @click="handleSelectHotelNode(hotel.id)"
                >
                  <el-icon :size="18" class="node-icon hotel-icon"><Building2 /></el-icon>
                  <span class="node-text">{{ hotel.nombre }}</span>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      <!-- Drawer Lateral de Navegación (Móvil) -->
      <el-drawer
        v-model="isMobileDrawerOpen"
        direction="ltr"
        size="100%"
        :with-header="false"
        class="mobile-drawer"
      >
        <div class="sidebar mobile-drawer-content">
          <div class="brand mobile-drawer-brand">
            <div class="brand-info">
              <img :src="logoJJ" alt="Logo JJ Studio" class="brand-logo" />
              <span class="brand-title">JJ Studio</span>
            </div>
            <el-button
              circle
              class="close-drawer-btn"
              :icon="Close"
              @click="closeMobileDrawer"
              aria-label="Cerrar menú de navegación"
            />
          </div>

          <nav class="sidebar-nav">
            <RouterLink to="/inicio" class="nav-link" @click="closeMobileDrawer">
              <el-icon :size="18"><House /></el-icon>
              <span>Inicio</span>
            </RouterLink>

            <RouterLink
              v-if="canSeeAgenda"
              to="/agenda"
              class="nav-link"
              @click="closeMobileDrawer"
            >
              <el-icon :size="18"><Calendar /></el-icon>
              <span>Agenda</span>
            </RouterLink>

            <RouterLink
              v-if="canSeeConfig"
              to="/configuracion"
              class="nav-link"
              @click="closeMobileDrawer"
            >
              <el-icon :size="18"><Setting /></el-icon>
              <span>Configuración</span>
            </RouterLink>

            <RouterLink v-if="canSeeUsers" to="/usuarios" class="nav-link" @click="closeMobileDrawer">
              <el-icon :size="18"><User /></el-icon>
              <span>Usuarios</span>
            </RouterLink>

            <div class="sidebar-divider" v-if="filteredCountriesTree.length > 0"></div>

            <div class="sidebar-tree" v-if="filteredCountriesTree.length > 0">
              <div v-for="pais in filteredCountriesTree" :key="pais.id" class="tree-country-group">
                <div class="tree-node node-country">
                  <span class="node-text">{{ pais.nombre }}</span>
                </div>

                <div v-for="area in pais.areas" :key="area.id" class="tree-area-group">
                  <div class="tree-node node-area">
                    <el-icon :size="18" class="node-icon area-icon"><Location /></el-icon>
                    <span class="node-text">{{ area.nombre }}</span>
                  </div>

                  <div
                    v-for="hotel in area.hoteles"
                    :key="hotel.id"
                    class="tree-node node-hotel clickable-node"
                    @click="handleSelectHotelNode(hotel.id)"
                  >
                    <el-icon :size="18" class="node-icon hotel-icon"><Building2 /></el-icon>
                    <span class="node-text">{{ hotel.nombre }}</span>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </el-drawer>

      <!-- Área principal con Toolbar superior + Contenido -->
      <div class="main-wrapper">
        <header class="app-toolbar-container">
          <div class="app-toolbar">
            <div class="toolbar-left">
              <el-button
                class="mobile-menu-btn"
                circle
                :icon="Menu"
                @click="isMobileDrawerOpen = true"
                aria-label="Abrir menú de navegación"
              />
            </div>

            <!-- Conmutador de tema centrado -->
            <div class="theme-switcher">
              <el-icon class="theme-icon sun-icon" :class="{ active: !isDark }" :size="18"
                ><Sunny
              /></el-icon>
              <el-switch v-model="isDark" @change="toggleTheme" />
              <el-icon class="theme-icon moon-icon" :class="{ active: isDark }" :size="18"
                ><Moon
              /></el-icon>
            </div>

            <div class="toolbar-right">
              <!-- Usuario autenticado -->
              <div v-if="authStore.user" class="user-badge">
                <el-avatar :src="userAvatar" shape="circle" :size="36" class="topbar-avatar" />
                <div class="user-info">
                  <span class="user-name"
                    >{{ authStore.user.nombre }} {{ authStore.user.apellidos }}</span
                  >
                  <span class="user-role">{{ authStore.user.roleName }}</span>
                </div>
              </div>

              <!-- Botón Cerrar Sesión -->
              <el-button
                type="danger"
                link
                :icon="SwitchButton"
                title="Cerrar sesión"
                @click="handleLogout"
                class="logout-btn"
              >
                <span class="logout-text">Salir</span>
              </el-button>
            </div>
          </div>
        </header>

        <main class="main-content">
          <RouterView />
        </main>
      </div>
    </div>
  </el-config-provider>
</template>

<style scoped>
.full-screen-wrapper {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.app-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--app-bg, #f8fafc);
  color: var(--app-text, #0f172a);
}

/* Sidebar Styling */
.sidebar {
  width: 250px;
  min-width: 250px;
  background-color: var(--sidebar-bg, #ffffff);
  border-right: 1px solid var(--sidebar-border, #e2e8f0);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  z-index: 10;
  overflow-y: auto;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.5rem 1.5rem 0.5rem;
  border-bottom: 1px solid var(--sidebar-border, #e2e8f0);
  margin-bottom: 1.5rem;
  transition: border-color 0.2s ease;
  min-height: 40px;
}

.brand-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.close-drawer-btn {
  font-size: 1.1rem;
}

.brand-logo {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.brand-title {
  font-weight: 700;
  font-size: 1.2rem;
  background: linear-gradient(135deg, #409eff 0%, #a0cfff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  color: var(--nav-link-color, #64748b);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease-in-out;
}

.nav-link:hover {
  color: var(--nav-link-hover-color, #0f172a);
  background-color: var(--nav-link-hover-bg, #f1f5f9);
}

.nav-link.router-link-active {
  color: #ffffff;
  background-color: #409eff;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.25);
}

/* Sidebar Tree Hierarchy Styling */
.sidebar-divider {
  height: 1px;
  background-color: var(--sidebar-border, #e2e8f0);
  margin: 0.75rem 0;
  width: 100%;
}

.sidebar-tree {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  user-select: none;
  cursor: default;
}

.tree-country-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.tree-area-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  line-height: 1.3;
}

.node-country {
  padding-left: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
  pointer-events: none;
}

.node-area {
  padding-left: 1.5rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--nav-link-color, #475569);
  pointer-events: none;
}

.node-hotel {
  padding-left: 2.5rem;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--nav-link-color, #64748b);
  border-radius: 6px;
  transition: all 0.2s ease-in-out;
}

.clickable-node {
  pointer-events: auto !important;
  cursor: pointer !important;
}

.clickable-node:hover {
  background-color: var(--nav-link-hover-bg, #f1f5f9);
  color: #409eff;
}

.clickable-node:hover .hotel-icon {
  color: #409eff;
}

.node-icon {
  flex-shrink: 0;
}

.country-icon {
  color: #409eff;
}

.area-icon {
  color: #e6a23c;
}

.hotel-icon {
  color: #94a3b8;
}

.node-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Main Wrapper Styling */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Top Toolbar Header */
.app-toolbar-container {
  border-bottom: 1px solid var(--toolbar-border, #e2e8f0);
  transition: border-color 0.2s ease;
}

.app-toolbar {
  background-color: var(--toolbar-bg, #ffffff);
  padding: 0.5rem 1.5rem;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  transition: background-color 0.2s ease;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.user-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--heading-color, #0f172a);
}

.user-role {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
  font-weight: 400;
}

/* Theme Switcher Styling (Centrado universal) */
.theme-switcher {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.theme-icon {
  color: var(--nav-link-color, #64748b);
  transition: color 0.2s ease;
}

.sun-icon.active {
  color: #e6a23c;
}

.moon-icon.active {
  color: #409eff;
}

/* Content Area */
.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--content-bg, #f8fafc);
  transition: background-color 0.2s ease;
}

/* Responsive Elements & Media Queries */
.mobile-menu-btn {
  display: none;
}

.mobile-drawer-content {
  height: 100%;
  width: 100%;
  border-right: none;
}

@media (max-width: 768px) {
  .desktop-sidebar {
    display: none !important;
  }

  .mobile-menu-btn {
    display: inline-flex !important;
  }

  .app-toolbar {
    padding: 0.5rem 1rem;
  }

  .toolbar-right {
    gap: 0.75rem;
  }

  .user-badge {
    gap: 0.35rem;
  }

  /* Espaciado y fuentes ampliadas para el árbol únicamente en Móvil */
  .sidebar-divider {
    margin: 1rem 0;
  }

  .sidebar-tree {
    gap: 1rem;
  }

  .tree-country-group {
    gap: 0.5rem;
  }

  .tree-area-group {
    gap: 0.35rem;
  }

  .tree-node {
    gap: 0.6rem;
    line-height: 1.4;
  }

  .node-country {
    padding: 0.4rem 0.5rem 0.2rem 0.5rem;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .node-area {
    padding: 0.35rem 0.5rem 0.15rem 1.25rem;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .node-hotel {
    padding: 0.65rem 0.75rem 0.65rem 2.25rem;
    font-size: 0.92rem;
    font-weight: 500;
    color: var(--nav-link-color, #334155);
    min-height: 44px;
  }
}

@media (max-width: 480px) {
  .user-info {
    display: none;
  }

  .logout-text {
    display: none;
  }

  .app-toolbar {
    padding: 0.5rem 0.75rem;
  }
}
</style>
