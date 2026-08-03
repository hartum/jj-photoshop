<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { getDefaultAvatar } from '@/features/users/utils/user-avatar'
import logoJJ from '@/assets/logoJJ.png'
import { House, Setting, User, Sunny, Moon, SwitchButton } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isLoginPage = computed(() => route.path === '/login')
const isDark = ref(false)

const userAvatar = computed(() => {
  if (authStore.user?.imagen) {
    return authStore.user.imagen
  }
  return getDefaultAvatar()
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

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark')
})
</script>

<template>
  <!-- Vista de Login sin Sidebar/Toolbar -->
  <div v-if="isLoginPage" class="full-screen-wrapper">
    <RouterView />
  </div>

  <!-- Vista Principal de la App con Sidebar y Toolbar -->
  <div v-else class="app-container">
    <!-- Menú lateral izquierdo -->
    <aside class="sidebar">
      <div class="brand">
        <img :src="logoJJ" alt="Logo JJ Studio" class="brand-logo" />
        <span class="brand-title">JJ Studio</span>
      </div>

      <nav class="sidebar-nav">
        <RouterLink to="/inicio" class="nav-link">
          <el-icon :size="18"><House /></el-icon>
          <span>Inicio</span>
        </RouterLink>

        <RouterLink to="/configuracion" class="nav-link">
          <el-icon :size="18"><Setting /></el-icon>
          <span>Configuración</span>
        </RouterLink>

        <RouterLink to="/usuarios" class="nav-link">
          <el-icon :size="18"><User /></el-icon>
          <span>Usuarios</span>
        </RouterLink>
      </nav>
    </aside>

    <!-- Área principal con Toolbar superior + Contenido -->
    <div class="main-wrapper">
      <header class="app-toolbar-container">
        <div class="app-toolbar">
          <div class="toolbar-left">
            <!-- Espacio para elementos futuros del Toolbar -->
          </div>

          <div class="toolbar-right">
            <!-- Conmutador de tema con el-switch de Element Plus -->
            <div class="theme-switcher">
              <el-icon class="theme-icon sun-icon" :class="{ active: !isDark }" :size="18"
                ><Sunny
              /></el-icon>
              <el-switch v-model="isDark" @change="toggleTheme" />
              <el-icon class="theme-icon moon-icon" :class="{ active: isDark }" :size="18"
                ><Moon
              /></el-icon>
            </div>

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
            >
              Salir
            </el-button>
          </div>
        </div>
      </header>

      <main class="main-content">
        <RouterView />
      </main>
    </div>
  </div>
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
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 0.5rem 1.5rem 0.5rem;
  border-bottom: 1px solid var(--sidebar-border, #e2e8f0);
  margin-bottom: 1.5rem;
  transition: border-color 0.2s ease;
  height: 24px;
}

.brand-logo {
  width: 50px;
  height: 50px;
  object-fit: contain;
}

.brand-title {
  font-weight: 700;
  font-size: 1.15rem;
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

/* Theme Switcher Styling */
.theme-switcher {
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
</style>
