<script setup lang="ts">
import { computed } from 'vue'
import { useDashboard, monthsOptions } from '@/features/home/composables/useDashboard'
import GoalProgressCard from '@/features/goals/ui/GoalProgressCard.vue'
import GoalEvolutionChart from '@/features/goals/ui/GoalEvolutionChart.vue'
import { User, Location, Setting, Money } from '@element-plus/icons-vue'
import { Building2 } from '@lucide/vue'
import type { HotelProgresoResumen } from '@/features/goals/domain/goal.model'
import type { Hotel } from '@/features/hotels/domain/hotel.model'

const {
  countryStore,
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

interface AreaGroup {
  id: number
  nombre: string
  hoteles: Hotel[]
}

interface CountryGroup {
  id: number
  nombre: string
  codigo: string
  areas: AreaGroup[]
}

const groupedHotelsByCountry = computed<CountryGroup[]>(() => {
  const hotels = hotelStore.hotels
  const groupsMap = new Map<number, CountryGroup>()

  for (const h of hotels) {
    const countryId = h.paisId || 0
    const countryName = h.paisNombre || 'Sin País'
    const countryObj = countryStore.countries.find(
      (c) => c.id === countryId || c.nombre === countryName,
    )
    const countryCode = countryObj?.codigo || h.paisCodigo || ''

    if (!groupsMap.has(countryId)) {
      groupsMap.set(countryId, {
        id: countryId,
        nombre: countryName,
        codigo: countryCode,
        areas: [],
      })
    }

    const countryGroup = groupsMap.get(countryId)!
    const areaId = h.areaId || 0
    const areaName = h.areaNombre || 'Sin Área'

    let areaGroup = countryGroup.areas.find((a) => a.id === areaId)
    if (!areaGroup) {
      areaGroup = {
        id: areaId,
        nombre: areaName,
        hoteles: [],
      }
      countryGroup.areas.push(areaGroup)
    }

    areaGroup.hoteles.push(h)
  }

  return Array.from(groupsMap.values())
})

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
          filterable
          clearable
          size="default"
          style="width: 250px"
          popper-class="custom-group-select-dropdown"
        >
          <el-option-group
            v-for="pais in groupedHotelsByCountry"
            :key="pais.id"
            :label="pais.codigo ? `${pais.nombre} (${pais.codigo})` : pais.nombre"
          >
            <template v-for="area in pais.areas" :key="area.id">
              <!-- Item no seleccionable por cada Área -->
              <el-option
                :value="`area-${area.id}`"
                :label="area.nombre"
                disabled
                class="area-header-option"
              >
                <div class="area-option-header">
                  <el-icon :size="18" class="area-icon"><Location /></el-icon>
                  <span class="area-title">{{ area.nombre }}</span>
                </div>
              </el-option>

              <!-- Hoteles pertenecientes a este área -->
              <el-option
                v-for="h in area.hoteles"
                :key="h.id"
                :label="`${h.nombre} (${area.nombre})`"
                :value="h.id"
                class="hotel-sub-option"
              >
                <div class="option-item-content hotel-option-item">
                  <el-icon :size="18" class="hotel-option-icon"><Building2 /></el-icon>
                  <span class="hotel-name">{{ h.nombre }}</span>
                </div>
              </el-option>
            </template>
          </el-option-group>
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

<style>
/* Estilos globales para el dropdown personalizado de hoteles con áreas no seleccionables */
.custom-group-select-dropdown .el-select-group__title {
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  padding-top: 0.6rem !important;
  padding-bottom: 0.3rem !important;
  letter-spacing: 0.02em;
}

.custom-group-select-dropdown .area-header-option {
  height: 30px !important;
  line-height: 30px !important;
  background-color: transparent !important;
  background: none !important;
  border: none !important;
  cursor: default !important;
  opacity: 1 !important;
  margin: 2px 0 !important;
  padding: 0 12px !important;
}

.custom-group-select-dropdown .area-header-option.is-disabled {
  color: var(--heading-color, #0f172a) !important;
  cursor: default !important;
  background-color: transparent !important;
  background: none !important;
}

.custom-group-select-dropdown .area-option-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.custom-group-select-dropdown .area-icon {
  font-size: 1.15rem !important;
  color: #e6a23c !important;
  flex-shrink: 0;
}

.custom-group-select-dropdown .area-title {
  font-weight: 600;
  font-size: 0.85rem;
  color: #475569;
  letter-spacing: 0.01em;
}

html.dark .custom-group-select-dropdown .area-header-option {
  background-color: transparent !important;
  background: none !important;
  border: none !important;
}

html.dark .custom-group-select-dropdown .area-title {
  color: #94a3b8 !important;
}

html.dark .custom-group-select-dropdown .el-select-group__title {
  color: #f1f5f9 !important;
}

.custom-group-select-dropdown .hotel-sub-option {
  padding-left: 28px !important;
  height: 32px !important;
  line-height: 32px !important;
}

.custom-group-select-dropdown .hotel-option-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-group-select-dropdown .hotel-option-icon {
  color: #94a3b8 !important;
  font-size: 1.15rem !important;
}

.custom-group-select-dropdown .hotel-name {
  font-weight: 500;
  font-size: 0.85rem;
  color: var(--app-text, #334155);
}
</style>

