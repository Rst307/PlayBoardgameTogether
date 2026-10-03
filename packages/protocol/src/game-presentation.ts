import { z } from 'zod';

export const publicImageUrlSchema = z.string().max(2048).refine(value => {
  if (/^\/game-art\/[a-z0-9/_.-]+\.(?:svg|png|jpe?g|webp)$/i.test(value)) {
    return !value.includes('..');
  }
  if (/^\/api\/v1\/game-packages\/[a-z0-9]+(?:[.-][a-z0-9]+)+\/versions\/\d+\.\d+\.\d+\/art\/(?:icon|cover|background)\.png$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash && !url.search;
  } catch { return false; }
}, '请输入公开 HTTPS、/game-art/ 或已安装游戏包的 PNG 图片地址，不包含凭据、查询参数或片段。');

const images = {
  iconUrl: publicImageUrlSchema.nullable(),
  coverUrl: publicImageUrlSchema.nullable(),
  backgroundUrl: publicImageUrlSchema.nullable(),
};
export const gamePresentationSchema = z.object({
  gameId: z.string().max(128), version: z.string().max(32),
  revision: z.number().int().nonnegative(), ...images,
}).strict();
export const gamePresentationInputSchema = z.object({
  expectedRevision: z.number().int().nonnegative(), ...images,
}).strict();
export type GamePresentation = z.infer<typeof gamePresentationSchema>;
export type GamePresentationInput = z.infer<typeof gamePresentationInputSchema>;
