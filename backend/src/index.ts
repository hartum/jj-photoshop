import Fastify from 'fastify';
import cors from '@fastify/cors';
import { projectRoutes } from './features/project-management/infrastructure/project.routes.js';

const fastify = Fastify({
  logger: true,
});

await fastify.register(cors, {
  origin: '*',
});

// Register feature routes
await fastify.register(projectRoutes);

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 JJ Photoshop Backend running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
