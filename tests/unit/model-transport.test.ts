import { EventEmitter } from 'node:events';
import { beforeEach, expect, it, vi } from 'vitest';
import { request } from 'node:https';
import { OpenAiChatAdapter } from '../../apps/api/src/model-ai.js';

vi.mock('node:dns/promises', () => ({ lookup: vi.fn().mockResolvedValue([{ address: '8.8.8.8', family: 4 }]) }));
vi.mock('node:https', () => ({ request: vi.fn() }));

const input = { endpoint: 'https://provider.example/v1', model: 'example', apiKey: 'secret-not-for-errors', decisionId: 'test', choices: [{ id: 'ok', description: 'test' }], rules: 'test', view: {}, timeoutMs: 1000 };
let status = 200;
let requestedPath = '';

beforeEach(() => {
  status = 200;
  vi.mocked(request).mockImplementation(((url: URL, options: {
    lookup: (host: string, options: { all: boolean }, callback: (error: unknown, addresses: unknown) => void) => void;
  }, callback: (response: EventEmitter & { statusCode: number; resume: () => void }) => void) => {
    requestedPath = url.pathname;
    const req = new EventEmitter();
    Object.assign(req, { end: () => {
      options.lookup(url.hostname, { all: true }, (_error: unknown, addresses: unknown) => {
        if (!Array.isArray(addresses)) {
          req.emit('error', new Error('Invalid IP address: undefined'));
          return;
        }
        const response = Object.assign(new EventEmitter(), { statusCode: status, resume() {} });
        callback(response);
        response.emit('data', Buffer.from(JSON.stringify(status === 200
          ? { choices: [{ message: { content: '{"decisionId":"test","choiceId":"ok"}' } }] }
          : { error: { message: input.apiKey } })));
        response.emit('end');
      });
    } });
    return req;
  }) as typeof request);
});

it('supports the Node lookup all-addresses callback used by HTTPS', async () => {
  await expect(new OpenAiChatAdapter().decide(input, new AbortController().signal)).resolves.toMatchObject({ raw: '{"decisionId":"test","choiceId":"ok"}' });
  expect(requestedPath).toBe('/v1/chat/completions');
});

it('accepts a pasted complete Chat Completions URL without duplicating its path', async () => {
  await expect(new OpenAiChatAdapter().decide({ ...input, endpoint: `${input.endpoint}/chat/completions` }, new AbortController().signal)).resolves.toBeDefined();
  expect(requestedPath).toBe('/v1/chat/completions');
});

it.each([[401, 'API key'], [403, '权限'], [404, '模型标识'], [429, '额度'], [400, '参数']])('explains HTTP %i without disclosing provider response bodies', async (code, message) => {
  status = code as number;
  await expect(new OpenAiChatAdapter().decide(input, new AbortController().signal)).rejects.toThrow(message as string);
});
