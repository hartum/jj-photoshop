<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useCountryStore } from '@/features/countries/stores/country.store'
import type { UserWithProfile } from '@/features/users/domain/user.model'
import { getDefaultAvatar, getRoleSvg } from '@/features/users/utils/user-avatar'
import {
  getRolePermissions,
  canEditUser,
  canDeleteUser,
  type RoleCode,
} from '@/shared/permissions'
import { Search, Plus, EditPen, Delete, Warning } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const profileStore = useProfileStore()
const authStore = useAuthStore()
const countryStore = useCountryStore()

// State
const searchQuery = ref('')
const deleteDialogVisible = ref(false)
const userToDelete = ref<UserWithProfile | null>(null)

const currentUser = computed(() => authStore.user)

onMounted(async () => {
  await Promise.all([
    profileStore.fetchProfiles(),
    userStore.fetchUsers(),
    countryStore.fetchCountries(),
  ])
})

function getHotelIdsInArea(areaId: number): number[] {
  for (const pais of countryStore.countries) {
    const area = (pais.areas || []).find((a) => a.id === areaId)
    if (area) {
      return (area.hoteles || []).map((h) => h.id)
    }
  }
  return []
}

// Visible users filtered by RBAC role visibility and scope
const visibleUsersByRole = computed(() => {
  const user = currentUser.value
  if (!user) return []

  const roleCode = user.roleCode?.toUpperCase()
  const perm = getRolePermissions(roleCode)

  return userStore.usersWithProfile.filter((u) => {
    const targetRoleCode = (u.perfil?.code?.toUpperCase() as RoleCode) || 'FOTOGRAFO'

    // 1. Role visibility check
    if (!perm.visibleTargetRoles.includes(targetRoleCode)) {
      return false
    }

    // 2. Scope check
    if (perm.scopeType === 'GLOBAL') {
      return true
    }

    if (perm.scopeType === 'AREAS') {
      const myAreaIds = new Set(user.areaIds || [])
      const myHotelIdsInAreas = new Set<number>()
      myAreaIds.forEach((areaId) => {
        getHotelIdsInArea(areaId).forEach((hId) => myHotelIdsInAreas.add(hId))
      })

      if (u.id === user.id) return true

      if (u.areaIds && u.areaIds.some((id) => myAreaIds.has(id))) {
        return true
      }

      if (u.hotelIds && u.hotelIds.some((hId) => myHotelIdsInAreas.has(hId))) {
        return true
      }

      return false
    }

    if (perm.scopeType === 'HOTELS') {
      const myHotelIds = new Set(user.hotelIds || [])
      if (u.id === user.id) return true
      if (u.hotelIds && u.hotelIds.some((hId) => myHotelIds.has(hId))) {
        return true
      }
      return false
    }

    return false
  })
})

// Filtered Users with search query
const filteredUsers = computed(() => {
  const baseList = visibleUsersByRole.value
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return baseList

  return baseList.filter((u) => {
    const fullName = `${u.nombre} ${u.apellidos}`.toLowerCase()
    const email = u.email.toLowerCase()
    const profileName = u.perfil?.name.toLowerCase() ?? ''
    return fullName.includes(query) || email.includes(query) || profileName.includes(query)
  })
})

function getUserAvatar(user: UserWithProfile): string {
  if (user.imagen) return user.imagen
  return getDefaultAvatar()
}

// Navigation Handlers
function navigateToCreate() {
  router.push('/usuarios/nuevo')
}

function navigateToEdit(user: UserWithProfile) {
  router.push(`/usuarios/${user.id}/editar`)
}

function confirmDelete(user: UserWithProfile) {
  userToDelete.value = user
  deleteDialogVisible.value = true
}

async function handleDeleteUser() {
  if (userToDelete.value) {
    await userStore.deleteUser(userToDelete.value.id)
    userToDelete.value = null
  }
  deleteDialogVisible.value = false
}
</script>

