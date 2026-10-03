import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { gameSubmissionInputSchema, gameSubmissionReviewSchema } from '../../packages/protocol/src/index.js';
import { ApiClient } from '../../packages/client-sdk/src/index.js';

const input = {
  requestId: randomUUID(), gameId: 'new-game', version: '1.0.0', name: '新游戏',
  description: '两人轮流行动的桌游。', repositoryUrl: 'https://github.com/example/new-game',
};
afterEach(() => vi.unstubAllGlobals());
describe('game submission public contract', () => {
  it('rejects executable fields, HTML, traversal, credentials and arbitrary network targets', () => {
    for (const field of ['code', 'file', 'archive', 'serverEntry', 'clientEntry', 'accountId', 'status', 'reviewedBy', '__proto__']) {
      expect(gameSubmissionInputSchema.safeParse({ ...input, [field]: 'malicious' }).success).toBe(false);
    }
    for (const repositoryUrl of [
      'http://github.com/example/game', 'https://127.0.0.1/game', 'https://github.com.evil.test/a/b',
      'https://user:secret@github.com/a/b', 'https://github.com/a/b?token=secret',
      'https://github.com/a/b#x', 'https://github.com/a/../private',
      'https://github.com/a/b/archive/main.zip', 'file:///tmp/game', 'javascript:alert(1)',
    ]) expect(gameSubmissionInputSchema.safeParse({ ...input, repositoryUrl }).success).toBe(false);
    for (const description of ['<script>alert(1)</script>', '<svg onload=alert(1)>', 'bad\u0000text', 'a'.repeat(2001)]) {
      expect(gameSubmissionInputSchema.safeParse({ ...input, description }).success).toBe(false);
    }
    expect(gameSubmissionInputSchema.safeParse({ ...input, gameId: '../game' }).success).toBe(false);
    expect(gameSubmissionInputSchema.safeParse({ ...input, version: 'latest' }).success).toBe(false);
    expect(gameSubmissionReviewSchema.safeParse({ requestId: randomUUID(), expectedRevision: 1, status: 'approved', reviewNote: '自动安装' }).success).toBe(false);
  });

  it('SDK validates requests before sending and rejects malformed responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { id: 'wrong' }, traceId: 'test' })));
    vi.stubGlobal('fetch', fetchMock);
    const api = new ApiClient();
    await expect(api.submitGame({ ...input, repositoryUrl: 'file:///virus' })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(api.submitGame(input)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/game-submissions');
  });
});
