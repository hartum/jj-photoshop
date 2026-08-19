import adminSvg from '@/assets/users/admin.svg'
import agendadorSvg from '@/assets/users/agendador.svg'
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
  AGENDADOR: agendadorSvg,
  CONTABLE: contableSvg,
}

/**
 * Retorna las iniciales del usuario a partir de su nombre y apellidos.
 * @param nombre Nombre del usuario
 * @param apellidos Apellidos del usuario
 */
export function getUserInitials(
  nombre?: string | null,
  apellidos?: string | null,
): string {
  const firstLetter = (nombre || '').trim().charAt(0).toUpperCase()
  const secondLetter = (apellidos || '').trim().charAt(0).toUpperCase()
  const initials = `${firstLetter}${secondLetter}`.trim()
  return initials || 'U'
}

/**
 * Retorna el color de fondo para el avatar del usuario (color personalizado o azul por defecto).
 * @param color Color hexadecimal o CSS (ej. #3b82f6)
 */
export function getUserBgColor(color?: string | null): string {
  return color && color.trim() ? color.trim() : '#3b82f6'
}


/**
 * Retorna la URL del recurso SVG correspondiente al código de perfil.
 */
export function getRoleSvg(code?: string | null): string {
  if (!code) return superuserSvg
  const upper = code.toUpperCase().trim()
  return svgMap[upper] || superuserSvg
}

/**
 * Retorna el tipo de tag (severity) correspondiente al código de perfil según el diseño de UX.
 */
export function getRoleTagType(
  code?: string | null,
): 'success' | 'primary' | 'warning' | 'danger' | 'info' {
  if (!code) return 'info'
  const upper = code.toUpperCase().trim()
  const map: Record<string, 'success' | 'primary' | 'warning' | 'danger' | 'info'> = {
    SUPERUSUARIO: 'primary',
    ADMIN: 'danger',
    GERENTE: 'danger',
    SUPERVISOR: 'warning',
    FOTOGRAFO: 'success',
    AGENDADOR: 'primary',
    CONTABLE: 'info',
  }
  return map[upper] || 'info'
}
