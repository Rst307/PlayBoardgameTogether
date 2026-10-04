import { useEffect, useRef, useState } from 'react';
import {GameRules} from './GameRules.js';
import { ApiError } from '@boardgame/client-sdk';
import { matchSnapshotMessageSchema, type MatchView } from '@boardgame/protocol';
import { api, command, navigate } from '../platform.js';
import { clientGame, type GameBoard } from '../game-registry.js';
import { AssetResolver, verifyManifest } from '../assets/resolver.js';
import { audioManager, ownAudio } from '../assets/audio-manager.js';
import { PresentationConsumer } from '../assets/presentation.js';
import { BoardAudio } from '../assets/board-audio.js';
import { AudioControls } from '../assets/AudioControls.js';
import type { AssetContract, PresentationAudioPort } from '@boardgame/game-sdk/assets';
import { ActionHint, GameErrorBoundary, PageFeedback } from '@boardgame/ui';

const aiNames = { idle: '等待行动', queued: '等待处理', running: '正在思考', submitting: '正在保存操作', blocked: '暂时受阻，请收回控制或检查配置' };

function GameSurface({ render, data, disabled, events, act, resolver, audio }: {
  render: GameBoard; data: MatchView; disabled: boolean; events: unknown[];
  act: (action: unknown) => void; resolver: AssetResolver | undefined;
  audio?: PresentationAudioPort;
}) {
  const playerNames = Object.fromEntries((data.players ?? []).map(player => [player.seatId, player.displayName]));
  return render(data.view, disabled, events, act, resolver, audio, playerNames);
}

type Pending = { accountId: string; matchId: string; requestId: string; expectedRevision: number; expectedControllerEpoch:number; action: unknown; attempts: number };
type Connection = 'connecting' | 'syncing' | 'online' | 'reconnecting' | 'offline' | 'auth-expired' | 'recovery-blocked';
const pendingKey = (id: string) => `boardgame:pending-match:${id}`;

function readPending(id: string, accountId: string): Pending | undefined {
  try {
    const raw = sessionStorage.getItem(pendingKey(id));
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === 'object' && 'accountId' in value && 'matchId' in value &&
      'requestId' in value && 'expectedRevision' in value && 'expectedControllerEpoch' in value && 'action' in value && 'attempts' in value &&
      value.accountId === accountId && value.matchId === id &&
      typeof value.requestId === 'string' && typeof value.expectedRevision === 'number' && typeof value.expectedControllerEpoch === 'number' &&
      typeof value.attempts === 'number') return value as Pending;
  } catch { /* Ignore a damaged local record. */ }
  sessionStorage.removeItem(pendingKey(id));
  return undefined;
}

