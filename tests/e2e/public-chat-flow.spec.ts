import { test, expect, type Page } from './fixtures.js';

async function login(page: Page, username: string) {
  await page.goto('/login');
  await page.getByLabel('用户名', { exact: true }).fill(username);
  await page.getByLabel('密码', { exact: true }).fill('stage two password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '游戏大厅', exact: true })).toBeVisible();
  const response = await page.request.get('/api/v1/auth/me');
  return String((await response.json()).data.account.id);
}

test('two players meet in public chat, become friends and persist public and private expressions', async ({ page, browser }, info) => {
  test.setTimeout(60000);
  const context = await browser.newContext({ viewport: info.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
  const peer = await context.newPage();
  try {
    const aid = await login(page, 'stage3_a');
    const bid = await login(peer, 'stage3_b');
    await page.getByRole('link', { name: '公共聊天', exact: true }).click();
    await expect(page).toHaveURL(/\/chat$/);
    await peer.goto('/chat');
    await page.getByLabel('公共消息', { exact: true }).fill('公共见面 🎲 ');
    await page.getByLabel('选择表情', { exact: true }).click();
    await page.getByRole('button', { name: '插入微笑', exact: true }).click();
    await page.getByRole('button', { name: '发送消息', exact: true }).click();
    const peerHistory = peer.getByRole('list', { name: '聊天记录' });
    await expect(peerHistory).toContainText('公共见面 🎲', { timeout: 10000 });
    await expect(peerHistory.getByRole('img', { name: '微笑', exact: true })).toBeVisible();
    await peer.getByLabel('查看 玩家 D 的名片', { exact: true }).click();
    await peer.getByRole('button', { name: '发送好友申请', exact: true }).click();
    await expect(peer.getByRole('dialog')).toContainText('好友申请已提交');
    await peer.getByLabel('关闭名片').click();
    await page.goto('/friends/requests');
    await expect(page.getByRole('button', { name: '接受申请', exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: '接受申请', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('已成为好友');
    await page.goto(`/friends/chat/${bid}`);
    await page.getByLabel('私聊消息', { exact: true }).fill('私密内容 ❤️ ');
    await page.getByLabel('选择表情', { exact: true }).click();
    await page.getByRole('button', { name: '插入眨眼', exact: true }).click();
    await page.getByRole('button', { name: '发送消息', exact: true }).click();
    await expect(page.getByLabel('私聊消息', { exact: true })).toHaveValue('');
    await peer.goto(`/friends/chat/${aid}`);
    await expect(peer.getByRole('list', { name: '聊天记录' })).toContainText('私密内容 ❤️');
    await peer.reload();
    await expect(peer.getByRole('list', { name: '聊天记录' }).getByRole('img', { name: '眨眼', exact: true })).toBeVisible();
    await page.goto('/chat');
    await page.reload();
    const history = page.getByRole('list', { name: '聊天记录' });
    await expect(history).toContainText('公共见面 🎲');
    await expect(history).not.toContainText('私密内容');
    await page.screenshot({ path: info.outputPath('public-chat-real.png'), fullPage: false });
  } finally { await context.close(); }
});
