import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@boardgame/client-sdk';
import { formatFriendId, type Profile, type MatchHistory } from '@boardgame/protocol';
import { PageFeedback } from '@boardgame/ui';
import { api, navigate } from '../platform.js';
import { FriendIdCard } from '../social/FriendIdCard.js';
import { useSocialContext } from '../social/SocialProvider.js';
import { avatars } from '../social/PersonAvatar.js';
import '../styles/social.css';
import '../styles/profile.css';

const statuses = { active: '进行中', finished: '已结束', aborted: '已中止' };
const date = (value: string) => new Date(value).toLocaleString('zh-CN');

export function ProfilePage({ section = 'summary' }: { section?: 'summary' | 'edit' | 'history' | 'identity' }) {
  const social = useSocialContext();
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
    void api.me().then(() => Promise.all([api.profile(), section === 'history' ? api.matchHistory() : Promise.resolve(undefined)])).then(([account, records]) => {
      if (!disposed) { setProfile(account); setDraft(account); setHistory(records); }
    }).catch(cause => {
      if (disposed) return;
      if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') navigate('/login');
      else setError('资料加载失败，请重试。');
    });
    return () => { disposed = true; active.current = false; };
  }, [attempt, section]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || saveLock.current) return;
    saveLock.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = await api.saveProfile({ displayName: draft.displayName, avatar: draft.avatar, bio: draft.bio });
      if (active.current) { setProfile(saved); setDraft(saved); void social.refresh(); navigate('/profile', { profileSaved: true }); }
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

  async function logout() {
    if (saveLock.current) return;
    saveLock.current = true;
    setBusy(true);
    try {
      await api.logout();
      social.clearSession();
      if (active.current) navigate('/login');
    } catch {
      if (active.current) setError('退出失败，请重试。');
    } finally {
      saveLock.current = false;
      if (active.current) setBusy(false);
    }
  }

  if (!profile || !draft || (section === 'history' && !history)) return error
    ? <PageFeedback title="资料加载失败" retry={() => setAttempt(value => value + 1)}>{error}</PageFeedback>
    : <PageFeedback title="正在加载我的资料…" loading />;
  const navigationState: unknown = window.history.state;
  const saved = !!navigationState && typeof navigationState === 'object' && 'profileSaved' in navigationState && navigationState.profileSaved === true;
  const title = { summary: '我的资料', edit: '编辑资料', history: '对局记录', identity: '管理好友 ID' }[section];
  return <div className="profile-page">
    {section !== 'summary' && <a className="social-back" href="/profile">← 返回我的资料</a>}
    <section className="page-heading"><div><h1>{title}</h1></div>
      {section === 'summary' && <details className="profile-options"><summary>账户操作</summary><div>
        <dl><dt>登录用户名</dt><dd>{profile.username}</dd><dt>账户 ID</dt><dd className="account-id">{profile.id}</dd><dt>加入时间</dt><dd>{date(profile.createdAt)}</dd></dl>
        <button className="secondary" disabled={busy} onClick={() => void logout()}>退出登录</button>
      </div></details>}
    </section>
    {error && <p className="error-notice" role="alert">{error}</p>}
    {(notice || (saved && section === 'summary')) && <p role="status">{notice || '资料已保存'}</p>}
    {section === 'summary' && <>
      <section className="profile-card" aria-label="我的桌游名片">
        <span className="profile-avatar" role="img" aria-label={avatars.find(avatar => avatar.id === profile.avatar)?.label}>{avatars.find(avatar => avatar.id === profile.avatar)?.symbol}</span>
        <div><h2>{profile.displayName}</h2><p className="muted friend-id">{social.data ? formatFriendId(social.data.identity.friendId) : '正在读取好友 ID…'}</p>
        <p className="profile-bio">{profile.bio || '还没有填写个人简介。'}</p></div>
        <a className="button-link" href="/profile/edit">编辑资料</a>
      </section>
      <nav className="profile-links" aria-label="资料功能"><a href="/profile/history">对局记录 <span aria-hidden="true">→</span></a><a href="/profile/identity">管理好友 ID <span aria-hidden="true">→</span></a></nav>
    </>}
    {section === 'edit' && <form className="form-stack profile-editor" onSubmit={save}>
        <fieldset className="room-fieldset form-stack" disabled={busy}>
          <label>昵称<input required maxLength={32} value={draft.displayName} onChange={event => setDraft({ ...draft, displayName: event.target.value })} /></label>
          <fieldset className="avatar-options"><legend>头像</legend>{avatars.map(avatar =>
            <label key={avatar.id}><input type="radio" name="avatar" value={avatar.id} checked={draft.avatar === avatar.id} onChange={() => setDraft({ ...draft, avatar: avatar.id })} /><span aria-hidden="true">{avatar.symbol}</span>{avatar.label}</label>)}
          </fieldset>
          <label>个人简介<textarea rows={4} maxLength={300} placeholder="喜欢的桌游、常玩的时间，或想对桌友说的话。" value={draft.bio} onChange={event => setDraft({ ...draft, bio: event.target.value })} /></label>
          <small className="muted">{draft.bio.length}/300</small>
          <div className="profile-save"><button disabled={!draft.displayName.trim()}>{busy ? '保存中…' : '保存资料'}</button><a href="/profile">取消</a></div>
        </fieldset>
      </form>}
    {section === 'identity' && <FriendIdCard />}
    {section === 'history' && history && <section className="room-list"><p className="muted">按开局时间排列，包含已结束与中止的对局。</p>
      {history.items.length === 0 ? <p className="muted">还没有对局记录。<a href="/">去游戏大厅开始第一局</a></p> : history.items.map(match =>
        <article className="room-row" key={match.id}><span><strong>{match.roomName}</strong><small>{match.gameId} · {match.gameVersion} · {date(match.createdAt)}</small></span>
          <span>{statuses[match.status]}</span><a className="button-link secondary" href={`/matches/${match.id}${match.status === 'active' ? '' : '/replay'}`}>{match.status === 'active' ? '继续对局' : '查看回放'}</a>
        </article>)}
      {history.nextCursor && <button className="secondary" disabled={loadingMore} onClick={() => void more()}>{loadingMore ? '加载中…' : '加载更多对局'}</button>}
    </section>}
  </div>;
}
