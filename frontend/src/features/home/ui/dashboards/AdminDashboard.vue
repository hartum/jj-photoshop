<script setup lang="ts">
import { useDashboard, monthsOptions } from '@/features/home/composables/useDashboard'
import GoalProgressCard from '@/features/goals/ui/GoalProgressCard.vue'
import GoalEvolutionChart from '@/features/goals/ui/GoalEvolutionChart.vue'
import { User, Location, Setting, Money } from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'
import type { HotelProgresoResumen } from '@/features/goals/domain/goal.model'

const {
  hotelStore,
  goalStore,
  commissionStore,
  selectedAnio,
  selectedMes,
  selectedHotelFilter,
  yearsOptions,
  totalUsers,
  activeUsers,
  totalCountries,
  totalAreas,
  totalHotels,
  currentHotelProgreso,
  globalProgresoTotals,
  getSemaforoTagType,
  getSemaforoText,
  getProgressColor,
  goToConfig,
  goToUsers,
  formatCurrency,
  handleNavigateToGoalForm,
  globalMonthlyCommissions,
} = useDashboard()

function semaforoSortMethod(a: HotelProgresoResumen, b: HotelProgresoResumen): number {
  const getScore = (row: HotelProgresoResumen) => {
    if (row.metaImporte <= 0 || row.semaforo === 'SIN_META') return 0
    if (row.semaforo === 'ROJO') return 1
    if (row.semaforo === 'AMARILLO') return 2
    if (row.semaforo === 'VERDE') return 3
    return 0
  }
  return getScore(a) - getScore(b)
}
</script>

