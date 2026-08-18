import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  CalendarioLaboralFotografo,
  CreateCalendarioLaboralPayload,
} from '../domain/calendario-laboral.model'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const useCalendarioLaboralStore = defineStore('calendario-laboral', () => {
  const registros = ref<CalendarioLaboralFotografo[]>([])
  const isLoading = ref(false)

  async function fetchRegistros(usuarioId: string) {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/usuarios/${usuarioId}/calendario-laboral`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        registros.value = await res.json()
      } else {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: Error al cargar calendario laboral`)
      }
    } catch (err) {
      console.error('Error al cargar calendario laboral:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function addRegistro(
    usuarioId: string,
    payload: CreateCalendarioLaboralPayload,
  ): Promise<CalendarioLaboralFotografo> {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/usuarios/${usuarioId}/calendario-laboral`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: Error al registrar en calendario laboral`)
      }
      const nuevo: CalendarioLaboralFotografo = await res.json()
      registros.value.push(nuevo)
      registros.value.sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
      return nuevo
    } catch (err) {
      console.error('Error al añadir registro a calendario laboral:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateRegistro(
    id: number,
    payload: Partial<CalendarioLaboralFotografo>,
  ): Promise<CalendarioLaboralFotografo> {
    isLoading.value = true
    try {
      const res = await fetch(`${API_URL}/calendario-laboral/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: Error al actualizar calendario laboral`)
      }
      const actualizado: CalendarioLaboralFotografo = await res.json()
      const index = registros.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        registros.value[index] = actualizado
        registros.value.sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
      }
      return actualizado
    } catch (err) {
      console.error('Error al actualizar registro de calendario laboral:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function deleteRegistro(id: number): Promise<void> {
    isLoading.value = true
    try {
      const headers: Record<string, string> = {}
      const token = localStorage.getItem('token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch(`${API_URL}/calendario-laboral/${id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: Error al eliminar registro de calendario laboral`)
      }
      registros.value = registros.value.filter((r) => r.id !== id)
    } catch (err) {
      console.error('Error al eliminar registro de calendario laboral:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    registros,
    isLoading,
    fetchRegistros,
    addRegistro,
    updateRegistro,
    deleteRegistro,
  }
})
