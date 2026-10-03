import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@boardgame/client-sdk';
import type { SocialMessage, SocialPerson } from '@boardgame/protocol';
import { api, navigate } from '../platform.js';

export function DirectChat({ person, refresh }: { person: SocialPerson; refresh: () => Promise<void> }) {
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);
  const [retry, setRetry] = useState(false);
  const pending = useRef<{ requestId: string; text: string } | undefined>(undefined);
  const mounted = useRef(false);
  const sending = useRef(false);
  const loadedOlder = useRef(false);
  const sequence = useRef(0);
  const request = useRef<AbortController | undefined>(undefined);
  const lastRead = useRef('');
  const latest = useRef<SocialMessage | undefined>(undefined);
  const readLock = useRef(false);
  function merge(items: SocialMessage[], advance = true) {
    if (advance) for (const item of items) if (!latest.current || BigInt(item.sequence) > BigInt(latest.current.sequence)) latest.current = item;
    setMessages(previous => {
      const known = new Map(previous.map(item => [item.id, item]));
      for (const item of items) known.set(item.id, item);
      return [...known.values()].sort((a, b) => BigInt(a.sequence) < BigInt(b.sequence) ? -1 : BigInt(a.sequence) > BigInt(b.sequence) ? 1 : 0);
    });
  }
  async function load(before?: string) {
    if (request.current) return;
    const version = sequence.current;
    const controller = new AbortController(); request.current = controller;
    if (before) setMoreBusy(true);
    try {
      const after = !before ? latest.current?.id : undefined;
      const page = await api.directMessages(person.id, before, controller.signal, after);
      if (!mounted.current || sequence.current !== version) return;
      merge(page.items);
      if (before) loadedOlder.current = true;
      if (before || (!after && !loadedOlder.current)) setCursor(page.nextCursor);
      // Fetch every missing segment after an offline period. The server returns
      // ascending batches after our watermark, never just the newest 30.
      let nextAfter = after ? page.nextCursor : null;
      while (nextAfter && mounted.current && !controller.signal.aborted) {
        const catchup = await api.directMessages(person.id, undefined, controller.signal, nextAfter);
        if (!mounted.current || sequence.current !== version) return;
        merge(catchup.items); nextAfter = catchup.nextCursor;
      }
      setError('');
    } catch (cause) {
      if (!mounted.current || controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') navigate('/login');
      else if (cause instanceof ApiError && cause.code === 'FORBIDDEN') { setMessages([]); void refresh(); }
      setError(cause instanceof ApiError ? cause.message : '聊天同步失败，请检查网络或重试。');
    } finally { if (request.current === controller) request.current = undefined; if (mounted.current) setMoreBusy(false); }
  }
  useEffect(() => {
    mounted.current = true;
    const sync = () => { if (document.visibilityState === 'visible') void load(); };
    sync();
    const timer = window.setInterval(sync, 5000);
    window.addEventListener('online', sync); document.addEventListener('visibilitychange', sync);
    return () => {
      mounted.current = false; sequence.current++; request.current?.abort(); request.current = undefined; clearInterval(timer);
      window.removeEventListener('online', sync); document.removeEventListener('visibilitychange', sync);
    };
  }, [person.id]);
  useEffect(() => {
    const last = messages.at(-1);
    if (!last || last.id !== latest.current?.id || last.id === lastRead.current || readLock.current || document.visibilityState !== 'visible') return;
    readLock.current = true;
    void api.readDirectMessages(person.id, { requestId: crypto.randomUUID(), messageId: last.id }).then(() => {
      lastRead.current = last.id;
      if (mounted.current) void refresh();
    }).catch(() => undefined).finally(() => { readLock.current = false; });
  }, [messages, person.id, refresh]);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (sending.current || (!text.trim() && !pending.current)) return;
    sending.current = true; setBusy(true); setError('');
    pending.current ??= { requestId: crypto.randomUUID(), text: text.trim() };
    try {
      const message = await api.sendDirectMessage(person.id, pending.current);
      pending.current = undefined;
      if (mounted.current) { setRetry(false); setText(''); merge([message], false); void load(); }
    } catch (cause) {
      if (cause instanceof ApiError && !cause.retryable) pending.current = undefined;
      if (mounted.current) { setRetry(!!pending.current); setError(cause instanceof ApiError ? cause.message : '发送结果未知，请点击重试发送。'); }
    } finally { sending.current = false; if (mounted.current) setBusy(false); }
  }
  return <section className="panel direct-chat" aria-label={`与 ${person.displayName} 的私聊`}>
    <h1>与 {person.displayName} 私聊</h1><p className="muted">仅你们双方可见</p>
    {error && <p role="alert" className="error-notice">{error}<button className="secondary" onClick={() => void load()}>重新同步</button></p>}
    {cursor && <button className="secondary" disabled={moreBusy} onClick={() => void load(cursor)}>加载更早消息</button>}
    <ol className="chat-history" aria-label="聊天记录">{messages.map(message => <li className={message.senderId === person.id ? '' : 'chat-message--mine'} key={message.id}>
      <small>{message.senderId === person.id ? person.displayName : '我'} · {new Date(message.createdAt).toLocaleString('zh-CN')}</small><p>{message.text}</p>
    </li>)}</ol>
    {messages.length === 0 && <p className="muted">还没有消息，打个招呼吧。</p>}
    <form className="form-stack" onSubmit={send}><label>私聊消息<textarea required maxLength={2000} rows={3} value={text} readOnly={retry} disabled={busy} onChange={event => setText(event.target.value)} /></label>
      <button disabled={busy || !text.trim()}>{busy ? '发送中…' : retry ? '重试发送' : '发送消息'}</button>
    </form>
  </section>;
}
