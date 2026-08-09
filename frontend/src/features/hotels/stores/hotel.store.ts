import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Hotel, CreateHotelPayload, UpdateHotelPayload } from '../domain/hotel.model'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const useHotelStore = defineStore('hotels', () => {
  const hotels = ref<Hotel[]>([])
  const isLoading = ref(false)

  async function fetchHotels() {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/hoteles`)
      if (res.ok) {
        hotels.value = await res.json()
      }
    } catch (err) {
      console.error('Error fetching hotels:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function addHotel(payload: CreateHotelPayload) {
    try {
      const res = await fetch(`${API_URL}/hoteles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al guardar el hotel')
      }
      await fetchHotels()
    } catch (err) {
      console.error('Error adding hotel:', err)
      throw err
    }
  }

  async function updateHotel(id: number, payload: UpdateHotelPayload) {
    try {
      const res = await fetch(`${API_URL}/hoteles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al actualizar el hotel')
      }
      await fetchHotels()
    } catch (err) {
      console.error('Error updating hotel:', err)
      throw err
    }
  }

  async function deleteHotel(id: number) {
    try {
      const res = await fetch(`${API_URL}/hoteles/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al eliminar el hotel')
      }
      await fetchHotels()
    } catch (err) {
      console.error('Error deleting hotel:', err)
      throw err
    }
  }

  return {
    hotels,
    isLoading,
    fetchHotels,
    addHotel,
    updateHotel,
    deleteHotel,
  }
})
