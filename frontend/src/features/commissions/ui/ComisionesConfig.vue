<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useCommissionStore } from '../stores/commission.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import { useHotelStore } from '@/features/hotels/stores/hotel.store'
import { ElMessage } from 'element-plus'
import {
  Money,
  Check,
  Refresh,
  Location,
  InfoFilled,
} from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'

const commissionStore = useCommissionStore()
const countryStore = useCountryStore()
const hotelStore = useHotelStore()

const selectedPaisId = ref<number | null>(null)
const selectedHotelId = ref<number | null>(null)

const formData = ref({
  gerentePct: 2.0,
  supervisorPct: 2.0,
  fotografoAsalariadoPct: 14.0,
  fotografoSinSalarioPct: 20.0,
  vendedorAsalariadoPct: 6.0,
  vendedorSinSalarioPct: 8.0,
  activo: true,
})

const isRecalculating = ref(false)

const availableHotels = computed(() => {
  if (!selectedPaisId.value) return []
  return hotelStore.hotels.filter((h) => {
    // Find area of hotel and check if its country is selectedPaisId
    const country = countryStore.countries.find((c) =>
      c.areas?.some((a) => a.id === h.areaId),
    )
    return country?.id === selectedPaisId.value
  })
})

async function loadConfig() {
  await commissionStore.fetchConfigs(
    selectedPaisId.value || undefined,
    selectedHotelId.value || undefined,
  )
  const eff = commissionStore.effectiveConfig
  if (eff) {
    formData.value = {
      gerentePct: eff.gerentePct,
      supervisorPct: eff.supervisorPct,
      fotografoAsalariadoPct: eff.fotografoAsalariadoPct,
      fotografoSinSalarioPct: eff.fotografoSinSalarioPct,
      vendedorAsalariadoPct: eff.vendedorAsalariadoPct,
      vendedorSinSalarioPct: eff.vendedorSinSalarioPct,
      activo: eff.activo ?? true,
    }
  }
}

onMounted(async () => {
  await Promise.all([
    countryStore.fetchCountries(),
    hotelStore.fetchHotels(),
  ])
  // Default to first country if available (e.g., México)
  if (countryStore.countries.length > 0 && countryStore.countries[0]) {
    selectedPaisId.value = countryStore.countries[0].id
  }
  await loadConfig()
})

watch([selectedPaisId, selectedHotelId], async () => {
  await loadConfig()
})

function onPaisChange() {
  selectedHotelId.value = null
}

async function handleSave() {
  try {
    await commissionStore.saveConfig({
      paisId: selectedPaisId.value,
      hotelId: selectedHotelId.value,
      ...formData.value,
    })
    ElMessage.success('Configuración de comisiones guardada correctamente')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al guardar la configuración'
    ElMessage.error(message)
  }
}

