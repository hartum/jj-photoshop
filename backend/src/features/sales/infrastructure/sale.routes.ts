import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'

const SALES_APPOINTMENT_DURATION_MS = 60 * 60 * 1000 // 1 hour

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

async function getUserRole(userId: string): Promise<string | null> {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    include: { role: true },
  })
  return user?.role.codigo.toUpperCase() || null
}

function parseLocalDateTime(dateStr: string): Date {
  if (!dateStr) return new Date()
  const cleanStr = dateStr.replace(' ', 'T').slice(0, 19)
  const hasTimezone = cleanStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(cleanStr)
  const isoStr = hasTimezone ? cleanStr : `${cleanStr}:00Z`.replace(':00:00Z', ':00Z')
  return new Date(isoStr)
}

async function findConflicts(hotelId: number, fechaHoraCita: Date, excludeId?: number) {
  const rangeStart = new Date(fechaHoraCita.getTime() - SALES_APPOINTMENT_DURATION_MS)
  const rangeEnd = new Date(fechaHoraCita.getTime() + SALES_APPOINTMENT_DURATION_MS)

  const where: any = {
    hotelId,
    deletedAt: null,
    estado: { not: 'CANCELADA' },
    fechaHoraCita: {
      gte: rangeStart,
      lte: rangeEnd,
    },
  }
  if (excludeId) {
    where.id = { not: excludeId }
  }

  return prisma.citaVenta.findMany({
    where,
    include: { sesion: true },
  })
}

async function getAllowedHotelIds(userId: string): Promise<number[] | null> {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    include: {
      role: true,
      hotelesAsignados: true,
      areasAsignadas: true,
    },
  })
  if (!user) return []

  const roleCode = user.role.codigo.toUpperCase()
  if (['SUPERUSUARIO', 'ADMIN', 'CONTABLE'].includes(roleCode)) return null // null means global

  if (roleCode === 'GERENTE') {
    const areaIds = user.areasAsignadas.map((a) => a.areaId)
    const hotelsInAreas = await prisma.hotel.findMany({
      where: { areaId: { in: areaIds }, deletedAt: null },
      select: { id: true },
    })
    return hotelsInAreas.map((h) => h.id)
  }

  return user.hotelesAsignados.map((h) => h.hotelId)
}

