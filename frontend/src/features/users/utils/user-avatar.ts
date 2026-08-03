import userImg from '@/assets/users/user.png'
import adminSvg from '@/assets/users/admin.svg'
import contableSvg from '@/assets/users/contable.svg'
import fotografoSvg from '@/assets/users/fotografo.svg'
import gerenteSvg from '@/assets/users/gerente.svg'
import superuserSvg from '@/assets/users/superuser.svg'
import supervisorSvg from '@/assets/users/supervisor.svg'

const svgMap: Record<string, string> = {
  SUPERUSUARIO: superuserSvg,
  ADMIN: adminSvg,
  GERENTE: gerenteSvg,
  SUPERVISOR: supervisorSvg,
  FOTOGRAFO: fotografoSvg,
  CONTABLE: contableSvg,
}

/**
 * Retorna la imagen por defecto genérica para cualquier usuario sin imagen.
 */
export function getDefaultAvatar(): string {
  return userImg
}

/**
 * Retorna la URL del recurso SVG correspondiente al código de perfil.
 */
export function getRoleSvg(code?: string | null): string {
  if (!code) return superuserSvg
  const upper = code.toUpperCase().trim()
  return svgMap[upper] || superuserSvg
}
