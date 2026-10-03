import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@boardgame/client-sdk';
import type { SocialOverview } from '@boardgame/protocol';
import { api, navigate } from '../platform.js';

export function useSocial() {
  const [data, setData] = useState<SocialOverview>();
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const sequence = useRef(0);
  const request = useRef<AbortController | undefined>(undefined);
  const refresh = useCallback(async () => {
    const version = ++sequence.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const next = await api.social(controller.signal);
      if (mounted.current && version === sequence.current) { setData(next); setError(''); }
    } catch (cause) {
      if (!mounted.current || version !== sequence.current || controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') { setData(undefined); navigate('/login'); }
      else setError('好友信息同步失败，请检查网络或重试。');
    } finally { if (version === sequence.current) request.current = undefined; }
  }, []);
  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    void api.me().then(() => { if (!disposed) void refresh(); }).catch(cause => {
      if (disposed) return;
      if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') navigate('/login');
      else setError('无法读取会话，请重试。');
    });
    const sync = () => { if (document.visibilityState === 'visible' && !request.current) void refresh(); };
    const timer = window.setInterval(sync, 5000);
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      disposed = true; mounted.current = false; sequence.current++; request.current?.abort();
      clearInterval(timer); window.removeEventListener('online', sync); document.removeEventListener('visibilitychange', sync);
    };
  }, [refresh]);
  return { data, error, refresh };
}

// Keep the same UUID for the same command after an uncertain network result.
export function useSocialCommand() {
  const active = useRef(false);
  const locked = useRef(false);
  const pending = useRef(new Map<string, string>());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function run(key: string, fn: (requestId: string) => Promise<unknown>, message = '', done?: () => void) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setNotice('');
    const id = pending.current.get(key) ?? crypto.randomUUID();
    pending.current.set(key, id);
    try {
      await fn(id);
      pending.current.delete(key);
      if (active.current) { setNotice(message); done?.(); }
    } catch (cause) {
      if (cause instanceof ApiError && !cause.retryable) pending.current.delete(key);
      if (active.current) {
        if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') navigate('/login');
        else setError(cause instanceof ApiError ? cause.message : '请求结果未知，请重试原操作。');
      }
    } finally { locked.current = false; if (active.current) setBusy(false); }
  }
  return { run, busy, error, notice };
}
