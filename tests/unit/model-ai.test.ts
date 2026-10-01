import { describe, expect, it } from 'vitest';
import { MockModelAdapter, parseModelChoice, resolvePublicHttpsTarget } from '../../apps/api/src/model-ai.js';

describe('model AI boundaries', () => {
  it('accepts only the exact decision and server choice id', () => {
    expect(parseModelChoice('{"decisionId":"d1","choiceId":"a1"}', 'd1', new Set(['a1']))).toEqual({ decisionId: 'd1', choiceId: 'a1' });
    expect(() => parseModelChoice('{"decisionId":"d0","choiceId":"a1"}', 'd1', new Set(['a1']))).toThrow('模型选择无效');
    expect(() => parseModelChoice('{"decisionId":"d1","choiceId":"forged","extra":1}', 'd1', new Set(['a1']))).toThrow('模型选择无效');
  });
  it('allows one complete JSON fence but rejects oversized output', async () => {
    expect(parseModelChoice('```json\n{"decisionId":"d1","choiceId":"a1"}\n```', 'd1', new Set(['a1'])).choiceId).toBe('a1');
    expect(() => parseModelChoice('x'.repeat(2049), 'd1', new Set(['a1']))).toThrow('模型响应格式不符合要求');
    const adapter = new MockModelAdapter();
    await expect(adapter.decide({ endpoint:'mock://local', model:'mock', apiKey:'mock', decisionId:'d1', choices:[{id:'a1',description:'safe'}], rules:'rules', view:{myHand:[]}, timeoutMs:100 })).resolves.toMatchObject({ inputTokens:null, outputTokens:null });
  });

  it('rejects unsafe custom HTTPS targets before making a request', async () => {
    for (const url of [
      'http://api.example.com/v1',
      'https://user:secret@api.example.com/v1',
      'https://api.example.com/v1?token=secret',
      'https://api.example.com/v1#fragment',
      'https://api.example.com:8443/v1',
      'https://127.0.0.1/v1',
      'https://192.168.1.1/v1',
      'https://[::1]/v1',
      'https://[::ffff:808:808]/v1',
      'https://localhost/v1',
    ]) {
      await expect(resolvePublicHttpsTarget(url)).rejects.toThrow();
    }
  });

  it('accepts a public IPv4 endpoint without matching it as IPv4-mapped IPv6', async () => {
    await expect(resolvePublicHttpsTarget('https://172.67.74.19/v1'))
      .resolves.toMatchObject({ address: '172.67.74.19', family: 4 });
  });
});
