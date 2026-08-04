import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { userRoutes } from './features/users/infrastructure/user.routes.js'
import { countryRoutes } from './features/countries/infrastructure/country.routes.js'
import { hotelRoutes } from './features/hotels/infrastructure/hotel.routes.js'
import { sessionRoutes } from './features/sessions/infrastructure/session.routes.js'

const fastify = Fastify({
  logger: true,
})

await fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
})

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'super-secret-key-jj-photoshop-2026',
})

// Register feature routes
await fastify.register(userRoutes)
await fastify.register(countryRoutes)
await fastify.register(hotelRoutes)
await fastify.register(sessionRoutes)

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000
    await fastify.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 JJ Photoshop Backend running on http://localhost:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
