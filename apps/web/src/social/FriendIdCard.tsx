import { useEffect, useState, type FormEvent } from 'react';
import { friendIdInputValueSchema, formatFriendId } from '@boardgame/protocol';
import { api } from '../platform.js';
import { useSocial, useSocialCommand } from './useSocial.js';

export function FriendIdCard() {
  const { data, error, refresh } = useSocial();
  const action = useSocialCommand();
  const [value, setValue] = useState('');
  const [copy, setCopy] = useState('');
  useEffect(() => { if (data) setValue(formatFriendId(data.identity.friendId)); }, [data?.identity.friendId]);
  function save(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    const input = { friendId: friendIdInputValueSchema.parse(value), expectedRevision: data.identity.revision };
    void action.run(JSON.stringify(input), id => api.changeFriendId({ ...input, requestId: id }), '好友 ID 已保存', () => void refresh());
  }
  return <section className="panel friend-id-card"><h2>我的好友 ID</h2>
    {data ? <><p><code className="friend-id">{formatFriendId(data.identity.friendId)}</code></p>
      <button className="secondary" onClick={() => void navigator.clipboard.writeText(formatFriendId(data.identity.friendId)).then(() => setCopy('好友 ID 已复制')).catch(() => setCopy('复制失败，请长按或选中 ID 复制'))}>复制好友 ID</button>
      <p className="muted">把这个 ID 发给朋友，对方可在「好友」中搜索你。修改后已有好友和聊天记录仍保留。</p>
      <form className="form-stack" onSubmit={save}><label>新好友 ID<input required pattern="@?[A-Za-z0-9_]{3,36}" minLength={3} maxLength={37} placeholder="@rst307" value={value} disabled={action.busy} onChange={event => setValue(event.target.value)} /></label>
        <small className="muted">自定义你的 @ID，例如 @rst307。名字为 3–36 位字母、数字或下划线，不区分大小写，登录用户名不变。</small>
        <button disabled={action.busy || friendIdInputValueSchema.safeParse(value).data === data.identity.friendId}>保存好友 ID</button>
      </form></> : <p>正在读取好友 ID…</p>}
    {(error || action.error) && <p className="error-notice" role="alert">{error || action.error}<button className="secondary" onClick={() => void refresh()}>重新读取</button></p>}
    {(action.notice || copy) && <p role="status">{action.notice || copy}</p>}
  </section>;
}
