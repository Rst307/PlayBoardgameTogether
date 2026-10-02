import { openRoomCreation, openInviteJoin } from './fixtures.js';
import {test,expect} from './fixtures.js';

for(const started of [false,true])test(`host closes ${started?'active':'waiting'} room and all members return home`,async({browser},testInfo)=>{
  const host=await browser.newContext(testInfo.project.use);
  const guest=await browser.newContext(testInfo.project.use);
  const a=await host.newPage(),b=await guest.newPage();
  try {
    for(const [page,user] of [[a,'stage2_a'],[b,'stage2_b']] as const){
      await page.goto('/login');await page.getByLabel('用户名').fill(user);
      await page.getByLabel('密码',{exact:true}).fill('stage two password');
      await page.getByRole('button',{name:'登录',exact:true}).click();
      await expect(page.getByRole('heading',{name:'游戏大厅',exact:true})).toBeVisible();
    }
    await openRoomCreation(a);
    await a.getByLabel('游戏与版本').selectOption('demo.counter-room@1.0.0');
    await a.getByRole('button',{name:'创建并生成邀请码'}).click();
    const code=await a.locator('.invite-box strong').innerText();
    const roomUrl=a.url();
    await openInviteJoin(b); await b.getByLabel('12 位邀请码').fill(code);
    await b.getByRole('button',{name:'加入私人房间'}).click();
    await expect(b.getByText('实时同步',{exact:true})).toBeVisible();
    await expect(b.getByRole('button',{name:/关闭房间/})).toHaveCount(0);
    if(started){
      await b.getByRole('button',{name:'坐这里'}).click();
      await b.getByRole('button',{name:'准备',exact:true}).click();
      await expect(a.getByText(/已准备 ·/)).toBeVisible();
      await a.getByRole('button',{name:'准备',exact:true}).click();
      await a.getByRole('button',{name:'开始游戏'}).click();
      await expect(b).toHaveURL(/\/matches\//);
      await a.getByRole('button',{name:'返回房间'}).click();
    }
    const close=a.getByRole('button',{name:started?'强制关闭房间':'关闭房间',exact:true});
    await expect(close).toBeEnabled();
    a.once('dialog',dialog=>dialog.dismiss());
    await close.click();
    await expect(a).toHaveURL(roomUrl);
    await a.screenshot({path:testInfo.outputPath('close-room.png'),fullPage:true});
    a.once('dialog',dialog=>dialog.accept());
    await close.click();
    for(const page of [a,b]){
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole('heading',{name:'游戏大厅',exact:true})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
    }
    await a.goto(roomUrl);
    await expect(a).toHaveURL(/\/$/);
    await expect(a.getByRole('heading',{name:'游戏大厅',exact:true})).toBeVisible();
    if (started) {
      await a.getByRole('link', { name: '我的资料', exact: true }).click();
      const history = a.locator('article.room-row');
      await expect(history).toContainText('已中止');
      await history.getByRole('link', { name: '查看对局' }).click();
      await expect(a).toHaveURL(/\/matches\//);
      await expect(a.getByRole('button', { name: '返回我的资料' })).toBeVisible();
      await expect(a.getByText(/你的座位.*已终止/)).toBeVisible();
      await a.reload();
      await expect(a.getByRole('button', { name: '返回我的资料' })).toBeVisible();
    }
  }finally{await host.close();await guest.close();}
});