async function handleRecalculate() {
  isRecalculating.value = true
  try {
    const res = await commissionStore.recalcularComisiones()
    ElMessage.success(`Se han recalculado las comisiones de ${res.processed} ventas completadas`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al recalcular comisiones'
    ElMessage.error(message)
  } finally {
    isRecalculating.value = false
  }
}
</script>

<template>
  <div class="comisiones-config-container">
    <!-- Header y Scope Selector -->
    <div class="scope-card">
      <div class="scope-header">
        <div class="scope-title-group">
          <el-icon class="icon-header"><Money /></el-icon>
          <div>
            <h3 class="scope-title">Matriz de Porcentajes de Comisión</h3>
            <p class="scope-desc">
              Configura los porcentajes automáticos para cada rol según país, hotel y tipo de contratación.
            </p>
          </div>
        </div>

        <el-button
          type="warning"
          plain
          :icon="Refresh"
          :loading="isRecalculating"
          @click="handleRecalculate"
        >
          Recalcular Ventas Pasadas
        </el-button>
      </div>

      <el-divider style="margin: 1.25rem 0;" />

      <!-- Selectores de Alcance Geográfico -->
      <div class="scope-selectors">
        <div class="selector-item">
          <label class="selector-label">
            <el-icon><Location /></el-icon> País / Territorio:
          </label>
          <el-select
            v-model="selectedPaisId"
            placeholder="Global (Por defecto)"
            clearable
            class="full-width"
            @change="onPaisChange"
          >
            <el-option :value="null" label="🌐 Configuración Global (Por defecto)" />
            <el-option
              v-for="pais in countryStore.countries"
              :key="pais.id"
              :value="pais.id"
              :label="pais.nombre"
            />
          </el-select>
        </div>

        <div class="selector-item">
          <label class="selector-label">
            <el-icon><Building2 /></el-icon> Hotel Específico (Opcional):
          </label>
          <el-select
            v-model="selectedHotelId"
            placeholder="Aplica a todos los hoteles del país"
            clearable
            class="full-width"
            :disabled="!selectedPaisId"
          >
            <el-option :value="null" label="Todos los hoteles del país seleccionado" />
            <el-option
              v-for="hotel in availableHotels"
              :key="hotel.id"
              :value="hotel.id"
              :label="hotel.nombre"
            />
          </el-select>
        </div>
      </div>
    </div>

    <!-- Formulario de Configuración de Porcentajes -->
    <div class="form-grid">
      <!-- Sección Fotógrafo -->
      <el-card shadow="never" class="role-card photographer-card">
        <template #header>
          <div class="card-header-role">
            <span class="role-tag tag-photographer">Fotógrafo</span>
            <span class="role-desc-header">Comisión sobre las ventas de sus sesiones</span>
          </div>
        </template>

        <div class="inputs-row">
          <div class="input-block">
            <div class="contract-label">
              <span class="contract-badge salaried">🟢 Con Salario (Asalariado)</span>
              <span class="contract-hint">Fotógrafo en plantilla con sueldo base</span>
            </div>
            <div class="input-with-symbol">
              <el-input-number
                v-model="formData.fotografoAsalariadoPct"
                :min="0"
                :max="100"
                :step="0.5"
                :precision="1"
                class="pct-input"
              />
              <span class="symbol-pct">%</span>
            </div>
          </div>

          <div class="input-block">
            <div class="contract-label">
              <span class="contract-badge commission-only">🔵 Sin Salario (Comisión Pura)</span>
              <span class="contract-hint">Fotógrafo freelance o sin sueldo fijo</span>
            </div>
            <div class="input-with-symbol">
              <el-input-number
                v-model="formData.fotografoSinSalarioPct"
                :min="0"
                :max="100"
                :step="0.5"
                :precision="1"
                class="pct-input"
              />
              <span class="symbol-pct">%</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- Sección Vendedor / Agendador -->
      <el-card shadow="never" class="role-card seller-card">
        <template #header>
          <div class="card-header-role">
            <span class="role-tag tag-seller">Vendedor / Agendador</span>
            <span class="role-desc-header">Comisión por captación y apertura de sesión</span>
          </div>
        </template>

        <div class="inputs-row">
          <div class="input-block">
            <div class="contract-label">
              <span class="contract-badge salaried">🟢 Con Salario (Asalariado)</span>
              <span class="contract-hint">Agendador en plantilla con sueldo base</span>
            </div>
            <div class="input-with-symbol">
              <el-input-number
                v-model="formData.vendedorAsalariadoPct"
                :min="0"
                :max="100"
                :step="0.5"
                :precision="1"
                class="pct-input"
              />
              <span class="symbol-pct">%</span>
            </div>
          </div>

          <div class="input-block">
            <div class="contract-label">
              <span class="contract-badge commission-only">🔵 Sin Salario (Comisión Pura)</span>
              <span class="contract-hint">Captador o comisionista externo</span>
            </div>
            <div class="input-with-symbol">
              <el-input-number
                v-model="formData.vendedorSinSalarioPct"
                :min="0"
                :max="100"
                :step="0.5"
                :precision="1"
                class="pct-input"
              />
              <span class="symbol-pct">%</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- Sección Supervisión y Gerencia -->
      <div class="management-grid">
        <el-card shadow="never" class="role-card supervisor-card">
          <template #header>
            <div class="card-header-role">
              <span class="role-tag tag-supervisor">Supervisor de Hotel</span>
            </div>
          </template>
          <div class="input-block">
            <div class="contract-label">
              <span class="contract-hint">Comisión fija sobre la venta total de su hotel asignado</span>
            </div>
            <div class="input-with-symbol">
              <el-input-number
                v-model="formData.supervisorPct"
                :min="0"
                :max="100"
                :step="0.5"
                :precision="1"
                class="pct-input"
              />
              <span class="symbol-pct">%</span>
            </div>
          </div>
        </el-card>

        <el-card shadow="never" class="role-card manager-card">
          <template #header>
            <div class="card-header-role">
              <span class="role-tag tag-manager">Gerente de Área</span>
            </div>
          </template>
          <div class="input-block">
            <div class="contract-label">
              <span class="contract-hint">Comisión fija sobre las ventas de todos los hoteles de su área</span>
            </div>
            <div class="input-with-symbol">
              <el-input-number
                v-model="formData.gerentePct"
                :min="0"
                :max="100"
                :step="0.5"
                :precision="1"
                class="pct-input"
              />
              <span class="symbol-pct">%</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- Tabla Resumen y Botón Guardar -->
    <div class="save-actions-card">
      <div class="summary-info">
        <el-icon><InfoFilled /></el-icon>
        <span>
          Las modificaciones afectarán de manera inmediata a las nuevas ventas que se completen. Las ventas ya cerradas mantienen su snapshot original a menos que se use el botón "Recalcular".
        </span>
      </div>

      <el-button
        type="primary"
        size="large"
        :icon="Check"
        :loading="commissionStore.isSaving"
        class="save-btn"
        @click="handleSave"
      >
        Guardar Configuración de Comisiones
      </el-button>
    </div>

    <!-- Lista de Configuraciones Activas Guardadas -->
    <div v-if="commissionStore.configs.length > 0" class="saved-configs-section">
      <h4 class="section-subtitle">Configuraciones Guardadas en el Sistema</h4>
      <el-table :data="commissionStore.configs" border stripe style="width: 100%;">
        <el-table-column prop="paisNombre" label="País" min-width="150" />
        <el-table-column prop="hotelNombre" label="Hotel" min-width="160" />
        <el-table-column label="Fotógrafo Asalariado" align="center" width="160">
          <template #default="{ row }">
            <strong>{{ row.fotografoAsalariadoPct }}%</strong>
          </template>
        </el-table-column>
        <el-table-column label="Fotógrafo Sin Salario" align="center" width="160">
          <template #default="{ row }">
            <strong style="color: #3b82f6;">{{ row.fotografoSinSalarioPct }}%</strong>
          </template>
        </el-table-column>
        <el-table-column label="Vendedor (Asal / Sin Sal)" align="center" width="180">
          <template #default="{ row }">
            <span>{{ row.vendedorAsalariadoPct }}% / <strong>{{ row.vendedorSinSalarioPct }}%</strong></span>
          </template>
        </el-table-column>
        <el-table-column label="Supervisor" align="center" width="110">
          <template #default="{ row }">
            <span>{{ row.supervisorPct }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="Gerente" align="center" width="110">
          <template #default="{ row }">
            <span>{{ row.gerentePct }}%</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.comisiones-config-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.scope-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.scope-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.scope-title-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-header {
  font-size: 2rem;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 0.75rem;
  border-radius: 10px;
}

.scope-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.scope-desc {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--text-muted, #64748b);
}

.scope-selectors {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.selector-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selector-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--heading-color, #334155);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.full-width {
  width: 100%;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.role-card {
  border-radius: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.card-header-role {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.role-tag {
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  text-transform: uppercase;
}

.tag-photographer {
  background: #ecfdf5;
  color: #059669;
}

.tag-seller {
  background: #eff6ff;
  color: #2563eb;
}

.tag-supervisor {
  background: #fdf4ff;
  color: #c026d3;
}

.tag-manager {
  background: #fffbeb;
  color: #d97706;
}

.role-desc-header {
  font-size: 0.825rem;
  color: var(--text-muted, #64748b);
}

.inputs-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
}

.input-block {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.contract-label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.contract-badge {
  font-size: 0.85rem;
  font-weight: 600;
}

.contract-badge.salaried {
  color: #059669;
}

.contract-badge.commission-only {
  color: #2563eb;
}

.contract-hint {
  font-size: 0.775rem;
  color: var(--text-muted, #64748b);
}

.input-with-symbol {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pct-input {
  width: 160px;
}

.symbol-pct {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--heading-color, #0f172a);
}

.management-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
}

.save-actions-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.summary-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: var(--text-muted, #64748b);
  max-width: 700px;
}

.summary-info .el-icon {
  font-size: 1.25rem;
  color: #3b82f6;
  flex-shrink: 0;
}

.save-btn {
  font-weight: 700;
  padding: 0.75rem 2rem;
}

.saved-configs-section {
  margin-top: 1rem;
}

.section-subtitle {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: var(--heading-color, #0f172a);
}
</style>
