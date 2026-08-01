import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/roles
  fastify.get('/api/roles', async (_request, reply) => {
    try {
      const roles = await prisma.role.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      })

      const severityMap: Record<string, string> = {
        SUPERUSUARIO: 'contrast',
        ADMIN: 'danger',
        GERENTE: 'warn',
        SUPERVISOR: 'info',
        FOTOGRAFO: 'success',
        CONTABLE: 'secondary',
      }

      const mapped = roles.map((r) => ({
        id: r.id,
        code: r.codigo,
        name: r.nombre,
        description: r.descripcion,
        severity: severityMap[r.codigo] ?? 'info',
        deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
      }))

      return reply.send(mapped)
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({ error: err.message || 'Error al obtener roles' })
    }
  })

  // GET /api/usuarios
  fastify.get('/api/usuarios', async (_request, reply) => {
    try {
      const usuarios = await prisma.usuario.findMany({
        where: { deletedAt: null },
        include: { role: true },
        orderBy: { createdAt: 'desc' },
      })

      const mapped = usuarios.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        apellidos: u.apellidos,
        email: u.email,
        telefono: u.telefono || '',
        profileId: u.roleId,
        status: u.activo ? 'Activo' : 'Inactivo',
        createdAt: u.createdAt.toISOString().split('T')[0],
        deletedAt: u.deletedAt ? u.deletedAt.toISOString() : null,
      }))

      return reply.send(mapped)
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({ error: err.message || 'Error al obtener usuarios' })
    }
  })

  // POST /api/usuarios
  fastify.post('/api/usuarios', async (request, reply) => {
    try {
      const body = request.body as {
        nombre: string
        apellidos: string
        email: string
        telefono?: string
        profileId: string
        status?: string
      }

      if (!body.nombre || !body.email || !body.profileId) {
        return reply.status(400).send({ error: 'Faltan campos obligatorios (nombre, email, profileId)' })
      }

      const nuevo = await prisma.usuario.create({
        data: {
          nombre: body.nombre,
          apellidos: body.apellidos || '',
          email: body.email,
          telefono: body.telefono || '',
          roleId: body.profileId,
          activo: body.status !== 'Inactivo',
        },
        include: { role: true },
      })

      return reply.status(201).send({
        id: nuevo.id,
        nombre: nuevo.nombre,
        apellidos: nuevo.apellidos,
        email: nuevo.email,
        telefono: nuevo.telefono || '',
        profileId: nuevo.roleId,
        status: nuevo.activo ? 'Activo' : 'Inactivo',
        createdAt: nuevo.createdAt.toISOString().split('T')[0],
      })
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(400).send({ error: err.message || 'Error al crear el usuario en MySQL' })
    }
  })

  // PUT /api/usuarios/:id
  fastify.put('/api/usuarios/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        nombre?: string
        apellidos?: string
        email?: string
        telefono?: string
        profileId?: string
        status?: string
      }

      const actualizado = await prisma.usuario.update({
        where: { id },
        data: {
          ...(body.nombre && { nombre: body.nombre }),
          ...(body.apellidos !== undefined && { apellidos: body.apellidos }),
          ...(body.email && { email: body.email }),
          ...(body.telefono !== undefined && { telefono: body.telefono }),
          ...(body.profileId && { roleId: body.profileId }),
          ...(body.status !== undefined && { activo: body.status === 'Activo' }),
        },
        include: { role: true },
      })

      return reply.send({
        id: actualizado.id,
        nombre: actualizado.nombre,
        apellidos: actualizado.apellidos,
        email: actualizado.email,
        telefono: actualizado.telefono || '',
        profileId: actualizado.roleId,
        status: actualizado.activo ? 'Activo' : 'Inactivo',
        createdAt: actualizado.createdAt.toISOString().split('T')[0],
      })
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(400).send({ error: err.message || 'Error al actualizar el usuario en MySQL' })
    }
  })

  // DELETE /api/usuarios/:id (Soft delete)
  fastify.delete('/api/usuarios/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      await prisma.usuario.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      return reply.send({ success: true, id })
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(400).send({ error: err.message || 'Error al eliminar el usuario en MySQL' })
    }
  })
}
