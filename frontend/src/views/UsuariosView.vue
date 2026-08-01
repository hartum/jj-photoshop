<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import type { UserStatus, UserWithProfile } from '@/features/users/domain/user.model'
import { Search, Plus, Edit, Delete, Warning } from '@element-plus/icons-vue'

const userStore = useUserStore()
const profileStore = useProfileStore()

// State
const searchQuery = ref('')
const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const isEditing = ref(false)
const selectedUserId = ref<string | null>(null)
const userToDelete = ref<UserWithProfile | null>(null)

// Form State
const formData = ref({
  nombre: '',
  apellidos: '',
  email: '',
  telefono: '',
  profileId: '',
  status: 'Activo' as UserStatus,
})

const statusOptions: UserStatus[] = ['Activo', 'Inactivo']

onMounted(async () => {
  await profileStore.fetchProfiles()
  await userStore.fetchUsers()
})

// Filtered Users
const filteredUsers = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return userStore.usersWithProfile

  return userStore.usersWithProfile.filter((u) => {
    const fullName = `${u.nombre} ${u.apellidos}`.toLowerCase()
    const email = u.email.toLowerCase()
    const profileName = u.perfil?.name.toLowerCase() ?? ''
    return fullName.includes(query) || email.includes(query) || profileName.includes(query)
  })
})

function getTagType(severity?: string): 'success' | 'warning' | 'info' | 'danger' | 'primary' {
  switch (severity) {
    case 'danger':
      return 'danger'
    case 'warn':
    case 'warning':
      return 'warning'
    case 'success':
      return 'success'
    case 'contrast':
      return 'primary'
    default:
      return 'info'
  }
}

// Modal Open Handlers
function openCreateModal() {
  isEditing.value = false
  selectedUserId.value = null
  formData.value = {
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    profileId: profileStore.activeProfiles[0]?.id ?? '',
    status: 'Activo',
  }
  dialogVisible.value = true
}

function openEditModal(user: UserWithProfile) {
  isEditing.value = true
  selectedUserId.value = user.id
  formData.value = {
    nombre: user.nombre,
    apellidos: user.apellidos,
    email: user.email,
    telefono: user.telefono,
    profileId: user.profileId,
    status: user.status,
  }
  dialogVisible.value = true
}

function confirmDelete(user: UserWithProfile) {
  userToDelete.value = user
  deleteDialogVisible.value = true
}

// Action Handlers
async function handleSaveUser() {
  if (!formData.value.nombre || !formData.value.email || !formData.value.profileId) return

  if (isEditing.value && selectedUserId.value) {
    await userStore.updateUser(selectedUserId.value, { ...formData.value })
  } else {
    await userStore.addUser({ ...formData.value })
  }

  dialogVisible.value = false
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

      <el-button type="primary" :icon="Plus" size="large" @click="openCreateModal">
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

      <span class="user-count"> Total: <strong>{{ filteredUsers.length }}</strong> usuarios </span>
    </div>

    <!-- Tabla de Usuarios con Element Plus -->
    <div class="table-card">
      <el-table
        v-loading="userStore.isLoading || profileStore.isLoading"
        :data="filteredUsers"
        stripe
        style="width: 100%"
      >
        <el-table-column label="Nombre Completo" sortable prop="nombre">
          <template #default="{ row }">
            <span class="user-fullname">{{ row.nombre }} {{ row.apellidos }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="email" label="Correo Electrónico" sortable />

        <el-table-column prop="telefono" label="Teléfono" />

        <el-table-column label="Perfil / Rol" sortable prop="perfil.name">
          <template #default="{ row }">
            <el-tag v-if="row.perfil" :type="getTagType(row.perfil.severity)" effect="light">
              {{ row.perfil.name }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="Estado" sortable>
          <template #default="{ row }">
            <el-tag :type="row.status === 'Activo' ? 'success' : 'info'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="Fecha de Alta" sortable />

        <el-table-column label="Acciones" width="120" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                type="primary"
                link
                :icon="Edit"
                title="Editar usuario"
                @click="openEditModal(row)"
              />
              <el-button
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

    <!-- Modal Crear / Editar Usuario con Element Plus -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? 'Editar Usuario' : 'Nuevo Usuario'"
      width="500px"
      destroy-on-close
    >
      <el-form label-position="top" class="form-container">
        <div class="form-row">
          <el-form-item label="Nombre *" class="flex-1">
            <el-input v-model="formData.nombre" placeholder="Ej. Juan" />
          </el-form-item>

          <el-form-item label="Apellidos *" class="flex-1">
            <el-input v-model="formData.apellidos" placeholder="Ej. Pérez" />
          </el-form-item>
        </div>

        <el-form-item label="Correo electrónico *">
          <el-input v-model="formData.email" placeholder="juan@ejemplo.es" />
        </el-form-item>

        <el-form-item label="Teléfono">
          <el-input v-model="formData.telefono" placeholder="+34 600 000 000" />
        </el-form-item>

        <el-form-item label="Perfil de Usuario *">
          <el-select
            v-model="formData.profileId"
            placeholder="Selecciona un perfil"
            style="width: 100%"
          >
            <el-option
              v-for="profile in profileStore.activeProfiles"
              :key="profile.id"
              :label="profile.name"
              :value="profile.id"
            >
              <div class="profile-option">
                <span class="profile-option-name">{{ profile.name }}</span>
                <small class="profile-option-desc">{{ profile.description }}</small>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="Estado">
          <el-select v-model="formData.status" style="width: 100%">
            <el-option
              v-for="status in statusOptions"
              :key="status"
              :label="status"
              :value="status"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">Cancelar</el-button>
          <el-button type="primary" @click="handleSaveUser">
            {{ isEditing ? 'Guardar Cambios' : 'Crear Usuario' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Modal Confirmar Eliminación con Element Plus -->
    <el-dialog v-model="deleteDialogVisible" title="Confirmar Eliminación" width="400px">
      <div class="confirm-dialog-content">
        <el-icon class="warning-icon" :size="32"><Warning /></el-icon>
        <p v-if="userToDelete">
          ¿Estás seguro de que deseas eliminar al usuario
          <strong>{{ userToDelete.nombre }} {{ userToDelete.apellidos }}</strong>? Esta acción no se puede deshacer.
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

.user-fullname {
  font-weight: 600;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

/* Form Modal Styling */
.form-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.flex-1 {
  flex: 1;
}

.profile-option {
  display: flex;
  flex-direction: column;
}

.profile-option-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.profile-option-desc {
  font-size: 0.75rem;
  color: var(--nav-link-color, #64748b);
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
</style>
