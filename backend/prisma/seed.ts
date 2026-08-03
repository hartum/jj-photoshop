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
  const mexico = await prisma.pais.upsert({
    where: { codigo: 'MX' },
    update: { nombre: 'México', codigoTelefono: '+52' },
    create: {
      codigo: 'MX',
      nombre: 'México',
      codigoTelefono: '+52',
    },
  })

  const jamaica = await prisma.pais.upsert({
    where: { codigo: 'JM' },
    update: { nombre: 'Jamaica', codigoTelefono: '+1876' },
    create: {
      codigo: 'JM',
      nombre: 'Jamaica',
      codigoTelefono: '+1876',
    },
  })

  const repDominicana = await prisma.pais.upsert({
    where: { codigo: 'DO' },
    update: { nombre: 'Rep. Dominicana', codigoTelefono: '+1809' },
    create: {
      codigo: 'DO',
      nombre: 'Rep. Dominicana',
      codigoTelefono: '+1809',
    },
  })

  // Seeding de Áreas
  const areasMexico = ['Cancún', 'Riviera Maya', 'Vallarta', 'Los Cabos']
  for (const nombre of areasMexico) {
    const existingArea = await prisma.area.findFirst({
      where: { paisId: mexico.id, nombre },
    })
    if (!existingArea) {
      await prisma.area.create({
        data: { paisId: mexico.id, nombre },
      })
    }
  }

  const areasJamaica = ['Costa Norte']
  for (const nombre of areasJamaica) {
    const existingArea = await prisma.area.findFirst({
      where: { paisId: jamaica.id, nombre },
    })
    if (!existingArea) {
      await prisma.area.create({
        data: { paisId: jamaica.id, nombre },
      })
    }
  }

  const areasRepDom = ['Punta Cana']
  for (const nombre of areasRepDom) {
    const existingArea = await prisma.area.findFirst({
      where: { paisId: repDominicana.id, nombre },
    })
    if (!existingArea) {
      await prisma.area.create({
        data: { paisId: repDominicana.id, nombre },
      })
    }
  }

  // Seeding de Hoteles por Área
  const hotelesMap: Record<string, string[]> = {
    'Cancún': ['Ziva', 'Zilara', 'HRC', 'AVA'],
    'Riviera Maya': ['Único', 'HRRM'],
    'Vallarta': ['HRV', 'Único'],
    'Los Cabos': ['HRLC', 'Nobu'],
    'Costa Norte': ['Bahía Principe', 'Único'],
    'Punta Cana': ['HRC', 'PC'],
  }

  for (const [nombreArea, nombresHoteles] of Object.entries(hotelesMap)) {
    const area = await prisma.area.findFirst({ where: { nombre: nombreArea } })
    if (area) {
      for (const nombreHotel of nombresHoteles) {
        const existingHotel = await prisma.hotel.findFirst({
          where: { areaId: area.id, nombre: nombreHotel },
        })
        if (!existingHotel) {
          await prisma.hotel.create({
            data: {
              areaId: area.id,
              nombre: nombreHotel,
            },
          })
        }
      }
    }
  }

  console.log(
    '✅ Seeding completed! Países, Áreas y Hoteles creados correctamente.',
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
