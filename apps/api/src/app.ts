import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { ZodError, z } from 'zod';
import { createLabMatchSchema, labActionSchema, pingMessageSchema, PROTOCOL_VERSION, type ErrorCode } from '@boardgame/protocol';
import { normalizeConfig, type ApiConfigInput } from './config.js';
import { databaseStatus, listInstalledGames, type Database } from './db/index.js';
import { type GameRegistry } from './registry/index.js';
import { LabRunner, RunnerError } from './runtime/runner.js';
import { AppError } from './errors.js';
import { AuthService } from './auth.js';
import { registerRegistrationRoutes } from './registration-routes.js';
import { ProfileService } from './profiles.js';
import { profileInputSchema, matchHistoryQuerySchema } from '@boardgame/protocol';
import { RoomService } from './rooms.js';
import { MatchService } from './matches.js';
import { AiScheduler } from './ai-scheduler.js';
import { ModelProfileService } from './model-profiles.js';
import { AssetService } from './assets/service.js';
import { LocalAssetStorage } from './assets/storage.js';
import { registerAssetRoutes } from './assets/routes.js';
import { GamePresentationService } from './catalog/presentations.js';
import { registerGamePresentationRoutes } from './catalog/routes.js';
import { GameSubmissionService } from './catalog/submissions.js';
import { registerGameSubmissionRoutes } from './catalog/submission-routes.js';
import { fileURLToPath } from 'node:url';
import { AdminService } from './admin/service.js';
import { registerAdminRoutes } from './admin/routes.js';
import { SocialService } from './social/service.js';
import { registerSocialRoutes } from './social/routes.js';

export type AppDeps = { config: ApiConfigInput; db: Database; registry: GameRegistry; runner?: LabRunner;
  testMatchFaults?: { beforeCommit?: () => void; afterCommit?: () => void } };
