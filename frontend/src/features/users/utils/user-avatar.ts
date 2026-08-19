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
 * Genera un avatar SVG con las iniciales del usuario y el color de fondo asignado (o por defecto).
 * @param nombre Nombre del usuario
 * @param apellidos Apellidos del usuario
 * @param color Color hexadecimal o CSS (ej. #3b82f6)
 */
export function getDefaultAvatar(
  nombre?: string | null,
  apellidos?: string | null,
  color?: string | null,
): string {
  const firstLetter = (nombre || '').trim().charAt(0).toUpperCase()
  const secondLetter = (apellidos || '').trim().charAt(0).toUpperCase()
  let initials = `${firstLetter}${secondLetter}`.trim()
  if (!initials) {
    initials = 'U'
  }

  const bgColor = color && color.trim() ? color.trim() : '#3b82f6'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" fill="${bgColor}" rx="50" />
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${initials.length > 1 ? 38 : 46}" font-weight="600" letter-spacing="1">
    ${initials}
  </text>
</svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
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
