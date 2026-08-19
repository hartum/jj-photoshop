<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useCalendarioLaboralStore } from '../stores/calendario-laboral.store'
import type {
  CalendarioLaboralFotografo,
  MotivoCalendarioLaboral,
} from '../domain/calendario-laboral.model'
import { Delete } from '@element-plus/icons-vue'
import { CalendarX2 } from '@lucide/vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{ usuarioId: string }>()

const store = useCalendarioLaboralStore()

const selectedRange = ref<[Date, Date] | null>(null)
const isSubmitting = ref(false)

const motivoOptions: { label: string; value: MotivoCalendarioLaboral; type: string }[] = [
  { label: 'Baja', value: 'BAJA', type: 'danger' },
  { label: 'Vacaciones', value: 'VACACIONES', type: 'primary' },
  { label: 'Permiso', value: 'PERMISO', type: 'warning' },
  { label: 'Otro', value: 'OTRO', type: 'info' },
]

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.slice(0, 10).split('-')
  if (parts.length === 3) {
    return `${parts[0]}/${parts[1]}/${parts[2]}`
  }
  return dateStr
}

function formatDateIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function calculateDays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0
  const d1 = new Date(`${startStr}T00:00:00`)
  const d2 = new Date(`${endStr}T00:00:00`)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1
}

// Cell class function to highlight absence days on the calendar panel
function getCellClassName(cellDate: Date): string {
  if (!store.registros.length) return ''
  const cellIso = formatDateIso(cellDate)

  for (const reg of store.registros) {
    if (cellIso >= reg.fechaInicio && cellIso <= reg.fechaFin) {
      let baseClass = ''
      if (reg.motivo === 'BAJA') baseClass = 'cell-highlight-baja'
      else if (reg.motivo === 'VACACIONES') baseClass = 'cell-highlight-vacaciones'
      else if (reg.motivo === 'PERMISO') baseClass = 'cell-highlight-permiso'
      else baseClass = 'cell-highlight-otro'

      const isStart = cellIso === reg.fechaInicio
      const isEnd = cellIso === reg.fechaFin
      const isMonday = cellDate.getDay() === 1
      const isSunday = cellDate.getDay() === 0

      let posClass = ''
      if ((isStart || isMonday) && (isEnd || isSunday)) {
        posClass = 'cell-range-single'
      } else if (isStart || isMonday) {
        posClass = 'cell-range-start'
      } else if (isEnd || isSunday) {
        posClass = 'cell-range-end'
      } else {
        posClass = 'cell-range-middle'
      }

      return `${baseClass} ${posClass}`
    }
  }
  return ''
}

// Watch datepicker range change to automatically create a new absence
watch(selectedRange, async (newRange) => {
  if (!newRange || newRange.length !== 2 || !newRange[0] || !newRange[1]) return
  if (isSubmitting.value) return

  const startDate = newRange[0]
  const endDate = newRange[1]
  const startIso = formatDateIso(startDate)
  const endIso = formatDateIso(endDate)

  // Determine default motivo
  const defaultMotivo: MotivoCalendarioLaboral = startIso === endIso ? 'BAJA' : 'VACACIONES'

  isSubmitting.value = true
  try {
    await store.addRegistro(props.usuarioId, {
      fechaInicio: startIso,
      fechaFin: endIso,
      motivo: defaultMotivo,
    })
    ElMessage.success(
      `Ausencia registrada (${defaultMotivo === 'BAJA' ? 'Baja de 1 día' : 'Vacaciones'})`,
    )
    // Clear selection so the user can select another date/range freely
    selectedRange.value = null
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al registrar la ausencia'
    ElMessage.error(message)
  } finally {
    isSubmitting.value = false
  }
})

// Inline editing functions
async function handleMotivoChange(
  row: CalendarioLaboralFotografo,
  newMotivo: MotivoCalendarioLaboral,
) {
  try {
    await store.updateRegistro(row.id, { motivo: newMotivo })
    ElMessage.success('Motivo actualizado')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar motivo'
    ElMessage.error(message)
    await store.fetchRegistros(props.usuarioId)
  }
}