const statusFor: Partial<Record<ErrorCode,number>>={VALIDATION_ERROR:400,GAME_NOT_FOUND:404,MATCH_NOT_FOUND:404,ROOM_NOT_FOUND:404,INVITE_UNAVAILABLE:404,AUTH_INVALID_CREDENTIALS:401,UNAUTHENTICATED:401,FORBIDDEN:403,STATE_CONFLICT:409,CONTROLLER_CONFLICT:409,CONTROLLER_NOT_HUMAN:409,AI_TASK_STALE:409,AI_BLOCKED:409,ROOM_CONFIG_CHANGED:409,REQUEST_ID_CONFLICT:409,ROOM_FULL:409,ROOM_NOT_WAITING:409,SEAT_OCCUPIED:409,NOT_SEATED:409,NOT_ALL_READY:409,ROOM_ALREADY_STARTED:409,ACTION_NOT_ALLOWED:422,AI_POLICY_UNAVAILABLE:422,AI_NOT_SUPPORTED:422,AI_INVALID_OUTPUT:422,AI_PROVIDER_FAILED:503,AI_TIMEOUT:503,GAME_SETUP_FAILED:422,GAME_VERSION_UNAVAILABLE:422,RATE_LIMITED:429,SERVICE_UNAVAILABLE:503,INTERNAL_ERROR:500};
function databaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? error.code : undefined;
  if (typeof code === 'string' && (code.startsWith('08') || ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', '57P01', '57P02', '57P03'].includes(code))) return true;
  const message = error instanceof Error ? error.message : '';
  return /timeout exceeded when trying to connect|connection terminated unexpectedly|connection terminated due to connection timeout/i.test(message);
}

export async function createApp(deps:AppDeps):Promise<FastifyInstance>{
  const config=normalizeConfig(deps.config); const app=Fastify({logger:config.LOG_LEVEL==='silent'?false:{level:config.LOG_LEVEL},bodyLimit:16*1024,genReqId:()=>randomUUID()}); const runner=deps.runner??new LabRunner(deps.registry); const auth=new AuthService(deps.db,config); const models=new ModelProfileService(deps.db,config.MODEL_CREDENTIALS_KEY); const rooms=new RoomService(deps.db,deps.registry,config); const matches=new MatchService(deps.db,deps.registry,config.NODE_ENV==='test'?deps.testMatchFaults:undefined);const scheduler=new AiScheduler(deps.db,deps.registry,matches,config);const joinAttempts=new Map<string,number[]>();
  await app.register(cors,{origin:config.WEB_ORIGIN,credentials:true}); await app.register(websocket,{options:{maxPayload:8*1024}});
  const assetRoot = process.env[config.NODE_ENV === 'test' ? 'TEST_ASSET_STORAGE_DIR' : 'ASSET_STORAGE_DIR'] ??
    fileURLToPath(new URL(config.NODE_ENV === 'test' ? '../../../.data/test-assets/' : '../../../.data/assets/', import.meta.url));
  const assets = new AssetService(deps.db, deps.registry, new LocalAssetStorage(assetRoot));
  await registerAssetRoutes(app, auth, assets);
  registerGamePresentationRoutes(app, auth, new GamePresentationService(deps.db), config.NODE_ENV === 'production');
  registerGameSubmissionRoutes(app, auth, new GameSubmissionService(deps.db));
  registerAdminRoutes(app, auth, new AdminService(deps.db, deps.registry, config.NODE_ENV === 'production'));
  registerSocialRoutes(app, auth, new SocialService(deps.db, rooms));
  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith('/api/v1/game-submissions') || request.url.startsWith('/api/v1/admin/') || request.url.startsWith('/api/v1/social') || request.url.startsWith('/api/v1/profile')) {
      reply.header('cache-control', 'no-store');
      reply.header('x-content-type-options', 'nosniff');
    }
    return payload;
  });
  app.addHook('onSend',async(request,reply,payload)=>{if(request.url.startsWith('/api/v1/me/model-')||request.url.startsWith('/api/v1/model-endpoints')||request.url.startsWith('/api/v1/auth')||request.url.startsWith('/api/v1/rooms')||request.url.startsWith('/api/v1/matches'))reply.header('cache-control','no-store');return payload;});
  app.setErrorHandler((error, request, reply) => {
    let code: ErrorCode = 'INTERNAL_ERROR';
    let message = 'Unexpected server error';
    let status = 500;
    let retryable = false;
    const transportCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (error instanceof ZodError) {
      code = 'VALIDATION_ERROR'; message = 'Request validation failed'; status = 400;
    } else if (transportCode === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      code = 'VALIDATION_ERROR'; message = 'Request body is too large'; status = 413;
    } else if (transportCode === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
      code = 'VALIDATION_ERROR'; message = 'Unsupported content type'; status = 415;
    } else if (transportCode === 'FST_ERR_CTP_INVALID_JSON_BODY' || transportCode === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
      code = 'VALIDATION_ERROR'; message = 'Invalid JSON body'; status = 400;
    } else if (error instanceof AppError) {
      code = error.code; message = error.message; status = error.status; retryable = error.retryable;
    } else if (error instanceof RunnerError) {
      code = error.code; message = error.message; status = statusFor[code] ?? 500;
    } else if (databaseUnavailable(error)) {
      code = 'SERVICE_UNAVAILABLE'; message = 'Database is temporarily unavailable'; status = 503; retryable = true;
    } else request.log.error({ errorType: error instanceof Error ? error.name : 'unknown' }, 'request failed');
    if (code === 'RATE_LIMITED') reply.header('retry-after', '60');
    reply.status(status).send({ ok: false, error: { code, message, retryable }, traceId: request.id });
  });
  const ok=<T>(request:any,data:T)=>({ok:true,data,traceId:request.id}); const requireAuth=(request:any)=>auth.authenticate(request); const protectedWrite=async(request:any)=>{auth.assertOrigin(request);const current=await auth.authenticate(request);auth.assertCsrf(request,current!);return current!;};
  app.get('/health/live',async request=>ok(request,{status:'live'}));
  app.get('/health/ready',async(request,reply)=>{const status=await databaseStatus(deps.db,deps.registry.manifests());if(!status.ready)reply.status(503);return ok(request,{status:status.ready?'ready':'not-ready',database:status});});
  app.get('/api/v1/games',async request=>{const ready=await databaseStatus(deps.db,deps.registry.manifests());if(!ready.ready)throw new AppError('SERVICE_UNAVAILABLE','Game catalog is unavailable until the database is ready',503,true);return ok(request,await listInstalledGames(deps.db,config.NODE_ENV==='production'));});
  app.get('/api/v1/games/:id/versions/:version',async request=>{const p=request.params as{id:string;version:string};const all=await listInstalledGames(deps.db,config.NODE_ENV==='production');const found=all.find(g=>g.id===p.id&&g.version===p.version);if(!found)throw new AppError('GAME_NOT_FOUND','Game extension not found',404);return ok(request,found);});
  app.get('/api/v1/games/:id/versions/:version/rules',async request=>{
    const p=request.params as {id:string;version:string};
    const rules=deps.registry.rules.get(`${p.id}@${p.version}`);
    if(!rules)throw new AppError('GAME_NOT_FOUND','此版本规则不可用',404);
    return ok(request,{gameId:p.id,version:p.version,rules});
  });
  app.get('/api/v1/games/:id/ai-policies',async request=>{const id=(request.params as{id:string}).id;const supported=deps.registry.manifests().some(item=>item.id===id&&!!deps.registry.get(item.id,item.version)?.getDecisionContext);return ok(request,supported?[{id:'basic-v1',version:'1.0.0',name:'基础脚本 AI'}]:[]);});
  const loginSchema=z.object({username:z.string().min(1).max(33),password:z.string().min(1).max(128)}).strict();
  registerRegistrationRoutes(app, auth);
  app.post('/api/v1/auth/login',async(request,reply)=>{auth.assertOrigin(request);const body=loginSchema.parse(request.body);const previous=await auth.authenticate(request,true);const result=await auth.login(body.username,body.password,request.ip);await auth.logout(previous);auth.setCookie(reply,result.token,result.csrfToken);return ok(request,{account:result.account,csrfToken:result.csrfToken,expiresAt:result.expiresAt.toISOString()});});
  app.get('/api/v1/auth/me',async request=>{const current=await requireAuth(request);return ok(request,{account:current!.account,csrfToken:auth.csrfFor(request,current!),expiresAt:current!.expiresAt.toISOString()});});
  const profiles = new ProfileService(deps.db);
  app.get('/api/v1/profile', async request => {
    const current = await requireAuth(request);
    return ok(request, await profiles.get(current!.account.id));
  });
  app.put('/api/v1/profile', async request => {
    const current = await protectedWrite(request);
    return ok(request, await profiles.save(current.account.id, profileInputSchema.parse(request.body)));
  });
  app.get('/api/v1/profile/matches', async request => {
    const current = await requireAuth(request);
    const query = matchHistoryQuerySchema.parse(request.query);
    return ok(request, await profiles.history(current!.account.id, query.before));
  });
  app.get('/api/v1/me/model-settings', async request => {
    await requireAuth(request);
    return ok(request, models.settingsStatus());
  });
  app.patch('/api/v1/me/model-profiles/:id', async request => {
    const current = await protectedWrite(request);
    const { id } = request.params as { id: string };
    return ok(request, await models.save(current.account.id, request.body, id));
  });
  app.delete('/api/v1/me/model-profiles/:id', async request => {
    const current = await protectedWrite(request);
    const { id } = request.params as { id: string };
    return ok(request, await models.remove(current.account.id, id));
  });
  app.get('/api/v1/model-endpoints',async request=>{await requireAuth(request);return ok(request,await models.endpoints());});
  app.get('/api/v1/me/model-profiles',async request=>{const current=await requireAuth(request);return ok(request,await models.list(current!.account.id));});
  app.post('/api/v1/me/model-profiles',async request=>{const current=await protectedWrite(request);return ok(request,await models.save(current.account.id,request.body));});
  app.post('/api/v1/me/model-profiles/:id/test',async request=>{const current=await protectedWrite(request);return ok(request,await models.test(current.account.id,(request.params as {id:string}).id));});
  app.put('/api/v1/me/model-profiles/:id/credential',async request=>{const current=await protectedWrite(request);return ok(request,await models.replaceCredential(current.account.id,(request.params as {id:string}).id,request.body));});
  app.delete('/api/v1/me/model-profiles/:id/credential',async request=>{const current=await protectedWrite(request);return ok(request,await models.revokeCredential(current.account.id,(request.params as {id:string}).id));});
  app.post('/api/v1/auth/logout',async(request,reply)=>{auth.assertOrigin(request);const current=await auth.authenticate(request,true);if(current)auth.assertCsrf(request,current);await auth.logout(current);auth.clearCookie(reply);return ok(request,{loggedOut:true});});
  app.get('/api/v1/rooms',async request=>{const a=await requireAuth(request);return ok(request,await rooms.list(a!.account.id,request.query));});
  app.post('/api/v1/rooms',async request=>{const a=await protectedWrite(request);return ok(request,await rooms.create(a.account.id,request.body));});
  const joinRoom = async (request: Parameters<typeof protectedWrite>[0], publicRoomId?:string) => {
    const a=await protectedWrite(request),now=Date.now();
    for(const [key,max] of [[`account:${a.account.id}`,10],[`ip:${request.ip}`,30]] as const){
      const recent=(joinAttempts.get(key)??[]).filter(at=>now-at<60_000);
      if(recent.length>=max)throw new AppError('RATE_LIMITED','Too many join attempts; retry later',429,true);
      recent.push(now);joinAttempts.set(key,recent);
    }
    return ok(request,await rooms.join(a.account.id,request.body,publicRoomId));
  };
  app.get('/api/v1/rooms/lobby',async request=>{const a=await requireAuth(request);return ok(request,await rooms.lobby(a!.account.id,request.query));});
  app.post('/api/v1/rooms/join',async request=>joinRoom(request));
  app.post('/api/v1/rooms/:id/join',async request=>joinRoom(request,(request.params as {id:string}).id));
  app.get('/api/v1/rooms/:id',async request=>{const a=await requireAuth(request);return ok(request,await rooms.snapshot((request.params as any).id,a!.account.id));});
  app.patch('/api/v1/rooms/:id/config',async request=>{const a=await protectedWrite(request);return ok(request,await rooms.configRoom(a.account.id,(request.params as any).id,request.body));});
  app.put('/api/v1/rooms/:id/assets',async request=>{const a=await protectedWrite(request);return ok(request,await rooms.selectAssets(a.account.id,(request.params as {id:string}).id,request.body));});
  app.post('/api/v1/rooms/:id/invite',async request=>{const a=await protectedWrite(request);return ok(request,await rooms.rotateInvite(a.account.id,(request.params as any).id,request.body));});
  app.put('/api/v1/rooms/:id/my-seat',async request=>{const a=await protectedWrite(request);return ok(request,await rooms.seat(a.account.id,(request.params as any).id,request.body));});
  app.delete('/api/v1/rooms/:id/my-seat',async request=>{const a=await protectedWrite(request);return ok(request,await rooms.unseat(a.account.id,(request.params as any).id,request.body));});
  app.put('/api/v1/rooms/:id/my-ready',async request=>{const a=await protectedWrite(request);return ok(request,await rooms.ready(a.account.id,(request.params as any).id,request.body));});
  app.post('/api/v1/rooms/:id/leave',async request=>{const a=await protectedWrite(request);return ok(request,await rooms.leave(a.account.id,(request.params as any).id,request.body));});
  app.post('/api/v1/rooms/:id/host',async request=>{const a=await protectedWrite(request);return ok(request,await rooms.transfer(a.account.id,(request.params as any).id,request.body));});
  app.post('/api/v1/rooms/:id/start',async request=>{const a=await protectedWrite(request);const result=await rooms.start(a.account.id,(request.params as any).id,request.body);scheduler.wake(result.matchId);return ok(request,result);});
  app.put('/api/v1/rooms/:id/seats/:seatId/bot',async request=>{const a=await protectedWrite(request);const p=request.params as{id:string;seatId:string};return ok(request,await rooms.addBot(a.account.id,p.id,p.seatId,request.body));});
  app.patch('/api/v1/rooms/:id/seats/:seatId/bot', async request => {
    const current = await protectedWrite(request);
    const params = request.params as {id: string; seatId: string};
    return ok(request, await rooms.configureBot(current.account.id, params.id, params.seatId, request.body));
  });
  app.delete('/api/v1/rooms/:id/seats/:seatId/bot',async request=>{const a=await protectedWrite(request);const p=request.params as{id:string;seatId:string};return ok(request,await rooms.removeBot(a.account.id,p.id,p.seatId,request.body));});
  app.post('/api/v1/rooms/:id/close',async request=>{const a=await protectedWrite(request);return ok(request,await rooms.closeRoom(a.account.id,(request.params as any).id,request.body));});
  app.get('/api/v1/matches/:id/view',async request=>{const a=await requireAuth(request);return ok(request,await matches.view(a!.account.id,(request.params as {id:string}).id));});
  app.get('/api/v1/matches/:id/commands/:requestId',async request=>{const a=await requireAuth(request);const p=request.params as {id:string;requestId:string};if(p.requestId.length<1||p.requestId.length>128)throw new AppError('VALIDATION_ERROR','Invalid requestId',400);return ok(request,await matches.commandReceipt(a!.account.id,p.id,p.requestId));});
  app.post('/api/v1/matches/:id/actions',async request=>{const a=await protectedWrite(request);return ok(request,await matches.act(a.account.id,(request.params as {id:string}).id,request.body,a.sessionId));});
  app.put('/api/v1/matches/:id/my-controller',async request=>{const a=await protectedWrite(request);const id=(request.params as{id:string}).id;const result=await matches.setMyController(a.account.id,id,request.body);scheduler.wake(id);return ok(request,result);});
  app.post('/api/v1/matches/:id/seats/:seatId/ai-retry',async request=>{const a=await protectedWrite(request);const p=request.params as{id:string;seatId:string};const result=await matches.retryAi(a.account.id,p.id,p.seatId);scheduler.wake(p.id);return ok(request,result);});
  app.get('/api/v1/ws',{websocket:true,preValidation:async(request,reply)=>{if(request.headers.origin!==config.WEB_ORIGIN)return reply.status(403).send({ok:false,error:{code:'VALIDATION_ERROR',message:'WebSocket origin is not allowed',retryable:false},traceId:request.id});}},socket=>{let windowStarted=Date.now(),count=0;let idle=setTimeout(()=>socket.close(1000,'idle'),60_000);socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'hello'}));socket.on('message',(raw:Buffer)=>{clearTimeout(idle);idle=setTimeout(()=>socket.close(1000,'idle'),60_000);if(Date.now()-windowStarted>=1000){windowStarted=Date.now();count=0;}if(++count>5){socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'error',code:'RATE_LIMITED'}));return;}try{const ping=pingMessageSchema.parse(JSON.parse(raw.toString()));socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'pong',requestId:ping.requestId}));}catch{socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'error',code:'VALIDATION_ERROR'}));}});socket.on('close',()=>clearTimeout(idle));});
  type SessionConnection={socket:any;request:any;accountId:string;sessionId:string;rooms:Set<string>}; const connections=new Set<SessionConnection>();let presenceSeq=0;const offlineTimers=new Map<string,NodeJS.Timeout>();
  const presence=async(roomId:string)=>{const eligible:SessionConnection[]=[];for(const c of connections){if(!c.rooms.has(roomId)||c.socket.readyState!==1)continue;try{const current=await auth.authenticate(c.request);if(current?.sessionId===c.sessionId)eligible.push(c);else c.socket.close(4001,'session revoked');}catch{c.socket.close(4001,'session revoked');}}const onlineAccountIds=[...new Set(eligible.map(c=>c.accountId))];const seq=++presenceSeq;for(const c of eligible)c.socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'room.presence',roomId,presenceSeq:seq,onlineAccountIds}));};
  const markOnline=(roomId:string,accountId:string)=>{const key=`${roomId}:${accountId}`;const timer=offlineTimers.get(key);if(timer){clearTimeout(timer);offlineTimers.delete(key);}void presence(roomId);};
  const markOffline=(roomId:string,accountId:string)=>{const key=`${roomId}:${accountId}`;const timer=setTimeout(()=>{offlineTimers.delete(key);void presence(roomId);},config.PRESENCE_GRACE_MS);timer.unref();offlineTimers.set(key,timer);};
  const broadcast=async(roomId:string)=>{for(const c of connections){if(!c.rooms.has(roomId)||c.socket.readyState!==1)continue;try{const current=await auth.authenticate(c.request);if(!current||current.sessionId!==c.sessionId){c.socket.close(4001,'session revoked');continue;}const snapshot=await rooms.snapshot(roomId,c.accountId);c.socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'room.snapshot',roomId,roomRevision:snapshot.roomRevision,snapshot}));if(snapshot.status==='closed'){c.socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'room.closed',roomId,roomRevision:snapshot.roomRevision}));c.rooms.delete(roomId);}}catch{c.rooms.delete(roomId);c.socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'subscription.revoked',roomId}));}}};
  const broadcastMatch=async(roomId:string,matchId:string,revision:number,events:unknown[])=>{for(const c of connections){if(!c.rooms.has(roomId)||c.socket.readyState!==1)continue;try{const current=await auth.authenticate(c.request);if(!current||current.sessionId!==c.sessionId){c.socket.close(4001,'session revoked');continue;}await rooms.snapshot(roomId,c.accountId);const snapshot=await matches.liveView(c.accountId,matchId,revision,events);c.socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'match.snapshot',matchId,revision:snapshot.revision,snapshot}));}catch{c.rooms.delete(roomId);c.socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'subscription.revoked',roomId}));}}};
  const unsubscribeRoom=rooms.onChanged(roomId=>void broadcast(roomId)); const unsubscribeMatch=matches.onChanged((roomId,matchId,revision,events,roomChanged)=>{void broadcastMatch(roomId,matchId,revision,events);if(roomChanged)void broadcast(roomId);scheduler.wake(matchId);}); const unsubscribeRevoked=auth.onRevoked((accountId,sessionId)=>{for(const c of connections)if(c.accountId===accountId&&(!sessionId||c.sessionId===sessionId))c.socket.close(4001,'session revoked');});
  app.get('/api/v1/ws/session',{websocket:true,preValidation:async(request,reply)=>{if(request.headers.origin!==config.WEB_ORIGIN)return reply.status(403).send();try{(request as any).auth=await auth.authenticate(request);}catch{return reply.status(401).send();}}},(socket,request)=>{
    const current=(request as any).auth;const connection:SessionConnection={socket,request,accountId:current.account.id,sessionId:current.sessionId,rooms:new Set()};connections.add(connection);socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'session.ready'}));let windowStarted=Date.now(),messages=0;const expiry=setTimeout(()=>socket.close(4001,'session expired'),Math.max(0,current.expiresAt.getTime()-Date.now()));expiry.unref();const recheck=setInterval(()=>{void auth.authenticate(request).then(latest=>{if(latest?.sessionId!==connection.sessionId)socket.close(4001,'session revoked');}).catch(()=>socket.close(4001,'session unavailable'));},5000);recheck.unref();
    socket.on('message',async(raw:Buffer)=>{try{if(Date.now()-windowStarted>=1000){windowStarted=Date.now();messages=0;}if(++messages>10)throw new AppError('RATE_LIMITED','Too many messages',429);const latest=await auth.authenticate(request);if(!latest||latest.sessionId!==connection.sessionId)throw new AppError('UNAUTHENTICATED','Session expired',401);const msg=JSON.parse(raw.toString());if(msg?.protocolVersion!==PROTOCOL_VERSION)throw new Error();if(msg.type==='ping'){socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'pong',requestId:String(msg.requestId??'')}));return;}if(msg.type==='room.unsubscribe'){const roomId=z.string().uuid().parse(msg.roomId);connection.rooms.delete(roomId);markOffline(roomId,connection.accountId);return;}if(msg.type==='room.subscribe'){const roomId=z.string().uuid().parse(msg.roomId);if(!connection.rooms.has(roomId)&&connection.rooms.size>=10)throw new AppError('RATE_LIMITED','Too many subscriptions',429);connection.rooms.add(roomId);let snapshot;try{snapshot=await rooms.snapshot(roomId,connection.accountId);}catch(error){connection.rooms.delete(roomId);throw error;}socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'room.snapshot',roomId,roomRevision:snapshot.roomRevision,snapshot}));if(snapshot.status==='closed'){connection.rooms.delete(roomId);socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'room.closed',roomId,roomRevision:snapshot.roomRevision}));}else{markOnline(roomId,connection.accountId);if(snapshot.activeMatchId){const match=await matches.view(connection.accountId,snapshot.activeMatchId);if(connection.rooms.has(roomId)&&socket.readyState===1)socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'match.snapshot',matchId:match.matchId,revision:match.revision,snapshot:match}));}}return;}throw new Error();}catch(error){const code=error instanceof AppError?error.code:'VALIDATION_ERROR';if(code==='UNAUTHENTICATED'){socket.close(4001,'session revoked');return;}socket.send(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'error',code}));}});
    socket.on('close',()=>{clearTimeout(expiry);clearInterval(recheck);connections.delete(connection);for(const roomId of connection.rooms)markOffline(roomId,connection.accountId);});
  });
  if(config.NODE_ENV==='development'&&config.ENABLE_DEV_LAB){app.post('/api/v1/dev/lab/matches',async request=>{const body=createLabMatchSchema.parse(request.body);return ok(request,runner.create(body.gameId,body.version,body.options));});app.get('/api/v1/dev/lab/matches/:id/view',async request=>{const p=request.params as{id:string};const q=request.query as{seat?:string};if(!q.seat)throw new ZodError([]);return ok(request,runner.view(p.id,q.seat));});app.post('/api/v1/dev/lab/matches/:id/actions',async request=>{const p=request.params as{id:string};const body=labActionSchema.parse(request.body);return ok(request,runner.act(p.id,body.testSeatId,body.expectedRevision,body.action));});app.delete('/api/v1/dev/lab/matches/:id',async(request,reply)=>{runner.delete((request.params as{id:string}).id);return reply.status(204).send();});}
  await auth.listenForRevocations().catch(error=>app.log.warn({errorType:error instanceof Error?error.name:'unknown'},'revocation notifications unavailable; session polling remains active'));
  scheduler.start();
  app.addHook('onClose',async()=>{await scheduler.close();unsubscribeRoom();unsubscribeMatch();unsubscribeRevoked();for(const timer of offlineTimers.values())clearTimeout(timer);for(const c of connections)c.socket.terminate?.();auth.close();runner.close();await deps.db.end();}); return app;
}
