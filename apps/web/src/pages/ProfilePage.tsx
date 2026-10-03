import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@boardgame/client-sdk';
import type { Profile, MatchHistory } from '@boardgame/protocol';
import { PageFeedback } from '@boardgame/ui';
import { api, navigate } from '../platform.js';
import { FriendIdCard } from '../social/FriendIdCard.js';
import '../styles/social.css';

const avatars = [
  { id: 'dice', label: '骰子', symbol: '🎲' },
  { id: 'leaf', label: '绿叶', symbol: '🌿' },
  { id: 'cat', label: '猫咪', symbol: '🐱' },
  { id: 'rocket', label: '火箭', symbol: '🚀' },
  { id: 'star', label: '星星', symbol: '⭐' },
  { id: 'coffee', label: '咖啡', symbol: '☕' },
] as const;
const statuses = { active: '进行中', finished: '已结束', aborted: '已中止' };
const date = (value: string) => new Date(value).toLocaleString('zh-CN');

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile>();
  const [history, setHistory] = useState<MatchHistory>();
  const [draft, setDraft] = useState<Profile>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const active = useRef(false);
  const saveLock = useRef(false);
  const moreLock = useRef(false);

  useEffect(() => {
    let disposed = false;
    active.current = true;
    setError('');
    void api.me().then(() => Promise.all([api.profile(), api.matchHistory()])).then(([account, records]) => {
      if (!disposed) { setProfile(account); setDraft(account); setHistory(records); }
    }).catch(cause => {
      if (disposed) return;
      if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') navigate('/login');
      else setError('资料加载失败，请重试。');
    });
    return () => { disposed = true; active.current = false; };
  }, [attempt]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || saveLock.current) return;
    saveLock.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = await api.saveProfile({ displayName: draft.displayName, avatar: draft.avatar, bio: draft.bio });
      if (active.current) { setProfile(saved); setDraft(saved); setNotice('资料已保存'); }
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : '保存失败');
    } finally {
      saveLock.current = false;
      if (active.current) setBusy(false);
    }
  }

  async function more() {
    if (!history?.nextCursor || moreLock.current) return;
    moreLock.current = true; setLoadingMore(true);
    try {
      const page = await api.matchHistory(history.nextCursor);
      if (active.current) setHistory(current => ({ items: [...(current?.items ?? []), ...page.items], nextCursor: page.nextCursor }));
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : '记录加载失败');
    } finally {
      moreLock.current = false;
      if (active.current) setLoadingMore(false);
    }
  }

  if (!profile || !draft || !history) return error
    ? <PageFeedback title="资料加载失败" retry={() => setAttempt(value => value + 1)}>{error}</PageFeedback>
    : <PageFeedback title="正在加载我的资料…" loading />;
  return <>
    <section className="page-heading"><div><p className="eyebrow">你的桌游名片</p><h1>我的资料</h1><p>管理个人资料，查看你参与过的对局。</p></div>
      <button className="secondary" onClick={() => void api.logout().then(() => navigate('/login')).catch(() => setError('退出失败，请重试。'))}>退出登录</button>
    </section>
    {error && <p className="error-notice" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div className="profile-layout">
      <section className="panel profile-summary">
        <span className="profile-avatar" role="img" aria-label={avatars.find(avatar => avatar.id === profile.avatar)?.label}>{avatars.find(avatar => avatar.id === profile.avatar)?.symbol}</span>
        <h2>{profile.displayName}</h2><p className="muted">@{profile.username}</p>
        <dl><div><dt>账户 ID</dt><dd className="account-id">{profile.id}</dd></div><div><dt>加入时间</dt><dd>{date(profile.createdAt)}</dd></div></dl>
        <p className="profile-bio">{profile.bio || '还没有填写个人简介。'}</p>
      </section>
      <section className="panel"><h2>编辑资料</h2><form className="form-stack" onSubmit={save}>
        <fieldset className="room-fieldset form-stack" disabled={busy}>
          <label>昵称<input required maxLength={32} value={draft.displayName} onChange={event => setDraft({ ...draft, displayName: event.target.value })} /></label>
          <fieldset className="avatar-options"><legend>头像</legend>{avatars.map(avatar =>
            <label key={avatar.id}><input type="radio" name="avatar" value={avatar.id} checked={draft.avatar === avatar.id} onChange={() => setDraft({ ...draft, avatar: avatar.id })} /><span aria-hidden="true">{avatar.symbol}</span>{avatar.label}</label>)}
          </fieldset>
          <label>个人简介<textarea rows={4} maxLength={300} placeholder="喜欢的桌游、常玩的时间，或想对桌友说的话。" value={draft.bio} onChange={event => setDraft({ ...draft, bio: event.target.value })} /></label>
          <small className="muted">{draft.bio.length}/300</small>
          <button disabled={!draft.displayName.trim()}>{busy ? '保存中…' : '保存资料'}</button>
        </fieldset>
      </form></section>
    </div>
    <FriendIdCard />
    <section className="room-list"><h2>我的对局</h2><p className="muted">按开局时间排列，包含已结束与中止的对局。</p>
      {history.items.length === 0 ? <p className="muted">还没有对局记录。<a href="/">去游戏大厅开始第一局</a></p> : history.items.map(match =>
        <article className="room-row" key={match.id}><span><strong>{match.roomName}</strong><small>{match.gameId} · {match.gameVersion} · {date(match.createdAt)}</small></span>
          <span>{statuses[match.status]}</span><a className="button-link secondary" href={`/matches/${match.id}`}>{match.status === 'active' ? '继续对局' : '查看对局'}</a>
        </article>)}
      {history.nextCursor && <button className="secondary" disabled={loadingMore} onClick={() => void more()}>{loadingMore ? '加载中…' : '加载更多对局'}</button>}
    </section>
  </>;
}