async function handleDelete(id: number) {
  try {
    await store.deleteRegistro(id)
    ElMessage.success('Registro eliminado')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar el registro'
    ElMessage.error(message)
  }
}

onMounted(async () => {
  if (props.usuarioId) {
    await store.fetchRegistros(props.usuarioId)
  }
})

watch(
  () => props.usuarioId,
  async (newId) => {
    if (newId) {
      await store.fetchRegistros(newId)
    }
  },
)
</script>

<template>
  <div class="calendario-laboral-wrapper">
    <div class="section-description">
      <p>
        Selecciona un día o rango de fechas en el calendario para registrar una ausencia laboral
        (vacaciones, baja o permiso). Los días no disponibles reducirán automáticamente el tope de
        sesiones simultáneas permitidas en los hoteles correspondientes.
      </p>
    </div>

    <!-- Panel de Calendarios (2 meses daterange) -->
    <div class="calendar-panel-container">
      <div class="calendar-card">
        <el-date-picker-panel
          v-model="selectedRange"
          type="daterange"
          :cell-class-name="getCellClassName"
          class="custom-dual-calendar"
        />
      </div>

      <!-- Leyenda de colores -->
      <div class="calendar-legend">
        <div class="legend-item">
          <span class="legend-dot dot-baja"></span>
          <span>Baja Médica</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot dot-vacaciones"></span>
          <span>Vacaciones</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot dot-permiso"></span>
          <span>Permiso</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot dot-otro"></span>
          <span>Otro</span>
        </div>
      </div>
    </div>

    <!-- Lista / Tabla de Ausencias registradas -->
    <div class="table-section">
      <div class="table-header">
        <h3 class="table-title">
          <el-icon class="title-icon"><CalendarX2 /></el-icon>
          <span>Registro de Ausencias Laborales</span>
        </h3>
        <el-tag type="info" round effect="plain" class="total-tag">
          {{ store.registros.length }} {{ store.registros.length === 1 ? 'registro' : 'registros' }}
        </el-tag>
      </div>

      <el-table
        :data="store.registros"
        v-loading="store.isLoading && isSubmitting"
        stripe
        style="width: 100%"
        empty-text="No hay ausencias ni bajas registradas para este usuario."
        class="ausencias-table"
      >
        <!-- Columna de Periodo de Ausencia -->
        <el-table-column label="Periodo de Ausencia" min-width="210">
          <template #default="{ row }">
            <div class="date-column-content">
              <span v-if="row.fechaInicio === row.fechaFin" class="date-text">
                {{ formatDateDisplay(row.fechaInicio) }}
              </span>
              <span v-else class="date-text">
                {{ formatDateDisplay(row.fechaInicio) }} &nbsp;al&nbsp;
                {{ formatDateDisplay(row.fechaFin) }}
              </span>
            </div>
          </template>
        </el-table-column>

        <!-- Columna de Duración -->
        <el-table-column label="Días" width="95">
          <template #default="{ row }">
            <span class="days-count">
              {{ calculateDays(row.fechaInicio, row.fechaFin) }}
              {{ calculateDays(row.fechaInicio, row.fechaFin) === 1 ? 'día' : 'días' }}
            </span>
          </template>
        </el-table-column>

        <!-- Columna de Motivo (Editable Online) -->
        <el-table-column label="Motivo de Ausencia" min-width="150">
          <template #default="{ row }">
            <el-select
              v-model="row.motivo"
              size="small"
              class="motivo-select"
              @change="(val: MotivoCalendarioLaboral) => handleMotivoChange(row, val)"
            >
              <el-option
                v-for="opt in motivoOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              >
                <div style="display: flex; align-items: center; height: 100%; width: 100%">
                  <el-tag :type="opt.type" size="small" effect="light">{{ opt.label }}</el-tag>
                </div>
              </el-option>
            </el-select>
          </template>
        </el-table-column>

        <!-- Columna de Acciones -->
        <el-table-column label="Acciones" width="100" align="center">
          <template #default="{ row }">
            <el-popconfirm
              title="¿Eliminar esta ausencia del calendario?"
              confirm-button-text="Eliminar"
              cancel-button-text="Cancelar"
              confirm-button-type="danger"
              :width="220"
              @confirm="handleDelete(row.id)"
            >
              <template #reference>
                <el-button type="danger" link :icon="Delete" size="small"> Eliminar </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.calendario-laboral-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.section-description {
  background: var(--el-fill-color-light, #f8fafc);
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 8px;
  padding: 0.85rem 1.15rem;
}

.section-description p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--el-text-color-regular, #64748b);
  line-height: 1.5;
}

