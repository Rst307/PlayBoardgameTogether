import { parentPort } from 'node:worker_threads';

// Load a built-in strategy only when it is selected. Online packages never
// load rule source into the host worker; their ordered JSON candidates suffice.
const policies = {
  'azul.base:basic-v1': async input => (await import('@boardgame/azul/server')).decideBasicAzul(input),
  'splendor.base:basic-v1': async input => (await import('@boardgame/splendor/server')).decideBasicSplendor(input),
  'color-match:basic-v1': async input => (await import('@boardgame/color-match/server')).decideBasicColorMatch(input),
  'grid-garden:basic-v1': async input => (await import('@boardgame/grid-garden/server')).decideBasicGridGarden(input),
};
parentPort?.on('message', async input => {
  try {
    if (input.testMode && input.policyId === 'fixture-timeout') for (;;) { /* terminated by the scheduler */ }
    if (input.testMode && input.policyId === 'fixture-invalid') {
      parentPort?.postMessage({ ok: true, action: { type: 'forged' } });
      return;
    }
    if (input.testMode && input.policyId === 'fixture-throw') throw new Error('fixture');
    const policy = policies[`${input.gameId}:${input.policyId}`];
    if (!policy && input.policyId === 'basic-v1' && Array.isArray(input.legalActions) && input.legalActions.length) {
      parentPort?.postMessage({ ok: true, action: input.legalActions[0] });
      return;
    }
    if (!policy) throw new Error('AI_POLICY_UNAVAILABLE');
    parentPort?.postMessage({ ok: true, action: await policy({ view: input.view, legalActions: input.legalActions }) });
  } catch {
    parentPort?.postMessage({ ok: false, error: 'AI_POLICY_FAILED' });
  }
});
