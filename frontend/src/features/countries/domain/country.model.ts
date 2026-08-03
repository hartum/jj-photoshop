export interface HotelItem {
  id: number
  areaId: number
  nombre: string
  direccion?: string | null
  estrellas?: number | null
  latitud?: number | null
  longitud?: number | null
  cadenaHotelera?: string | null
  personaContacto?: string | null
  email?: string | null
  telefono?: string | null
  createdAt: string
  deletedAt?: string | null
}

export interface AreaItem {
  id: number
  paisId: number
  nombre: string
  createdAt: string
  deletedAt?: string | null
  hoteles?: HotelItem[]
}

export interface Pais {
  id: number
  codigo: string
  nombre: string
  codigoTelefono?: string | null
  createdAt: string
  deletedAt?: string | null
  areas?: AreaItem[]
}
