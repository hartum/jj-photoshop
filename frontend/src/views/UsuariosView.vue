<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import type { UserStatus, UserWithProfile } from '@/features/users/domain/user.model'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'

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

      <Button
        label="Nuevo Usuario"
        icon="pi pi-user-plus"
        severity="primary"
        @click="openCreateModal"
      />
    </div>

    <!-- Barra de búsqueda y filtrado -->
    <div class="toolbar-card">
      <IconField iconPosition="left" class="search-field">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchQuery"
          placeholder="Buscar por nombre, email o perfil..."
          class="search-input"
        />
      </IconField>

      <span class="user-count"> Total: <strong>{{ filteredUsers.length }}</strong> usuarios </span>
    </div>

    <!-- Tabla de Usuarios -->
    <div class="table-card">
      <DataTable
        :value="filteredUsers"
        :loading="userStore.isLoading || profileStore.isLoading"
        paginator
        :rows="10"
        responsiveLayout="scroll"
        dataKey="id"
        class="p-datatable-sm custom-datatable"
      >
        <Column header="Nombre Completo" sortable sortBy="nombre">
          <template #body="{ data }">
            <span class="user-fullname">{{ data.nombre }} {{ data.apellidos }}</span>
          </template>
        </Column>

        <Column field="email" header="Correo Electrónico" sortable></Column>

        <Column field="telefono" header="Teléfono"></Column>

        <Column header="Perfil / Rol" sortable sortBy="perfil.name">
          <template #body="{ data }">
            <Tag
              v-if="data.perfil"
              :value="data.perfil.name"
              :severity="data.perfil.severity"
              class="profile-tag"
            />
          </template>
        </Column>

        <Column field="status" header="Estado" sortable>
          <template #body="{ data }">
            <Tag
              :value="data.status"
              :severity="data.status === 'Activo' ? 'success' : 'secondary'"
            />
          </template>
        </Column>

        <Column field="createdAt" header="Fecha de Alta" sortable></Column>

        <Column header="Acciones" style="width: 7rem; text-align: center">
          <template #body="{ data }">
            <div class="action-buttons">
              <Button
                icon="pi pi-pencil"
                severity="secondary"
                text
                rounded
                size="small"
                title="Editar usuario"
                @click="openEditModal(data)"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                size="small"
                title="Eliminar usuario"
                @click="confirmDelete(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Modal Crear / Editar Usuario -->
    <Dialog
      v-model:visible="dialogVisible"
      modal
      :header="isEditing ? 'Editar Usuario' : 'Nuevo Usuario'"
      :style="{ width: '32rem' }"
    >
      <div class="form-container">
        <div class="form-row">
          <div class="form-field">
            <label for="nombre">Nombre *</label>
            <InputText id="nombre" v-model="formData.nombre" placeholder="Ej. Juan" />
          </div>

          <div class="form-field">
            <label for="apellidos">Apellidos *</label>
            <InputText id="apellidos" v-model="formData.apellidos" placeholder="Ej. Pérez" />
          </div>
        </div>

        <div class="form-field">
          <label for="email">Correo electrónico *</label>
          <InputText id="email" v-model="formData.email" placeholder="juan@ejemplo.es" />
        </div>

        <div class="form-field">
          <label for="telefono">Teléfono</label>
          <InputText id="telefono" v-model="formData.telefono" placeholder="+34 600 000 000" />
        </div>

        <div class="form-field">
          <label for="perfil">Perfil de Usuario *</label>
          <Select
            id="perfil"
            v-model="formData.profileId"
            :options="profileStore.activeProfiles"
            optionLabel="name"
            optionValue="id"
            placeholder="Selecciona un perfil"
          >
            <template #option="{ option }">
              <div class="profile-option">
                <span class="profile-option-name">{{ option.name }}</span>
                <small class="profile-option-desc">{{ option.description }}</small>
              </div>
            </template>
          </Select>
        </div>

        <div class="form-field">
          <label for="status">Estado</label>
          <Select id="status" v-model="formData.status" :options="statusOptions" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="dialogVisible = false" />
        <Button
          :label="isEditing ? 'Guardar Cambios' : 'Crear Usuario'"
          severity="primary"
          @click="handleSaveUser"
        />
      </template>
    </Dialog>

    <!-- Modal Confirmar Eliminación -->
    <Dialog
      v-model:visible="deleteDialogVisible"
      modal
      header="Confirmar Eliminación"
      :style="{ width: '25rem' }"
    >
      <div class="confirm-dialog-content">
        <i class="pi pi-exclamation-triangle warning-icon"></i>
        <p v-if="userToDelete">
          ¿Estás seguro de que deseas eliminar al usuario
          <strong>{{ userToDelete.nombre }} {{ userToDelete.apellidos }}</strong>? Esta acción no se puede deshacer.
        </p>
      </div>

      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="deleteDialogVisible = false" />
        <Button label="Eliminar" severity="danger" @click="handleDeleteUser" />
      </template>
    </Dialog>
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

.search-field {
  width: 320px;
}

.search-input {
  width: 100%;
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

.profile-tag {
  font-size: 0.75rem;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 0.25rem;
}

/* Form Modal Styling */
.form-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-field {
  flex: 1;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--heading-color, #0f172a);
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
  font-size: 2rem;
  color: #f59e0b;
}

.confirm-dialog-content p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.4;
}
</style>
