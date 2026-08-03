import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create default roles/profiles
  const superuserRole = await prisma.role.upsert({
    where: { codigo: 'SUPERUSUARIO' },
    update: {},
    create: {
      codigo: 'SUPERUSUARIO',
      nombre: 'SuperUsuario',
      descripcion: 'Acceso total y control absoluto del sistema',
    },
  })

  const adminRole = await prisma.role.upsert({
    where: { codigo: 'ADMIN' },
    update: {},
    create: {
      codigo: 'ADMIN',
      nombre: 'Administrador General / Dueño',
      descripcion: 'Gestión global de países, hoteles, usuarios y reportes',
    },
  })

  await prisma.role.upsert({
    where: { codigo: 'GERENTE' },
    update: {},
    create: {
      codigo: 'GERENTE',
      nombre: 'Gerente de Área',
      descripcion: 'Control de la operación asignada en su área/país',
    },
  })

  const supervisorRole = await prisma.role.upsert({
    where: { codigo: 'SUPERVISOR' },
    update: {},
    create: {
      codigo: 'SUPERVISOR',
      nombre: 'Supervisor de Hotel',
      descripcion: 'Gestión operativa del hotel y su equipo',
    },
  })

  const fotografoRole = await prisma.role.upsert({
    where: { codigo: 'FOTOGRAFO' },
    update: {},
    create: {
      codigo: 'FOTOGRAFO',
      nombre: 'Fotógrafo',
      descripcion: 'Agenda de sesiones y registro de ventas',
    },
  })

  await prisma.role.upsert({
    where: { codigo: 'CONTABLE' },
    update: {},
    create: {
      codigo: 'CONTABLE',
      nombre: 'Contable',
      descripcion: 'Acceso a ventas, comisiones e importes',
    },
  })

  // Encriptar contraseña del SuperUsuario "fardaka"
  const superuserPassword = await bcrypt.hash('fardaka', 10)
  const defaultPassword = await bcrypt.hash('123456', 10)

  // SuperUsuario principal
  await prisma.usuario.upsert({
    where: { email: 'hartum@gmail.com' },
    update: {
      nombre: 'Ivan',
      apellidos: 'Gascon',
      telefono: '+34 645 584 470',
      passwordHash: superuserPassword,
      roleId: superuserRole.id,
      activo: true,
      deletedAt: null,
    },
    create: {
      nombre: 'Ivan',
      apellidos: 'Gascon',
      email: 'hartum@gmail.com',
      telefono: '+34 645 584 470',
      passwordHash: superuserPassword,
      roleId: superuserRole.id,
      activo: true,
    },
  })

  // Usuarios adicionales de ejemplo
  await prisma.usuario.upsert({
    where: { email: 'carlos.mendoza@jjphotoshop.es' },
    update: { passwordHash: defaultPassword },
    create: {
      nombre: 'Carlos',
      apellidos: 'Mendoza García',
      email: 'carlos.mendoza@jjphotoshop.es',
      telefono: '+34 612 345 678',
      passwordHash: defaultPassword,
      roleId: adminRole.id,
      activo: true,
    },
  })

  await prisma.usuario.upsert({
    where: { email: 'laura.foto@jjphotoshop.es' },
    update: { passwordHash: defaultPassword },
    create: {
      nombre: 'Laura',
      apellidos: 'Fernández Perea',
      email: 'laura.foto@jjphotoshop.es',
      telefono: '+34 699 887 766',
      passwordHash: defaultPassword,
      roleId: fotografoRole.id,
      activo: true,
    },
  })

  await prisma.usuario.upsert({
    where: { email: 'maria.ruiz@jjphotoshop.es' },
    update: { passwordHash: defaultPassword },
    create: {
      nombre: 'María',
      apellidos: 'Ruiz Gómez',
      email: 'maria.ruiz@jjphotoshop.es',
      telefono: '+34 655 443 322',
      passwordHash: defaultPassword,
      roleId: supervisorRole.id,
      activo: true,
    },
  })

  // Seeding de Países
  await prisma.pais.upsert({
    where: { codigo: 'MX' },
    update: { nombre: 'México', codigoTelefono: '+52' },
    create: {
      codigo: 'MX',
      nombre: 'México',
      codigoTelefono: '+52',
    },
  })

  await prisma.pais.upsert({
    where: { codigo: 'JM' },
    update: { nombre: 'Jamaica', codigoTelefono: '+1876' },
    create: {
      codigo: 'JM',
      nombre: 'Jamaica',
      codigoTelefono: '+1876',
    },
  })

  await prisma.pais.upsert({
    where: { codigo: 'DO' },
    update: { nombre: 'Rep. Dominicana', codigoTelefono: '+1809' },
    create: {
      codigo: 'DO',
      nombre: 'Rep. Dominicana',
      codigoTelefono: '+1809',
    },
  })

  console.log(
    '✅ Seeding completed! Paises: MX (México +52), JM (Jamaica +1876), DO (Rep. Dominicana +1809)',
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
