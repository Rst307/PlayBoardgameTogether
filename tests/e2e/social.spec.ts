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
    await b.getByRole('link', { name: '添加好友', exact: true }).click();
    await expect(b.getByLabel('新好友 ID', { exact: true })).toHaveValue('@stage3_b');
    await b.getByLabel('新好友 ID', { exact: true }).fill('@rst307');
    await b.getByRole('button', { name: '保存好友 ID', exact: true }).click();
    await expect(b.getByRole('status')).toContainText('好友 ID 已保存');
    await b.reload();
    await expect(b.getByLabel('新好友 ID', { exact: true })).toHaveValue('@rst307');
    await page.getByRole('link', { name: '好友', exact: true }).click();
    await page.getByRole('link', { name: '添加好友', exact: true }).click();
    await page.getByLabel('搜索好友 ID').fill('@RST307');
    await page.getByRole('button', { name: '搜索用户' }).click();
    await expect(page.getByText('玩家 E', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '发送好友申请' }).click();
    await expect(page.getByRole('status')).toContainText('好友申请已提交');
    await b.locator('.social-navigation').getByRole('link', { name: '好友申请' }).click();
    await expect(b.getByRole('button', { name: '接受申请', exact: true })).toBeVisible({ timeout: 15000 });
    await b.getByRole('button', { name: '接受申请', exact: true }).click();
    await b.locator('.social-navigation').getByRole('link', { name: '我的好友' }).click();
    await page.locator('.social-navigation').getByRole('link', { name: '我的好友' }).click();
    await expect(b.getByRole('link', { name: '私聊 玩家 D' })).toBeVisible();
    await expect(page.getByRole('link', { name: '私聊 玩家 E' })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: info.outputPath('friends-directory.png'), fullPage: true, animations: 'disabled' });
    await page.getByLabel('查找我的好友').fill('不存在的好友');
    await expect(page.getByText('没有匹配的好友，试试其他昵称或 ID。')).toBeVisible();
    await page.getByLabel('查找我的好友').fill('@rst307');
    await page.getByRole('link', { name: '私聊 玩家 E' }).click();
    await page.getByLabel('私聊消息', { exact: true }).fill('周末一起玩！<script>不执行</script>');
    await page.getByRole('button', { name: '发送消息', exact: true }).click();
    await expect(page.getByText('周末一起玩！<script>不执行</script>', { exact: true })).toBeVisible();
    await expect(b.getByText('1 条未读', { exact: true })).toBeVisible({ timeout: 15000 });
    await b.getByRole('link', { name: '私聊 玩家 D' }).click();
    await expect(b.getByText('周末一起玩！<script>不执行</script>', { exact: true })).toBeVisible();
    await b.getByLabel('私聊消息', { exact: true }).fill('可以，邀请我吧。');
    await b.getByRole('button', { name: '发送消息', exact: true }).click();
    await expect(page.getByText('可以，邀请我吧。', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.reload();
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
    await b.locator('.social-navigation').getByRole('link', { name: '房间邀请' }).click();
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
    const request = await page.request.post('/api/v1/social/requests', { headers: { origin: new URL(page.url()).origin, 'x-csrf-token': aAccount.csrfToken }, data: { requestId: crypto.randomUUID(), friendId: socialB.identity.friendId } });
    expect(request.ok()).toBe(true);
    await b.request.post(`/api/v1/social/friends/${aAccount.account.id}`, { headers: { origin: new URL(page.url()).origin, 'x-csrf-token': (await sessionB.json()).data.csrfToken }, data: { requestId: crypto.randomUUID(), expectedRevision: 1, action: 'accept' } });
    await page.goto('/friends'); await page.getByRole('link', { name: '私聊 玩家 E' }).click();
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

test('social pages separate tasks and preserve keyboard, refresh and history navigation', async ({ page }, info) => {
  await login(page, 'stage3_a');
  await page.getByRole('link', { name: '好友', exact: true }).click();
  await expect(page.getByRole('heading', { name: '好友', exact: true })).toBeVisible();
  await expect(page.getByLabel('新好友 ID')).toHaveCount(0);
  await expect(page.getByLabel('搜索好友 ID')).toHaveCount(0);
  await expect(page.getByLabel('私聊消息')).toHaveCount(0);
  const navigationTops = await page.locator('.social-navigation a').evaluateAll(links => links.map(link => link.getBoundingClientRect().top));
  expect(navigationTops.every(top => Math.abs(top - navigationTops[0]!) < 1)).toBe(true);
  await expect(page.getByRole('heading', { name: '收到的申请' })).toHaveCount(0);
  await page.evaluate(() => { document.body.dataset.socialNavigation = 'same-document'; });
  const navigationRequests: string[] = [];
  page.on('request', request => { if (request.isNavigationRequest()) navigationRequests.push(request.url()); });
  await page.getByRole('link', { name: '添加好友', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/friends\/add$/);
  await expect(page.getByLabel('搜索好友 ID')).toBeVisible();
  await expect(page.getByLabel('新好友 ID')).toBeVisible();
  await expect(page.getByRole('heading', { name: '收到的申请' })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('friends-add.png'), fullPage: true, animations: 'disabled' });
  await page.locator('.social-navigation').getByRole('link', { name: '好友申请' }).click();
  await expect(page).toHaveTitle('好友申请 · 桌游平台');
  await expect(page.getByRole('heading', { name: '收到的申请' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '发出的申请' })).toBeVisible();
  await expect(page.getByLabel('搜索好友 ID')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByLabel('搜索好友 ID')).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: '好友申请', exact: true })).toBeVisible();
  expect(navigationRequests).toEqual([]);
  expect(await page.evaluate(() => document.body.dataset.socialNavigation)).toBe('same-document');
  await page.reload();
  await expect(page.getByRole('heading', { name: '收到的申请' })).toBeVisible();
  await page.locator('.social-navigation').getByRole('link', { name: '房间邀请' }).click();
  await expect(page).toHaveURL(/\/friends\/invitations$/);
  await expect(page.getByRole('heading', { name: '开桌邀请' })).toBeVisible();
  await expect(page.getByLabel('新好友 ID')).toHaveCount(0);
  await page.getByRole('link', { name: '好友', exact: true }).click();
  await page.screenshot({ path: info.outputPath('friends-list.png'), fullPage: true, animations: 'disabled' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto('/friends/chat/00000000-0000-0000-0000-000000000000');
  await expect(page.getByRole('heading', { name: '无法打开这段私聊' })).toBeVisible();
  await expect(page.getByLabel('私聊消息')).toHaveCount(0);
  const chatNavigationTops = await page.locator('.social-navigation a').evaluateAll(links => links.map(link => link.getBoundingClientRect().top));
  expect(chatNavigationTops.every(top => Math.abs(top - chatNavigationTops[0]!) < 1)).toBe(true);
  await expect(page.getByRole('link', { name: '返回好友列表' })).toBeVisible();
});
