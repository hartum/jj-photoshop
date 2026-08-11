import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'

export async function hotelRoutes(fastify: FastifyInstance) {
  // GET /api/hoteles (obtiene los hoteles activos con datos de área y país)
  fastify.get('/api/hoteles', async (_request, reply) => {
    try {
      const hoteles = await prisma.hotel.findMany({
        where: { deletedAt: null },
        include: {
          area: {
            include: {
              pais: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      const mapped = hoteles.map((h) => ({
        id: h.id,
        areaId: h.areaId,
        areaNombre: h.area.nombre,
        paisId: h.area.paisId,
        paisNombre: h.area.pais.nombre,
        paisCodigo: h.area.pais.codigo,
        nombre: h.nombre,
        direccion: h.direccion || '',
        estrellas: h.estrellas || 0,
        latitud: h.latitud || null,
        longitud: h.longitud || null,
        cadenaHotelera: h.cadenaHotelera || '',
        personaContacto: h.personaContacto || '',
        email: h.email || '',
        telefono: h.telefono || '',
        metaMensualDefault: h.metaMensualDefault ?? null,
        createdAt: h.createdAt.toISOString().split('T')[0],
      }))

      return reply.send(mapped)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener los hoteles'
      return reply.status(500).send({ error: message })
    }
  })

  // POST /api/hoteles (Crear nuevo hotel)
  fastify.post('/api/hoteles', async (request, reply) => {
    try {
      const body = request.body as {
        areaId: number
        nombre: string
        direccion?: string
        estrellas?: number
        latitud?: number
        longitud?: number
        cadenaHotelera?: string
        personaContacto?: string
        email?: string
        telefono?: string
        metaMensualDefault?: number | null
      }

      if (!body.areaId || !body.nombre || body.nombre.trim() === '') {
        return reply.status(400).send({ error: 'Faltan campos obligatorios (areaId, nombre)' })
      }

      const nuevo = await prisma.hotel.create({
        data: {
          areaId: Number(body.areaId),
          nombre: body.nombre.trim(),
          direccion: body.direccion ? body.direccion.trim() : null,
          estrellas: body.estrellas ? Number(body.estrellas) : null,
          latitud: body.latitud ? Number(body.latitud) : null,
          longitud: body.longitud ? Number(body.longitud) : null,
          cadenaHotelera: body.cadenaHotelera ? body.cadenaHotelera.trim() : null,
          personaContacto: body.personaContacto ? body.personaContacto.trim() : null,
          email: body.email ? body.email.trim() : null,
          telefono: body.telefono ? body.telefono.trim() : null,
          metaMensualDefault: body.metaMensualDefault != null ? Number(body.metaMensualDefault) : null,
        },
        include: {
          area: {
            include: {
              pais: true,
            },
          },
        },
      })

      return reply.status(201).send({
        id: nuevo.id,
        areaId: nuevo.areaId,
        areaNombre: nuevo.area.nombre,
        paisId: nuevo.area.paisId,
        paisNombre: nuevo.area.pais.nombre,
        paisCodigo: nuevo.area.pais.codigo,
        nombre: nuevo.nombre,
        direccion: nuevo.direccion || '',
        estrellas: nuevo.estrellas || 0,
        latitud: nuevo.latitud || null,
        longitud: nuevo.longitud || null,
        cadenaHotelera: nuevo.cadenaHotelera || '',
        personaContacto: nuevo.personaContacto || '',
        email: nuevo.email || '',
        telefono: nuevo.telefono || '',
        metaMensualDefault: nuevo.metaMensualDefault ?? null,
        createdAt: nuevo.createdAt.toISOString().split('T')[0],
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al crear el hotel'
      return reply.status(400).send({ error: message })
    }
  })

  // PUT /api/hoteles/:id (Actualizar hotel existente)
  fastify.put('/api/hoteles/:id', async (request, reply) => {
    try {
      const id = Number(request.params && (request.params as any).id)
      const body = request.body as {
        areaId?: number
        nombre?: string
        direccion?: string
        estrellas?: number
        latitud?: number
        longitud?: number
        cadenaHotelera?: string
        personaContacto?: string
        email?: string
        telefono?: string
        metaMensualDefault?: number | null
      }

      const actualizado = await prisma.hotel.update({
        where: { id },
        data: {
          ...(body.areaId !== undefined && { areaId: Number(body.areaId) }),
          ...(body.nombre && { nombre: body.nombre.trim() }),
          ...(body.direccion !== undefined && { direccion: body.direccion ? body.direccion.trim() : null }),
          ...(body.estrellas !== undefined && { estrellas: body.estrellas ? Number(body.estrellas) : null }),
          ...(body.latitud !== undefined && { latitud: body.latitud ? Number(body.latitud) : null }),
          ...(body.longitud !== undefined && { longitud: body.longitud ? Number(body.longitud) : null }),
          ...(body.cadenaHotelera !== undefined && { cadenaHotelera: body.cadenaHotelera ? body.cadenaHotelera.trim() : null }),
          ...(body.personaContacto !== undefined && { personaContacto: body.personaContacto ? body.personaContacto.trim() : null }),
          ...(body.email !== undefined && { email: body.email ? body.email.trim() : null }),
          ...(body.telefono !== undefined && { telefono: body.telefono ? body.telefono.trim() : null }),
          ...(body.metaMensualDefault !== undefined && {
            metaMensualDefault: body.metaMensualDefault != null ? Number(body.metaMensualDefault) : null,
          }),
        },
        include: {
          area: {
            include: {
              pais: true,
            },
          },
        },
      })

      return reply.send({
        id: actualizado.id,
        areaId: actualizado.areaId,
        areaNombre: actualizado.area.nombre,
        paisId: actualizado.area.paisId,
        paisNombre: actualizado.area.pais.nombre,
        paisCodigo: actualizado.area.pais.codigo,
        nombre: actualizado.nombre,
        direccion: actualizado.direccion || '',
        estrellas: actualizado.estrellas || 0,
        latitud: actualizado.latitud || null,
        longitud: actualizado.longitud || null,
        cadenaHotelera: actualizado.cadenaHotelera || '',
        personaContacto: actualizado.personaContacto || '',
        email: actualizado.email || '',
        telefono: actualizado.telefono || '',
        metaMensualDefault: actualizado.metaMensualDefault ?? null,
        createdAt: actualizado.createdAt.toISOString().split('T')[0],
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al actualizar el hotel'
      return reply.status(400).send({ error: message })
    }
  })

  // DELETE /api/hoteles/:id (Soft delete)
  fastify.delete('/api/hoteles/:id', async (request, reply) => {
    try {
      const id = Number(request.params && (request.params as any).id)

      await prisma.hotel.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      return reply.send({ success: true, id })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al eliminar el hotel'
      return reply.status(400).send({ error: message })
    }
  })
}
