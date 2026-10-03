import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../../platform.js';
import { adminError, useAdminRequestId } from './AdminLayout.js';

export function SocialSettingsPanel() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.socialSettings>>>();
  const [days, setDays] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const alive = useRef(false);
  const lock = useRef(false);
  const requestId = useAdminRequestId();
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setError('');
    void api.socialSettings().then(value => {
      if (disposed) return;
      setData(value);
      setDays(String(value.friendIdChangeDays));
    }).catch(cause => {
      if (!disposed) setError(adminError(cause));
    }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [attempt]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!data || lock.current || loading) return;
    const input = { expectedRevision: data.revision, friendIdChangeDays: Number(days) };
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await api.setSocialSettings({ ...input, requestId: requestId(input) });
      if (!alive.current) return;
      setData(saved);
      setDays(String(saved.friendIdChangeDays));
      setNotice('好友 ID 修改间隔已保存，立即生效。');
    } catch (cause) {
      if (alive.current) setError(adminError(cause));
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return <section className="panel" aria-label="好友 ID 设置">
    <h2>好友 ID 修改规则</h2>
    <p className="muted">首次自定义不受限制，之后从上次成功修改起计算。调整间隔会立即影响所有账户。</p>
    {loading && <p role="status">正在读取修改规则…</p>}
    {data && <form className="form-stack" onSubmit={event => void save(event)}>
      <label>好友 ID 修改间隔（天）<input type="number" required min={0} max={3650} step={1}
        value={days} disabled={busy || loading} onChange={event => setDays(event.target.value)} /></label>
      <small className="muted">0 表示不限次数，最多 3650 天。失败、重复请求和保存相同 ID 不会重新计时。</small>
      <button disabled={busy || loading || days === '' || Number(days) === data.friendIdChangeDays}>保存修改间隔</button>
    </form>}
    {error && <p role="alert" className="error-notice">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <button className="secondary" disabled={busy || loading} onClick={() => { setNotice(''); setAttempt(value => value + 1); }}>刷新修改规则</button>
  </section>;
}
