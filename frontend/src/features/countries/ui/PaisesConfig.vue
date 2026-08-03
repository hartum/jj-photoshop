<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCountryStore } from '../stores/country.store'
import { WORLD_COUNTRIES } from '../domain/world-countries.data'
import type { Pais } from '../domain/country.model'
import { getFlagEmoji } from '@/components/flagEmoji'
import { Plus, Delete, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const countryStore = useCountryStore()

const activeCollapse = ref<number | string>('')
const selectedCountryCode = ref<string>('')
const isAdding = ref(false)

const deleteDialogVisible = ref(false)
const countryToDelete = ref<Pais | null>(null)
const isDeleting = ref(false)

onMounted(async () => {
  await countryStore.fetchCountries()
})

// Filtrar el listado del select para que NO muestre países que ya están añadidos en la BBDD
const availableSelectCountries = computed(() => {
  return WORLD_COUNTRIES.filter((worldCountry) => {
    return !countryStore.countries.some(
      (active) => active.codigo.toUpperCase() === worldCountry.codigo.toUpperCase(),
    )
  })
})

async function handleAddCountry() {
  if (!selectedCountryCode.value) {
    ElMessage.warning('Por favor selecciona un país de la lista')
    return
  }

  const target = WORLD_COUNTRIES.find((c) => c.codigo === selectedCountryCode.value)
  if (!target) return

  // Verificación adicional para asegurar que no esté ya en la BBDD
  const alreadyExists = countryStore.countries.some(
    (c) => c.codigo.toUpperCase() === target.codigo.toUpperCase(),
  )
  if (alreadyExists) {
    ElMessage.warning('El país seleccionado ya se encuentra en el sistema')
    return
  }

  isAdding.value = true
  try {
    await countryStore.addCountry({
      codigo: target.codigo,
      nombre: target.nombre,
      codigoTelefono: target.codigoTelefono,
    })
    ElMessage.success(`País "${target.nombre}" añadido correctamente`)
    selectedCountryCode.value = ''
  } catch (err: any) {
    ElMessage.error(err.message || 'Error al añadir el país')
  } finally {
    isAdding.value = false
  }
}

function confirmDeleteCountry(pais: Pais) {
  countryToDelete.value = pais
  deleteDialogVisible.value = true
}

async function handleDeleteCountry() {
  if (!countryToDelete.value) return

  isDeleting.value = true
  try {
    await countryStore.deleteCountry(countryToDelete.value.id)
    ElMessage.success(`País "${countryToDelete.value.nombre}" eliminado correctamente`)
    countryToDelete.value = null
    deleteDialogVisible.value = false
  } catch (err: any) {
    ElMessage.error(err.message || 'Error al eliminar el país')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div v-loading="countryStore.isLoading" class="paises-config-container">
    <!-- Barra superior de selección y botón para añadir país (antes del collapse) -->
    <div class="add-country-bar">
      <el-select
        v-model="selectedCountryCode"
        filterable
        placeholder="Buscar y seleccionar país para añadir..."
        size="large"
        class="country-select"
      >
        <el-option
          v-for="country in availableSelectCountries"
          :key="country.codigo"
          :label="`${getFlagEmoji(country.codigo)} ${country.nombre} (${country.codigo})`"
          :value="country.codigo"
        >
          <div class="select-option-row">
            <span class="option-flag">{{ getFlagEmoji(country.codigo) }}</span>
            <span class="option-name">{{ country.nombre }}</span>
            <span class="option-code">({{ country.codigo }})</span>
            <el-tag size="small" type="success" effect="plain" class="option-phone">
              {{ country.codigoTelefono }}
            </el-tag>
          </div>
        </el-option>
      </el-select>

      <el-button
        type="primary"
        size="large"
        :icon="Plus"
        :loading="isAdding"
        :disabled="!selectedCountryCode"
        @click="handleAddCountry"
      >
        Añadir País
      </el-button>
    </div>

    <!-- Componente Acordeón para la gestión de Países & Áreas -->
    <el-collapse v-model="activeCollapse" accordion class="country-collapse">
      <el-collapse-item v-for="pais in countryStore.countries" :key="pais.id" :name="pais.id">
        <template #title>
          <div class="collapse-header-title">
            <span class="flag-icon">{{ getFlagEmoji(pais.codigo) }}</span>
            <strong class="country-name">{{ pais.nombre }}</strong>
            <!-- Acciones en la cabecera: Botón eliminar -->
            <div class="header-actions">
              <el-button
                type="danger"
                link
                :icon="Delete"
                title="Eliminar país"
                class="delete-btn"
                @click.stop="confirmDeleteCountry(pais)"
              />
            </div>
          </div>
        </template>

        <div class="collapse-body-content">
          <el-tag size="small" type="info" effect="plain" class="country-tag">
            {{ pais.codigo }}
          </el-tag>
          <el-tag
            v-if="pais.codigoTelefono"
            size="small"
            type="success"
            effect="plain"
            class="country-tag"
          >
            {{ pais.codigoTelefono }}
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

    <!-- Modal Confirmar Eliminación (Soft delete) -->
    <el-dialog v-model="deleteDialogVisible" title="Confirmar Eliminación de País" width="420px">
      <div class="confirm-dialog-content">
        <el-icon class="warning-icon" :size="32"><Warning /></el-icon>
        <p v-if="countryToDelete">
          ¿Estás seguro de que deseas eliminar el país
          <strong>{{ countryToDelete.nombre }} ({{ countryToDelete.codigo }})</strong>? El país ya
          no estará activo en el sistema.
        </p>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">Cancelar</el-button>
          <el-button type="danger" :loading="isDeleting" @click="handleDeleteCountry">
            Eliminar
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.paises-config-container {
  padding-top: 0.5rem;
}

/* Barra de selección de países */
.add-country-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.country-select {
  flex: 1;
  max-width: 420px;
}

.select-option-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.option-flag {
  font-size: 1.1rem;
}

.option-name {
  font-weight: 600;
}

.option-code {
  color: var(--nav-link-color, #64748b);
  font-size: 0.85rem;
}

.option-phone {
  margin-left: auto;
}

.country-collapse {
  border-top: none;
}

.collapse-header-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
  padding-left: 0.5rem;
  width: 100%;
}

.flag-icon {
  font-size: 1.25rem;
}

.country-name {
  color: var(--heading-color, #0f172a);
}

.country-tag {
  font-weight: 500;
  margin-right: 0.5em;
}

.header-actions {
  margin-left: auto;
  margin-right: 1rem;
  display: flex;
  align-items: center;
}

.delete-btn {
  font-size: 1.1rem;
}

.collapse-body-content {
  padding: 1rem 0.5rem;
}

.country-info-text {
  margin: 0.75rem 0 1rem 0;
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

/* Modal styling */
.confirm-dialog-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding-top: 0.5rem;
}

.warning-icon {
  color: #e6a23c;
}

.confirm-dialog-content p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
