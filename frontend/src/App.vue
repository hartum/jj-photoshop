<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import Toolbar from 'primevue/toolbar'
import ToggleSwitch from 'primevue/toggleswitch'

const isDark = ref(false)

function toggleTheme() {
  if (isDark.value) {
    document.documentElement.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark-mode')
  }
}

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark-mode')
})
</script>

<template>
  <div class="app-container">
    <!-- Menú lateral izquierdo -->
    <aside class="sidebar">
      <div class="brand">
        <i class="pi pi-camera brand-icon"></i>
        <span class="brand-title">JJ Photoshop</span>
      </div>

      <nav class="sidebar-nav">
        <RouterLink to="/inicio" class="nav-link">
          <i class="pi pi-home"></i>
          <span>Inicio</span>
        </RouterLink>

        <RouterLink to="/configuracion" class="nav-link">
          <i class="pi pi-cog"></i>
          <span>Configuración</span>
        </RouterLink>

        <RouterLink to="/usuarios" class="nav-link">
          <i class="pi pi-users"></i>
          <span>Usuarios</span>
        </RouterLink>
      </nav>
    </aside>

    <!-- Área principal con Toolbar superior + Contenido -->
    <div class="main-wrapper">
      <header class="app-toolbar-container">
        <Toolbar class="app-toolbar">
          <template #start>
            <div class="toolbar-slot">
              <!-- Espacio para elementos futuros del Toolbar -->
            </div>
          </template>

          <template #end>
            <div class="toolbar-slot">
              <!-- Conmutador de tema con ToggleSwitch de PrimeVue -->
              <div class="theme-switcher">
                <i class="pi pi-sun theme-icon sun-icon" :class="{ active: !isDark }"></i>
                <ToggleSwitch v-model="isDark" @change="toggleTheme" aria-label="Cambiar tema" />
                <i class="pi pi-moon theme-icon moon-icon" :class="{ active: isDark }"></i>
              </div>
            </div>
          </template>
        </Toolbar>
      </header>

      <main class="main-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
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
}

.brand-icon {
  font-size: 1.5rem;
  color: #2563eb;
}

.brand-title {
  font-weight: 700;
  font-size: 1.15rem;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
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

.nav-link i {
  font-size: 1.1rem;
}

.nav-link:hover {
  color: var(--nav-link-hover-color, #0f172a);
  background-color: var(--nav-link-hover-bg, #f1f5f9);
}

.nav-link.router-link-active {
  color: #ffffff;
  background-color: #2563eb;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
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
  border: none;
  border-radius: 0;
  padding: 0.5rem 1.5rem;
  display: flex;
  align-items: center;
  transition: background-color 0.2s ease;
}

.toolbar-slot {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Theme Switcher Styling */
.theme-switcher {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.theme-icon {
  font-size: 1.15rem;
  color: var(--nav-link-color, #64748b);
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.sun-icon.active {
  color: #f59e0b;
}

.moon-icon.active {
  color: #6366f1;
}

/* Content Area */
.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--content-bg, #f8fafc);
  transition: background-color 0.2s ease;
}
</style>
