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

  async function addCountry(payload: { codigo: string; nombre: string; codigoTelefono?: string }) {
    try {
      const res = await fetch(`${API_URL}/paises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al guardar el país en la base de datos')
      }
      await fetchCountries()
    } catch (err) {
      console.error('Error adding country:', err)
      throw err
    }
  }

  async function deleteCountry(id: number) {
    try {
      const res = await fetch(`${API_URL}/paises/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al eliminar el país')
      }
      await fetchCountries()
    } catch (err) {
      console.error('Error deleting country:', err)
      throw err
    }
  }

  async function addArea(payload: { paisId: number; nombre: string }) {
    try {
      const res = await fetch(`${API_URL}/areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al crear el área en la base de datos')
      }
      await fetchCountries()
    } catch (err) {
      console.error('Error adding area:', err)
      throw err
    }
  }

  async function deleteArea(id: number) {
    try {
      const res = await fetch(`${API_URL}/areas/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al eliminar el área')
      }
      await fetchCountries()
    } catch (err) {
      console.error('Error deleting area:', err)
      throw err
    }
  }

  return {
    countries,
    isLoading,
    fetchCountries,
    addCountry,
    deleteCountry,
    addArea,
    deleteArea,
  }
})