.calendar-panel-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.calendar-card {
  display: flex;
  justify-content: center;
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color, #e2e8f0);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 0.75rem;
  overflow-x: auto;
  max-width: 100%;
}

.custom-dual-calendar {
  border: none !important;
  background: transparent !important;
}

.calendar-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  font-size: 0.825rem;
  color: var(--el-text-color-secondary, #64748b);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.dot-baja {
  background-color: #f87171;
}

.dot-vacaciones {
  background-color: #60a5fa;
}

.dot-permiso {
  background-color: #fbbf24;
}

.dot-otro {
  background-color: #94a3b8;
}

.table-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
  margin: 0;
}

.title-icon {
  color: var(--el-color-primary, #3b82f6);
}

.total-tag {
  font-weight: 500;
}

.ausencias-table {
  border-radius: 8px;
  overflow: hidden;
}

.date-column-content {
  display: flex;
  align-items: center;
}

.date-text {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--heading-color, #0f172a);
}

.days-count {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--el-text-color-regular, #475569);
}

.motivo-select {
  width: 100%;
}
</style>

<style>
/* Global CSS for DatePickerPanel highlighted absence cells */
.el-date-table td.cell-highlight-baja .el-date-table-cell {
  background-color: rgba(239, 68, 68, 0.18) !important;
  color: #b91c1c !important;
  font-weight: 700;
}

.el-date-table td.cell-highlight-vacaciones .el-date-table-cell {
  background-color: rgba(59, 130, 246, 0.18) !important;
  color: #1d4ed8 !important;
  font-weight: 700;
}

.el-date-table td.cell-highlight-permiso .el-date-table-cell {
  background-color: rgba(245, 158, 11, 0.2) !important;
  color: #b45309 !important;
  font-weight: 700;
}

.el-date-table td.cell-highlight-otro .el-date-table-cell {
  background-color: rgba(148, 163, 184, 0.2) !important;
  color: #334155 !important;
  font-weight: 700;
}

/* Bordes redondeados solo al principio y al final del rango de ausencia */
.el-date-table td.cell-range-start .el-date-table-cell {
  border-top-left-radius: 14px !important;
  border-bottom-left-radius: 14px !important;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

.el-date-table td.cell-range-end .el-date-table-cell {
  border-top-right-radius: 14px !important;
  border-bottom-right-radius: 14px !important;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
}

.el-date-table td.cell-range-middle .el-date-table-cell {
  border-radius: 0 !important;
}

.el-date-table td.cell-range-single .el-date-table-cell {
  border-radius: 14px !important;
}

html.dark .el-date-table td.cell-highlight-baja .el-date-table-cell {
  background-color: rgba(239, 68, 68, 0.35) !important;
  color: #fca5a5 !important;
}

html.dark .el-date-table td.cell-highlight-vacaciones .el-date-table-cell {
  background-color: rgba(59, 130, 246, 0.35) !important;
  color: #93c5fd !important;
}

html.dark .el-date-table td.cell-highlight-permiso .el-date-table-cell {
  background-color: rgba(245, 158, 11, 0.35) !important;
  color: #fde68a !important;
}

/* Alineación horizontal de botones de acción en Popconfirm */
.el-popconfirm__action {
  display: flex !important;
  flex-direction: row !important;
  justify-content: flex-end !important;
  align-items: center !important;
  gap: 8px !important;
  margin-top: 12px !important;
}

.el-popconfirm__action .el-button {
  margin-left: 0 !important;
  margin-bottom: 0 !important;
  flex-shrink: 0 !important;
}
</style>
