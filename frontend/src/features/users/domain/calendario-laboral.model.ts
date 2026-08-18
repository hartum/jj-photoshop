export type MotivoCalendarioLaboral = 'BAJA' | 'VACACIONES' | 'PERMISO' | 'OTRO'

export interface CalendarioLaboralFotografo {
  id: number
  usuarioId: string
  fechaInicio: string // YYYY-MM-DD
  fechaFin: string // YYYY-MM-DD
  motivo: MotivoCalendarioLaboral
  notas?: string | null
  createdAt?: string
  updatedAt?: string
}

export type CreateCalendarioLaboralPayload = {
  fechaInicio: string
  fechaFin: string
  motivo?: MotivoCalendarioLaboral | string
  notas?: string
}
