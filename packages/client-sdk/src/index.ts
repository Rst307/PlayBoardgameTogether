import { modelProfileSchema, modelEndpointSchema, modelProfileSavedSchema, modelConnectionTestSchema, modelSettingsStatusSchema, modelDeletedSchema, modelCredentialSavedSchema, modelCredentialRevokedSchema, type ModelProfileInput, type ModelProfileUpdate } from '@boardgame/protocol';
import { apiEnvelopeSchema, matchCommandReceiptSchema, matchViewSchema, pongMessageSchema } from '@boardgame/protocol';
import { createRoomInputSchema, createRoomResultSchema, lobbyPageSchema, gameRulesSchema, type CreateRoomInput, type LobbyQuery } from '@boardgame/protocol';
import { AssetClient } from './assets.js';
import { profileSchema, profileInputSchema, matchHistorySchema, type ProfileInput } from '@boardgame/protocol';
export type { AssetDraft, AssetVersion } from './assets.js';

export class ApiError extends Error { constructor(readonly code: string, message: string, readonly retryable: boolean, readonly traceId: string) { super(message); } }
export class ApiClient {
  async profile() { return profileSchema.parse(await this.request<unknown>('/profile')); }
  async saveProfile(input: ProfileInput) {
    return profileSchema.parse(await this.request<unknown>('/profile', {
      method: 'PUT', body: JSON.stringify(profileInputSchema.parse(input)),
    }));
  }
  async matchHistory(before?: string) {
    return matchHistorySchema.parse(await this.request<unknown>(`/profile/matches${before ? `?before=${encodeURIComponent(before)}` : ''}`));
  }
  readonly assets = new AssetClient((path, init) => this.request<unknown>(path, init));
  private csrfToken: string | null = null;
  constructor(private base = '/api/v1') {}
  private async request<T>(path: string, init?: RequestInit): Promise<T> { const headers = new Headers(init?.headers); if (init?.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json'); if(init?.method&&init.method!=='GET'&&this.csrfToken)headers.set('x-csrf-token',this.csrfToken); const response = await fetch(`${this.base}${path}`, { credentials:'same-origin',...init, headers }); if (response.status === 204) return undefined as T; const body = apiEnvelopeSchema.parse(await response.json()); if (!body.ok) throw new ApiError(body.error.code, body.error.message, body.error.retryable, body.traceId); const data=body.data as any;if(data?.csrfToken)this.csrfToken=data.csrfToken;return data as T; }
  login<T>(username:string,password:string){return this.request<T>('/auth/login',{method:'POST',body:JSON.stringify({username,password})});}
  me<T>(){return this.request<T>('/auth/me');}
  logout<T>(){return this.request<T>('/auth/logout',{method:'POST'}).finally(()=>{this.csrfToken=null;if(typeof sessionStorage!=='undefined')for(const key of Object.keys(sessionStorage))if(key.startsWith('boardgame:pending-match:'))sessionStorage.removeItem(key);});}
  rooms<T>(cursor?:string){return this.request<T>(`/rooms${cursor?`?cursor=${encodeURIComponent(cursor)}`:''}`);}
  async createConfiguredRoom(body: CreateRoomInput) {
    return createRoomResultSchema.parse(await this.request<unknown>('/rooms',{method:'POST',body:JSON.stringify(createRoomInputSchema.parse(body))}));
  }
  async lobby(query: LobbyQuery = {}) {
    const params = new URLSearchParams();
    for (const [key,value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key,String(value));
    return lobbyPageSchema.parse(await this.request<unknown>(`/rooms/lobby?${params}`));
  }
  async joinPublicRoom(id: string, body: {requestId:string;password?:string}) {
    await this.request<unknown>(`/rooms/${encodeURIComponent(id)}/join`,{method:'POST',body:JSON.stringify(body)});
  }
  async gameRules(id:string,version:string) {
    return gameRulesSchema.parse(await this.request<unknown>(`/games/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/rules`));
  }
  room<T>(id:string){return this.request<T>(`/rooms/${encodeURIComponent(id)}`);}
  createRoom<T>(body:unknown){return this.request<T>('/rooms',{method:'POST',body:JSON.stringify(body)});}
  joinRoom<T>(body:unknown){return this.request<T>('/rooms/join',{method:'POST',body:JSON.stringify(body)});}
  roomCommand<T>(id:string,path:string,method:string,body:unknown){return this.request<T>(`/rooms/${encodeURIComponent(id)}/${path}`,{method,body:JSON.stringify(body)});}
  matchView<T>(id:string){return this.request<T>(`/matches/${encodeURIComponent(id)}/view`);}
  async matchSnapshot(id:string){return matchViewSchema.parse(await this.request<unknown>(`/matches/${encodeURIComponent(id)}/view`,{signal:AbortSignal.timeout(10000)}));}
  async matchCommandReceipt(id:string,requestId:string){return matchCommandReceiptSchema.parse(await this.request<unknown>(`/matches/${encodeURIComponent(id)}/commands/${encodeURIComponent(requestId)}`,{signal:AbortSignal.timeout(10000)}));}
  async submitMatchAction(id:string,body:{requestId:string;expectedRevision:number;expectedControllerEpoch:number;action:unknown}){return matchViewSchema.parse(await this.request<unknown>(`/matches/${encodeURIComponent(id)}/actions`,{method:'POST',body:JSON.stringify(body),signal:AbortSignal.timeout(10000)}));}
  async setMyController(id:string,body:{requestId:string;expectedControllerEpoch:number;controllerType:'human'|'script'|'model';policyId?:'basic-v1';profileId?:string}){return matchViewSchema.parse(await this.request<unknown>(`/matches/${encodeURIComponent(id)}/my-controller`,{method:'PUT',body:JSON.stringify(body),signal:AbortSignal.timeout(10000)}));}
  async modelEndpoints() {
    return modelEndpointSchema.array().parse(await this.request<unknown>('/model-endpoints'));
  }
  async modelSettingsStatus() {
    return modelSettingsStatusSchema.parse(await this.request<unknown>('/me/model-settings'));
  }
  async modelProfiles() {
    return modelProfileSchema.array().parse(await this.request<unknown>('/me/model-profiles'));
  }
  async createModelProfile(body: ModelProfileInput) {
    return modelProfileSavedSchema.parse(await this.request<unknown>('/me/model-profiles', {
      method: 'POST', body: JSON.stringify(body),
    }));
  }
  async updateModelProfile(id: string, body: ModelProfileUpdate) {
    return modelProfileSavedSchema.parse(await this.request<unknown>(`/me/model-profiles/${encodeURIComponent(id)}`, {
      method: 'PATCH', body: JSON.stringify(body),
    }));
  }
  async deleteModelProfile(id: string) {
    return modelDeletedSchema.parse(await this.request<unknown>(`/me/model-profiles/${encodeURIComponent(id)}`, { method: 'DELETE' }));
  }
  async testModelProfile(id: string) {
    return modelConnectionTestSchema.parse(await this.request<unknown>(`/me/model-profiles/${encodeURIComponent(id)}/test`, {
      method: 'POST', body: '{}',
    }));
  }
  async setModelCredential(id: string, apiKey: string) {
    return modelCredentialSavedSchema.parse(await this.request<unknown>(`/me/model-profiles/${encodeURIComponent(id)}/credential`, {
      method: 'PUT', body: JSON.stringify({ apiKey }),
    }));
  }
  async revokeModelCredential(id: string) {
    return modelCredentialRevokedSchema.parse(await this.request<unknown>(`/me/model-profiles/${encodeURIComponent(id)}/credential`, { method: 'DELETE' }));
  }
  games<T>(signal?: AbortSignal) { return this.request<T>('/games', signal ? { signal } : undefined); }
  createMatch<T>(options: unknown, signal?: AbortSignal) { return this.request<T>('/dev/lab/matches', { method: 'POST', body: JSON.stringify({ gameId: 'demo.test-counter', version: '0.1.0', options }), ...(signal ? { signal } : {}) }); }
  view<T>(matchId: string, seatId: string, signal?: AbortSignal) { return this.request<T>(`/dev/lab/matches/${encodeURIComponent(matchId)}/view?seat=${encodeURIComponent(seatId)}`, signal ? { signal } : undefined); }
  action<T>(matchId: string, command: unknown, signal?: AbortSignal) { return this.request<T>(`/dev/lab/matches/${encodeURIComponent(matchId)}/actions`, { method: 'POST', body: JSON.stringify(command), ...(signal ? { signal } : {}) }); }
  deleteMatch(matchId: string, signal?: AbortSignal) { return this.request<void>(`/dev/lab/matches/${encodeURIComponent(matchId)}`, { method: 'DELETE', ...(signal ? { signal } : {}) }); }
}
export function pingWebSocket(signal?: AbortSignal): Promise<number> { return new Promise((resolve, reject) => { const started = performance.now(); const url = new URL('/api/v1/ws', window.location.href); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'; const ws = new WebSocket(url); const id = crypto.randomUUID(); const timer = window.setTimeout(() => { ws.close(); reject(new Error('WebSocket ping timed out')); }, 5000); signal?.addEventListener('abort', () => { clearTimeout(timer); ws.close(); reject(new DOMException('Aborted', 'AbortError')); }, { once: true }); ws.addEventListener('message', event => { try { const raw: unknown = JSON.parse(String(event.data)); if (typeof raw === 'object' && raw !== null && 'type' in raw && raw.type === 'hello') ws.send(JSON.stringify({ protocolVersion: 1, type: 'ping', requestId: id })); if (typeof raw === 'object' && raw !== null && 'type' in raw && raw.type === 'pong') { const pong = pongMessageSchema.parse(raw); if (pong.requestId === id) { clearTimeout(timer); ws.close(); resolve(Math.round(performance.now() - started)); } } } catch { clearTimeout(timer); ws.close(); reject(new Error('WebSocket returned an invalid protocol message')); } }); ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('WebSocket unavailable')); }); }); }
