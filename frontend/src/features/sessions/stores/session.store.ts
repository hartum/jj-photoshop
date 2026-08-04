import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SesionFotografica, CreateSesionPayload } from '../domain/session.model'

const LOCAL_STORAGE_KEY = 'jj_photoshop_sesiones_fotograficas'

const MOCK_INITIAL_SESSIONS: SesionFotografica[] = [
  {
    id: 1,
    hotelId: 9, // HRLC (Los Cabos)
    fotografoId: 'user-fotografo-1',
    creadorId: 'user-admin-1',
    clienteNombre: 'Familia García',
    clienteEmail: 'garcia@ejemplo.com',
    clienteTelefono: '+34 611 223 344',
    fechaHoraInicio: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T10:00:00',
    fechaHoraFin: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T11:00:00',
    estado: 'PROGRAMADA',
    origen: 'MANUAL',
    notas: 'Sesión al atardecer en la playa de HRLC',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    hotelId: 10, // Nobu (Los Cabos)
    fotografoId: 'user-fotografo-1',
    creadorId: 'user-admin-1',
    clienteNombre: 'Pareja Martínez',
    clienteEmail: 'martinez@ejemplo.com',
    clienteTelefono: '+34 699 887 766',
    fechaHoraInicio: new Date(Date.now() + 172800000).toISOString().split('T')[0] + 'T16:00:00',
    fechaHoraFin: new Date(Date.now() + 172800000).toISOString().split('T')[0] + 'T17:00:00',
    estado: 'PROGRAMADA',
    origen: 'MANUAL',
    notas: 'Sesión romántica cerca de la piscina en Nobu',
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    hotelId: 1, // Ziva (Cancún)
    fotografoId: 'user-fotografo-1',
    creadorId: 'user-admin-1',
    clienteNombre: 'Familia López',
    clienteEmail: 'lopez@ejemplo.com',
    clienteTelefono: '+34 622 334 455',
    fechaHoraInicio: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T12:00:00',
    fechaHoraFin: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T13:00:00',
    estado: 'PROGRAMADA',
    origen: 'MANUAL',
    notas: 'Sesión familiar en la terraza de Ziva',
    createdAt: new Date().toISOString(),
  },
]

export const useSessionStore = defineStore('sessions', () => {
  const sessions = ref<SesionFotografica[]>([])
  const isLoading = ref(false)

  function loadFromStorage() {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      try {
        const stored: SesionFotografica[] = JSON.parse(raw)
        // Fusionar sesiones iniciales si faltan en el storage del navegador
        const storedIds = new Set(stored.map((s) => s.id))
        const missingMocks = MOCK_INITIAL_SESSIONS.filter((m) => !storedIds.has(m.id))

        if (missingMocks.length > 0) {
          sessions.value = [...stored, ...missingMocks]
          saveToStorage()
        } else {
          sessions.value = stored
        }
        return
      } catch (err) {
        console.error('Error al parsear sesiones de localStorage:', err)
      }
    }
    // Si no hay datos guardados, cargar mocks iniciales
    sessions.value = [...MOCK_INITIAL_SESSIONS]
    saveToStorage()
  }

  function saveToStorage() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions.value))
  }

  async function fetchSessions() {
    isLoading.value = true
    try {
      loadFromStorage()
    } finally {
      isLoading.value = false
    }
  }

  async function addSession(payload: CreateSesionPayload): Promise<SesionFotografica> {
    isLoading.value = true
    try {
      const newSession: SesionFotografica = {
        id: Date.now(),
        hotelId: payload.hotelId,
        fotografoId: payload.fotografoId,
        creadorId: payload.fotografoId,
        clienteNombre: payload.clienteNombre.trim(),
        clienteEmail: payload.clienteEmail?.trim(),
        clienteTelefono: payload.clienteTelefono?.trim(),
        fechaHoraInicio: payload.fechaHoraInicio,
        fechaHoraFin: payload.fechaHoraFin,
        estado: 'PROGRAMADA',
        origen: 'MANUAL',
        notas: payload.notas?.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      sessions.value.push(newSession)
      saveToStorage()
      return newSession
    } finally {
      isLoading.value = false
    }
  }

  async function updateSession(id: number, payload: Partial<SesionFotografica>): Promise<void> {
    isLoading.value = true
    try {
      const existing = sessions.value.find((s) => s.id === id)
      if (existing) {
        Object.assign(existing, payload, { updatedAt: new Date().toISOString() })
        saveToStorage()
      }
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
    addSession,
    updateSession,
    cancelSession,
  }
})
