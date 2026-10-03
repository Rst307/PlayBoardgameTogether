import {test as base,expect,type Page} from '@playwright/test';
import setup from './setup.js';

// Each test owns its rooms; creation quotas must not depend on earlier test runs.
export const test=base.extend<{isolatedDatabase:void}>({
  isolatedDatabase:[async ({baseURL},use)=>{
    if(!baseURL)throw new Error('E2E baseURL is required');
    await setup();await use();
  },{auto:true}],
});
export {expect};
export type {BrowserContext,Page} from '@playwright/test';

export async function openRoomCreation(page: Page) {
  await page.locator('a.game-card[href="/games/color-match/1.0.0"]').click();
  await page.getByRole('link', { name: '创建房间', exact: true }).click();
  await expect(page.getByLabel('游戏与版本')).toHaveValue('color-match@1.0.0');
}

export async function openInviteJoin(page: Page) {
  await page.locator('a.game-card[href="/games/color-match/1.0.0"]').click();
  await page.getByText('使用邀请码加入私人房间', { exact: true }).click();
}
