export interface Hotel {
  id: number
  areaId: number
  areaNombre?: string
  paisId?: number
  paisNombre?: string
  paisCodigo?: string
  nombre: string
  direccion?: string
  estrellas?: number
  latitud?: number | null
  longitud?: number | null
  cadenaHotelera?: string
  personaContacto?: string
  email?: string
  telefono?: string
  metaMensualDefault?: number | null
  createdAt?: string
}

export interface CreateHotelPayload {
  areaId: number
  nombre: string
  direccion?: string
  estrellas?: number
  latitud?: number
  longitud?: number
  cadenaHotelera?: string
  personaContacto?: string
  email?: string
  telefono?: string
  metaMensualDefault?: number | null
}

export type UpdateHotelPayload = Partial<CreateHotelPayload>
