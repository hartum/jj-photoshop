export type EstadoSesion = 'PROGRAMADA' | 'COMPLETADA' | 'CANCELADA' | 'NO_SHOW'
export type OrigenSesion = 'MANUAL' | 'BOT'

export interface SesionFotografica {
  id: number
  hotelId: number
  fotografoId: string
  creadorId: string
  clienteNombre: string
  clienteEmail?: string
  clienteTelefono?: string
  fechaHoraInicio: string // ISO string
  fechaHoraFin: string // ISO string
  estado: EstadoSesion
  origen: OrigenSesion
  notas?: string
  googleCalendarEventId?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateSesionPayload {
  hotelId: number
  fotografoId: string
  clienteNombre: string
  clienteEmail?: string
  clienteTelefono?: string
  fechaHoraInicio: string
  fechaHoraFin: string
  notas?: string
}
