import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@boardgame/client-sdk';
import { PageFeedback } from '@boardgame/ui';
import { z } from 'zod';
import { api, command, navigate } from '../platform.js';
import { Lobby } from './Lobby.js';

const roomSchema = z.object({
  id: z.string(), name: z.string(), status: z.string(), gameId: z.string(),
  gameVersion: z.string(), seatCount: z.number(), roomRevision: z.number(),
});
const roomsSchema = z.object({ items: z.array(roomSchema), nextCursor: z.string().nullable() });
const meSchema = z.object({ account: z.object({ id: z.string(), displayName: z.string() }) });
type Room = z.infer<typeof roomSchema>;
const statusNames: Record<string, string> = { waiting: '等待开局', in_game: '进行中', finished: '已结束', closed: '已关闭' };

export function DashboardPage() {
  const [me, setMe] = useState<z.infer<typeof meSchema>>();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [joining, setJoining] = useState(false);
  const joinLock = useRef(false);
  const active = useRef(false);

  useEffect(() => {
    let disposed = false;
    active.current = true;
    setLoadError('');
    void Promise.all([api.me<unknown>(), api.rooms<unknown>()]).then(([rawAccount, rawPage]) => {
      if (disposed) return;
      const account = meSchema.parse(rawAccount);
      const page = roomsSchema.parse(rawPage);
      setMe(account); setRooms(page.items); setCursor(page.nextCursor);
    }).catch(cause => {
      if (disposed) return;
      if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') navigate('/login');
      else setLoadError('无法加载你的房间，请检查连接后重试。');
    });
    return () => { disposed = true; active.current = false; };
  }, [attempt]);

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (joinLock.current) return;
    joinLock.current = true;
    setJoining(true); setError('');
    const fields = new FormData(event.currentTarget);
    try {
      const room = roomSchema.parse(await api.joinRoom<unknown>({
        requestId: command(), inviteCode: String(fields.get('invite')),
        ...(fields.get('password') ? { password: String(fields.get('password')) } : {}),
      }));
      if (active.current) navigate(`/rooms/${room.id}`);
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : '加入失败');
    } finally {
      joinLock.current = false;
      if (active.current) setJoining(false);
    }
  }

  async function more() {
    if (!cursor) return;
    try {
      const page = roomsSchema.parse(await api.rooms<unknown>(cursor));
      if (active.current) { setRooms(current => [...current, ...page.items]); setCursor(page.nextCursor); }
    } catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : '加载失败'); }
  }

  if (loadError) return <PageFeedback title="房间加载失败" retry={() => setAttempt(value => value + 1)}><p>{loadError}</p></PageFeedback>;
  if (!me) return <PageFeedback title="正在验证会话…" loading>正在加载你可以访问的房间。</PageFeedback>;
  return <>
    <section className="page-heading"><div><p className="eyebrow">你好，{me.account.displayName}</p><h1>游戏大厅</h1><p>找一张游戏桌，或邀请朋友开始新的一局。</p></div>
      <a className="button-link" href="/rooms/new">创建房间</a>
    </section>
    {error && <p className="error-notice" role="alert">{error}</p>}
    <div className="dashboard-grid">
      <section className="panel"><h2>继续游戏</h2>
        {rooms.filter(room => room.status !== 'closed').length === 0 ? <p className="muted">暂时没有正在参与的房间。可以加入公开房间，或创建自己的房间。</p> : rooms.filter(room => room.status !== 'closed').map(room =>
          <button className="room-row" key={room.id} onClick={() => navigate(`/rooms/${room.id}`)}>
            <span><strong>{room.name}</strong><small>{room.seatCount} 人 · {statusNames[room.status]}</small></span><span>进入房间 →</span>
          </button>)}
        {cursor && <button className="secondary" onClick={() => void more()}>加载更多参与房间</button>}
      </section>
      <section className="panel"><h2>邀请码加入</h2><form className="form-stack" onSubmit={join}>
        <label>12 位邀请码<input name="invite" placeholder="ABCD-EFGH-JK23" required /></label>
        <label>邀请码房间密码（如有）<input name="password" type="password" maxLength={128} autoComplete="off" /></label>
        <button disabled={joining}>{joining ? '加入中…' : '加入私人房间'}</button>
      </form></section>
    </div>
    <Lobby />
  </>;
}