export async function saleRoutes(fastify: FastifyInstance) {
  // GET /api/citas-venta - List sales appointments
  fastify.get('/api/citas-venta', async (request, reply) => {
    try {
      const { hotelId } = request.query as { hotelId?: string }
      const where: any = { deletedAt: null }

      const userId = getAuthUserId(request)
      if (userId) {
        const allowedHotelIds = await getAllowedHotelIds(userId)
        if (allowedHotelIds !== null) {
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

      const citas = await prisma.citaVenta.findMany({
        where,
        include: {
          sesion: true,
          hotel: true,
        },
        orderBy: { fechaHoraCita: 'asc' },
      })

      const mapped = citas.map((c) => ({
        id: c.id,
        sesionId: c.sesionId,
        hotelId: c.sesion?.hotelId || c.hotelId,
        hotelNombre: c.hotel?.nombre || '',
        fechaHoraCita: c.fechaHoraCita.toISOString().slice(0, 16),
        estado: c.estado,
        numFotosVendidas: c.numFotosVendidas,
        totalVentaUsd: c.totalVentaUsd,
        notas: c.notas || '',
        clienteNombre: c.sesion.clienteNombre,
        clienteEmail: c.sesion.clienteEmail || '',
        clienteTelefono: c.sesion.clienteTelefono || '',
        numeroHabitacion: c.sesion.numeroHabitacion || '',
        fotografoId: c.sesion.fotografoId || null,
        sesionFechaHoraInicio: c.sesion.fechaHoraInicio.toISOString().slice(0, 16),
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))

      return reply.send(mapped)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener las citas de venta'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/citas-venta/conflictos - Check for conflicts
  fastify.get('/api/citas-venta/conflictos', async (request, reply) => {
    try {
      const { hotelId, fechaHoraCita, excludeId } = request.query as {
        hotelId: string
        fechaHoraCita: string
        excludeId?: string
      }

      if (!hotelId || !fechaHoraCita) {
        return reply.status(400).send({ error: 'hotelId y fechaHoraCita son requeridos' })
      }

      const conflicts = await findConflicts(
        Number(hotelId),
        parseLocalDateTime(fechaHoraCita),
        excludeId ? Number(excludeId) : undefined,
      )

      const mapped = conflicts.map((c) => ({
        id: c.id,
        sesionId: c.sesionId,
        fechaHoraCita: c.fechaHoraCita.toISOString().slice(0, 16),
        clienteNombre: c.sesion.clienteNombre,
        numeroHabitacion: c.sesion.numeroHabitacion || '',
      }))

      return reply.send(mapped)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al verificar conflictos'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/citas-venta/:id - Get single sales appointment
  fastify.get('/api/citas-venta/:id', async (request, reply) => {
    try {
      const id = Number((request.params as any).id)

      const cita = await prisma.citaVenta.findUnique({
        where: { id },
        include: { sesion: true, hotel: true },
      })

      if (!cita || cita.deletedAt) {
        return reply.status(404).send({ error: 'Cita de venta no encontrada' })
      }

      return reply.send({
        id: cita.id,
        sesionId: cita.sesionId,
        hotelId: cita.hotelId,
        fechaHoraCita: cita.fechaHoraCita.toISOString().slice(0, 16),
        estado: cita.estado,
        numFotosVendidas: cita.numFotosVendidas,
        totalVentaUsd: cita.totalVentaUsd,
        notas: cita.notas || '',
        clienteNombre: cita.sesion.clienteNombre,
        clienteEmail: cita.sesion.clienteEmail || '',
        clienteTelefono: cita.sesion.clienteTelefono || '',
        numeroHabitacion: cita.sesion.numeroHabitacion || '',
        fotografoId: cita.sesion.fotografoId || null,
        numAdultos: cita.sesion.numAdultos ?? 1,
        numNinos: cita.sesion.numNinos ?? 0,
        concepto: cita.sesion.concepto || '',
        sesionFechaHoraInicio: cita.sesion.fechaHoraInicio.toISOString().slice(0, 16),
        hotelNombre: cita.hotel.nombre,
        createdAt: cita.createdAt.toISOString(),
        updatedAt: cita.updatedAt.toISOString(),
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener la cita de venta'
      return reply.status(500).send({ error: message })
    }
  })

  // POST /api/citas-venta - Create sales appointment
  fastify.post('/api/citas-venta', async (request, reply) => {
    try {
      const body = request.body as {
        sesionId: number
        hotelId: number
        fechaHoraCita: string
        notas?: string
      }

      if (!body.sesionId || !body.hotelId || !body.fechaHoraCita) {
        return reply
          .status(400)
          .send({ error: 'Faltan campos obligatorios (sesionId, hotelId, fechaHoraCita)' })
      }

      // Validate session exists and is eligible for a sales appointment
      const sesion = await prisma.sesionFotografica.findUnique({
        where: { id: body.sesionId },
        include: { citaVenta: true },
      })

      if (!sesion || sesion.deletedAt) {
        return reply.status(404).send({ error: 'Sesión fotográfica no encontrada' })
      }

      const ESTADOS_NO_PERMITIDOS = ['CANCELADA', 'NO_SHOW']
      if (ESTADOS_NO_PERMITIDOS.includes(sesion.estado)) {
        return reply
          .status(400)
          .send({ error: 'No se puede agendar una cita de venta para una sesión cancelada o donde el cliente no se presentó' })
      }

      if (sesion.citaVenta && !sesion.citaVenta.deletedAt) {
        return reply
          .status(400)
          .send({ error: 'Esta sesión ya tiene una cita de venta asociada' })
      }

      const fechaCita = parseLocalDateTime(body.fechaHoraCita)

      // Check conflicts using session's hotelId
      const conflicts = await findConflicts(sesion.hotelId, fechaCita)

      const nueva = await prisma.citaVenta.create({
        data: {
          sesionId: body.sesionId,
          hotelId: sesion.hotelId,
          fechaHoraCita: fechaCita,
          estado: 'PROGRAMADA',
          notas: body.notas ? body.notas.trim() : null,
        },
        include: { sesion: true },
      })

      const response: any = {
        id: nueva.id,
        sesionId: nueva.sesionId,
        hotelId: nueva.hotelId,
        fechaHoraCita: nueva.fechaHoraCita.toISOString().slice(0, 16),
        estado: nueva.estado,
        numFotosVendidas: nueva.numFotosVendidas,
        totalVentaUsd: nueva.totalVentaUsd,
        notas: nueva.notas || '',
        clienteNombre: nueva.sesion.clienteNombre,
        createdAt: nueva.createdAt.toISOString(),
        updatedAt: nueva.updatedAt.toISOString(),
      }

      if (conflicts.length > 0) {
        response.conflictos = conflicts.map((c) => ({
          id: c.id,
          fechaHoraCita: c.fechaHoraCita.toISOString().slice(0, 16),
          clienteNombre: c.sesion.clienteNombre,
        }))
      }

      return reply.status(201).send(response)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al crear la cita de venta'
      return reply.status(400).send({ error: message })
    }
  })

  // PUT /api/citas-venta/:id - Update sales appointment
  fastify.put('/api/citas-venta/:id', async (request, reply) => {
    try {
      const id = Number((request.params as any).id)
      const body = request.body as {
        fechaHoraCita?: string
        estado?: string
        numFotosVendidas?: number | null
        totalVentaUsd?: number | null
        notas?: string
      }

      const existing = await prisma.citaVenta.findUnique({ where: { id } })
      if (!existing || existing.deletedAt) {
        return reply.status(404).send({ error: 'Cita de venta no encontrada' })
      }

      // Role check: if COMPLETADA, only GERENTE/ADMIN/SUPERUSUARIO can edit
      if (existing.estado === 'COMPLETADA') {
        const userId = getAuthUserId(request)
        if (!userId) {
          return reply.status(403).send({ error: 'No autorizado para editar citas completadas' })
        }
        const role = await getUserRole(userId)
        const canEdit = ['GERENTE', 'ADMIN', 'SUPERUSUARIO'].includes(role || '')
        if (!canEdit) {
          return reply
            .status(403)
            .send({ error: 'Solo gerentes, administradores y superusuarios pueden editar citas completadas' })
        }
      }

      // Validate sales fields when transitioning to COMPLETADA
      if (body.estado === 'COMPLETADA') {
        const fotosVendidas = body.numFotosVendidas ?? existing.numFotosVendidas
        const totalVenta = body.totalVentaUsd ?? existing.totalVentaUsd
        if (fotosVendidas == null || totalVenta == null) {
          return reply
            .status(400)
            .send({ error: 'Para completar la cita, debes indicar el nº de fotos vendidas y el total en USD' })
        }
      }

      const data: any = {}
      if (body.fechaHoraCita !== undefined) {
        data.fechaHoraCita = parseLocalDateTime(body.fechaHoraCita)
      }
      if (body.estado !== undefined) data.estado = body.estado
      if (body.numFotosVendidas !== undefined) data.numFotosVendidas = body.numFotosVendidas
      if (body.totalVentaUsd !== undefined) data.totalVentaUsd = body.totalVentaUsd
      if (body.notas !== undefined) data.notas = body.notas ? body.notas.trim() : null

      const actualizada = await prisma.citaVenta.update({
        where: { id },
        data,
        include: { sesion: true },
      })

      const response: any = {
        id: actualizada.id,
        sesionId: actualizada.sesionId,
        hotelId: actualizada.hotelId,
        fechaHoraCita: actualizada.fechaHoraCita.toISOString().slice(0, 16),
        estado: actualizada.estado,
        numFotosVendidas: actualizada.numFotosVendidas,
        totalVentaUsd: actualizada.totalVentaUsd,
        notas: actualizada.notas || '',
        clienteNombre: actualizada.sesion.clienteNombre,
        createdAt: actualizada.createdAt.toISOString(),
        updatedAt: actualizada.updatedAt.toISOString(),
      }

      // Check conflicts if date changed
      if (body.fechaHoraCita !== undefined) {
        const conflicts = await findConflicts(actualizada.hotelId, actualizada.fechaHoraCita, id)
        if (conflicts.length > 0) {
          response.conflictos = conflicts.map((c) => ({
            id: c.id,
            fechaHoraCita: c.fechaHoraCita.toISOString().slice(0, 16),
            clienteNombre: c.sesion.clienteNombre,
          }))
        }
      }

      return reply.send(response)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al actualizar la cita de venta'
      return reply.status(400).send({ error: message })
    }
  })

  // DELETE /api/citas-venta/:id - Soft delete
  fastify.delete('/api/citas-venta/:id', async (request, reply) => {
    try {
      const id = Number((request.params as any).id)

      await prisma.citaVenta.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      return reply.send({ success: true, id })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al eliminar la cita de venta'
      return reply.status(400).send({ error: message })
    }
  })
}
