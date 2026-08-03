<script setup lang="ts">
import { ref } from 'vue'
import PaisesConfig from '@/features/countries/ui/PaisesConfig.vue'

const activeTab = ref('paises')
</script>

<template>
  <div class="view-container">
    <!-- Header de la sección -->
    <div class="page-header">
      <h1 class="page-title">Configuración</h1>
      <p class="page-subtitle">
        Gestiona las opciones generales, estructura geográfica y parámetros de la plataforma
      </p>
    </div>

    <!-- Componente Tabs estilo tarjeta de Element Plus -->
    <el-tabs v-model="activeTab" type="card" class="config-tabs">
      <el-tab-pane label="Paises & Areas" name="paises">
        <!-- Componente modular de la feature 'countries' -->
        <PaisesConfig />
      </el-tab-pane>

      <el-tab-pane label="Test" name="test">
        <div class="tab-pane-content">
          <h3>Pestaña de Pruebas</h3>
          <p>Espacio reservado para pruebas y configuraciones adicionales.</p>
        </div>
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
</style>
