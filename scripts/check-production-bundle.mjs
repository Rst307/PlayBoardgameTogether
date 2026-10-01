/* eslint-env node */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dist = join('apps', 'web', 'dist');
const forbidden = ['Test Counter', '测试身份', '我的私密提示码', 'UI_FIXTURES_STAGE_9', 'sample-card-', 'anonymous-ui-render-fixture', 'jsxDEV'];

async function files(dir) {
  const output = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await files(path));
    else if (entry.name.endsWith('.js')) output.push(path);
  }
  return output;
}

for (const file of await files(dist)) {
  const source = await readFile(file, 'utf8');
  for (const token of forbidden) {
    if (source.includes(token)) throw new Error(`${file}: production bundle contains development lab marker ${token}`);
  }
}
console.log('production bundle excludes development lab UI');
