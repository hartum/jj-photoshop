import { PrismaClient } from '@prisma/client'

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

  // Create initial users
  await prisma.usuario.upsert({
    where: { email: 'hartumia@jjphotoshop.es' },
    update: {},
    create: {
      nombre: 'Hartumia',
      apellidos: 'SuperUser',
      email: 'hartumia@jjphotoshop.es',
      telefono: '+34 600 000 001',
      roleId: superuserRole.id,
      activo: true,
    },
  })

  await prisma.usuario.upsert({
    where: { email: 'carlos.mendoza@jjphotoshop.es' },
    update: {},
    create: {
      nombre: 'Carlos',
      apellidos: 'Mendoza García',
      email: 'carlos.mendoza@jjphotoshop.es',
      telefono: '+34 612 345 678',
      roleId: adminRole.id,
      activo: true,
    },
  })

  await prisma.usuario.upsert({
    where: { email: 'laura.foto@jjphotoshop.es' },
    update: {},
    create: {
      nombre: 'Laura',
      apellidos: 'Fernández Perea',
      email: 'laura.foto@jjphotoshop.es',
      telefono: '+34 699 887 766',
      roleId: fotografoRole.id,
      activo: true,
    },
  })

  await prisma.usuario.upsert({
    where: { email: 'maria.ruiz@jjphotoshop.es' },
    update: {},
    create: {
      nombre: 'María',
      apellidos: 'Ruiz Gómez',
      email: 'maria.ruiz@jjphotoshop.es',
      telefono: '+34 655 443 322',
      roleId: supervisorRole.id,
      activo: true,
    },
  })

  console.log('✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
