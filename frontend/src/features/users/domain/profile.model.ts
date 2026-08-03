export interface Perfil {
  id: number
  code: string
  name: string
  description: string
  severity?: string
  deletedAt?: string | null
}
