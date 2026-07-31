import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User, UserRole, UserStatus } from '../domain/user.model'

export const useUserStore = defineStore('usersManagement', () => {
  const users = ref<User[]>([
    {
      id: 'usr-1',
      name: 'Carlos Mendoza',
      email: 'carlos.mendoza@jjphotoshop.es',
      phone: '+34 612 345 678',
      role: 'Gestor Tienda',
      storeLocation: 'JJ Photoshop - Centro',
      status: 'Activo',
      createdAt: '2025-01-15',
    },
    {
      id: 'usr-2',
      name: 'Laura Fernández',
      email: 'laura.foto@jjphotoshop.es',
      phone: '+34 699 887 766',
      role: 'Fotógrafo',
      storeLocation: 'JJ Photoshop - Norte',
      status: 'Activo',
      createdAt: '2025-02-01',
    },
    {
      id: 'usr-3',
      name: 'María Ruiz',
      email: 'maria.ruiz@gmail.com',
      phone: '+34 655 443 322',
      role: 'Cliente',
      storeLocation: 'JJ Photoshop - Centro',
      status: 'Activo',
      createdAt: '2025-03-10',
    },
    {
      id: 'usr-4',
      name: 'Javier Jiménez',
      email: 'admin@jjphotoshop.es',
      phone: '+34 600 112 233',
      role: 'Administrador',
      storeLocation: 'Oficina Central',
      status: 'Activo',
      createdAt: '2024-11-20',
    },
  ])

  function addUser(newUser: {
    name: string
    email: string
    phone: string
    role: UserRole
    storeLocation: string
    status: UserStatus
  }) {
    const created: User = {
      id: `usr-${Date.now()}`,
      ...newUser,
      createdAt: new Date().toISOString().split('T')[0] ?? '',
    }
    users.value.unshift(created)
  }

  function deleteUser(id: string) {
    users.value = users.value.filter((u) => u.id !== id)
  }

  return {
    users,
    addUser,
    deleteUser,
  }
})