<template>
  <div class="dashboard-section">
    <!-- Filtro y Controles de Metas -->
    <div class="section-header-row">
      <h2 class="section-title">Panel Ejecutivo y Metas Globales</h2>
      <div class="controls-bar">
        <el-select
          v-model="selectedHotelFilter"
          placeholder="Todos los Hoteles"
          clearable
          size="default"
          style="width: 220px"
        >
          <el-option v-for="h in hotelStore.hotels" :key="h.id" :label="h.nombre" :value="h.id" />
        </el-select>
        <el-select v-model="selectedMes" size="default" style="width: 140px">
          <el-option v-for="m in monthsOptions" :key="m.value" :label="m.label" :value="m.value" />
        </el-select>
        <el-select v-model="selectedAnio" size="default" style="width: 100px">
          <el-option v-for="y in yearsOptions" :key="y" :label="String(y)" :value="y" />
        </el-select>
        <el-button
          type="primary"
          :icon="Setting"
          size="default"
          @click="handleNavigateToGoalForm(selectedHotelFilter)"
        >
          Configurar Metas
        </el-button>
        <el-button
          type="success"
          plain
          :icon="Money"
          size="default"
          @click="goToConfig('comisiones')"
        >
          Matriz Comisiones
        </el-button>
      </div>
    </div>

    <!-- Barra de Progreso Semafórica Global / Hotel Seleccionado -->
    <div class="goals-summary-block">
      <GoalProgressCard
        v-if="!selectedHotelFilter"
        titulo="Objetivo Global"
        :subtitulo="`Mes de ${monthsOptions.find((m) => m.value === selectedMes)?.label} ${selectedAnio} — Consolidado de ${globalProgresoTotals.numHoteles} hoteles`"
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
        :subtitulo="`${currentHotelProgreso.areaNombre} (${currentHotelProgreso.paisNombre}) — ${monthsOptions.find((m) => m.value === selectedMes)?.label} ${selectedAnio}`"
        :meta-importe="currentHotelProgreso.metaImporte"
        :ventas-reales-usd="currentHotelProgreso.ventasRealesUsd"
        :porcentaje-cumplimiento="currentHotelProgreso.porcentajeCumplimiento"
        :meta-esperada-hoy="currentHotelProgreso.metaEsperadaHoy"
        :desviacion-monetaria="currentHotelProgreso.desviacionMonetaria"
        :semaforo="currentHotelProgreso.semaforo"
        :num-ventas="currentHotelProgreso.numVentas"
        :num-sesiones="currentHotelProgreso.numSesiones"
      />
    </div>

    <!-- Resumen Ejecutivo Financiero de Comisiones para Admin -->
    <el-card class="dashboard-card mb-4" shadow="hover">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span class="font-bold">
            <el-icon style="vertical-align: middle; margin-right: 6px; color: #10b981"
              ><Money
            /></el-icon>
            Resumen Financiero de Comisiones —
            {{ monthsOptions.find((m) => m.value === selectedMes)?.label }} {{ selectedAnio }}
          </span>
          <el-button type="primary" link @click="goToConfig('comisiones')">
            Editar Matriz de Comisiones
          </el-button>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="8">
          <div class="stat-box-comm">
            <span class="stat-box-label">Total Comisiones Generadas</span>
            <span class="stat-box-val text-success">{{
              formatCurrency(globalMonthlyCommissions)
            }}</span>
          </div>
        </el-col>
        <el-col :xs="24" :sm="8">
          <div class="stat-box-comm">
            <span class="stat-box-label">Ventas con Comisión</span>
            <span class="stat-box-val">{{
              formatCurrency(commissionStore.resumen?.totalVentasUsd || 0)
            }}</span>
          </div>
        </el-col>
        <el-col :xs="24" :sm="8">
          <div class="stat-box-comm">
            <span class="stat-box-label">Comisiones Pendientes de Pago</span>
            <span class="stat-box-val text-warning">
              {{ commissionStore.comisiones.filter((c) => c.estado === 'PENDIENTE').length }}
              pendientes
            </span>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- Gráficas de Línea (Line Charts): Mes a Día y Año a Mes -->
    <GoalEvolutionChart
      :data="goalStore.evolucion"
      :loading="goalStore.isLoading"
      :hotel-name="currentHotelProgreso?.hotelNombre"
    />

    <!-- Tabla Comparativa de Hoteles con Semáforos -->
    <el-card
      class="dashboard-card mb-4"
      header="Desglose y Estado de Metas por Hotel"
      shadow="hover"
    >
      <el-table
        :data="goalStore.progresoHoteles"
        :default-sort="{ prop: 'porcentajeCumplimiento', order: 'descending' }"
        style="width: 100%"
        size="small"
        stripe
      >
        <el-table-column prop="hotelNombre" label="Hotel" min-width="160" sortable />
        <el-table-column prop="areaNombre" label="Área" min-width="120" sortable />
        <el-table-column prop="metaImporte" label="Meta Mensual" width="140" align="right" sortable>
          <template #default="{ row }">
            <span class="font-semibold">{{ formatCurrency(row.metaImporte) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="ventasRealesUsd"
          label="Ventas Reales"
          width="140"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span class="font-bold text-primary">{{ formatCurrency(row.ventasRealesUsd) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="metaEsperadaHoy"
          label="Ritmo a Hoy"
          width="130"
          align="right"
          sortable
        >
          <template #default="{ row }">
            <span>{{ formatCurrency(row.metaEsperadaHoy) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="porcentajeCumplimiento" label="Avance" min-width="170" sortable>
          <template #default="{ row }">
            <el-progress
              :percentage="Math.min(100, Math.max(0, row.porcentajeCumplimiento))"
              :color="getProgressColor(row.semaforo, row.metaImporte)"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        <el-table-column
          prop="semaforo"
          label="Semáforo"
          width="140"
          align="center"
          sortable
          :sort-method="semaforoSortMethod"
        >
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

    <!-- Tarjetas de Estadísticas Rápidas de la Plataforma -->
    <h3 class="subsection-title">Estructura y Personal</h3>
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-primary">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Usuarios Activos</span>
            <span class="stat-value"
              >{{ activeUsers }} <small>/ {{ totalUsers }}</small></span
            >
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-warning">
            <el-icon><Location /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Países y Áreas</span>
            <span class="stat-value"
              >{{ totalCountries }} <small>p / {{ totalAreas }} á</small></span
            >
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-success">
            <el-icon><Building2 :size="24" /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Hoteles</span>
            <span class="stat-value">{{ totalHotels }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="dashboard-card stat-card" shadow="hover">
          <div class="card-icon bg-info">
            <el-icon><Setting /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">Enlaces Rápidos</span>
            <div class="quick-actions">
              <el-button size="small" type="primary" link @click="goToConfig()"
                >Configuración</el-button
              >
              <el-button size="small" type="primary" link @click="goToUsers">Usuarios</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
