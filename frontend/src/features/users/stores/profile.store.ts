import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Perfil } from '../domain/profile.model'

const API_URL = import.meta.env.VITE_API_URL

export const useProfileStore = defineStore('profiles', () => {
  const profiles = ref<Perfil[]>([])
  const isLoading = ref(false)

  const activeProfiles = computed(() => profiles.value.filter((p) => !p.deletedAt))

  async function fetchProfiles() {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/roles`)
      if (res.ok) {
        profiles.value = await res.json()
      }
    } catch (err) {
      console.error('Error fetching profiles from DB:', err)
    } finally {
      isLoading.value = false
    }
  }

  function getProfileById(id: number | string): Perfil | undefined {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id
    return profiles.value.find((p) => p.id === numericId)
  }

  return {
    profiles,
    activeProfiles,
    isLoading,
    fetchProfiles,
    getProfileById,
  }
})
