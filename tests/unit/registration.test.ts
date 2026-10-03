import { describe, expect, it } from 'vitest';
import { registrationInputSchema } from '../../packages/protocol/src/auth.js';

const input = { displayName: '桌游玩家', userId: '@RST307', password: 'LongPassword307!' };
describe('registration input', () => {
  it('normalizes the ID and display name without changing password bytes', () => {
    expect(registrationInputSchema.parse({ ...input, displayName: ' 桌游玩家 ', password: ' LongPassword307! ' }))
      .toEqual({ displayName: '桌游玩家', userId: 'rst307', password: ' LongPassword307! ' });
    expect(registrationInputSchema.parse({ ...input, userId: 'rst307' }).userId).toBe('rst307');
  });
  it('rejects invalid IDs, blank names, weak passwords and privilege fields', () => {
    for (const invalid of [
      { ...input, displayName: '   ' }, { ...input, displayName: '字'.repeat(33) },
      ...['@@rst307', '@ab', '@用户307', 'a-b', 'x'.repeat(33)].map(userId => ({ ...input, userId })),
      ...['Short307', 'OnlyLettersHere', '123456789012', 'A1' + 'x'.repeat(127)].map(password => ({ ...input, password })),
      { ...input, role: 'administrator' }, { ...input, accountId: 'fake' },
    ]) expect(registrationInputSchema.safeParse(invalid).success).toBe(false);
    expect(registrationInputSchema.safeParse({ ...input, password: 'a1' + 'x'.repeat(10) }).success).toBe(true);
    expect(registrationInputSchema.safeParse({ ...input, password: 'a1' + 'x'.repeat(126) }).success).toBe(true);
  });
});
