import { test, expect, openRoomCreation, type Page } from './fixtures.js';

async function login(page: Page, username: string) {
  await page.goto('/login');
  await page.getByLabel('用户名', { exact: true }).fill(username);
  await page.getByLabel('密码', { exact: true }).fill('stage two password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '游戏大厅', exact: true })).toBeVisible();
}

test('two friends change IDs, confirm friendship, chat privately and join a private room', async ({ page, browser }, info) => {
  // Two sessions wait for several separate 5-second synchronizations. Keep
  // each UI assertion's deadline unchanged while budgeting the entire journey.
  test.setTimeout(60000);
  const contextB = await browser.newContext({ viewport: info.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
  const b = await contextB.newPage();
  try {
    await login(page, 'stage3_a'); await login(b, 'stage3_b');
    await b.getByRole('link', { name: '好友', exact: true }).click();
    await expect(b.getByRole('heading', { name: '好友', exact: true })).toBeVisible();
    await expect(b.getByLabel('新好友 ID', { exact: true })).toHaveValue('@stage3_b');
    await b.getByLabel('新好友 ID', { exact: true }).fill('@rst307');
    await b.getByRole('button', { name: '保存好友 ID', exact: true }).click();
    await expect(b.getByRole('status')).toContainText('好友 ID 已保存');
    await b.reload();
    await expect(b.getByLabel('新好友 ID', { exact: true })).toHaveValue('@rst307');
    await page.getByRole('link', { name: '好友', exact: true }).click();
    await page.getByLabel('搜索好友 ID').fill('@RST307');
    await page.getByRole('button', { name: '搜索用户' }).click();
    await expect(page.getByText('玩家 E', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '发送好友申请' }).click();
    await expect(page.getByRole('status')).toContainText('好友申请已提交');
    await expect(b.getByRole('button', { name: '接受申请', exact: true })).toBeVisible({ timeout: 15000 });
    await b.getByRole('button', { name: '接受申请', exact: true }).click();
    await expect(b.getByRole('button', { name: '私聊 玩家 D' })).toBeVisible();
    await expect(page.getByRole('button', { name: '私聊 玩家 E' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: '私聊 玩家 E' }).click();
    await page.getByLabel('私聊消息', { exact: true }).fill('周末一起玩！<script>不执行</script>');
    await page.getByRole('button', { name: '发送消息', exact: true }).click();
    await expect(page.getByText('周末一起玩！<script>不执行</script>', { exact: true })).toBeVisible();
    await expect(b.getByText('1 条未读', { exact: true })).toBeVisible({ timeout: 15000 });
    await b.getByRole('button', { name: '私聊 玩家 D' }).click();
    await expect(b.getByText('周末一起玩！<script>不执行</script>', { exact: true })).toBeVisible();
    await b.getByLabel('私聊消息', { exact: true }).fill('可以，邀请我吧。');
    await b.getByRole('button', { name: '发送消息', exact: true }).click();
    await expect(page.getByText('可以，邀请我吧。', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.reload();
    await page.getByRole('button', { name: '私聊 玩家 E' }).click();
    await expect(page.getByText('可以，邀请我吧。', { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('friends-chat.png'), fullPage: true, animations: 'disabled' });
    await page.getByRole('link', { name: '游戏大厅', exact: true }).click();
    await openRoomCreation(page);
    await page.getByLabel('房间名', { exact: true }).fill('好友邀请桌');
    await page.getByLabel('房间类型').selectOption('private');
    await page.getByRole('button', { name: '创建并生成邀请码', exact: true }).click();
    await expect(page.getByRole('heading', { name: '好友邀请桌', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '邀请 玩家 E', exact: true }).click();
    await expect(page.getByText('已邀请 玩家 E', { exact: true })).toBeVisible();
    await expect(b.getByRole('button', { name: '接受并加入', exact: true })).toBeVisible({ timeout: 15000 });
    await b.getByRole('button', { name: '接受并加入', exact: true }).click();
    await expect(b.getByRole('heading', { name: '好友邀请桌', exact: true })).toBeVisible();
    await expect(b.getByRole('heading', { name: '候场成员', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '候场成员', exact: true })).toBeVisible();
    await expect.poll(() => b.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await b.screenshot({ path: info.outputPath('invited-room.png'), fullPage: true, animations: 'disabled' });
  } finally { await contextB.close(); }
});

test('unknown send outcome retries the same command without duplicate messages', async ({ page, browser }) => {
  const contextB = await browser.newContext(); const b = await contextB.newPage();
  try {
    await login(page, 'stage3_a'); await login(b, 'stage3_b');
    const sessionB = await b.request.get('/api/v1/auth/me');
    const bId = String((await sessionB.json()).data.account.id);
    const sessionA = await page.request.get('/api/v1/auth/me');
    const aAccount = (await sessionA.json()).data;
    const socialB = (await (await b.request.get('/api/v1/social')).json()).data;
    const request = await page.request.post('/api/v1/social/requests', { headers: { origin: 'http://127.0.0.1:5273', 'x-csrf-token': aAccount.csrfToken }, data: { requestId: crypto.randomUUID(), friendId: socialB.identity.friendId } });
    expect(request.ok()).toBe(true);
    await b.request.post(`/api/v1/social/friends/${aAccount.account.id}`, { headers: { origin: 'http://127.0.0.1:5273', 'x-csrf-token': (await sessionB.json()).data.csrfToken }, data: { requestId: crypto.randomUUID(), expectedRevision: 1, action: 'accept' } });
    await page.goto('/friends'); await page.getByRole('button', { name: '私聊 玩家 E' }).click();
    const requestIds: string[] = [];
    await page.route(`**/api/v1/social/friends/${bId}/messages`, async route => {
      if (route.request().method() !== 'POST') return route.continue();
      requestIds.push(String(route.request().postDataJSON().requestId));
      const response = await route.fetch();
      if (requestIds.length === 1) await route.abort('failed');
      else await route.fulfill({ response });
    });
    await page.getByLabel('私聊消息', { exact: true }).fill('发送确认丢失后仍只有一条');
    await page.getByRole('button', { name: '发送消息', exact: true }).click();
    await expect(page.getByRole('button', { name: '重试发送' })).toBeVisible();
    await page.getByRole('button', { name: '重试发送' }).click();
    await expect(page.getByRole('button', { name: '发送消息', exact: true })).toBeVisible();
    expect(requestIds).toHaveLength(2); expect(requestIds[1]).toBe(requestIds[0]);
    const messages = await (await page.request.get(`/api/v1/social/friends/${bId}/messages`)).json();
    expect(messages.data.items.filter((item: { text: string }) => item.text === '发送确认丢失后仍只有一条')).toHaveLength(1);
  } finally { await contextB.close(); }
});
