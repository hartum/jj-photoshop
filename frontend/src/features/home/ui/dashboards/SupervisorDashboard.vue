<script setup lang="ts">
import { useDashboard, monthsOptions } from '@/features/home/composables/useDashboard'
import GoalProgressCard from '@/features/goals/ui/GoalProgressCard.vue'
import GoalEvolutionChart from '@/features/goals/ui/GoalEvolutionChart.vue'
import { Money } from '@element-plus/icons-vue'

const {
  goalStore,
  commissionStore,
  selectedAnio,
  selectedMes,
  selectedHotelFilter,
  getSemaforoTagType,
  getSemaforoText,
  getProgressColor,
  formatCurrency,
  supervisorHotels,
  supervisorMonthlyCommissions,
} = useDashboard()
</script>

<template>
  <div class="dashboard-section">
    <div class="section-header-row">
      <h2 class="section-title">Control de Metas y Comisiones</h2>
      <div class="controls-bar">
        <el-select
          v-model="selectedHotelFilter"
          placeholder="Selecciona un Hotel"
          clearable
          size="default"
          style="width: 220px"
        >
          <el-option v-for="h in supervisorHotels" :key="h.id" :label="h.nombre" :value="h.id" />
        </el-select>
        <el-select v-model="selectedMes" size="default" style="width: 140px">
          <el-option
            v-for="m in monthsOptions"
            :key="m.value"
            :label="m.label"
            :value="m.value"
          />
        </el-select>
      </div>
    </div>

    <!-- Tarjeta de Comisiones del Supervisor -->
    <el-card class="dashboard-card mb-4" shadow="hover">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span class="font-bold">
            <el-icon style="vertical-align: middle; margin-right: 6px; color: #c026d3"
              ><Money
            /></el-icon>
            Tus Comisiones —
            {{ monthsOptions.find((m) => m.value === selectedMes)?.label }} {{ selectedAnio }}
          </span>
          <el-tag type="info" effect="light">2% sobre ventas del hotel</el-tag>
        </div>
      </template>
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        "
      >
        <div>
          <div style="font-size: 0.85rem; color: var(--el-text-color-secondary)">
            Tu comisión acumulada:
          </div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #c026d3">
            {{ formatCurrency(supervisorMonthlyCommissions) }}
          </div>
        </div>
        <div>
          <div
            style="font-size: 0.825rem; color: var(--el-text-color-secondary); margin-bottom: 4px"
          >
            Total comisiones generadas en tus hoteles:
          </div>
          <div style="font-size: 1.3rem; font-weight: 700; color: #0f172a">
            {{ formatCurrency(commissionStore.resumen?.totalComisionesUsd || 0) }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- Barra de Progreso del Hotel -->
    <div class="goals-summary-block">
      <div v-for="hotelProg in goalStore.progresoHoteles" :key="hotelProg.hotelId">
        <GoalProgressCard
          :titulo="`Meta del Hotel: ${hotelProg.hotelNombre}`"
          :subtitulo="`${hotelProg.areaNombre} — ${monthsOptions.find((m) => m.value === selectedMes)?.label} ${selectedAnio}`"
          :meta-importe="hotelProg.metaImporte"
          :ventas-reales-usd="hotelProg.ventasRealesUsd"
          :porcentaje-cumplimiento="hotelProg.porcentajeCumplimiento"
          :meta-esperada-hoy="hotelProg.metaEsperadaHoy"
          :desviacion-monetaria="hotelProg.desviacionMonetaria"
          :semaforo="hotelProg.semaforo"
          :num-ventas="hotelProg.numVentas"
          :num-sesiones="hotelProg.numSesiones"
          class="mb-4"
        />

        <!-- Tabla de Desglose por Fotógrafo en este Hotel -->
        <el-card
          class="dashboard-card mb-4"
          :header="`Rendimiento Individual de Fotógrafos — ${hotelProg.hotelNombre}`"
          shadow="hover"
        >
          <div v-if="hotelProg.fotografos.length === 0" class="empty-hint p-3">
            No hay fotógrafos asignados a este hotel.
          </div>
          <el-table v-else :data="hotelProg.fotografos" style="width: 100%" size="small" stripe>
            <el-table-column prop="nombreCompleto" label="Fotógrafo" min-width="160" />
            <el-table-column label="Meta Asignada" width="130" align="right">
              <template #default="{ row }">
                <span class="font-semibold">{{ formatCurrency(row.metaImporte) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Ventas Reales" width="130" align="right">
              <template #default="{ row }">
                <span class="font-bold text-primary">{{
                  formatCurrency(row.ventasRealesUsd)
                }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Ritmo a Hoy" width="120" align="right">
              <template #default="{ row }">
                <span>{{ formatCurrency(row.metaEsperadaHoy) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Avance" min-width="170">
              <template #default="{ row }">
                <div class="table-progress-cell">
                  <el-progress
                    :percentage="Math.min(100, Math.max(0, row.porcentajeCumplimiento))"
                    :color="getProgressColor(row.semaforo, row.metaImporte)"
                    :stroke-width="8"
                  />
                  <span class="progress-pct-label">{{ row.porcentajeCumplimiento }}%</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="Semáforo" width="130" align="center">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  effect="dark"
                  :type="getSemaforoTagType(row.semaforo, row.metaImporte)"
                >
                  {{ getSemaforoText(row.semaforo, row.metaImporte) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </div>

    <!-- Gráficas de Línea -->
    <GoalEvolutionChart
      :data="goalStore.evolucion"
      :loading="goalStore.isLoading"
      :hotel-name="goalStore.progresoHoteles[0]?.hotelNombre"
    />
  </div>
</template>
