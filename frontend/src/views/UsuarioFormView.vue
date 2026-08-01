<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import type { UserStatus } from '@/features/users/domain/user.model'
import { ArrowLeft, Check, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const profileStore = useProfileStore()

const userId = computed(() => route.params.id as string | undefined)
const isEditing = computed(() => !!userId.value)

const isSaving = ref(false)

const formData = ref({
  nombre: '',
  apellidos: '',
  email: '',
  password: '',
  telefono: '',
  profileId: '',
  status: 'Activo' as UserStatus,
})

const isActivo = computed({
  get: () => formData.value.status === 'Activo',
  set: (val: boolean) => {
    formData.value.status = val ? 'Activo' : 'Inactivo'
  },
})

onMounted(async () => {
  await profileStore.fetchProfiles()
  await userStore.fetchUsers()

  if (isEditing.value && userId.value) {
    const existing = userStore.users.find((u) => u.id === userId.value)
    if (existing) {
      formData.value = {
        nombre: existing.nombre,
        apellidos: existing.apellidos,
        email: existing.email,
        password: '',
        telefono: existing.telefono,
        profileId: existing.profileId,
        status: existing.status,
      }
    } else {
      ElMessage.error('Usuario no encontrado')
      router.push('/usuarios')
    }
  } else {
    const defaultProfile = profileStore.activeProfiles[0]
    if (defaultProfile) {
      formData.value.profileId = defaultProfile.id
    }
  }
})

function handleCancel() {
  router.push('/usuarios')
}

async function handleSave() {
  if (!formData.value.nombre || !formData.value.email || !formData.value.profileId) {
    ElMessage.warning('Por favor completa todos los campos requeridos (*)')
    return
  }

  if (!isEditing.value && !formData.value.password) {
    ElMessage.warning('La contraseña es obligatoria para nuevos usuarios (*)')
    return
  }

  isSaving.value = true
  try {
    if (isEditing.value && userId.value) {
      await userStore.updateUser(userId.value, { ...formData.value })
      ElMessage.success('Usuario actualizado correctamente')
    } else {
      await userStore.addUser({ ...formData.value })
      ElMessage.success('Usuario creado correctamente')
    }
    router.push('/usuarios')
  } catch (err: any) {
    ElMessage.error(err.message || 'Error al conectar con la base de datos')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="view-container">
    <!-- Header con botón Volver y Título -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" circle @click="handleCancel" class="back-btn" />
        <div>
          <h1 class="page-title">
            {{ isEditing ? 'Editar Usuario' : 'Nuevo Usuario' }}
          </h1>
          <p class="page-subtitle">
            {{
              isEditing
                ? 'Modifica los datos y perfil del usuario'
                : 'Completa la información para dar de alta a un nuevo usuario'
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Formulario alineado según documentación oficial de Element Plus -->
    <el-form
      :model="formData"
      label-width="150px"
      label-position="right"
      class="user-form"
      @submit.prevent="handleSave"
    >
      <el-form-item label="Nombre *" required>
        <el-input v-model="formData.nombre" placeholder="Ej. Juan" />
      </el-form-item>

      <el-form-item label="Apellidos *" required>
        <el-input v-model="formData.apellidos" placeholder="Ej. Pérez" />
      </el-form-item>

      <el-form-item label="Correo electrónico *" required>
        <el-input v-model="formData.email" placeholder="juan@ejemplo.es" />
      </el-form-item>

      <el-form-item
        :label="isEditing ? 'Contraseña' : 'Contraseña *'"
        :required="!isEditing"
      >
        <el-input
          v-model="formData.password"
          type="password"
          show-password
          :placeholder="isEditing ? 'Dejar en blanco para no cambiar' : '••••••••'"
        />
      </el-form-item>

      <el-form-item label="Teléfono">
        <el-input v-model="formData.telefono" placeholder="+34 600 000 000" />
      </el-form-item>

      <el-form-item label="Perfil / Rol *" required>
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
        <el-checkbox v-model="isActivo" label="Usuario Activo" />
      </el-form-item>

      <el-form-item class="form-actions-item">
        <el-button
          type="primary"
          :icon="Check"
          :loading="isSaving"
          @click="handleSave"
        >
          {{ isEditing ? 'Guardar Cambios' : 'Crear Usuario' }}
        </el-button>
        <el-button :icon="Close" @click="handleCancel">Cancelar</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.view-container {
  padding: 2rem;
  max-width: 700px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  font-size: 1.1rem;
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

.user-form {
  margin-top: 1rem;
}

.form-actions-item {
  margin-top: 1.5rem;
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
</style>
