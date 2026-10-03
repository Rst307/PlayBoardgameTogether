import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@boardgame/client-sdk';
import { navigate } from '../platform.js';
import { useSocialContext } from './SocialProvider.js';

export function useSocial() {
  const { data, error, refresh, guest } = useSocialContext();
  useEffect(() => {
    if (guest) navigate('/login');
  }, [guest]);
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
