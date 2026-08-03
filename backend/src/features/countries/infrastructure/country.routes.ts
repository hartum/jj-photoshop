import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'

export async function countryRoutes(fastify: FastifyInstance) {
  // GET /api/paises
  fastify.get('/api/paises', async (_request, reply) => {
    try {
      const paises = await prisma.pais.findMany({
        where: { deletedAt: null },
        orderBy: { nombre: 'asc' },
      })
      return reply.send(paises)
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({ error: err.message || 'Error al obtener países' })
    }
  })

  // POST /api/paises
  fastify.post('/api/paises', async (request, reply) => {
    try {
      const body = request.body as {
        codigo: string
        nombre: string
        codigoTelefono?: string
      }

      if (!body.codigo || !body.nombre) {
        return reply.status(400).send({ error: 'Faltan campos obligatorios (codigo, nombre)' })
      }

      const codeUpper = body.codigo.toUpperCase().trim()

      const existing = await prisma.pais.findUnique({
        where: { codigo: codeUpper },
      })

      if (existing) {
        if (existing.deletedAt === null) {
          return reply.status(400).send({ error: 'El país ya se encuentra añadido en el sistema' })
        } else {
          const reactivado = await prisma.pais.update({
            where: { id: existing.id },
            data: {
              nombre: body.nombre.trim(),
              codigoTelefono: body.codigoTelefono ? body.codigoTelefono.trim() : null,
              deletedAt: null,
            },
          })
          return reply.status(200).send(reactivado)
        }
      }

      const nuevo = await prisma.pais.create({
        data: {
          codigo: codeUpper,
          nombre: body.nombre.trim(),
          codigoTelefono: body.codigoTelefono ? body.codigoTelefono.trim() : null,
        },
      })

      return reply.status(201).send(nuevo)
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(400).send({ error: err.message || 'Error al crear el país' })
    }
  })

  // PUT /api/paises/:id
  fastify.put('/api/paises/:id', async (request, reply) => {
    try {
      const id = Number(request.params && (request.params as any).id)
      const body = request.body as {
        codigo?: string
        nombre?: string
        codigoTelefono?: string
      }

      const actualizado = await prisma.pais.update({
        where: { id },
        data: {
          ...(body.codigo && { codigo: body.codigo.toUpperCase().trim() }),
          ...(body.nombre && { nombre: body.nombre.trim() }),
          ...(body.codigoTelefono !== undefined && {
            codigoTelefono: body.codigoTelefono ? body.codigoTelefono.trim() : null,
          }),
        },
      })

      return reply.send(actualizado)
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(400).send({ error: err.message || 'Error al actualizar el país' })
    }
  })

  // DELETE /api/paises/:id (Soft delete)
  fastify.delete('/api/paises/:id', async (request, reply) => {
    try {
      const id = Number(request.params && (request.params as any).id)

      await prisma.pais.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      return reply.send({ success: true, id })
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(400).send({ error: err.message || 'Error al eliminar el país' })
    }
  })
}
