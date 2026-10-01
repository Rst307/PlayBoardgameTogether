import { decideBasicSplendor } from '@boardgame/splendor/server';
import { parentPort } from 'node:worker_threads';
import { decideBasicColorMatch } from '@boardgame/color-match/server';
import { decideBasicGridGarden } from '@boardgame/grid-garden/server';

parentPort?.on('message', input => {
  try {
    if (input.testMode && input.policyId === 'fixture-timeout') for (;;) { /* terminated by the scheduler */ }
    if (input.testMode && input.policyId === 'fixture-invalid') {
      parentPort?.postMessage({ ok: true, action: { type: 'forged' } });
      return;
    }
    if (input.testMode && input.policyId === 'fixture-throw') throw new Error('fixture');
    const policies = { 'splendor.base:basic-v1': decideBasicSplendor, 'color-match:basic-v1': decideBasicColorMatch, 'grid-garden:basic-v1': decideBasicGridGarden };
    const policy = policies[`${input.gameId}:${input.policyId}`];
    if (!policy) throw new Error('AI_POLICY_UNAVAILABLE');
    parentPort?.postMessage({ ok: true, action: policy({ view: input.view, legalActions: input.legalActions }) });
  } catch {
    parentPort?.postMessage({ ok: false, error: 'AI_POLICY_FAILED' });
  }
});
