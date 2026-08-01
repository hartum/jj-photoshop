import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Perfil } from '../domain/profile.model'

const API_URL = 'http://localhost:3000/api'

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

  function getProfileById(id: string): Perfil | undefined {
    return profiles.value.find((p) => p.id === id)
  }

  return {
    profiles,
    activeProfiles,
    isLoading,
    fetchProfiles,
    getProfileById,
  }
})
