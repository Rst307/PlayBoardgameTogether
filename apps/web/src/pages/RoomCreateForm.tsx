import {useEffect,useRef,useState,type FormEvent} from 'react';
import {api,command,navigate} from '../platform.js';
import {clientGame} from '../game-registry.js';
import {GameRules} from './GameRules.js';
import {loadGames, type AvailableGame} from './game-catalog.js';

export type {AvailableGame} from './game-catalog.js';

export function RoomCreateForm({defaultName='新的游戏桌', selectedGame}:{defaultName?:string;selectedGame?:{id:string;version:string}}) {
  const [games,setGames]=useState<AvailableGame[]>([]);
  const [choice,setChoice]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [attempt,setAttempt]=useState(0);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(()=>{
    let disposed=false;
    setLoading(true);setError('');
    void loadGames().then(items=>{
      if(disposed)return;
      const available=items.filter(item=>!item.developmentOnly);
      setGames(available);
      const first=selectedGame ? available.find(item=>item.id===selectedGame.id&&item.version===selectedGame.version) : available[0];
      if(first)setChoice(`${first.id}@${first.version}`);
      else if(selectedGame)setError('所选游戏或版本已不可用，请返回大厅重新选择。');
    }).catch(()=>{if(!disposed)setError('无法加载可用游戏，请重试。');}).finally(()=>{if(!disposed)setLoading(false);});
    return()=>{disposed=true;};
  },[attempt,selectedGame?.id,selectedGame?.version]);
  const game=games.find(item=>`${item.id}@${item.version}`===choice);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!game||busy)return;
    const fields=new FormData(event.currentTarget);
    setBusy(true);setError('');
    try {
      const password=String(fields.get('password')??'');
      const options:unknown=JSON.parse(String(fields.get('options')));
      const result=await api.createConfiguredRoom({requestId:command(),name:String(fields.get('name')).trim(),
        gameId:game.id,version:game.version,seatCount:Number(fields.get('seatCount')),options,
        visibility:fields.get('visibility')==='public'?'public':'private',...(password?{password}:{})});
      if (active.current) navigate(`/rooms/${result.roomId}`,{inviteCode:result.inviteCode});
    } catch(cause) {setError(cause instanceof Error?cause.message:'创建失败，请检查设置。');}
    finally {setBusy(false);}
  }
  return <><form className="form-stack" onSubmit={submit}>
    <label>房间名<input name="name" defaultValue={defaultName} maxLength={40} required/></label>
    <label>游戏与版本<select value={choice} onChange={event=>setChoice(event.target.value)}>{games.map(item=><option key={`${item.id}@${item.version}`} value={`${item.id}@${item.version}`}>{item.name} · {item.version}</option>)}</select></label>
    {game&&<p className="muted">{game.description}</p>}
    <label>人数<input name="seatCount" type="number" min={game?.players.min??2} max={game?.players.max??2} defaultValue={game?.players.min??2} key={choice} required/></label>
    <label>房间类型<select name="visibility" defaultValue="public"><option value="public">公开房间（展示在大厅）</option><option value="private">私人邀请房间（不展示在大厅）</option></select></label>
    <label>房间密码（选填）<input name="password" type="password" autoComplete="new-password" maxLength={128}/></label>
    <p className="muted">设置密码后，大厅和邀请码加入都需要密码。每人最多创建一个未关闭房间。</p>
    <label>游戏选项（JSON）<textarea name="options" rows={2} key={`${choice}-options`} defaultValue={JSON.stringify((game&&clientGame(game.id,game.version)?.defaultOptions)??{})} required/></label>
    {error&&<p className="error-notice" role="alert">{error}</p>}
    {loading&&<p role="status">正在加载可用游戏…</p>}
    {!loading&&!games.length&&<p role="status">暂无可用游戏，请联系管理员安装游戏扩展。</p>}
    {!loading&&error&&!games.length&&<button type="button" className="secondary" onClick={()=>setAttempt(value=>value+1)}>重新加载游戏</button>}
    <button disabled={busy||!game}>{busy?'创建中…':'创建并生成邀请码'}</button>
  </form>{game&&<GameRules gameId={game.id} version={game.version}/>}</>;
}
