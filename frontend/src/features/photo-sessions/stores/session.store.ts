import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SesionFotografica, CreateSesionPayload } from '../domain/session.model'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const useSessionStore = defineStore('sessions', () => {
  const sessions = ref<SesionFotografica[]>([])
  const isLoading = ref(false)

  async function fetchSessions(hotelId?: number) {
    isLoading.value = true
    try {
      const url = hotelId ? `${API_URL}/sesiones?hotelId=${hotelId}` : `${API_URL}/sesiones`
      const res = await fetch(url, { headers: getAuthHeaders() })
      if (res.ok) {
        sessions.value = await res.json()
      }
    } catch (err) {
      console.warn('Error al obtener sesiones fotográficas:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchSession(id: number): Promise<SesionFotografica | null> {
    try {
      const res = await fetch(`${API_URL}/sesiones/${id}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data: SesionFotografica = await res.json()
        const index = sessions.value.findIndex((s) => s.id === id)
        if (index !== -1) {
          sessions.value[index] = data
        } else {
          sessions.value.push(data)
        }
        return data
      }
      return null
    } catch (err) {
      console.warn(`Error al obtener sesión ${id}:`, err)
      return null
    }
  }

  async function addSession(payload: CreateSesionPayload): Promise<SesionFotografica> {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/sesiones`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: Error al crear la sesión`)
      }

      const created: SesionFotografica = await res.json()
      sessions.value.push(created)
      return created
    } finally {
      isLoading.value = false
    }
  }

  async function updateSession(id: number, payload: Partial<SesionFotografica>): Promise<SesionFotografica> {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/sesiones/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: Error al actualizar la sesión`)
      }

      const updated: SesionFotografica = await res.json()
      const index = sessions.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        sessions.value[index] = updated
      }
      return updated
    } finally {
      isLoading.value = false
    }
  }

  async function cancelSession(id: number): Promise<void> {
    await updateSession(id, { estado: 'CANCELADA' })
  }

  return {
    sessions,
    isLoading,
    fetchSessions,
    fetchSession,
    addSession,
    updateSession,
    cancelSession,
  }
})
