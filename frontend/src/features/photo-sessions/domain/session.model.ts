export type EstadoSesion = 'PROGRAMADA' | 'COMPLETADA' | 'CANCELADA' | 'NO_SHOW'
export type OrigenSesion = 'MANUAL' | 'BOT'

export interface SesionFotografica {
  id: number
  hotelId: number
  fotografoId?: string | null
  creadorId: string
  clienteNombre: string
  clienteEmail?: string
  clienteTelefono?: string
  numeroHabitacion?: string
  numAdultos?: number
  numNinos?: number
  fechaSalida?: string
  concepto?: string
  fechaHoraInicio: string // ISO string
  estado: EstadoSesion
  origen: OrigenSesion
  notas?: string
  googleCalendarEventId?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateSesionPayload {
  hotelId: number
  fotografoId?: string | null
  creadorId?: string
  clienteNombre: string
  clienteEmail?: string
  clienteTelefono?: string
  numeroHabitacion?: string
  numAdultos?: number
  numNinos?: number
  fechaSalida?: string
  concepto?: string
  fechaHoraInicio: string
  notas?: string
}
