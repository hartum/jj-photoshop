import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'

function parseLocalDateTime(dateStr: string): Date {
  if (!dateStr) return new Date()
  const cleanStr = dateStr.replace(' ', 'T').slice(0, 19)
  const hasTimezone = cleanStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(cleanStr)
  const isoStr = hasTimezone ? cleanStr : `${cleanStr}:00Z`.replace(':00:00Z', ':00Z')
  return new Date(isoStr)
}

function getAuthUserId(request: any): string | null {
  try {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null
    const token = authHeader.substring(7)
    const decoded = request.server.jwt.decode(token) as { id: string } | null
    return decoded?.id || null
  } catch {
    return null
  }
}

export async function sessionRoutes(fastify: FastifyInstance) {
  // GET /api/sesiones (Obtiene las sesiones fotográficas activas)
  fastify.get('/api/sesiones', async (request, reply) => {
    try {
      const { hotelId } = request.query as { hotelId?: string }

      const where: any = { deletedAt: null }
      const userId = getAuthUserId(request)

      if (userId) {
        const user = await prisma.usuario.findUnique({
          where: { id: userId },
          include: {
            role: true,
            hotelesAsignados: true,
            areasAsignadas: true,
          },
        })

        if (user) {
          const roleCode = user.role.codigo.toUpperCase()
          const isGlobalAccess = ['SUPERUSUARIO', 'ADMIN', 'CONTABLE'].includes(roleCode)

          if (!isGlobalAccess) {
            let allowedHotelIds: number[] = []

            if (roleCode === 'GERENTE') {
              const areaIds = user.areasAsignadas.map((a) => a.areaId)
              const hotelsInAreas = await prisma.hotel.findMany({
                where: { areaId: { in: areaIds }, deletedAt: null },
                select: { id: true },
              })
              allowedHotelIds = hotelsInAreas.map((h) => h.id)
            } else {
              allowedHotelIds = user.hotelesAsignados.map((h) => h.hotelId)
            }

            if (hotelId) {
              const reqHotelId = Number(hotelId)
              if (!allowedHotelIds.includes(reqHotelId)) {
                return reply.send([])
              }
              where.hotelId = reqHotelId
            } else {
              where.hotelId = { in: allowedHotelIds }
            }
          } else if (hotelId) {
            where.hotelId = Number(hotelId)
          }
        } else if (hotelId) {
          where.hotelId = Number(hotelId)
        }
      } else if (hotelId) {
        where.hotelId = Number(hotelId)
      }

      const sesiones = await prisma.sesionFotografica.findMany({
        where,
        include: {
          hotel: true,
          fotografo: true,
          creador: true,
        },
        orderBy: { fechaHoraInicio: 'asc' },
      })

      const mapped = sesiones.map((s) => ({
        id: s.id,
        hotelId: s.hotelId,
        fotografoId: s.fotografoId || null,
        creadorId: s.creadorId,
        clienteNombre: s.clienteNombre,
        clienteEmail: s.clienteEmail || '',
        clienteTelefono: s.clienteTelefono || '',
        numeroHabitacion: s.numeroHabitacion || '',
        numAdultos: s.numAdultos ?? 1,
        numNinos: s.numNinos ?? 0,
        fechaSalida: s.fechaSalida ? s.fechaSalida.toISOString().slice(0, 10) : '',
        concepto: s.concepto || '',
        fechaHoraInicio: s.fechaHoraInicio.toISOString().slice(0, 16),
        estado: s.estado,
        origen: s.origen,
        notas: s.notas || '',
        googleCalendarEventId: s.googleCalendarEventId || null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))

      return reply.send(mapped)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener las sesiones'
      return reply.status(500).send({ error: message })
    }
  })

  // POST /api/sesiones (Crear nueva sesión fotográfica)
  fastify.post('/api/sesiones', async (request, reply) => {
    try {
      const body = request.body as {
        hotelId: number
        fotografoId?: string | null
        creadorId?: string | null
        clienteNombre: string
        clienteEmail?: string
        clienteTelefono?: string
        numeroHabitacion?: string
        numAdultos?: number
        numNinos?: number
        fechaSalida?: string
        concepto?: string
        fechaHoraInicio: string
        notas?: string
      }

      if (
        !body.hotelId ||
        !body.clienteNombre ||
        !body.fechaHoraInicio
      ) {
        return reply
          .status(400)
          .send({ error: 'Faltan campos obligatorios (hotelId, clienteNombre, fechaHoraInicio)' })
      }

      const fotografoId = body.fotografoId ? body.fotografoId : null
      const creadorId = body.creadorId || getAuthUserId(request) || fotografoId

      if (!creadorId) {
        return reply
          .status(400)
          .send({ error: 'Debes proporcionar un creadorId válido o token de usuario autenticado' })
      }

      const nueva = await prisma.sesionFotografica.create({
        data: {
          hotelId: Number(body.hotelId),
          fotografoId: fotografoId,
          creadorId: creadorId,
          clienteNombre: body.clienteNombre.trim(),
          clienteEmail: body.clienteEmail ? body.clienteEmail.trim() : null,
          clienteTelefono: body.clienteTelefono ? body.clienteTelefono.trim() : null,
          numeroHabitacion: body.numeroHabitacion ? body.numeroHabitacion.trim() : null,
          numAdultos: body.numAdultos !== undefined ? Number(body.numAdultos) : 1,
          numNinos: body.numNinos !== undefined ? Number(body.numNinos) : 0,
          fechaSalida: body.fechaSalida ? new Date(body.fechaSalida) : null,
          concepto: body.concepto ? body.concepto.trim() : null,
          fechaHoraInicio: parseLocalDateTime(body.fechaHoraInicio),
          estado: 'PROGRAMADA',
          origen: 'MANUAL',
          notas: body.notas ? body.notas.trim() : null,
        },
      })

      return reply.status(201).send({
        id: nueva.id,
        hotelId: nueva.hotelId,
        fotografoId: nueva.fotografoId || null,
        creadorId: nueva.creadorId,
        clienteNombre: nueva.clienteNombre,
        clienteEmail: nueva.clienteEmail || '',
        clienteTelefono: nueva.clienteTelefono || '',
        numeroHabitacion: nueva.numeroHabitacion || '',
        numAdultos: nueva.numAdultos ?? 1,
        numNinos: nueva.numNinos ?? 0,
        fechaSalida: nueva.fechaSalida ? nueva.fechaSalida.toISOString().slice(0, 10) : '',
        concepto: nueva.concepto || '',
        fechaHoraInicio: nueva.fechaHoraInicio.toISOString().slice(0, 16),
        estado: nueva.estado,
        origen: nueva.origen,
        notas: nueva.notas || '',
        googleCalendarEventId: nueva.googleCalendarEventId || null,
        createdAt: nueva.createdAt.toISOString(),
        updatedAt: nueva.updatedAt.toISOString(),
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al crear la sesión'
      return reply.status(400).send({ error: message })
    }
  })

  // PUT /api/sesiones/:id (Actualizar sesión existente)
  fastify.put('/api/sesiones/:id', async (request, reply) => {
    try {
      const id = Number(request.params && (request.params as any).id)
      const body = request.body as {
        hotelId?: number
        fotografoId?: string | null
        clienteNombre?: string
        clienteEmail?: string
        clienteTelefono?: string
        numeroHabitacion?: string
        numAdultos?: number
        numNinos?: number
        fechaSalida?: string
        concepto?: string
        fechaHoraInicio?: string
        estado?: string
        notas?: string
      }

      const actualizada = await prisma.sesionFotografica.update({
        where: { id },
        data: {
          ...(body.hotelId !== undefined && { hotelId: Number(body.hotelId) }),
          ...(body.fotografoId !== undefined && { fotografoId: body.fotografoId ? body.fotografoId : null }),
          ...(body.clienteNombre && { clienteNombre: body.clienteNombre.trim() }),
          ...(body.clienteEmail !== undefined && { clienteEmail: body.clienteEmail ? body.clienteEmail.trim() : null }),
          ...(body.clienteTelefono !== undefined && { clienteTelefono: body.clienteTelefono ? body.clienteTelefono.trim() : null }),
          ...(body.numeroHabitacion !== undefined && { numeroHabitacion: body.numeroHabitacion ? body.numeroHabitacion.trim() : null }),
          ...(body.numAdultos !== undefined && { numAdultos: Number(body.numAdultos) }),
          ...(body.numNinos !== undefined && { numNinos: Number(body.numNinos) }),
          ...(body.fechaSalida !== undefined && { fechaSalida: body.fechaSalida ? new Date(body.fechaSalida) : null }),
          ...(body.concepto !== undefined && { concepto: body.concepto ? body.concepto.trim() : null }),
          ...(body.fechaHoraInicio && { fechaHoraInicio: parseLocalDateTime(body.fechaHoraInicio) }),
          ...(body.estado && { estado: body.estado }),
          ...(body.notas !== undefined && { notas: body.notas ? body.notas.trim() : null }),
        },
      })

      return reply.send({
        id: actualizada.id,
        hotelId: actualizada.hotelId,
        fotografoId: actualizada.fotografoId || null,
        creadorId: actualizada.creadorId || null,
        clienteNombre: actualizada.clienteNombre,
        clienteEmail: actualizada.clienteEmail || '',
        clienteTelefono: actualizada.clienteTelefono || '',
        numeroHabitacion: actualizada.numeroHabitacion || '',
        numAdultos: actualizada.numAdultos ?? 1,
        numNinos: actualizada.numNinos ?? 0,
        fechaSalida: actualizada.fechaSalida ? actualizada.fechaSalida.toISOString().slice(0, 10) : '',
        concepto: actualizada.concepto || '',
        fechaHoraInicio: actualizada.fechaHoraInicio.toISOString().slice(0, 16),
        estado: actualizada.estado,
        origen: actualizada.origen,
        notas: actualizada.notas || '',
        googleCalendarEventId: actualizada.googleCalendarEventId || null,
        createdAt: actualizada.createdAt.toISOString(),
        updatedAt: actualizada.updatedAt.toISOString(),
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al actualizar la sesión'
      return reply.status(400).send({ error: message })
    }
  })

  // DELETE /api/sesiones/:id (Soft delete)
  fastify.delete('/api/sesiones/:id', async (request, reply) => {
    try {
      const id = Number(request.params && (request.params as any).id)

      await prisma.sesionFotografica.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      return reply.send({ success: true, id })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al eliminar la sesión'
      return reply.status(400).send({ error: message })
    }
  })
}
