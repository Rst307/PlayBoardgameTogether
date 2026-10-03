import { describe, expect, it } from 'vitest';
import { friendIdInputValueSchema, friendIdSchema, formatFriendId, socialSettingsInputSchema } from '../../packages/protocol/src/social.js';

describe('custom @friend handles', () => {
  it('accepts optional @ and canonicalizes the same account handle', () => {
    for (const input of ['rst307', '@rst307', ' @RST307 ']) {
      expect(friendIdInputValueSchema.parse(input)).toBe('rst307');
    }
    expect(formatFriendId('rst307')).toBe('@rst307');
    expect(friendIdSchema.safeParse('@rst307').success).toBe(false);
  });

  it('rejects malformed and oversized handles without silently stripping extra @', () => {
    for (const input of ['@@rst307', '@ab', '@', '@rst 307', '@rst-307', '@' + 'a'.repeat(37)]) {
      expect(friendIdInputValueSchema.safeParse(input).success).toBe(false);
    }
    expect(friendIdInputValueSchema.parse('@' + 'a'.repeat(36))).toBe('a'.repeat(36));
  });

  it('accepts only bounded integer day policies and strict command metadata', () => {
    const command = { requestId: '00000000-0000-4000-8000-000000000001', expectedRevision: 1, friendIdChangeDays: 0 };
    expect(socialSettingsInputSchema.parse(command).friendIdChangeDays).toBe(0);
    expect(socialSettingsInputSchema.parse({ ...command, friendIdChangeDays: 3650 }).friendIdChangeDays).toBe(3650);
    for (const value of [-1, 3651, 0.5, '7']) {
      expect(socialSettingsInputSchema.safeParse({ ...command, friendIdChangeDays: value }).success).toBe(false);
    }
    expect(socialSettingsInputSchema.safeParse({ ...command, accountId: command.requestId }).success).toBe(false);
  });
});