<template>
  <div class="view-container">
    <!-- Header de la sección -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Gestión de Usuarios</h1>
        <p class="page-subtitle">Administra los usuarios del sistema y sus perfiles de acceso</p>
      </div>

      <el-button type="primary" :icon="Plus" size="large" @click="navigateToCreate">
        Nuevo Usuario
      </el-button>
    </div>

    <!-- Barra de búsqueda y filtrado -->
    <div class="toolbar-card">
      <el-input
        v-model="searchQuery"
        placeholder="Buscar por nombre, email o perfil..."
        :prefix-icon="Search"
        clearable
        class="search-input"
      />

      <span class="user-count">
        Total: <strong>{{ filteredUsers.length }}</strong> usuarios
      </span>
    </div>

    <!-- Tabla de Usuarios con Element Plus -->
    <div class="table-card">
      <el-table
        v-loading="userStore.isLoading || profileStore.isLoading"
        :data="filteredUsers"
        stripe
        style="width: 100%"
      >
        <el-table-column label="Nombre" sortable prop="nombre" width="120">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :src="getUserAvatar(row)" shape="circle" :size="36" />
              <span class="user-fullname">{{ row.nombre }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          prop="apellidos"
          label="Apellidos"
          show-overflow-tooltip
          sortable
          width="160"
        />

        <el-table-column prop="email" label="Correo Electrónico" show-overflow-tooltip sortable />

        <el-table-column prop="telefono" label="Teléfono" width="140" />

        <el-table-column label="Perfil / Rol" sortable prop="perfil.name" width="180">
          <template #default="{ row }">
            <div class="role-cell" v-if="row.perfil">
              <img :src="getRoleSvg(row.perfil.code)" class="role-icon" :alt="row.perfil.name" />
              <el-tag :type="row.perfil.severity || 'info'" effect="light">
                {{ row.perfil.name }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="Estado" sortable width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'Activo' ? 'success' : 'info'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="Fecha Alta" sortable width="130" />

        <el-table-column label="Acciones" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                v-if="canEditUser(currentUser?.roleCode, row.perfil?.code, currentUser?.id, row.id)"
                type="primary"
                link
                :icon="EditPen"
                title="Editar usuario"
                @click="navigateToEdit(row)"
              />
              <el-button
                v-if="canDeleteUser(currentUser?.roleCode, row.perfil?.code, currentUser?.id, row.id)"
                type="danger"
                link
                :icon="Delete"
                title="Eliminar usuario"
                @click="confirmDelete(row)"
              />
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Modal Confirmar Eliminación -->
    <el-dialog v-model="deleteDialogVisible" title="Confirmar Eliminación" width="400px">
      <div class="confirm-dialog-content">
        <el-icon class="warning-icon" :size="32"><Warning /></el-icon>
        <p v-if="userToDelete">
          ¿Estás seguro de que deseas eliminar al usuario
          <strong>{{ userToDelete.nombre }} {{ userToDelete.apellidos }}</strong
          >? Esta acción no se puede deshacer.
        </p>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">Cancelar</el-button>
          <el-button type="danger" @click="handleDeleteUser">Eliminar</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.view-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.toolbar-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.search-input {
  width: 320px;
}

.user-count {
  font-size: 0.85rem;
  color: var(--nav-link-color, #64748b);
}

.table-card {
  background-color: var(--toolbar-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 10px;
  overflow: hidden;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.role-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.role-icon {
  width: 35px;
  height: 35px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(50%) sepia(0%) saturate(0%) hue-rotate(244deg)
    brightness(97%) contrast(85%);
}

.user-fullname {
  font-weight: 600;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 0.1rem;
  .el-button {
    font-size: 1.3rem;
    padding: 4px;
  }
}

/* Confirm Dialog Styling */
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

@media (max-width: 768px) {
  .view-container {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .page-header .el-button {
    width: 100%;
  }

  .toolbar-card {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .search-input {
    width: 100%;
  }

  .table-card {
    overflow-x: auto;
  }

  :deep(.el-dialog) {
    width: 92% !important;
    max-width: 400px;
  }
}
</style>
