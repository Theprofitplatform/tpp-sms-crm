import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    return {
      ok: true,
      ts: new Date().toISOString(),
      service: 'api',
    };
  });
};

export default healthRoutes;
