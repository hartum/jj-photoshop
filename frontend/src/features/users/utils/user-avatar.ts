import adminImg from '@/assets/users/admin.png'
import contableImg from '@/assets/users/contable.png'
import fotografoImg from '@/assets/users/fotografo.png'
import gerenteImg from '@/assets/users/gerente.png'
import superuserImg from '@/assets/users/superuser.png'
import supervisorImg from '@/assets/users/supervisor.png'

const avatarMap: Record<string, string> = {
  SUPERUSUARIO: superuserImg,
  ADMIN: adminImg,
  GERENTE: gerenteImg,
  SUPERVISOR: supervisorImg,
  FOTOGRAFO: fotografoImg,
  CONTABLE: contableImg,
}

/**
 * Retorna la imagen por defecto correspondiente al código de perfil.
 * En caso de no encontrar coincidencia, retorna superuser.png por defecto.
 */
export function getDefaultAvatarByProfileCode(code?: string | null): string {
  if (!code) return superuserImg
  const upper = code.toUpperCase().trim()
  return avatarMap[upper] || superuserImg
}
