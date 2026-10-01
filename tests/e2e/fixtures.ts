import {test as base,expect} from '@playwright/test';
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