export function MatchPage({ id }: { id: string }) {
  const [data, setData] = useState<MatchView>();
  const [board, setBoard] = useState<GameBoard>();
  const [events, setEvents] = useState<unknown[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<Pending>();
  const [connection, setConnection] = useState<Connection>('connecting');
  const [modelProfiles, setModelProfiles] = useState<Array<{id:string;name:string;endpoint_id:string;model_id:string;has_credential:boolean}>>([]);
  const latest = useRef<MatchView | undefined>(undefined);
  const pendingRef = useRef<Pending | undefined>(undefined);
  const accountId = useRef<string | undefined>(undefined);
  const connected = useRef(false);
  const generation = useRef(0);
  const seenEvents = useRef(new Set<string>());
  const returnedHome = useRef(false);
  const [resolver,setResolver]=useState<AssetResolver>();
  const [assetError,setAssetError]=useState('');
  const presentation=useRef(new PresentationConsumer());
  const soundResources=useRef<{resolver:AssetResolver;contract:AssetContract}|undefined>(undefined);
  const boardAudio = useRef(new BoardAudio(() => audioManager.playbackEpoch, cueId => {
    const resources = soundResources.current;
    if (resources) void audioManager.play(cueId, resources.resolver.manifest, resources.contract);
  }));

  function returnHome() {
    if(returnedHome.current)return;
    returnedHome.current=true;
    connected.current=false;
    generation.current++;
    storePending(undefined);
    navigate('/',undefined,true);
  }

  function storePending(value: Pending | undefined) {
    pendingRef.current = value;
    setPending(value);
    if (value) sessionStorage.setItem(pendingKey(id), JSON.stringify(value));
    else sessionStorage.removeItem(pendingKey(id));
  }

  function merge(next: MatchView) {
    if (next.status === 'aborted' && latest.current?.status === 'active') { returnHome(); return; }
    if (latest.current && next.revision < latest.current.revision) return;
    const presentationGame = clientGame(next.gameId, next.gameVersion);
    const keepResult = presentationGame && 'finishBehavior' in presentationGame && presentationGame.finishBehavior === 'stay';
    if (next.status === 'finished' && latest.current?.status === 'active' && !keepResult) {
      if (returnedHome.current) return;
      returnedHome.current = true;
      connected.current = false;
      generation.current++;
      storePending(undefined);
      navigate(`/rooms/${next.roomId}`, { completedMatchId: id }, true);
      return;
    }
    if (latest.current && next.revision === latest.current.revision) next={...next,
      controller:next.controller.controllerVersion>=latest.current.controller.controllerVersion?next.controller:latest.current.controller,
      aiStatus:next.aiStatus.version>=latest.current.aiStatus.version?next.aiStatus:latest.current.aiStatus};
    latest.current = next;
    setData(next);
    if (next.delivery !== 'live' || !next.events?.length) return;
    const fresh = next.events.filter(item => {
      if (!item || typeof item !== 'object' || !('eventId' in item) || typeof item.eventId !== 'string') return false;
      if (seenEvents.current.has(item.eventId)) return false;
      seenEvents.current.add(item.eventId);
      return true;
    });
    if (fresh.length) setEvents(old => [...old, ...fresh].slice(-20));
  }

  async function refresh(token: number) {
    const next = await api.matchSnapshot(id);
    if (generation.current === token) merge(next);
    return next;
  }

  async function send(value: Pending, token: number) {
    const sending = { ...value, attempts: value.attempts + 1 };
    if (generation.current === token) storePending(sending);
    try {
      const response = await api.submitMatchAction(id, {
        requestId: sending.requestId,
        expectedRevision: sending.expectedRevision,
        expectedControllerEpoch:sending.expectedControllerEpoch,
        action: sending.action,
      });
      if (generation.current !== token) return;
      storePending(undefined);
      merge(response);
      setError('');
      setNotice('操作已保存。');
    } catch (cause) {
      if (generation.current !== token) return;
      if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') {
        storePending(undefined); connected.current = false; latest.current = undefined;
        setData(undefined); setConnection('auth-expired');
      } else if (cause instanceof ApiError && (
        cause.code === 'STATE_CONFLICT' || cause.code === 'CONTROLLER_CONFLICT' ||
        cause.code === 'CONTROLLER_NOT_HUMAN' || !cause.retryable && cause.code !== 'SERVICE_UNAVAILABLE'
      )) {
        storePending(undefined);
        setError(cause.code === 'STATE_CONFLICT' ? '局面已变化，请检查当前状态并再次确认。' : cause.message);
        await refresh(token).catch(() => undefined);
      } else setError('操作结果尚未确认。请等待同步或点击确认结果。');
    }
  }

  async function reconcile(token: number, manual = false) {
    const value = pendingRef.current;
    if (!value || generation.current !== token) return;
    setBusy(true);
    try {
      const receipt = await api.matchCommandReceipt(id, value.requestId);
      if (generation.current !== token) return;
      if (receipt.outcome === 'accepted') {
        storePending(undefined);
        await refresh(token);
        if (generation.current !== token) return;
        setError('');
        setNotice('操作已保存，已恢复最新局面。');
      } else if (value.attempts < 3 || manual) await send(value, token);
      else setError('仍无法确认操作结果。可以手动使用原请求继续确认。');
    } catch (cause) {
      if (generation.current !== token) return;
      if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') {
        storePending(undefined); connected.current = false; latest.current = undefined;
        setData(undefined); setConnection('auth-expired');
      } else setError('操作结果尚未确认。连接恢复后可继续确认。');
    } finally { if (generation.current === token) setBusy(false); }
  }

  useEffect(() => {
    const token = ++generation.current;
    returnedHome.current = false;
    presentation.current=new PresentationConsumer();
    boardAudio.current = new BoardAudio(() => audioManager.playbackEpoch, cueId => {
      const resources = soundResources.current;
      if (resources) void audioManager.play(cueId, resources.resolver.manifest, resources.contract);
    });
    audioManager.clear();
    latest.current = undefined;
    pendingRef.current = undefined;
    accountId.current = undefined;
    seenEvents.current.clear();
    setData(undefined);
    setEvents([]);
    setPending(undefined);
    setBusy(false);
    setNotice('');
    let socket: WebSocket | undefined;
    let retryTimer: number | undefined;
    let roomId: string | undefined;
    let delay = 1000;
    let lastPong = Date.now();
    let connectedOnce = false;
    let subscriptionReady = false;
    let roomSubscriptionReady = false;
    let networkOnline = navigator.onLine;
    let releaseAudio:(()=>void)|undefined;

    const sync = async (showStatus = true) => {
      if (generation.current !== token) return;
      if (!networkOnline) { connected.current=false; setConnection('offline'); return; }
      if (showStatus) setConnection('syncing');
      try {
        const view = await refresh(token);
        if (generation.current !== token) return;
        roomId = view.roomId;
        if (pendingRef.current) await reconcile(token);
        if (generation.current !== token) return;
        if (!networkOnline) { connected.current=false; setConnection('offline'); return; }
        connected.current = socket?.readyState === WebSocket.OPEN &&
          (subscriptionReady || roomSubscriptionReady && view.status === 'finished');
        if(connected.current)presentation.current.baseline(view.revision);
        setConnection(connected.current ? 'online' : socket?.readyState === WebSocket.OPEN ? 'syncing' : 'offline');
        delay = 1000;
      } catch (cause) {
        if (generation.current !== token) return;
        connected.current = false;
        if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') {
          storePending(undefined); latest.current = undefined; setData(undefined); setConnection('auth-expired');
        } else if (cause instanceof ApiError && (cause.code === 'RECOVERY_BLOCKED' || cause.code === 'GAME_VERSION_UNAVAILABLE')) {
          setConnection('recovery-blocked'); setError(cause.message);
        } else { setConnection('offline'); setError('无法同步对局，请检查连接后重试。'); }
      }
    };

    const connect = () => {
      if (generation.current !== token || !roomId || !navigator.onLine) return;
      const url = new URL('/api/v1/ws/session', location.href);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(url);
      socket = ws;
      presentation.current.reset();audioManager.invalidate();
      subscriptionReady = false;
      roomSubscriptionReady = false;
      setConnection(connectedOnce ? 'reconnecting' : 'connecting');
      ws.onopen = () => {
        if (generation.current !== token || socket !== ws) return;
        connectedOnce = true;
        lastPong = Date.now();
        ws.send(JSON.stringify({ protocolVersion: 1, type: 'room.subscribe', roomId }));
        void sync();
      };
      ws.onmessage = event => {
        if (generation.current !== token || socket !== ws) return;
        try {
          const message: unknown = JSON.parse(String(event.data));
          if (!message || typeof message !== 'object' || !('type' in message)) return;
          if (message.type === 'pong') { lastPong = Date.now(); return; }
          if (message.type === 'room.snapshot' && 'roomId' in message && message.roomId === roomId) {
            // Finished rounds are retrieved by REST; a waiting room no longer
            // includes the historical match in its subscription snapshot.
            roomSubscriptionReady = true;
            void sync(false);
          }
          if (message.type === 'match.snapshot') {
            const parsed = matchSnapshotMessageSchema.parse(message);
            if (parsed.matchId === id) {
              const snapshot=parsed.snapshot;
              if(connected.current&&subscriptionReady&&snapshot.delivery==='live'&&snapshot.events?.length){
                presentation.current.consume(id,snapshot.revision,snapshot.cues??[],true,cue=>{
                  const game = clientGame(snapshot.gameId, snapshot.gameVersion);
                  if ('boardAudio' in game && game.boardAudio) {
                    if (audioManager.available && audioManager.owner && !audioManager.preferences.muted && !document.hidden)
                      boardAudio.current.authorize(cue.eventId);
                    return;
                  }
                  const resources=soundResources.current;
                  if(resources)void audioManager.play(cue.cueId,resources.resolver.manifest,resources.contract);
                });
              }
              merge(parsed.snapshot);
              if (!subscriptionReady) { subscriptionReady = true; void sync(); }
            }
          }
          if (message.type === 'room.closed' && 'roomId' in message && message.roomId === roomId) { returnHome(); return; }
          if (message.type === 'subscription.revoked' && 'roomId' in message && message.roomId === roomId) {
            connected.current = false; setConnection('offline'); setError('已失去房间访问权限。'); ws.close();
          }
        } catch { setError('实时消息无法读取，正在重新同步。'); void sync(); }
      };
      ws.onclose = event => {
        if (generation.current !== token || socket !== ws) return;
        subscriptionReady = false;
        roomSubscriptionReady = false;
        connected.current = false;
        presentation.current.reset();audioManager.invalidate();
        if (event.code === 4001) {
          storePending(undefined); latest.current = undefined; setData(undefined); setConnection('auth-expired'); return;
        }
        setConnection('offline');
        // An expired session can reject the WS upgrade before the server can
        // send close code 4001. Recheck via authenticated HTTP so a failed
        // handshake cannot leave the previous private View on screen forever.
        void sync(false).then(() => {
          if (generation.current !== token || socket !== ws || !latest.current) return;
          retryTimer = window.setTimeout(() => { delay = Math.min(delay * 2, 15000); connect(); }, delay);
        });
      };
    };

    const onOnline = () => {
      networkOnline = true;
      if (generation.current !== token) return;
      if (!roomId) return;
      if (retryTimer) clearTimeout(retryTimer);
      if (socket?.readyState !== WebSocket.OPEN) connect(); else void sync();
    };
    const onOffline = () => { networkOnline = false; connected.current = false; presentation.current.reset();audioManager.invalidate();setConnection('offline'); };
    const onFocus = () => { if (socket?.readyState === WebSocket.OPEN) void sync(false); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('focus', onFocus);

    const initialize = async () => {
      try {
        const account = await api.me<{ account: { id: string } }>();
        if (generation.current !== token) return;
        accountId.current = account.account.id;
        audioManager.setAccount(account.account.id);
        const saved = readPending(id, account.account.id);
        pendingRef.current = saved;
        setPending(saved);
        const view = await refresh(token);
        if (generation.current !== token) return;
        roomId = view.roomId;
        // A retained aborted match is a read-only archive. It does not subscribe
        // to a closed room, which would otherwise redirect it to the lobby.
        if (view.status === 'aborted') {
          storePending(undefined);
          setError('');
          setConnection('online');
          return;
        }
        releaseAudio=ownAudio(account.account.id,id,async()=>{
          presentation.current.reset();
          const baseline=await api.matchSnapshot(id);
          if(generation.current===token)presentation.current.baseline(baseline.revision);
        });
        setError('');
        connect();
      } catch (cause) {
        if (generation.current !== token) return;
        if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') {
          storePending(undefined); setConnection('auth-expired'); return;
        }
        if (cause instanceof ApiError && (cause.code === 'RECOVERY_BLOCKED' || cause.code === 'GAME_VERSION_UNAVAILABLE')) {
          setConnection('recovery-blocked'); setError(cause.message); return;
        }
        if (cause instanceof ApiError && cause.code === 'MATCH_NOT_FOUND') {
          setConnection('offline'); setError('当前会话无权读取该局。'); return;
        }
        setConnection('offline');
        setError('服务暂时不可用，正在重新连接。');
        retryTimer = window.setTimeout(() => void initialize(), delay);
        delay = Math.min(delay * 2, 15000);
      }
    };
    void initialize();

    const pollTimer = window.setInterval(() => { if (socket?.readyState === WebSocket.OPEN) void sync(false); }, 15000);
    const heartbeat = window.setInterval(() => {
      if (socket?.readyState !== WebSocket.OPEN) return;
      if (Date.now() - lastPong > 60000) { socket.close(); return; }
      socket.send(JSON.stringify({ protocolVersion: 1, type: 'ping', requestId: command() }));
    }, 20000);
    return () => {
      generation.current++; connected.current = false;
      releaseAudio?.();audioManager.clear();presentation.current.reset();soundResources.current=undefined;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(pollTimer);
      clearInterval(heartbeat);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('focus', onFocus);
      socket?.close();
    };
  }, [id]);

  useEffect(()=>{
    let disposed=false;
    setResolver(undefined);setAssetError('');soundResources.current=undefined;audioManager.invalidate();
    if(data?.assetBinding){
      const binding=data.assetBinding;
      void Promise.all([api.assets.version(binding.versionId),api.assets.contracts()]).then(async([version,contracts])=>{
        if(version.manifestHash!==binding.manifestHash)throw new Error('资源清单与对局锁定摘要不符');
        const manifest=await verifyManifest(version.manifest,binding.manifestHash);
        const contract=contracts.find(item=>item.hash===manifest.assetContract.hash)?.contract;
        if(!contract)throw new Error('资源契约不可用');
        if(disposed)return;
        const resolver=new AssetResolver(manifest);setResolver(resolver);soundResources.current={resolver,contract};
      }).catch(cause=>{if(!disposed)setAssetError(cause instanceof Error?cause.message:'资源不可用，保留文字桌面。');});
    }
    return()=>{disposed=true;};
  },[data?.assetBinding?.versionId,data?.assetBinding?.manifestHash]);

  useEffect(()=>{if(connection==='auth-expired'){audioManager.dispose();setResolver(undefined);soundResources.current=undefined;}},[connection]);

  useEffect(() => {
    const token = generation.current;
    void api.modelProfiles().then(profiles => {
      if (generation.current === token) setModelProfiles(profiles);
    }).catch(() => undefined);
  }, [id]);

  useEffect(() => {
    const game = data && clientGame(data.gameId, data.gameVersion);
    if (!game) { setBoard(undefined); return; }
    let disposed = false;
    void game.load().then(render => { if (!disposed) setBoard(() => render); }).catch(() => { if (!disposed) setError('无法加载此游戏版本。'); });
    return () => { disposed = true; };
  }, [data?.gameId, data?.gameVersion]);

  async function act(action: unknown) {
    const view = latest.current;
    if (!view || busy || pendingRef.current || !connected.current || view.status !== 'active') return;
    const token = generation.current;
    const value: Pending = { accountId: accountId.current!, matchId: id, requestId: command(), expectedRevision: view.revision, expectedControllerEpoch:view.controller.controllerEpoch, action, attempts: 0 };
    storePending(value);
    setBusy(true); setError('');
    setNotice('');
    try { await send(value, token); } finally { if (generation.current === token) setBusy(false); }
  }

  async function setController(type:'human'|'script'|'model', profileId?:string){
    const view=latest.current;if(!view||busy||pendingRef.current||!connected.current||view.status!=='active')return;const token=generation.current;setBusy(true);setError('');
    try{const control={requestId:command(),expectedControllerEpoch:view.controller.controllerEpoch,controllerType:type,...(type==='script'?{policyId:'basic-v1' as const}:type==='model'&&profileId?{profileId}:{})};const next=await api.setMyController(id,control);if(generation.current===token){merge(next);setNotice(type==='human'?'已收回控制，可以继续操作。':'已启用模型托管，可随时收回控制。');}}
    catch(cause){if(generation.current===token){setError(cause instanceof Error?cause.message:'无法切换控制权');await refresh(token).catch(()=>undefined);}}finally{if(generation.current===token)setBusy(false);}
  }

  if (connection === 'auth-expired') return <div className="empty"><h1>会话已失效</h1><p>请重新登录后读取本人对局。</p><button onClick={() => navigate('/login')}>前往登录</button></div>;
  if (error && !data) return <div className="empty"><h1>无法读取对局</h1><p>{error}</p><button onClick={() => location.reload()}>重新同步</button></div>;
  if (!data) return <PageFeedback title="正在加载对局视图…" loading>正在恢复你的座位与已保存局面。</PageFeedback>;
  return <div className="match-page">
    <section className="page-heading match-heading"><div><p className="eyebrow">对局 · revision {data.revision}</p>
      <h1>{clientGame(data.gameId, data.gameVersion)?.name ?? '游戏版本不可用'}</h1>
      <p>你的座位 {data.seatIndex + 1} · {data.status === 'finished' ? '已结束' : data.status === 'aborted' ? '已终止' : '进行中'}</p>
    </div><div className="match-heading-actions"><span className={`status ${connection === 'online' ? 'status--ok' : 'status--warn'}`} role="status">{connection === 'online' ? '实时同步' : '正在恢复连接'}</span><button className="secondary" onClick={() => navigate(data.status === 'aborted' ? '/profile' : `/rooms/${data.roomId}`)}>{data.status === 'aborted' ? '返回我的资料' : '返回房间'}</button></div></section>
    {connection !== 'online' && <p className="error-notice" role="status">{connection === 'recovery-blocked' ? '此对局的存档或版本暂不可恢复。' : '连接中断或正在同步，操作已暂停。'}</p>}
    {pending && <p className="error-notice" role="status">操作结果尚未确认。<button className="secondary" disabled={busy} onClick={() => void reconcile(generation.current, true)}>确认操作结果</button></p>}
    {error && <p className="error-notice" role="alert">{error}</p>}
    {(busy || notice) && <ActionHint title={busy ? '正在保存操作…' : notice} />}
    <div className="match-layout">
      <section className="match-table" aria-label="游戏桌">
    <GameErrorBoundary key={id}>{board ? <GameSurface render={board} data={data} disabled={busy || !!pending || connection !== 'online' || data.status !== 'active'||data.controller.type!=='human'} events={events} act={action => void act(action)} resolver={resolver} audio={boardAudio.current.playCue} /> :
      <PageFeedback title="正在加载游戏界面…" loading />}</GameErrorBoundary>
      </section>
      <aside className="match-support" aria-label="对局辅助">
        <h2>对局工具</h2>
        {data.status !== 'active' && <a className="button-link secondary" href={`/matches/${id}/replay`}>查看回放</a>}
        <p className="muted">返回房间不会退出对局。规则、声音与托管设置可按需展开。</p>
    {data.status==='active'&&<details className="panel controller-panel"><summary>控制方式 · {data.controller.type === 'human' ? '由你操作' : '托管中'}</summary><h2>控制方式</h2><p>{data.controller.type==='script'||data.controller.type==='model'?`托管中 · ${aiNames[data.aiStatus.status]}`:'由你操作'}</p>{data.controller.type==='human'?<><p className="muted">真人座位不能开启脚本托管；脚本 AI 请在开局前添加至专用座位。</p>{modelProfiles.filter(profile=>profile.has_credential||profile.endpoint_id==='mock').map(profile=><button className="secondary" key={profile.id} disabled={busy||!!pending||connection!=='online'} onClick={()=>void setController('model',profile.id)}>启用模型 · {profile.name}</button>)}</>:<button disabled={busy||!!pending||connection!=='online'} onClick={()=>void setController('human')}>收回控制</button>}<p className="muted">托管会持续到主动收回，关闭页面不会停止。外部模型会收到此座位可见的游戏信息。</p></details>}
    <GameRules gameId={data.gameId} version={data.gameVersion}/>
    <AudioControls/>
    {assetError&&<p role="status" className="error-notice">{assetError} 图片使用语义占位，操作仍可继续。</p>}
    {data.controllers&&<section className="seat-control-strip" aria-label="座位控制状态">{data.controllers.map(item=><span key={item.seatIndex}>座位 {item.seatIndex+1} · {item.type==='human'?'真人':`${item.type==='script'?'脚本 AI':'模型 AI'} · ${item.safeErrorCode === 'AI_FALLBACK_USED' ? '本次由脚本兜底完成' : aiNames[item.aiStatus]}`}</span>)}</section>}
      </aside>
    </div>
  </div>;
}


