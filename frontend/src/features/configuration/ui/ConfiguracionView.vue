<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import PaisesConfig from '@/features/countries/ui/PaisesConfig.vue'
import HotelesConfig from '@/features/hotels/ui/HotelesConfig.vue'
import GoalFormView from '@/features/goals/ui/GoalFormView.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const userRole = computed(() => authStore.user?.roleCode?.toUpperCase())
const isSuperOrAdmin = computed(() => userRole.value === 'SUPERUSUARIO' || userRole.value === 'ADMIN')

// Pestaña por defecto según el rol del usuario
const defaultTab = computed(() => (isSuperOrAdmin.value ? 'paises' : 'metas'))

// Leer la pestaña activa desde el parámetro de consulta ?tab=
const activeTab = ref((route.query.tab as string) || defaultTab.value)

// Sincronizar el tab si cambia la query de la URL
watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab) {
      activeTab.value = newTab as string
    } else {
      activeTab.value = defaultTab.value
    }
  },
)

function handleTabChange(paneName: string | number) {
  router.replace({ query: { ...route.query, tab: String(paneName) } })
}
</script>

<template>
  <div class="view-container">
    <!-- Header de la sección -->
    <div class="page-header">
      <h1 class="page-title">Configuración</h1>
      <p class="page-subtitle">
        {{
          isSuperOrAdmin
            ? 'Gestiona las opciones generales, estructura geográfica y parámetros de la plataforma'
            : 'Establece y gestiona los objetivos comerciales y metas de tus hoteles y equipo'
        }}
      </p>
    </div>

    <!-- Componente Tabs estilo tarjeta de Element Plus -->
    <el-tabs
      v-model="activeTab"
      type="card"
      class="config-tabs"
      @tab-change="handleTabChange"
    >
      <el-tab-pane v-if="isSuperOrAdmin" label="Paises & Areas" name="paises">
        <!-- Componente modular de la feature 'countries' -->
        <PaisesConfig />
      </el-tab-pane>

      <el-tab-pane v-if="isSuperOrAdmin" label="Hoteles" name="hoteles">
        <!-- Componente modular de la feature 'hotels' -->
        <HotelesConfig />
      </el-tab-pane>

      <el-tab-pane label="Metas y Objetivos" name="metas">
        <!-- Componente modular de la feature 'goals' -->
        <GoalFormView />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.view-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
  margin: 0 0 0.25rem 0;
}

.page-subtitle {
  font-size: 0.9rem;
  color: var(--nav-link-color, #64748b);
  margin: 0;
}

.config-tabs {
  margin-top: 1rem;
}

.tab-pane-content {
  padding: 1.5rem 1rem;
}

.tab-pane-content h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  color: var(--heading-color, #0f172a);
}

.tab-pane-content p {
  margin: 0;
  color: var(--nav-link-color, #64748b);
  font-size: 0.95rem;
}

@media (max-width: 768px) {
  .view-container {
    padding: 1rem;
  }

  :deep(.el-tabs__nav-scroll) {
    overflow-x: auto;
  }
}
</style>
