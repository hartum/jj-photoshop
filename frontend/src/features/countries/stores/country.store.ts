import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Pais } from '../domain/country.model'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const useCountryStore = defineStore('countries', () => {
  const countries = ref<Pais[]>([])
  const isLoading = ref(false)

  async function fetchCountries() {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/paises`)
      if (res.ok) {
        countries.value = await res.json()
      }
    } catch (err) {
      console.error('Error fetching countries from API:', err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    countries,
    isLoading,
    fetchCountries,
  }
})
