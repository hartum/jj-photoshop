import type { Perfil } from './profile.model'

export type UserStatus = 'Activo' | 'Inactivo'

export interface User {
  id: string
  nombre: string
  apellidos: string
  email: string
  telefono: string
  profileId: string
  status: UserStatus
  password?: string
  createdAt: string
  deletedAt?: string | null
}

export interface UserWithProfile extends User {
  perfil?: Perfil
}
