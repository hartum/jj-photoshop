<script setup lang="ts">
import { useDashboard, monthsOptions } from '@/features/home/composables/useDashboard'
import GoalProgressCard from '@/features/goals/ui/GoalProgressCard.vue'
import GoalEvolutionChart from '@/features/goals/ui/GoalEvolutionChart.vue'
import {
  User,
  Location,
  Edit,
  Money,
} from '@element-plus/icons-vue'
import { Hotel } from '@lucide/vue'

const {
  goalStore,
  commissionStore,
  selectedAnio,
  selectedMes,
  selectedHotelFilter,
  currentHotelProgreso,
  globalProgresoTotals,
  getSemaforoTagType,
  getSemaforoText,
  getProgressColor,
  formatCurrency,
  handleNavigateToGoalForm,
  managerAreas,
  managerHotels,
  managerTeam,
  gerenteMonthlyCommissions,
} = useDashboard()
</script>

<template>
  <div class="dashboard-section">
    <div class="section-header-row">
      <h2 class="section-title">Control de Áreas, Metas y Comisiones</h2>
      <div class="controls-bar">
        <el-select
          v-model="selectedHotelFilter"
          placeholder="Todos tus Hoteles"
          clearable
          size="default"
          style="width: 220px"
        >
          <el-option v-for="h in managerHotels" :key="h.id" :label="h.nombre" :value="h.id" />
        </el-select>
        <el-select v-model="selectedMes" size="default" style="width: 140px">
          <el-option
            v-for="m in monthsOptions"
            :key="m.value"
            :label="m.label"
            :value="m.value"
          />
        </el-select>
        <el-button
          type="primary"
          :icon="Edit"
          size="default"
          @click="handleNavigateToGoalForm(selectedHotelFilter)"
        >
          Establecer Meta
        </el-button>
      </div>
    </div>

    <!-- Tarjeta de Comisiones del Gerente -->
    <el-card class="dashboard-card mb-4" shadow="hover">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span class="font-bold">
            <el-icon style="vertical-align: middle; margin-right: 6px; color: #2563eb"
              ><Money
            /></el-icon>
            Tus Comisiones —
            {{ monthsOptions.find((m) => m.value === selectedMes)?.label }} {{ selectedAnio }}
          </span>
          <el-tag type="primary" effect="light">2% sobre ventas de tus áreas</el-tag>
        </div>
      </template>
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.5rem;
        "
      >
        <div>
          <div style="font-size: 0.85rem; color: var(--el-text-color-secondary)">
            Tu comisión acumulada:
          </div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #2563eb">
            {{ formatCurrency(gerenteMonthlyCommissions) }}
          </div>
        </div>
        <div style="display: flex; gap: 2rem; flex-wrap: wrap">
          <div>
            <div
              style="
                font-size: 0.825rem;
                color: var(--el-text-color-secondary);
                margin-bottom: 4px;
              "
            >
              Ventas en tus áreas:
            </div>
            <div style="font-size: 1.3rem; font-weight: 700; color: #0f172a">
              {{ formatCurrency(commissionStore.resumen?.totalVentasUsd || 0) }}
            </div>
          </div>
          <div>
            <div
              style="
                font-size: 0.825rem;
                color: var(--el-text-color-secondary);
                margin-bottom: 4px;
              "
            >
              Total comisiones en tus hoteles:
            </div>
            <div style="font-size: 1.3rem; font-weight: 700; color: #0f172a">
              {{ formatCurrency(commissionStore.resumen?.totalComisionesUsd || 0) }}
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- Barra de Progreso Semafórica Consolidada de las Áreas -->
    <div class="goals-summary-block">
      <GoalProgressCard
        v-if="!selectedHotelFilter"
        titulo="Objetivo Comercial de tus Áreas"
        :subtitulo="`Mes de ${monthsOptions.find((m) => m.value === selectedMes)?.label} ${selectedAnio}`"
        :meta-importe="globalProgresoTotals.metaTotal"
        :ventas-reales-usd="globalProgresoTotals.ventasTotal"
        :porcentaje-cumplimiento="globalProgresoTotals.porcentaje"
        :meta-esperada-hoy="globalProgresoTotals.metaEsperadaTotal"
        :desviacion-monetaria="globalProgresoTotals.desviacion"
        :semaforo="globalProgresoTotals.semaforo"
      />
      <GoalProgressCard
        v-else-if="currentHotelProgreso"
        :titulo="`Meta Mensual: ${currentHotelProgreso.hotelNombre}`"
        :subtitulo="`${currentHotelProgreso.areaNombre} — ${monthsOptions.find((m) => m.value === selectedMes)?.label} ${selectedAnio}`"
        :meta-importe="currentHotelProgreso.metaImporte"
        :ventas-reales-usd="currentHotelProgreso.ventasRealesUsd"
        :porcentaje-cumplimiento="currentHotelProgreso.porcentajeCumplimiento"
        :meta-esperada-hoy="currentHotelProgreso.metaEsperadaHoy"
        :desviacion-monetaria="currentHotelProgreso.desviacionMonetaria"
        :semaforo="currentHotelProgreso.semaforo"
      />
    </div>

    <!-- Gráficas de Línea -->
    <GoalEvolutionChart
      :data="goalStore.evolucion"
      :loading="goalStore.isLoading"
      :hotel-name="currentHotelProgreso?.hotelNombre"
    />

    <!-- Tabla de Hoteles en tus Áreas con Semáforos -->
    <el-card
      class="dashboard-card mb-4"
      header="Rendimiento de Hoteles en tus Áreas"
      shadow="hover"
    >
      <el-table :data="goalStore.progresoHoteles" style="width: 100%" size="small" stripe>
        <el-table-column prop="hotelNombre" label="Hotel" min-width="160" />
        <el-table-column prop="areaNombre" label="Área" min-width="120" />
        <el-table-column label="Meta Mensual" width="130" align="right">
          <template #default="{ row }">
            <span class="font-semibold">{{ formatCurrency(row.metaImporte) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Ventas Reales" width="130" align="right">
          <template #default="{ row }">
            <span class="font-bold text-primary">{{ formatCurrency(row.ventasRealesUsd) }}</span>
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
        <el-table-column label="Acción" width="130" align="center">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              link
              :icon="Edit"
              @click="handleNavigateToGoalForm(row.hotelId)"
            >
              Establecer Meta
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Resumen Operativo de Áreas y Personal -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="8">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-primary">
            <el-icon><Location /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Tus Áreas</span>
            <span class="stat-value">{{ managerAreas.length }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-success">
            <el-icon><Hotel :size="24" /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Hoteles Asociados</span>
            <span class="stat-value">{{ managerHotels.length }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-warning">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Personal a tu Cargo</span>
            <span class="stat-value">{{ managerTeam.length }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
