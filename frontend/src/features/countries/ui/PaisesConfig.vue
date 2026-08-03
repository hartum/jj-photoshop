<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCountryStore } from '../stores/country.store'
import { getFlagEmoji } from '@/components/flagEmoji'

const activeCollapse = ref<number | string>('')
const countryStore = useCountryStore()

onMounted(async () => {
  await countryStore.fetchCountries()
})
</script>

<template>
  <!-- Componente Acordeón para la gestión de Países & Áreas (sin envoltorio de card) -->
  <div v-loading="countryStore.isLoading" class="paises-config-container">
    <el-collapse v-model="activeCollapse" accordion class="country-collapse">
      <el-collapse-item v-for="pais in countryStore.countries" :key="pais.id" :name="pais.id">
        <template #title>
          <div class="collapse-header-title">
            <span class="flag-icon">{{ getFlagEmoji(pais.codigo) }}</span>

            <strong class="country-name">{{ pais.nombre }}</strong>
            <el-tag
              v-if="pais.codigoTelefono"
              size="small"
              type="success"
              effect="plain"
              class="country-tag"
            >
              {{ pais.codigoTelefono }}
            </el-tag>
          </div>
        </template>

        <div class="collapse-body-content">
          <el-tag size="small" type="info" effect="plain" class="country-tag">
            {{ pais.codigo }}
          </el-tag>
          <p class="country-info-text">
            Configuración y áreas asignadas para <strong>{{ pais.nombre }}</strong> ({{
              pais.codigo
            }}).
          </p>

          <div class="country-details-grid">
            <div class="detail-item">
              <span class="detail-label">Código ISO:</span>
              <span class="detail-value">{{ pais.codigo }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Prefijo Telefónico:</span>
              <span class="detail-value">{{ pais.codigoTelefono || 'N/A' }}</span>
            </div>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped>
.paises-config-container {
  padding-top: 1rem;
}

.country-collapse {
  border-top: none;
}

.collapse-header-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
  padding-left: 0.5em;
}

.flag-icon {
  font-size: 1.25rem;
}

.country-name {
  color: var(--heading-color, #0f172a);
}

.country-tag {
  font-weight: 500;
}

.collapse-body-content {
  padding: 1rem 0.5rem;
}

.country-info-text {
  margin: 0 0 1rem 0;
  color: var(--nav-link-color, #64748b);
  font-size: 0.95rem;
}

.country-details-grid {
  display: flex;
  gap: 2rem;
}

.detail-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.detail-label {
  color: var(--nav-link-color, #64748b);
}

.detail-value {
  font-weight: 600;
  color: var(--heading-color, #0f172a);
}
</style>
