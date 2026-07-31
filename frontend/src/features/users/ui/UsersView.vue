<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '../stores/user.store'
import type { UserRole, UserStatus } from '../domain/user.model'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Toolbar from 'primevue/toolbar'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'

const userStore = useUserStore()

// Dialog & Form state
const dialogVisible = ref(false)
const searchQuery = ref('')

const newUser = ref({
  name: '',
  email: '',
  phone: '',
  role: 'Cliente' as UserRole,
  storeLocation: 'JJ Photoshop - Centro',
  status: 'Activo' as UserStatus,
})

const rolesOptions = ref<UserRole[]>(['Cliente', 'Fotógrafo', 'Gestor Tienda', 'Administrador'])
const storesOptions = ref<string[]>([
  'JJ Photoshop - Centro',
  'JJ Photoshop - Norte',
  'JJ Photoshop - Sur',
  'Oficina Central',
])

function openCreateDialog() {
  newUser.value = {
    name: '',
    email: '',
    phone: '',
    role: 'Cliente',
    storeLocation: 'JJ Photoshop - Centro',
    status: 'Activo',
  }
  dialogVisible.value = true
}

function handleSaveUser() {
  if (!newUser.value.name || !newUser.value.email) return
  userStore.addUser({ ...newUser.value })
  dialogVisible.value = false
}

function getRoleSeverity(role: UserRole) {
  switch (role) {
    case 'Administrador':
      return 'danger'
    case 'Gestor Tienda':
      return 'warn'
    case 'Fotógrafo':
      return 'info'
    default:
      return 'secondary'
  }
}
</script>

<template>
  <div class="users-page">
    <!-- Top Header Navigation -->
    <header class="app-header">
      <div class="header-content">
        <div class="brand">
          <i class="pi pi-camera brand-icon"></i>
          <div>
            <h1 class="brand-name">JJ Photoshop</h1>
            <span class="brand-sub">Gestión de Tiendas de Fotografía</span>
          </div>
        </div>

        <nav class="nav-links">
          <a href="#" class="nav-item active"><i class="pi pi-users"></i> Usuarios</a>
          <a href="#" class="nav-item"><i class="pi pi-shopping-bag"></i> Pedidos de Fotos</a>
          <a href="#" class="nav-item"><i class="pi pi-building"></i> Tiendas Físicas</a>
        </nav>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="content-container">
      <!-- Toolbar Action Bar -->
      <Toolbar class="users-toolbar">
        <template #start>
          <div class="search-box">
            <IconField iconPosition="left">
              <InputIcon class="pi pi-search" />
              <InputText
                v-model="searchQuery"
                placeholder="Buscar por nombre o email..."
                class="search-input"
              />
            </IconField>
          </div>
        </template>

        <template #end>
          <Button
            label="Nuevo Usuario"
            icon="pi pi-user-plus"
            severity="primary"
            @click="openCreateDialog"
          />
        </template>
      </Toolbar>

      <!-- Users DataTable -->
      <div class="table-card">
        <DataTable
          :value="userStore.users"
          paginator
          :rows="10"
          responsiveLayout="scroll"
          dataKey="id"
          class="p-datatable-sm"
        >
          <Column field="name" header="Nombre y Apellidos" sortable></Column>
          <Column field="email" header="Email" sortable></Column>
          <Column field="phone" header="Teléfono"></Column>
          <Column field="storeLocation" header="Tienda Asignada" sortable></Column>
          <Column field="role" header="Rol" sortable>
            <template #body="{ data }">
              <Tag :value="data.role" :severity="getRoleSeverity(data.role)" />
            </template>
          </Column>
          <Column field="status" header="Estado">
            <template #body="{ data }">
              <Tag :value="data.status" :severity="data.status === 'Activo' ? 'success' : 'contrast'" />
            </template>
          </Column>
          <Column field="createdAt" header="Fecha Alta" sortable></Column>
          <Column header="Acciones" style="width: 8rem; text-align: center">
            <template #body="{ data }">
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                size="small"
                @click="userStore.deleteUser(data.id)"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </main>

    <!-- Create User Modal Dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      modal
      header="Registrar Nuevo Usuario"
      :style="{ width: '30rem' }"
    >
      <div class="form-container">
        <div class="form-field">
          <label for="name">Nombre completo</label>
          <InputText id="name" v-model="newUser.name" placeholder="Ej. Ana Martínez" />
        </div>

        <div class="form-field">
          <label for="email">Correo electrónico</label>
          <InputText id="email" v-model="newUser.email" placeholder="ana@ejemplo.es" />
        </div>

        <div class="form-field">
          <label for="phone">Teléfono de contacto</label>
          <InputText id="phone" v-model="newUser.phone" placeholder="+34 600 000 000" />
        </div>

        <div class="form-field">
          <label for="role">Rol de usuario</label>
          <Select id="role" v-model="newUser.role" :options="rolesOptions" />
        </div>

        <div class="form-field">
          <label for="store">Tienda Física Asignada</label>
          <Select id="store" v-model="newUser.storeLocation" :options="storesOptions" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="dialogVisible = false" />
        <Button label="Guardar Usuario" severity="primary" @click="handleSaveUser" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.users-page {
  min-height: 100vh;
  background-color: var(--p-surface-950, #09090b);
  color: var(--p-surface-50, #fafafa);
}

.app-header {
  background-color: var(--p-surface-900, #18181b);
  border-bottom: 1px solid var(--p-surface-800, #27272a);
  padding: 1rem 2rem;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  font-size: 1.8rem;
  color: #3b82f6;
}

.brand-name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #60a5fa 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-sub {
  font-size: 0.75rem;
  color: var(--p-surface-400, #a1a1aa);
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-item {
  color: var(--p-surface-400, #a1a1aa);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.nav-item:hover, .nav-item.active {
  color: #ffffff;
  background-color: var(--p-surface-800, #27272a);
}

.content-container {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.users-toolbar {
  background-color: var(--p-surface-900, #18181b);
  border: 1px solid var(--p-surface-800, #27272a);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
}

.search-input {
  width: 280px;
}

.table-card {
  background-color: var(--p-surface-900, #18181b);
  border: 1px solid var(--p-surface-800, #27272a);
  border-radius: 8px;
  overflow: hidden;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-surface-300, #d4d4d8);
}
</style>
