import {test,expect} from './fixtures.js';

test('two real accounts create, join, ready, and load isolated initial views',async({browser},testInfo)=>{
  const a=await browser.newContext(),b=await browser.newContext(),c=await browser.newContext();
  const pa=await a.newPage(),pb=await b.newPage(),pc=await c.newPage();
  await pb.addInitScript(()=>{const start=OscillatorNode.prototype.start;OscillatorNode.prototype.start=function(...args){(window as any).__matchCueStarts=((window as any).__matchCueStarts??0)+1;return start.apply(this,args);};});
  async function login(page:any,user:string){await page.goto('/login');await page.getByLabel('用户名').fill(user);await page.getByLabel('密码').fill('stage two password');await page.getByRole('button',{name:'登录',exact:true}).click();await expect(page.getByRole('heading',{name:'游戏大厅'})).toBeVisible();}
  await login(pa,'stage2_a');await login(pb,'stage2_b');await login(pc,'stage2_c');
  await pa.getByRole('link',{name:'创建房间'}).click();
  await pa.getByLabel('游戏与版本').selectOption('demo.counter-room@1.0.0');
  await pa.getByLabel('房间名').fill(`阶段二验收 ${testInfo.project.name}`);await pa.getByRole('button',{name:'创建并生成邀请码'}).click();
  const code=(await pa.locator('.invite-box strong').textContent())!;await expect(pa.getByRole('heading',{name:`阶段二验收 ${testInfo.project.name}`})).toBeVisible();
  await pb.getByLabel('12 位邀请码').fill(code);await pb.getByRole('button',{name:'加入私人房间'}).click();await pb.getByRole('button',{name:'坐这里'}).click();await pb.getByRole('button',{name:'准备',exact:true}).click();
  await expect(pa.getByText(/已准备 ·/)).toBeVisible();await pa.getByRole('button',{name:'准备',exact:true}).click();await expect(pa.getByRole('button',{name:'开始游戏'})).toBeEnabled();await pa.screenshot({path:`docs/screenshots/stage-2/room-${testInfo.project.name}.png`,fullPage:true});await pa.getByRole('button',{name:'开始游戏'}).click();
  await expect(pa.getByText('计数房间仅用于正式身份验收')).toBeVisible();const matchUrl=pa.url();await expect(pb.getByText('计数房间仅用于正式身份验收')).toBeVisible();expect(await pb.evaluate(()=>(window as any).__matchCueStarts??0)).toBe(0); // Initial snapshots never play game sounds.
  const privateHint=await pa.getByText(/你的私密提示/).textContent();expect(privateHint).not.toBe(await pb.getByText(/你的私密提示/).textContent());await pa.reload();await expect(pa.getByText(/你的私密提示/)).toHaveText(privateHint!);await pc.goto(matchUrl);await expect(pc.getByText('无法读取对局')).toBeVisible();expect(await pa.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);await pa.screenshot({path:`docs/screenshots/stage-2/match-${testInfo.project.name}.png`,fullPage:true});
  await pa.getByRole('button',{name:'返回房间'}).click();
  await expect(pa.getByRole('heading',{name:`阶段二验收 ${testInfo.project.name}`})).toBeVisible();
  await expect(pa.getByText('实时同步',{exact:true})).toBeVisible();
  await expect(pa).toHaveURL(/\/rooms\//);
  await pa.reload();
  await expect(pa.getByRole('button',{name:'进入对局'})).toBeVisible();
  await expect(pa.getByText('实时同步',{exact:true})).toBeVisible();
  await expect(pa).toHaveURL(/\/rooms\//);
  await expect(pa.getByRole('button',{name:'关闭并终止对局'})).toHaveCount(0);
  await Promise.all([a.close(),b.close(),c.close()]);
});

test('dedicated room creation supports installed game options',async({page},testInfo)=>{
  await page.goto('/login');await page.getByLabel('用户名').fill('stage2_a');await page.getByLabel('密码').fill('stage two password');await page.getByRole('button',{name:'登录',exact:true}).click();
  await expect(page.getByRole('heading',{name:'游戏大厅'})).toBeVisible();
  await page.getByRole('link',{name:'创建房间'}).click();
  await expect(page.getByRole('heading',{name:'创建房间'})).toBeVisible();
  await page.getByLabel('游戏与版本').selectOption('demo.counter-room@1.0.0');
  await page.getByLabel('房间名').fill(`自定义房间 ${testInfo.project.name}`);
  await page.getByLabel('游戏选项（JSON）').fill('{"targetScore":5}');
  await page.getByRole('button',{name:'创建并生成邀请码'}).click();
  await expect(page.getByRole('heading',{name:`自定义房间 ${testInfo.project.name}`})).toBeVisible();
  await expect(page.locator('.invite-box strong')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
});

