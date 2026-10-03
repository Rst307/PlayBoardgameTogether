import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  gameSubmissionInputSchema, gameSubmissionReviewSchema, gameSubmissionListQuerySchema,
} from '@boardgame/protocol';
import type { AuthService } from '../auth.js';
import { AppError } from '../errors.js';
import type { GameSubmissionService } from './submissions.js';

export function registerGameSubmissionRoutes(app: FastifyInstance, auth: AuthService, submissions: GameSubmissionService) {
  const attempts = new Map<string, { count: number; expiresAt: number }>();
  app.addHook('onRequest', async request => {
    const path = request.url.split('?')[0]!;
    if (!/^\/api\/v1\/(?:admin\/)?game-submissions(?:\/|$)/.test(path)) return;
    const now = Date.now();
    for (const [key, value] of attempts) if (value.expiresAt <= now) attempts.delete(key);
    const bucket = attempts.get(request.ip);
    if ((!bucket && attempts.size >= 1024) || (bucket && bucket.count >= 120)) {
      throw new AppError('RATE_LIMITED', '请求过于频繁，请稍后再试', 429, true);
    }
    attempts.set(request.ip, bucket ? { ...bucket, count: bucket.count + 1 } : { count: 1, expiresAt: now + 60_000 });
    if (request.method === 'POST' && request.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
      throw new AppError('VALIDATION_ERROR', '申请接口只接受 JSON', 415);
    }
  });
  const idSchema = z.object({ id: z.string().uuid() }).strict();
  const ok = (request: FastifyRequest, data: unknown) => ({ ok: true, data, traceId: request.id });
  const administrator = async (request: FastifyRequest) => {
    const current = await auth.authenticate(request);
    if (!current || current.account.role !== 'administrator') throw new AppError('FORBIDDEN', '需要管理员权限', 403);
    return current;
  };
  app.post('/api/v1/game-submissions', { bodyLimit: 8 * 1024 }, async request => {
    auth.assertOrigin(request);
    const current = await auth.authenticate(request);
    if (!current) throw new AppError('UNAUTHENTICATED', '请先登录', 401);
    auth.assertCsrf(request, current);
    return ok(request, await submissions.submit(current, gameSubmissionInputSchema.parse(request.body)));
  });
  app.get('/api/v1/game-submissions', async request => {
    const current = await auth.authenticate(request);
    if (!current) throw new AppError('UNAUTHENTICATED', '请先登录', 401);
    const query = gameSubmissionListQuerySchema.parse(request.query);
    return ok(request, await submissions.list(current.account.id, query.before));
  });
  app.get('/api/v1/game-submissions/:id', async request => {
    const current = await auth.authenticate(request);
    if (!current) throw new AppError('UNAUTHENTICATED', '请先登录', 401);
    const { id } = idSchema.parse(request.params);
    return ok(request, await submissions.get(current.account.id, id));
  });
  app.get('/api/v1/admin/game-submissions', async request => {
    const current = await administrator(request);
    const query = gameSubmissionListQuerySchema.parse(request.query);
    return ok(request, await submissions.list(current.account.id, query.before, true));
  });
  app.get('/api/v1/admin/game-submissions/:id', async request => {
    const current = await administrator(request);
    const { id } = idSchema.parse(request.params);
    return ok(request, await submissions.get(current.account.id, id, true));
  });
  app.post('/api/v1/admin/game-submissions/:id/review', { bodyLimit: 8 * 1024 }, async request => {
    auth.assertOrigin(request);
    const current = await administrator(request);
    auth.assertCsrf(request, current);
    const { id } = idSchema.parse(request.params);
    return ok(request, await submissions.review(current, id, gameSubmissionReviewSchema.parse(request.body)));
  });
}
