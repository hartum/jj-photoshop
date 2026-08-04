import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'

export async function sessionRoutes(fastify: FastifyInstance) {
  // GET /api/sesiones (Obtiene las sesiones fotográficas activas)
  fastify.get('/api/sesiones', async (request, reply) => {
    try {
      const { hotelId } = request.query as { hotelId?: string }

      const where: any = { deletedAt: null }
      if (hotelId) {
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
        fotografoId: s.fotografoId,
        creadorId: s.creadorId,
        clienteNombre: s.clienteNombre,
        clienteEmail: s.clienteEmail || '',
        clienteTelefono: s.clienteTelefono || '',
        fechaHoraInicio: s.fechaHoraInicio.toISOString().slice(0, 16),
        fechaHoraFin: s.fechaHoraFin.toISOString().slice(0, 16),
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
        fotografoId: string
        creadorId?: string
        clienteNombre: string
        clienteEmail?: string
        clienteTelefono?: string
        fechaHoraInicio: string
        fechaHoraFin: string
        notas?: string
      }

      if (
        !body.hotelId ||
        !body.fotografoId ||
        !body.clienteNombre ||
        !body.fechaHoraInicio ||
        !body.fechaHoraFin
      ) {
        return reply
          .status(400)
          .send({ error: 'Faltan campos obligatorios (hotelId, fotografoId, clienteNombre, fechaHoraInicio, fechaHoraFin)' })
      }

      const creadorId = body.creadorId || body.fotografoId

      const nueva = await prisma.sesionFotografica.create({
        data: {
          hotelId: Number(body.hotelId),
          fotografoId: body.fotografoId,
          creadorId: creadorId,
          clienteNombre: body.clienteNombre.trim(),
          clienteEmail: body.clienteEmail ? body.clienteEmail.trim() : null,
          clienteTelefono: body.clienteTelefono ? body.clienteTelefono.trim() : null,
          fechaHoraInicio: new Date(body.fechaHoraInicio),
          fechaHoraFin: new Date(body.fechaHoraFin),
          estado: 'PROGRAMADA',
          origen: 'MANUAL',
          notas: body.notas ? body.notas.trim() : null,
        },
      })

      return reply.status(201).send({
        id: nueva.id,
        hotelId: nueva.hotelId,
        fotografoId: nueva.fotografoId,
        creadorId: nueva.creadorId,
        clienteNombre: nueva.clienteNombre,
        clienteEmail: nueva.clienteEmail || '',
        clienteTelefono: nueva.clienteTelefono || '',
        fechaHoraInicio: nueva.fechaHoraInicio.toISOString().slice(0, 16),
        fechaHoraFin: nueva.fechaHoraFin.toISOString().slice(0, 16),
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
        fotografoId?: string
        clienteNombre?: string
        clienteEmail?: string
        clienteTelefono?: string
        fechaHoraInicio?: string
        fechaHoraFin?: string
        estado?: string
        notas?: string
      }

      const actualizada = await prisma.sesionFotografica.update({
        where: { id },
        data: {
          ...(body.hotelId !== undefined && { hotelId: Number(body.hotelId) }),
          ...(body.fotografoId && { fotografoId: body.fotografoId }),
          ...(body.clienteNombre && { clienteNombre: body.clienteNombre.trim() }),
          ...(body.clienteEmail !== undefined && { clienteEmail: body.clienteEmail ? body.clienteEmail.trim() : null }),
          ...(body.clienteTelefono !== undefined && { clienteTelefono: body.clienteTelefono ? body.clienteTelefono.trim() : null }),
          ...(body.fechaHoraInicio && { fechaHoraInicio: new Date(body.fechaHoraInicio) }),
          ...(body.fechaHoraFin && { fechaHoraFin: new Date(body.fechaHoraFin) }),
          ...(body.estado && { estado: body.estado }),
          ...(body.notas !== undefined && { notas: body.notas ? body.notas.trim() : null }),
        },
      })

      return reply.send({
        id: actualizada.id,
        hotelId: actualizada.hotelId,
        fotografoId: actualizada.fotografoId,
        creadorId: actualizada.creadorId,
        clienteNombre: actualizada.clienteNombre,
        clienteEmail: actualizada.clienteEmail || '',
        clienteTelefono: actualizada.clienteTelefono || '',
        fechaHoraInicio: actualizada.fechaHoraInicio.toISOString().slice(0, 16),
        fechaHoraFin: actualizada.fechaHoraFin.toISOString().slice(0, 16),
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
