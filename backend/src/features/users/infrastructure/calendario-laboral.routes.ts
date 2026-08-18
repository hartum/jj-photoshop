import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'

function formatDateToIsoString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseDateOnly(dateStr: string): Date {
  const parts = dateStr.slice(0, 10).split('-')
  if (parts.length === 3) {
    return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])))
  }
  return new Date(dateStr)
}

export async function calendarioLaboralRoutes(fastify: FastifyInstance) {
  // GET /api/usuarios/:id/calendario-laboral (Listar ausencias/laboral del usuario)
  fastify.get('/api/usuarios/:id/calendario-laboral', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const user = await prisma.usuario.findUnique({
        where: { id },
        select: { id: true, deletedAt: true },
      })

      if (!user || user.deletedAt !== null) {
        return reply.status(404).send({ error: 'Usuario no encontrado' })
      }

      const registros = await prisma.calendarioLaboralFotografo.findMany({
        where: { usuarioId: id },
        orderBy: { fechaInicio: 'asc' },
      })

      const mapped = registros.map((r) => ({
        id: r.id,
        usuarioId: r.usuarioId,
        fechaInicio: formatDateToIsoString(r.fechaInicio),
        fechaFin: formatDateToIsoString(r.fechaFin),
        motivo: r.motivo,
        notas: r.notas || '',
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))

      return reply.send(mapped)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al obtener registros del calendario laboral'
      return reply.status(500).send({ error: message })
    }
  })

  // POST /api/usuarios/:id/calendario-laboral (Crear entrada)
  fastify.post('/api/usuarios/:id/calendario-laboral', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        fechaInicio?: string
        fechaFin?: string
        motivo?: string
        notas?: string
      }

      if (!body.fechaInicio || !body.fechaFin) {
        return reply.status(400).send({ error: 'Debes proporcionar fechaInicio y fechaFin' })
      }

      const user = await prisma.usuario.findUnique({
        where: { id },
        select: { id: true, deletedAt: true },
      })

      if (!user || user.deletedAt !== null) {
        return reply.status(404).send({ error: 'Usuario no encontrado' })
      }

      const fechaInicioStr = body.fechaInicio.slice(0, 10)
      const fechaFinStr = body.fechaFin.slice(0, 10)

      let motivo = body.motivo?.trim()
      if (!motivo) {
        motivo = fechaInicioStr === fechaFinStr ? 'BAJA' : 'VACACIONES'
      }

      const nuevo = await prisma.calendarioLaboralFotografo.create({
        data: {
          usuarioId: id,
          fechaInicio: parseDateOnly(fechaInicioStr),
          fechaFin: parseDateOnly(fechaFinStr),
          motivo,
          notas: body.notas ? body.notas.trim() : null,
        },
      })

      return reply.status(201).send({
        id: nuevo.id,
        usuarioId: nuevo.usuarioId,
        fechaInicio: formatDateToIsoString(nuevo.fechaInicio),
        fechaFin: formatDateToIsoString(nuevo.fechaFin),
        motivo: nuevo.motivo,
        notas: nuevo.notas || '',
        createdAt: nuevo.createdAt.toISOString(),
        updatedAt: nuevo.updatedAt.toISOString(),
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al crear registro en el calendario laboral'
      return reply.status(400).send({ error: message })
    }
  })

  // PUT /api/calendario-laboral/:id (Actualizar entrada)
  fastify.put('/api/calendario-laboral/:id', async (request, reply) => {
    try {
      const id = Number((request.params as any).id)
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'ID inválido' })
      }

      const body = request.body as {
        fechaInicio?: string
        fechaFin?: string
        motivo?: string
        notas?: string
      }

      const existing = await prisma.calendarioLaboralFotografo.findUnique({ where: { id } })
      if (!existing) {
        return reply.status(404).send({ error: 'Registro no encontrado' })
      }

      const dataToUpdate: any = {}
      if (body.fechaInicio) {
        dataToUpdate.fechaInicio = parseDateOnly(body.fechaInicio.slice(0, 10))
      }
      if (body.fechaFin) {
        dataToUpdate.fechaFin = parseDateOnly(body.fechaFin.slice(0, 10))
      }
      if (body.motivo !== undefined) {
        dataToUpdate.motivo = body.motivo.trim()
      }
      if (body.notas !== undefined) {
        dataToUpdate.notas = body.notas ? body.notas.trim() : null
      }

      const actualizado = await prisma.calendarioLaboralFotografo.update({
        where: { id },
        data: dataToUpdate,
      })

      return reply.send({
        id: actualizado.id,
        usuarioId: actualizado.usuarioId,
        fechaInicio: formatDateToIsoString(actualizado.fechaInicio),
        fechaFin: formatDateToIsoString(actualizado.fechaFin),
        motivo: actualizado.motivo,
        notas: actualizado.notas || '',
        createdAt: actualizado.createdAt.toISOString(),
        updatedAt: actualizado.updatedAt.toISOString(),
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al actualizar registro del calendario laboral'
      return reply.status(400).send({ error: message })
    }
  })

  // DELETE /api/calendario-laboral/:id (Eliminar entrada)
  fastify.delete('/api/calendario-laboral/:id', async (request, reply) => {
    try {
      const id = Number((request.params as any).id)
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'ID inválido' })
      }

      const existing = await prisma.calendarioLaboralFotografo.findUnique({
        where: { id },
      })

      if (!existing) {
        return reply.send({ success: true, id })
      }

      await prisma.calendarioLaboralFotografo.delete({
        where: { id },
      })

      return reply.send({ success: true, id })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al eliminar registro del calendario laboral'
      return reply.status(500).send({ error: message })
    }
  })
}
