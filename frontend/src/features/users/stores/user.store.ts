import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserWithProfile } from '../domain/user.model'
import { useProfileStore } from './profile.store'

const API_URL = 'http://localhost:3000/api'

export const useUserStore = defineStore('users', () => {
  const profileStore = useProfileStore()
  const users = ref<User[]>([])
  const isLoading = ref(false)

  const usersWithProfile = computed<UserWithProfile[]>(() => {
    return users.value
      .filter((u) => !u.deletedAt)
      .map((u) => ({
        ...u,
        perfil: profileStore.getProfileById(u.profileId),
      }))
  })

  async function fetchUsers() {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/usuarios`)
      if (res.ok) {
        users.value = await res.json()
      }
    } catch (err) {
      console.error('Error fetching users from DB:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function addUser(userData: Omit<User, 'id' | 'createdAt' | 'deletedAt'>) {
    try {
      const res = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      if (res.ok) {
        const created: User = await res.json()
        users.value.unshift(created)
      }
    } catch (err) {
      console.error('Error creating user in DB:', err)
    }
  }

  async function updateUser(
    id: string,
    updatedData: Partial<Omit<User, 'id' | 'createdAt' | 'deletedAt'>>,
  ) {
    try {
      const res = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      })
      if (res.ok) {
        const updated: User = await res.json()
        const index = users.value.findIndex((u) => u.id === id)
        if (index !== -1) {
          users.value[index] = updated
        }
      }
    } catch (err) {
      console.error('Error updating user in DB:', err)
    }
  }

  async function deleteUser(id: string) {
    try {
      const res = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        const user = users.value.find((u) => u.id === id)
        if (user) {
          user.deletedAt = new Date().toISOString().split('T')[0] ?? ''
        }
      }
    } catch (err) {
      console.error('Error deleting user in DB:', err)
    }
  }

  return {
    users,
    usersWithProfile,
    isLoading,
    fetchUsers,
    addUser,
    updateUser,
    deleteUser,
  }
})
