import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { gamePresentationInputSchema } from '@boardgame/protocol';
import type { AuthService } from '../auth.js';
import { AppError } from '../errors.js';
import type { GamePresentationService } from './presentations.js';

export function registerGamePresentationRoutes(
  app: FastifyInstance, auth: AuthService, presentations: GamePresentationService, production: boolean,
) {
  const ok = (request: FastifyRequest, data: unknown) => ({ ok: true, data, traceId: request.id });
  app.get('/api/v1/games/presentations', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    return ok(request, await presentations.list(production));
  });
  app.put('/api/v1/games/:id/versions/:version/presentation', async (request, reply) => {
    auth.assertOrigin(request);
    const current = await auth.authenticate(request);
    if (!current) throw new AppError('UNAUTHENTICATED', '请先登录', 401);
    auth.assertCsrf(request, current);
    if (current.account.role !== 'administrator') throw new AppError('FORBIDDEN', '需要管理员权限', 403);
    const params = z.object({ id: z.string().max(128), version: z.string().max(32) }).parse(request.params);
    const input = gamePresentationInputSchema.parse(request.body);
    reply.header('cache-control', 'no-store');
    return ok(request, await presentations.save(current.account.id, params.id, params.version, input));
  });
}
