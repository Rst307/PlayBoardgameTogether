import { test, expect, type Page } from '@playwright/test';
import type { SocialOverview } from '@boardgame/protocol';

const me = '10000000-0000-4000-8000-000000000001';
const friend = '10000000-0000-4000-8000-000000000002';
const messageId = '10000000-0000-4000-8000-000000000003';
const timestamp = '2026-10-04T00:00:00.000Z';
async function fixture(page: Page) {
  let guest = false;
  let reads = 0;
  let arrivals = 0;
  let overview: SocialOverview = {
    identity: { friendId: 'alice', revision: 1, changeIntervalDays: 30, nextChangeAt: null, canChange: true },
    friends: [{ person: { id: friend, friendId: 'bob', displayName: '桌友小明', avatar: 'cat' }, status: 'accepted', direction: 'incoming', revision: 1, unread: 0 }],
    requests: [], invitations: [],
  };
  let profile = { id: me, username: 'alice', displayName: '桌友小红', avatar: 'dice', bio: '周末一起玩', createdAt: timestamp };
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    const ok = (data: unknown) => route.fulfill({ json: { ok: true, traceId: 'social-ui', data } });
    if (path === '/auth/logout') { guest = true; return ok({}); }
    if (guest) return route.fulfill({ status: 401, json: { ok: false, traceId: 'social-ui', error: { code: 'UNAUTHENTICATED', message: '请登录', retryable: false } } });
    if (path === '/auth/me') return ok({ account: { id: me, username: 'alice', displayName: profile.displayName, role: 'user' }, csrfToken: 'fixture-csrf' });
    if (path === '/social') return ok(overview);
    if (path === '/profile') {
      if (route.request().method() === 'PUT') profile = { ...profile, ...route.request().postDataJSON() };
      return ok(profile);
    }
    if (path === '/profile/matches') return ok({ items: [], nextCursor: null });
    if (path === `/social/friends/${friend}/messages`) return ok({ items: [
      { id: messageId, sequence: '1', senderId: friend, text: '晚上一起开桌吗？', createdAt: timestamp },
      ...(arrivals > 1 ? [{ id: '10000000-0000-4000-8000-000000000004', sequence: '2', senderId: friend, text: '最小化后收到的新消息', createdAt: timestamp }] : []),
    ], nextCursor: null });
    if (path === `/social/friends/${friend}/read`) { reads++; overview.friends[0]!.unread = 0; return ok({ done: true }); }
    return ok([]);
  });
  return {
    arrive() {
      arrivals++;
      overview = { ...overview, friends: overview.friends.map(item => ({ ...item, unread: 1 })), invitations: [{
        id: messageId, sender: overview.friends[0]!.person,
        recipient: { id: me, friendId: 'alice', displayName: '桌友小红', avatar: 'dice' },
        roomId: friend, roomName: '周末桌', hasPassword: true, status: 'pending', expiresAt: '2099-10-04T00:00:00.000Z', available: true,
      }] };
    },
    readCount: () => reads,
  };
}

test('messages and invitations notify outside the friends page', async ({ page }, info) => {
  const state = await fixture(page);
  await page.goto('/profile');
  await expect(page.getByRole('button', { name: /通知/ })).toBeVisible();
  state.arrive();
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('button', { name: '通知，2 条未处理' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '你有新的好友消息或邀请' })).toBeVisible();
  expect(state.readCount()).toBe(0);
  await page.getByRole('button', { name: '通知，2 条未处理' }).click();
  await expect(page.getByRole('link', { name: /周末桌/ })).toBeVisible();
  await page.screenshot({ path: info.outputPath('notification-menu.png'), fullPage: true });
  await page.getByRole('link', { name: /桌友小明.*1 条未读/ }).click();
  await expect(page.getByText('晚上一起开桌吗？', { exact: true })).toBeVisible();
  if (info.project.name === 'desktop') {
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('region', { name: '聊天浮窗' })).toBeVisible();
    await page.screenshot({ path: info.outputPath('chat-dock.png'), fullPage: true });
    await expect.poll(state.readCount).toBeGreaterThanOrEqual(1);
    await page.getByLabel('私聊消息', { exact: true }).fill('保留草稿');
    await page.getByRole('button', { name: '最小化聊天' }).click();
    await expect(page.getByLabel('私聊消息')).toBeHidden();
    const reads = state.readCount();
    state.arrive();
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByRole('button', { name: '通知，2 条未处理' })).toBeVisible();
    expect(state.readCount()).toBe(reads);
    await page.getByRole('button', { name: /展开与 桌友小明 的聊天/ }).click();
    await expect(page.getByLabel('私聊消息')).toHaveValue('保留草稿');
    await expect(page.getByText('最小化后收到的新消息', { exact: true })).toBeVisible();
    await expect.poll(state.readCount).toBeGreaterThan(reads);
    await page.getByRole('link', { name: '开发者文档', exact: true }).click();
    await expect(page.getByLabel('私聊消息')).toHaveValue('保留草稿');
    await page.getByRole('button', { name: '关闭聊天' }).click();
    await expect(page.getByLabel('私聊消息')).toHaveCount(0);
  } else {
    await expect(page).toHaveURL(new RegExp(`/friends/chat/${friend}$`));
    await expect(page.getByRole('region', { name: '聊天浮窗' })).toHaveCount(0);
  }
  await page.getByRole('button', { name: /^通知(?:，.*)?$/ }).click();
  await page.getByRole('link', { name: /周末桌/ }).click();
  await expect(page).toHaveURL(/\/friends\/invitations$/);
  await expect(page.getByLabel('邀请房间密码')).toBeVisible();
  await expect(page.getByRole('button', { name: '接受并加入' })).toBeDisabled();
  await page.getByLabel('邀请房间密码').fill('test-password');
  await expect(page.getByRole('button', { name: '接受并加入' })).toBeEnabled();
  await page.screenshot({ path: info.outputPath('social-notifications.png'), fullPage: true });
});

test('profile keeps editing, ID settings and history behind task entrances', async ({ page }, info) => {
  await fixture(page);
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: '桌友小红' })).toBeVisible();
  await expect(page.getByLabel('昵称', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('新好友 ID')).toHaveCount(0);
  await expect(page.getByText('@alice', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('profile-simple.png'), fullPage: true });
  await page.getByRole('link', { name: '编辑资料', exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/edit$/);
  await page.getByLabel('昵称', { exact: true }).fill('新的昵称');
  await page.getByRole('button', { name: '保存资料', exact: true }).click();
  await expect(page.getByRole('heading', { name: '新的昵称' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '新的昵称' })).toBeVisible();
  await page.getByRole('link', { name: '对局记录', exact: true }).click();
  await expect(page.getByText('还没有对局记录。')).toBeVisible();
  await page.getByRole('link', { name: '返回我的资料' }).click();
  await page.getByRole('link', { name: '管理好友 ID' }).click();
  await expect(page.getByLabel('新好友 ID')).toBeVisible();
  await page.getByRole('link', { name: '返回我的资料' }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByText('账户操作', { exact: true }).click();
  await page.getByRole('button', { name: '退出登录' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: /通知/ })).toHaveCount(0);
});
