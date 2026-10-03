import { z } from 'zod';
import { friendIdInputValueSchema } from './social.js';

export const registrationIdSchema = friendIdInputValueSchema.refine(value => value.length <= 32, {
  message: '用户 ID 须为 3–32 位字母、数字或下划线',
});
export const registrationPasswordSchema = z.string().min(12).max(128)
  .regex(/[A-Za-z]/, '密码至少包含一个字母')
  .regex(/[0-9]/, '密码至少包含一个数字');
export const registrationInputSchema = z.object({
  displayName: z.string().trim().min(1).max(32),
  userId: registrationIdSchema,
  password: registrationPasswordSchema,
}).strict();
export const registrationResultSchema = z.object({
  username: z.string().regex(/^[a-z0-9_]{3,32}$/),
  displayName: z.string().min(1).max(32),
  friendId: z.string().regex(/^[a-z0-9_]{3,32}$/),
}).strict();
export type RegistrationInput = z.input<typeof registrationInputSchema>;
