import { createApp } from '../../apps/api/src/app.js';
import { loadConfig } from '../../apps/api/src/config.js';
import { createDatabase } from '../../apps/api/src/db/index.js';
import { createRegistry } from '../../apps/api/src/registry/index.js';
import { deliverRegistrationMail, deliverTestMail } from './registration-mailbox.js';
import { createHash } from 'node:crypto';
import { gamePackageZip } from '../fixtures/game-package.js';

const config = loadConfig();
if (config.NODE_ENV !== 'development' || config.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
  throw new Error('E2E server requires the isolated test database and development mode');
}
const app = await createApp({
  config,
  db: createDatabase(config.DATABASE_URL),
  registry: createRegistry(true),
  gameSubscriptionSource: {
    discover: async () => {
      const bytes = await gamePackageZip(source => source.replaceAll('online.score-race', 'online.subscription-example'));
      return [{ gameId: 'online.subscription-example', version: '1.0.0', sha256: createHash('sha256').update(bytes).digest('hex'), url: 'https://github.com/e2e/fixture.zip' }];
    },
    download: async () => gamePackageZip(source => source.replaceAll('online.score-race', 'online.subscription-example')),
  },
  mailTransport: async (_settings, message) => {
    const code = /验证码是：(\d{6})/.exec(message.text)?.[1];
    if (code) await deliverRegistrationMail(message.to, code);
    else await deliverTestMail(message.to, message.subject);
  },
});
await app.listen({ host: config.API_HOST, port: config.API_PORT });
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void app.close().then(() => process.exit(0)));
}
