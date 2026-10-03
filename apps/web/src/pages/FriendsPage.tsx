import { useState, type FormEvent } from 'react';
import type { SocialPerson, SocialOverview } from '@boardgame/protocol';
import { formatFriendId } from '@boardgame/protocol';
import { PageFeedback } from '@boardgame/ui';
import { api, navigate } from '../platform.js';
import { useSocial, useSocialCommand } from '../social/useSocial.js';
import { DirectChat } from '../social/DirectChat.js';
import { FriendIdCard } from '../social/FriendIdCard.js';
import '../styles/social.css';

function Invitation({ invite, me, run, busy, refresh }: {
  invite: SocialOverview['invitations'][number]; me: string;
  run: ReturnType<typeof useSocialCommand>['run']; busy: boolean; refresh: () => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const incoming = invite.recipient.id === me;
  const respond = (action: 'accept' | 'reject') => {
    const input = { action, ...(action === 'accept' && invite.hasPassword ? { password } : {}) };
    void run(JSON.stringify({ id: invite.id, ...input }), async requestId => {
      const result = await api.respondFriendInvitation(invite.id, { requestId, ...input });
      if (action === 'accept') return result.roomId;
    }, action === 'accept' ? '已加入房间' : '已拒绝邀请', () => {
      if (action === 'accept') navigate(`/rooms/${invite.roomId}`);
      else void refresh();
    });
  };
  const state = invite.status === 'accepted' ? '已接受' : invite.status === 'rejected' ? '已拒绝' : invite.available ? '等待回应' : '已失效';
  return <article className="social-row"><div><strong>{invite.roomName}</strong>
    <p>{incoming ? `${invite.sender.displayName} 邀请你` : `已邀请 ${invite.recipient.displayName}`} · {state}</p>
    <small className="muted">有效至 {new Date(invite.expiresAt).toLocaleString('zh-CN')}{invite.hasPassword ? ' · 需要房间密码' : ''}</small>
  </div>{incoming && invite.status === 'accepted' && <a className="button-link secondary" href={`/rooms/${invite.roomId}`}>进入已接受的房间</a>}
  {incoming && invite.status === 'pending' && <div className="form-stack">
    {invite.available && invite.hasPassword && <label>邀请房间密码<input type="password" autoComplete="off" maxLength={128} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} /></label>}
    <div className="social-actions"><button disabled={busy || !invite.available || (invite.hasPassword && !password)} onClick={() => respond('accept')}>接受并加入</button>
      <button className="secondary" disabled={busy} onClick={() => respond('reject')}>拒绝邀请</button></div>
  </div>}</article>;
}

