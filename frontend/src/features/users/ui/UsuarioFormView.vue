<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/features/users/stores/user.store'
import { useProfileStore } from '@/features/users/stores/profile.store'
import type { UserStatus } from '@/features/users/domain/user.model'
import { getDefaultAvatar } from '@/features/users/utils/user-avatar'
import {
  ArrowLeft,
  Check,
  Close,
  Upload,
  Delete,
  ZoomIn,
  ZoomOut,
  RefreshLeft,
  RefreshRight,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const profileStore = useProfileStore()

const userId = computed(() => route.params.id as string | undefined)
const isEditing = computed(() => !!userId.value)

const isSaving = ref(false)

// Ref para cropper dialog y file input
const fileInput = ref<HTMLInputElement | null>(null)
const cropperDialogVisible = ref(false)
const imageToCrop = ref<string | null>(null)
const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)

const formData = ref({
  nombre: '',
  apellidos: '',
  email: '',
  password: '',
  telefono: '',
  profileId: null as number | null,
  status: 'Activo' as UserStatus,
  imagen: null as string | null,
})

const isActivo = computed({
  get: () => formData.value.status === 'Activo',
  set: (val: boolean) => {
    formData.value.status = val ? 'Activo' : 'Inactivo'
  },
})

const displayAvatar = computed(() => {
  if (formData.value.imagen) {
    return formData.value.imagen
  }
  return getDefaultAvatar()
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
        imagen: existing.imagen || null,
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

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    ElMessage.error('Por favor selecciona un archivo de imagen válido')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    imageToCrop.value = e.target?.result as string
    cropperDialogVisible.value = true
  }
  reader.readAsDataURL(file)

  target.value = ''
}

function applyCrop() {
  if (!cropperRef.value) return
  const { canvas } = cropperRef.value.getResult()
  if (canvas) {
    formData.value.imagen = canvas.toDataURL('image/png')
    cropperDialogVisible.value = false
    ElMessage.success('Imagen recortada y asignada correctamente')
  }
}

function removeCustomImage() {
  formData.value.imagen = null
  ElMessage.info('Imagen personalizada removida. Se asignará la imagen según perfil.')
}

function zoom(factor: number) {
  cropperRef.value?.zoom(factor)
}

function rotate(angle: number) {
  cropperRef.value?.rotate(angle)
}

function handleCancel() {
  router.push('/usuarios')
}

async function handleSave() {
  if (!formData.value.nombre || !formData.value.email || formData.value.profileId === null) {
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
      await userStore.updateUser(userId.value, {
        ...formData.value,
        profileId: formData.value.profileId,
      })
      ElMessage.success('Usuario actualizado correctamente')
    } else {
      await userStore.addUser({
        ...formData.value,
        profileId: formData.value.profileId,
      })
      ElMessage.success('Usuario creado correctamente')
    }
    router.push('/usuarios')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al conectar con la base de datos'
    ElMessage.error(message)
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
                ? 'Modifica los datos, perfil e imagen del usuario'
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
      <!-- Campo Fotografía / Avatar de Usuario -->
      <el-form-item label="Imagen">
        <div class="avatar-field-container">
          <el-avatar
            :src="displayAvatar"
            shape="circle"
            :size="90"
            class="user-avatar"
          />
          <div class="avatar-actions">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="onFileSelected"
            />
            <div class="avatar-buttons">
              <el-button type="primary" :icon="Upload" @click="triggerFileInput">
                {{ formData.imagen ? 'Cambiar Imagen' : 'Subir Imagen' }}
              </el-button>
              <el-button
                v-if="formData.imagen"
                type="danger"
                plain
                :icon="Delete"
                @click="removeCustomImage"
              >
                Quitar Imagen
              </el-button>
            </div>
            <small class="avatar-hint">
              {{
                formData.imagen
                  ? 'Imagen personalizada cargada.'
                  : 'Sin imagen asignada. Mostrando imagen por defecto según perfil seleccionado.'
              }}
            </small>
          </div>
        </div>
      </el-form-item>

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

    <!-- Diálogo para Recorte de Imagen -->
    <el-dialog
      v-model="cropperDialogVisible"
      title="Recortar Imagen de Usuario"
      width="550px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="cropper-container" v-if="imageToCrop">
        <cropper
          ref="cropperRef"
          class="cropper"
          :src="imageToCrop"
          :stencil-component="CircleStencil"
          :stencil-props="{
            aspectRatio: 1,
          }"
        />
        <div class="cropper-controls">
          <el-button-group>
            <el-button :icon="ZoomIn" @click="zoom(1.2)">Acercar</el-button>
            <el-button :icon="ZoomOut" @click="zoom(0.8)">Alejar</el-button>
            <el-button :icon="RefreshLeft" @click="rotate(-90)">Rotar Izq.</el-button>
            <el-button :icon="RefreshRight" @click="rotate(90)">Rotar Der.</el-button>
          </el-button-group>
        </div>
      </div>
      <template #footer>
        <el-button @click="cropperDialogVisible = false">Cancelar</el-button>
        <el-button type="primary" :icon="Check" @click="applyCrop">
          Guardar Recorte
        </el-button>
      </template>
    </el-dialog>
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

.avatar-field-container {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.user-avatar {
  border: 2px solid var(--el-border-color, #e2e8f0);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  object-fit: cover;
  flex-shrink: 0;
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.avatar-buttons {
  display: flex;
  gap: 0.5rem;
}

.avatar-hint {
  font-size: 0.8rem;
  color: var(--nav-link-color, #64748b);
  line-height: 1.3;
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

.cropper-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.cropper {
  height: 320px;
  width: 100%;
  background: #1e293b;
  border-radius: 8px;
  overflow: hidden;
}

.cropper-controls {
  display: flex;
  justify-content: center;
}
</style>
