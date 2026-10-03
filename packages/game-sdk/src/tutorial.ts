/** Public practice data only: never pass an authoritative State or a live match ID. */
export interface TutorialFrame {
  view: unknown;
  events: unknown[];
}

export type TutorialActionResult =
  | { accepted: false; feedback: string }
  | { accepted: true; frame: TutorialFrame; complete: boolean; feedback: string };

export interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  /** Accessible region label in the game's existing board to highlight. */
  focusArea?: string;
  initial: TutorialFrame;
  /** Parse unknown actions and views with game schemas. Return a new frame, without mutation. */
  onAction(input: { action: unknown; frame: TutorialFrame }): TutorialActionResult;
}

export interface GameTutorial {
  title: string;
  description: string;
  steps: readonly TutorialStep[];
}

export interface TutorialProgress {
  stepIndex: number;
  frame: TutorialFrame;
  complete: boolean;
  feedback: string;
}

export function startTutorialStep(tutorial: GameTutorial, stepIndex = 0): TutorialProgress {
  const step = tutorial.steps[stepIndex];
  if (!step || !Number.isInteger(stepIndex)) throw new Error('Tutorial step unavailable');
  return { stepIndex, frame: structuredClone(step.initial), complete: false, feedback: '' };
}

export function applyTutorialAction(
  tutorial: GameTutorial, progress: TutorialProgress, action: unknown,
): TutorialProgress {
  if (progress.complete) return progress;
  const step = tutorial.steps[progress.stepIndex];
  if (!step) throw new Error('Tutorial step unavailable');
  // Isolate author code so rejected actions cannot mutate the current practice scene.
  const result = step.onAction({ action, frame: structuredClone(progress.frame) });
  return result.accepted
    ? { ...progress, frame: result.frame, complete: result.complete, feedback: result.feedback }
    : { ...progress, feedback: result.feedback };
}
