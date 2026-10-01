/** Optional extension capability for games with several simultaneous decision owners. */
export interface MultiActorDecisionRequests<State> {
  getDecisionRequests(state: State): Array<{ seatId: string; decisionKey: string }>;
}
