import type { FastifyInstance } from 'fastify';

export async function projectRoutes(fastify: FastifyInstance) {
  fastify.get('/api/projects', async () => {
    return { projects: [] };
  });

  fastify.post('/api/projects', async (request, reply) => {
    const body = request.body as { name?: string; width?: number; height?: number };
    const newProject = {
      id: `proj_${Date.now()}`,
      name: body.name || 'Untitled Project',
      width: body.width || 1920,
      height: body.height || 1080,
      createdAt: new Date(),
    };
    return reply.status(201).send(newProject);
  });
}
