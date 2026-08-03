import type { Perfil } from './profile.model'

export type UserStatus = 'Activo' | 'Inactivo'

export interface User {
  id: string
  nombre: string
  apellidos: string
  email: string
  telefono: string
  profileId: number
  status: UserStatus
  password?: string
  imagen?: string | null
  areaIds?: number[]
  hotelIds?: number[]
  createdAt: string
  deletedAt?: string | null
}

export interface UserWithProfile extends User {
  perfil?: Perfil
}
