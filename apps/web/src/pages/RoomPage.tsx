import {useEffect,useRef,useState,type FormEvent} from 'react';
import {api,command,navigate} from '../platform.js';
import type {AssetVersionInfo} from '@boardgame/protocol/assets';
import { botSeatCommandSchema, type ModelProfile } from '@boardgame/protocol';
import { BotSeatSettings } from './BotSeatSettings.js';
import {GameRules} from './GameRules.js';
import {mergeRoomSnapshot} from './roomSnapshot.js';
import { PageFeedback } from '@boardgame/ui';
import { InviteFriends } from '../social/InviteFriends.js';

export function RoomPage({id}:{id:string}){
  const[room,setRoom]=useState<any>();
  const[me,setMe]=useState<any>();
  const[error,setError]=useState('');
  const[invite,setInvite]=useState((history.state as any)?.inviteCode??'');
  const[copyNotice,setCopyNotice]=useState('');
  const[online,setOnline]=useState<string[]>([]);
  const[connected,setConnected]=useState(false);
  const[busy,setBusy]=useState(false);
  const[players,setPlayers]=useState<{min:number;max:number}>({min:2,max:2});
  const [modelProfiles, setModelProfiles] = useState<ModelProfile[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [modelsRefresh, setModelsRefresh] = useState(0);
  useEffect(() => {
    if (!room?.permissions.isHost || room.status !== 'waiting') return;
    let disposed = false;
    setModelsLoading(true);
    setModelsError('');
    void api.modelProfiles().then(profiles => { if (!disposed) setModelProfiles(profiles); })
      .catch(cause => { if (!disposed) { setModelProfiles([]); setModelsError(cause instanceof Error ? cause.message : '模型配置读取失败，请重试'); } })
      .finally(() => { if (!disposed) setModelsLoading(false); });
    return () => { disposed = true; };
  }, [room?.permissions.isHost, room?.status, modelsRefresh]);
  const[assetVersions,setAssetVersions]=useState<AssetVersionInfo[]>([]);
  useEffect(()=>{if(room?.gameId)void api.assets.versions(room.gameId).then(setAssetVersions).catch(()=>undefined);},[room?.gameId]);
  const [completedMatchId] = useState<string | undefined>(() => {
    const state: unknown = history.state;
    if (state && typeof state === 'object' && 'completedMatchId' in state && typeof state.completedMatchId === 'string') return state.completedMatchId;
    return undefined;
  });
  const enteringMatch=useRef(false);
  const active=useRef(false);
  const returnedHome=useRef(false);
  function returnHome(){if(returnedHome.current)return;returnedHome.current=true;navigate('/',undefined,true);}
  function enterMatch(matchId:string){if(enteringMatch.current||returnedHome.current)return;enteringMatch.current=true;navigate(`/matches/${matchId}`);}
  useEffect(()=>{
    active.current=true;
    let disposed=false;let closed=false;let ws:WebSocket|undefined;let retry:number|undefined;let delay=1000;
    let latest: {roomRevision:number;status:string;activeMatchId:string|null}|undefined;
    const update=(next:any)=>{
      if(disposed)return;
      const merged=mergeRoomSnapshot(latest,next);
      if(merged.status==='closed'){closed=true;ws?.close();returnHome();return;}
      const started=latest?.status==='waiting'&&merged.status==='in_game'&&merged.activeMatchId;
      latest=merged;
      setRoom((old:any)=>mergeRoomSnapshot(old,merged));
      if(started)enterMatch(started);
    };
    function connect(){
      if(disposed||closed||returnedHome.current)return;
      const url=new URL('/api/v1/ws/session',location.href);url.protocol=url.protocol==='https:'?'wss:':'ws:';
      ws=new WebSocket(url);
      ws.onopen=()=>ws?.send(JSON.stringify({protocolVersion:1,type:'room.subscribe',roomId:id}));
      ws.onmessage=event=>{if(disposed)return;try{const msg=JSON.parse(String(event.data));if(msg.type==='room.snapshot'&&msg.roomId===id){update(msg.snapshot);setConnected(true);delay=1000;}if(msg.type==='room.presence'&&msg.roomId===id)setOnline(msg.onlineAccountIds);if(msg.type==='room.closed'&&msg.roomId===id){closed=true;setConnected(false);ws?.close();returnHome();}if(msg.type==='subscription.revoked'&&msg.roomId===id){closed=true;setConnected(false);setError('已失去房间访问权限。');ws?.close();}}catch{setError('实时消息无法读取，请刷新页面。');}};
      ws.onclose=event=>{setConnected(false);setOnline([]);if(disposed||closed)return;if(event.code===4001){navigate('/login');return;}retry=window.setTimeout(()=>{void api.room<any>(id).then(update).catch(()=>undefined);connect();},delay);delay=Math.min(delay*2,10000);};
    }
    Promise.all([api.me<any>(),api.room<any>(id)]).then(([account,snapshot])=>{if(disposed)return;setMe(account);update(snapshot);connect();}).catch(()=>{if(!disposed)setError('无法读取该私人房间。');});
    return()=>{active.current=false;disposed=true;if(retry)clearTimeout(retry);ws?.close();};
  },[id]);
  useEffect(()=>{if(!room)return;let disposed=false;void api.games<Array<{id:string;version:string;players:{min:number;max:number}}>>().then(games=>{const game=games.find(item=>item.id===room.gameId&&item.version===room.gameVersion);if(game&&!disposed)setPlayers(game.players);}).catch(()=>undefined);return()=>{disposed=true;};},[room?.gameId,room?.gameVersion]);
  async function run(path:string,method:string,extra={}){
    if(!connected||busy)return;
    setBusy(true);setError('');
    try{
      const body={requestId:command(),expectedRoomRevision:room.roomRevision,...extra};
      const botPath=/^seats\/([^/]+)\/bot$/.exec(path);
      const next=botPath&&(method==='PUT'||method==='PATCH')
        ?await api.saveRoomBot(id,botPath[1]!,method,botSeatCommandSchema.parse(body))
        :await api.roomCommand<any>(id,path,method,body);
      if(!active.current)return;
      if(path==='invite'){setInvite(next.inviteCode??'');setCopyNotice(next.inviteCode?'':'本次响应无法重取原码，请重新刷新邀请码。');history.replaceState(null,'',location.href);}
      if(path==='start'){enterMatch(next.matchId);return;}
      if(path==='leave'||path==='close'){returnHome();return;}
      updateRoom(next.room??next);
    }catch(cause){if(!active.current)return;setError(cause instanceof Error?cause.message:'操作失败');try{const next=await api.room(id);if(active.current)updateRoom(next);}catch{if(active.current)setConnected(false);}}
    finally{if(active.current)setBusy(false);}
  }
  function updateRoom(next:any){if(next.status==='closed'){returnHome();return;}setRoom((old:any)=>mergeRoomSnapshot(old,next));}
  async function copyInvite(){
    try{await navigator.clipboard.writeText(invite);setCopyNotice('邀请码已复制');}
    catch{setCopyNotice('复制失败，请选择邀请码手动复制。');}
  }
  function configure(event:FormEvent<HTMLFormElement>){event.preventDefault();const fields=new FormData(event.currentTarget);void run('config','PATCH',{name:String(fields.get('name')),gameId:room.gameId,version:room.gameVersion,options:room.options,seatCount:Number(fields.get('seatCount'))});}
  if(error&&!room)return <div className="empty"><h1>无法进入房间</h1><p>{error}</p><button onClick={()=>navigate('/')}>返回</button></div>;
  if(!room||!me)return <PageFeedback title="正在加载房间…" loading>正在恢复席位与准备状态。</PageFeedback>;
  const mine=room.seats.find((seat:any)=>seat.ownerAccountId===me.account.id);
  const waiting=room.status==='waiting';
  const playing=room.matchStatus==='active';
  return <><section className="page-heading"><div><p className="eyebrow">{waiting?'等待开局':room.status==='closed'?'房间已关闭':'对局已创建'}</p><h1>{room.name}</h1><p>{room.gameId}@{room.gameVersion} · {room.members.length}/{room.seatCount} 人 · revision {room.roomRevision}</p></div><span className={`status ${connected?'status--ok':'status--warn'}`}>{connected?'实时同步':'连接中断，状态可能过期'}</span></section>{error&&<p className="error-notice" role="alert">{error}</p>}{invite&&waiting&&<div className="invite-box"><span>点击邀请码即可复制</span><button type="button" className="secondary" aria-label="复制邀请码" onClick={()=>void copyInvite()}><strong>{invite.match(/.{1,4}/g)?.join('-')??invite}</strong></button></div>}{copyNotice&&<p role="status">{copyNotice}</p>}{copyNotice.startsWith('复制失败')&&<label className="form-stack invite-manual">手动复制邀请码<input readOnly value={invite} onFocus={event=>event.currentTarget.select()}/></label>}<GameRules gameId={room.gameId} version={room.gameVersion}/>{playing&&<p className="muted">对局进行中，玩家不能退出；房主可强制关闭房间并终止对局。返回此页不会退出对局。</p>}
    {completedMatchId&&<section className="round-complete panel" aria-label="本局已结束"><div><h2>本局已结束，已返回房间</h2><p>席位已保留。重新准备后，房主就能开始下一局。</p></div><a className="button-link secondary" href={`/matches/${encodeURIComponent(completedMatchId)}`}>查看本局结果</a></section>}
    {busy&&<p className="action-hint" role="status">正在保存房间操作，请稍候…</p>}
    {assetVersions.length>0&&<section className="panel"><h2>图片与音效</h2><p>当前：{assetVersions.find(version=>version.id===room.assetVersionId)?.name??(room.assetVersionId?'已锁定版本（可能已归档）':'历史 CSS 默认包')}</p>
      {waiting&&room.permissions.isHost&&<label>资源包<select aria-label="资源包" value={room.assetVersionId??''} disabled={busy||!connected} onChange={event=>void run('assets','PUT',{versionId:event.target.value})}>
        {!assetVersions.some(version=>version.id===room.assetVersionId)&&<option value={room.assetVersionId??''}>保持当前绑定</option>}
        {assetVersions.map(version=><option value={version.id} key={version.id}>{version.name} · {version.version}</option>)}
      </select></label>}<p className="muted">更换会取消真人准备；开局后锁定本版本。</p></section>}
    <fieldset className="room-fieldset" disabled={!connected||busy}><div className="seat-grid">{room.seats.map((seat:any)=>{const member=room.members.find((item:any)=>item.accountId===seat.ownerAccountId);const bot=seat.occupantKind==='bot';return <article className="panel seat-card" key={seat.seatId}><p className="eyebrow">座位 {seat.seatIndex+1}</p><h2>{bot?(seat.botName??'脚本 AI'):(member?.displayName??'空座位')}</h2><p>{bot?(seat.botPolicyId==='model'?'模型 AI · 已就绪':'脚本 AI · basic-v1 · 已就绪'):<>{seat.ownerAccountId===me.account.id?'这是你 · ':''}{seat.ownerAccountId===room.hostAccountId?'房主 · ':''}{seat.ready?'已准备':'未准备'}{member?` · ${online.includes(member.accountId)?'在线':'离线'}`:''}</>}</p>{!seat.ownerAccountId&&!bot&&waiting&&<><button onClick={()=>run('my-seat','PUT',{seatIndex:seat.seatIndex})}>坐这里</button>{room.permissions.isHost&&<button className="secondary" onClick={()=>run(`seats/${seat.seatId}/bot`,'PUT',{policyId:'basic-v1'})}>添加脚本 AI</button>}</>}{room.permissions.isHost&&waiting&&(bot||!seat.ownerAccountId)&&<BotSeatSettings
      key={`${seat.botPolicyId}:${seat.botModelProfileId}`} editing={bot} policyId={seat.botPolicyId} profileId={seat.botModelProfileId??null}
      profiles={modelProfiles} loading={modelsLoading} error={modelsError} refresh={()=>setModelsRefresh(value=>value+1)}
      save={settings=>void run(`seats/${seat.seatId}/bot`,bot?'PATCH':'PUT',settings)}
    />}{bot&&room.permissions.isHost&&waiting&&<button className="secondary" onClick={()=>run(`seats/${seat.seatId}/bot`,'DELETE')}>移除 AI</button>}</article>})}</div>
    {waiting&&<div className="panel room-actions"><h2>房间操作</h2><p className="muted">席位变更会取消真人准备，请全员入座后再准备。</p>{mine?<><button onClick={()=>run('my-ready','PUT',{ready:!mine.ready})}>{mine.ready?'取消准备':'准备'}</button><button className="secondary" onClick={()=>run('my-seat','DELETE')}>离座</button></>:<p className="muted">选择一个空座位后才能准备。</p>}{room.permissions.isHost&&<><button className="secondary" onClick={()=>run('invite','POST')}>刷新邀请码</button><button disabled={!room.permissions.canStart} onClick={()=>run('start','POST')}>开始游戏</button></>}<button className="secondary" onClick={()=>run('leave','POST')}>退出房间</button>{room.startBlockers.length>0&&<ul>{room.startBlockers.map((blocker:string)=><li key={blocker}>{blocker}</li>)}</ul>}</div>}
    {waiting&&room.members.some((member:any)=>!room.seats.some((seat:any)=>seat.ownerAccountId===member.accountId))&&<section className="panel waiting-members"><h2>候场成员</h2>{room.members.filter((member:any)=>!room.seats.some((seat:any)=>seat.ownerAccountId===member.accountId)).map((member:any)=><p key={member.accountId}>{member.displayName} · 请先选择空座位</p>)}</section>}
    {waiting && <InviteFriends roomId={id} revision={room.roomRevision} memberIds={room.members.map((member: { accountId: string }) => member.accountId)} />}
    {room.permissions.isHost&&waiting&&<section className="panel host-tools"><h2>房主设置</h2><form className="form-stack" onSubmit={configure}><label>房间名<input name="name" defaultValue={room.name} maxLength={40}/></label><label>座位数<input name="seatCount" type="number" min={players.min} max={players.max} defaultValue={room.seatCount}/></label><button className="secondary">保存配置（规则变更会清除准备）</button></form><h3>转让房主</h3>{room.members.filter((member:any)=>member.accountId!==me.account.id).map((member:any)=><button className="secondary" key={member.accountId} onClick={()=>run('host','POST',{targetAccountId:member.accountId})}>转让给 {member.displayName}</button>)}</section>}
    {room.permissions.isHost&&room.status!=='closed'&&<button className="danger" onClick={()=>{if(confirm(playing?'强制关闭将终止当前对局，并让所有玩家返回首页。确定关闭吗？':'确定关闭房间并返回首页吗？'))void run('close','POST');}}>{playing?'强制关闭房间':'关闭房间'}</button>}{!waiting&&!playing&&room.status!=='closed'&&<button className="secondary" onClick={()=>run('leave','POST')}>退出房间</button>}{room.activeMatchId&&room.status!=='closed'&&<button onClick={()=>navigate(`/matches/${room.activeMatchId}`)}>进入对局</button>}</fieldset>
  </>;
}