export function FriendsPage() {
  const { data, error, refresh } = useSocial();
  const action = useSocialCommand();
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<SocialPerson | null>();
  const [selectedId, setSelectedId] = useState<string>();
  const selected = data?.friends.find(item => item.person.id === selectedId)?.person;
  function find(event: FormEvent) {
    event.preventDefault();
    const friendId = search.trim().toLowerCase();
    setResult(undefined);
    void action.run(`search:${friendId}`, async () => { setResult(await api.searchFriend(friendId)); });
  }
  if (!data) return <PageFeedback title="正在读取好友…" loading={!error} retry={() => void refresh()}>{error}</PageFeedback>;
  return <>
    <section className="page-heading"><div><p className="eyebrow">一起玩，也一起聊</p><h1>好友</h1><p>用好友 ID 找到朋友，私聊约时间，接受开桌邀请。</p></div></section>
    {(error || action.error) && <p className="error-notice" role="alert">{error || action.error}<button className="secondary" onClick={() => void refresh()}>刷新好友信息</button></p>}
    {action.notice && <p role="status">{action.notice}</p>}
    <div className="social-top"><FriendIdCard /><section className="panel"><h2>添加好友</h2>
      <form className="form-stack" onSubmit={find}><label>搜索好友 ID<input required minLength={3} maxLength={37} pattern="@?[A-Za-z0-9_]{3,36}" placeholder="@rst307" value={search} disabled={action.busy} onChange={event => { setSearch(event.target.value); setResult(undefined); }} /></label>
        <button disabled={action.busy}>搜索用户</button></form>
      {result === null && <p role="status">没有找到这个好友 ID。</p>}
      {result && <article className="social-row"><div><strong>{result.displayName}</strong><p className="friend-id">{formatFriendId(result.friendId)}</p></div>
        {result.friendId === data.identity.friendId ? <span>这是你自己</span> : data.friends.some(item => item.person.id === result.id) ? <span>已是好友</span> : <button disabled={action.busy} onClick={() => void action.run(`request:${result.friendId}`, id => api.requestFriend({ requestId: id, friendId: result.friendId }), '好友申请已提交，请等待对方确认', () => void refresh())}>发送好友申请</button>}
      </article>}
    </section></div>
    <section className="panel"><h2>好友申请</h2>{data.requests.length === 0 && <p className="muted">暂无待处理申请。</p>}
      {data.requests.map(item => <article className="social-row" key={item.person.id}><div><strong>{item.person.displayName}</strong><p className="muted friend-id">{formatFriendId(item.person.friendId)} · {item.direction === 'incoming' ? '请求添加你' : '等待对方确认'}</p></div>
        <div className="social-actions">{(item.direction === 'incoming' ? ['accept', 'reject'] as const : ['cancel'] as const).map(operation => <button key={operation} className={operation === 'accept' ? '' : 'secondary'} disabled={action.busy} onClick={() => void action.run(`friend:${item.person.id}:${item.revision}:${operation}`, id => api.updateFriend(item.person.id, { requestId: id, expectedRevision: item.revision, action: operation }), operation === 'accept' ? '已成为好友' : '申请已处理', () => void refresh())}>{operation === 'accept' ? '接受申请' : operation === 'reject' ? '拒绝申请' : '撤回申请'}</button>)}</div>
      </article>)}
    </section>
    <div className="social-layout"><section className="panel"><h2>我的好友 <small>({data.friends.length})</small></h2>
      {data.friends.length === 0 && <p className="muted">还没有好友，先用 ID 添加一位朋友吧。</p>}
      {data.friends.map(item => <article className="social-row" key={item.person.id}><div><strong>{item.person.displayName}</strong><p className="muted friend-id">{formatFriendId(item.person.friendId)}</p>
        {item.unread > 0 && <span className="unread-count">{item.unread} 条未读</span>}</div><div className="social-actions">
        <button className={selectedId === item.person.id ? '' : 'secondary'} onClick={() => setSelectedId(item.person.id)}>私聊 {item.person.displayName}</button>
        <button className="secondary" disabled={action.busy} onClick={() => {
          if (confirm(`删除好友 ${item.person.displayName}？删除后将不能继续私聊或邀请。`)) void action.run(`remove:${item.person.id}:${item.revision}`, id => api.updateFriend(item.person.id, { requestId: id, expectedRevision: item.revision, action: 'remove' }), '好友已删除', () => void refresh());
        }}>删除好友</button></div></article>)}
    </section>{selected ? <DirectChat key={selected.id} person={selected} refresh={refresh} /> : <section className="panel"><h2>好友私聊</h2><p className="muted">选择一位好友开始聊天。邀请好友开桌请进入等待中的房间，点击「邀请好友」。</p></section>}</div>
    <section className="panel"><h2>房间邀请</h2>{data.invitations.length === 0 && <p className="muted">暂无房间邀请。</p>}
      {data.invitations.map(invite => <Invitation key={invite.id} invite={invite} me={invite.sender.friendId === data.identity.friendId ? invite.sender.id : invite.recipient.id} run={action.run} busy={action.busy} refresh={refresh} />)}
    </section>
  </>;
}
