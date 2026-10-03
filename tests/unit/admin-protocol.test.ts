import { describe, expect, it } from 'vitest';
import {
  adminAccountCommandSchema,
  adminGameCommandSchema,
  adminAccountQuerySchema,
} from '../../packages/protocol/src/index.js';

describe('administrative command boundaries', () => {
  const command = {
    requestId: '824cd6dd-2e66-4bda-870b-77d0294ed3a8',
    expectedRevision: 1,
  };
  it('rejects identity, role and executable fields rather than granting privileges', () => {
    expect(
      adminAccountCommandSchema.safeParse({
        ...command,
        status: 'disabled',
        role: 'administrator',
      }).success,
    ).toBe(false);
    expect(
      adminGameCommandSchema.safeParse({
        ...command,
        enabled: true,
        serverEntry: '/tmp/code',
      }).success,
    ).toBe(false);
    expect(
      adminAccountCommandSchema.safeParse({ ...command, status: 'deleted' })
        .success,
    ).toBe(false);
    expect(
      adminGameCommandSchema.safeParse({
        ...command,
        expectedRevision: 0,
        enabled: true,
      }).success,
    ).toBe(false);
  });
  it('bounds search and cursor inputs', () => {
    expect(adminAccountQuerySchema.parse({ search: ' 玩家 ' }).search).toBe(
      '玩家',
    );
    expect(
      adminAccountQuerySchema.safeParse({ search: 'x'.repeat(33) }).success,
    ).toBe(false);
    expect(
      adminAccountQuerySchema.safeParse({ before: 'invalid' }).success,
    ).toBe(false);
  });
});
