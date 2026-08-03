import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../shared/db.js'

export async function userRoutes(fastify: FastifyInstance) {
  // POST /api/auth/login
  fastify.post('/api/auth/login', async (request, reply) => {
    try {
      const { email, password } = request.body as { email?: string; password?: string }

      if (!email || !password) {
        return reply.status(400).send({ error: 'Debes proporcionar correo y contraseña' })
      }

      const user = await prisma.usuario.findUnique({
        where: { email: email.trim() },
        include: {
          role: true,
          areasAsignadas: true,
          hotelesAsignados: true,
        },
      })

      if (!user || user.deletedAt !== null) {
        return reply
          .status(401)
          .send({ error: 'Credenciales incorrectas o usuario no encontrado' })
      }

      if (!user.activo) {
        return reply.status(401).send({ error: 'El usuario se encuentra inactivo' })
      }

      let isMatch = false
      if (user.passwordHash) {
        if (user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$')) {
          isMatch = await bcrypt.compare(password, user.passwordHash)
        } else {
          isMatch = user.passwordHash === password
        }
      }

      if (!isMatch) {
        return reply.status(401).send({ error: 'Credenciales incorrectas' })
      }

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role.codigo,
      })

      return reply.send({
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          apellidos: user.apellidos,
          email: user.email,
          telefono: user.telefono || '',
          profileId: user.roleId,
          roleCode: user.role.codigo,
          roleName: user.role.nombre,
          imagen: user.imagen || null,
          areaIds: user.areasAsignadas.map((a) => a.areaId),
          hotelIds: user.hotelesAsignados.map((h) => h.hotelId),
        },
      })
    } catch (err: any) {
      fastify.log.error(err)
      return reply
        .status(500)
        .send({ error: err.message || 'Error durante el inicio de sesión' })
    }
  })

  // GET /api/roles
  fastify.get('/api/roles', async (_request, reply) => {
    try {
      const roles = await prisma.role.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      })

      const severityMap: Record<string, 'primary' | 'danger' | 'warning' | 'info' | 'success'> = {
        SUPERUSUARIO: 'primary',
        ADMIN: 'danger',
        GERENTE: 'warning',
        SUPERVISOR: 'info',
        FOTOGRAFO: 'success',
        CONTABLE: 'info',
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
        include: {
          role: true,
          areasAsignadas: true,
          hotelesAsignados: true,
        },
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
        imagen: u.imagen || null,
        areaIds: u.areasAsignadas.map((a) => a.areaId),
        hotelIds: u.hotelesAsignados.map((h) => h.hotelId),
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
        password?: string
        profileId: number | string
        status?: string
        imagen?: string | null
        areaIds?: number[]
        hotelIds?: number[]
      }

      if (!body.nombre || !body.email || body.profileId === undefined) {
        return reply
          .status(400)
          .send({ error: 'Faltan campos obligatorios (nombre, email, profileId)' })
      }

      let passwordHash: string | null = null
      if (body.password && body.password.trim() !== '') {
        passwordHash = await bcrypt.hash(body.password, 10)
      }

      const areaIds = Array.isArray(body.areaIds) ? body.areaIds.map(Number) : []
      const hotelIds = Array.isArray(body.hotelIds) ? body.hotelIds.map(Number) : []

      const nuevo = await prisma.usuario.create({
        data: {
          nombre: body.nombre,
          apellidos: body.apellidos || '',
          email: body.email,
          telefono: body.telefono || '',
          passwordHash,
          imagen: body.imagen || null,
          roleId: Number(body.profileId),
          activo: body.status !== 'Inactivo',
          ...(areaIds.length > 0 && {
            areasAsignadas: {
              create: areaIds.map((areaId) => ({ areaId })),
            },
          }),
          ...(hotelIds.length > 0 && {
            hotelesAsignados: {
              create: hotelIds.map((hotelId) => ({ hotelId })),
            },
          }),
        },
        include: {
          role: true,
          areasAsignadas: true,
          hotelesAsignados: true,
        },
      })

      return reply.status(201).send({
        id: nuevo.id,
        nombre: nuevo.nombre,
        apellidos: nuevo.apellidos,
        email: nuevo.email,
        telefono: nuevo.telefono || '',
        profileId: nuevo.roleId,
        status: nuevo.activo ? 'Activo' : 'Inactivo',
        imagen: nuevo.imagen || null,
        areaIds: nuevo.areasAsignadas.map((a) => a.areaId),
        hotelIds: nuevo.hotelesAsignados.map((h) => h.hotelId),
        createdAt: nuevo.createdAt.toISOString().split('T')[0],
      })
    } catch (err: any) {
      fastify.log.error(err)
      return reply
        .status(400)
        .send({ error: err.message || 'Error al crear el usuario en MySQL' })
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
        password?: string
        profileId?: number | string
        status?: string
        imagen?: string | null
        areaIds?: number[]
        hotelIds?: number[]
      }

      let passwordHash: string | undefined = undefined
      if (body.password && body.password.trim() !== '') {
        passwordHash = await bcrypt.hash(body.password, 10)
      }

      if (body.areaIds !== undefined) {
        await prisma.usuarioArea.deleteMany({ where: { usuarioId: id } })
        if (Array.isArray(body.areaIds) && body.areaIds.length > 0) {
          await prisma.usuarioArea.createMany({
            data: body.areaIds.map((areaId) => ({ usuarioId: id, areaId: Number(areaId) })),
          })
        }
      }

      if (body.hotelIds !== undefined) {
        await prisma.usuarioHotel.deleteMany({ where: { usuarioId: id } })
        if (Array.isArray(body.hotelIds) && body.hotelIds.length > 0) {
          await prisma.usuarioHotel.createMany({
            data: body.hotelIds.map((hotelId) => ({ usuarioId: id, hotelId: Number(hotelId) })),
          })
        }
      }

      const actualizado = await prisma.usuario.update({
        where: { id },
        data: {
          ...(body.nombre && { nombre: body.nombre }),
          ...(body.apellidos !== undefined && { apellidos: body.apellidos }),
          ...(body.email && { email: body.email }),
          ...(body.telefono !== undefined && { telefono: body.telefono }),
          ...(passwordHash && { passwordHash }),
          ...(body.imagen !== undefined && { imagen: body.imagen }),
          ...(body.profileId !== undefined && { roleId: Number(body.profileId) }),
          ...(body.status !== undefined && { activo: body.status === 'Activo' }),
        },
        include: {
          role: true,
          areasAsignadas: true,
          hotelesAsignados: true,
        },
      })

      return reply.send({
        id: actualizado.id,
        nombre: actualizado.nombre,
        apellidos: actualizado.apellidos,
        email: actualizado.email,
        telefono: actualizado.telefono || '',
        profileId: actualizado.roleId,
        status: actualizado.activo ? 'Activo' : 'Inactivo',
        imagen: actualizado.imagen || null,
        areaIds: actualizado.areasAsignadas.map((a) => a.areaId),
        hotelIds: actualizado.hotelesAsignados.map((h) => h.hotelId),
        createdAt: actualizado.createdAt.toISOString().split('T')[0],
      })
    } catch (err: any) {
      fastify.log.error(err)
      return reply
        .status(400)
        .send({ error: err.message || 'Error al actualizar el usuario en MySQL' })
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
      return reply
        .status(400)
        .send({ error: err.message || 'Error al eliminar el usuario en MySQL' })
    }
  })
}
