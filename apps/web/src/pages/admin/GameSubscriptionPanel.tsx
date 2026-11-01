import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@boardgame/client-sdk';
import type { GameSubscription, GameSubscriptionInput } from '@boardgame/protocol';
import { api } from '../../platform.js';
import { adminError } from './AdminLayout.js';

type Pending =
  | { kind: 'save'; input: GameSubscriptionInput }
  | { kind: 'check'; input: Pick<GameSubscriptionInput, 'requestId' | 'expectedRevision'> };
const statusLabels: Record<GameSubscription['status'], string> = {
  idle: '尚未同步',
  running: '正在同步',
  succeeded: '同步完成',
  partial: '部分失败',
  failed: '同步失败',
  interrupted: '上次同步中断，可重试',
};
const outcomeLabels = {
  added: '已添加',
  updated: '已更新',
  current: '已是最新',
  skipped: '已跳过',
  failed: '失败',
};
const time = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

function SubscriptionSettings({ onChanged }: { onChanged: () => void }) {
  const [data, setData] = useState<GameSubscription>();
  const [draft, setDraft] = useState<{ autoAdd: boolean; autoUpdate: boolean; revision: number }>();
  const [error, setError] = useState('');
  const [readError, setReadError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending>();
  const [attempt, setAttempt] = useState(0);
  const alive = useRef(false);
  const lock = useRef(false);
  const generation = useRef(0);
  const lastFinished = useRef<string | null>(null);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function read() {
      const sequence = ++generation.current;
      try {
        const next = await api.gameSubscription(controller.signal);
        if (controller.signal.aborted || sequence !== generation.current) return;
        if (lastFinished.current !== next.finishedAt && next.finishedAt) onChanged();
        lastFinished.current = next.finishedAt;
        setData(next);
        setReadError('');
        setDraft(
          (previous) =>
            previous ?? {
              autoAdd: next.autoAdd,
              autoUpdate: next.autoUpdate,
              revision: next.revision,
            },
        );
      } catch (cause) {
        if (!controller.signal.aborted && sequence === generation.current)
          setReadError(adminError(cause));
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(() => void read(), 5000);
      }
    }
    void read();
    return () => {
      alive.current = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [attempt, onChanged]);

  async function submit(kind: 'save' | 'check') {
    if (!data || !draft || lock.current) return;
    const command: Pending =
      pending ??
      (kind === 'save'
        ? {
            kind,
            input: {
              autoAdd: draft.autoAdd,
              autoUpdate: draft.autoUpdate,
              expectedRevision: draft.revision,
              requestId: crypto.randomUUID(),
            },
          }
        : { kind, input: { expectedRevision: data.revision, requestId: crypto.randomUUID() } });
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    ++generation.current;
    try {
      const saved =
        command.kind === 'save'
          ? await api.saveGameSubscription(command.input)
          : await api.checkGameSubscription(command.input);
      if (!alive.current) return;
      setPending(undefined);
      if (command.kind === 'save') {
        setDraft({
          autoAdd: saved.autoAdd,
          autoUpdate: saved.autoUpdate,
          revision: saved.revision,
        });
        setNotice(
          saved.autoAdd || saved.autoUpdate
            ? '订阅已保存，后台将自动同步官方游戏。'
            : '自动订阅已关闭，已安装游戏保留。',
        );
      } else setNotice('已请求同步，结果将在下方自动更新。');
      setAttempt((value) => value + 1);
    } catch (cause) {
      if (!alive.current) return;
      if (
        !(cause instanceof ApiError) ||
        ['INTERNAL_ERROR', 'SERVICE_UNAVAILABLE'].includes(cause.code)
      ) {
        setPending(command);
        setError('请求结果尚未确认，请使用原请求重试。');
      } else {
        setPending(undefined);
        setError(adminError(cause));
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const dirty =
    draft && data && (draft.autoAdd !== data.autoAdd || draft.autoUpdate !== data.autoUpdate);
  const stale = draft && data && draft.revision !== data.revision;
  const canReauthorize = data?.status === 'failed' || data?.status === 'interrupted';
  return (
    <div className="game-subscription">
      <p className="muted">
        订阅 PlayBoard 官方目录，每小时检查一次。启用后允许服务器自动校验、安装并上架官方 ZIP
        游戏；内置游戏随平台更新。
      </p>
      {!data && !error && !readError && <p role="status">正在读取订阅设置…</p>}
      {data && draft && (
        <>
          <fieldset disabled={busy || !!pending}>
            <legend>自动同步范围</legend>
            <label>
              <input
                type="checkbox"
                checked={draft.autoAdd}
                onChange={(event) => setDraft({ ...draft, autoAdd: event.target.checked })}
              />
              自动添加新游戏
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.autoUpdate}
                onChange={(event) => setDraft({ ...draft, autoUpdate: event.target.checked })}
              />
              自动更新已安装游戏
            </label>
          </fieldset>
          <p className="muted">
            已下架游戏保持下架；更新保留旧规则和正在进行的对局。关闭订阅不会卸载游戏。
          </p>
          <div className="admin-actions">
            <button
              disabled={
                busy ||
                (!pending && ((!dirty && !canReauthorize) || !!stale)) ||
                pending?.kind === 'check'
              }
              onClick={() => void submit('save')}
            >
              {pending?.kind === 'save' ? '确认原保存请求' : '保存订阅'}
            </button>
            <button
              className="secondary"
              disabled={
                busy ||
                (!pending &&
                  (!!dirty ||
                    !!stale ||
                    (!data.autoAdd && !data.autoUpdate) ||
                    data.status === 'running')) ||
                pending?.kind === 'save'
              }
              onClick={() => void submit('check')}
            >
              {pending?.kind === 'check' ? '确认原同步请求' : '立即同步'}
            </button>
            <button
              className="secondary"
              disabled={busy || !!pending}
              onClick={() => {
                setDraft(undefined);
                setError('');
                setAttempt((value) => value + 1);
              }}
            >
              重新读取设置
            </button>
          </div>
          {stale && !pending && (
            <p role="status">订阅设置已被其他操作修改，请重新读取设置后再保存。</p>
          )}
          <div className="game-subscription-status" aria-live="polite">
            <strong>
              {statusLabels[data.status]}
              {!data.autoAdd && !data.autoUpdate ? ' · 自动订阅已关闭' : ''}
            </strong>
            <span>最近完成：{time(data.finishedAt)}</span>
            <span>下次检查：{time(data.nextCheckAt)}</span>
            {data.message && <span>{data.message}</span>}
          </div>
          {data.items.length > 0 && (
            <details>
              <summary>同步明细（{data.items.length}）</summary>
              <ul className="game-subscription-results">
                {data.items.map((item) => (
                  <li key={item.gameId}>
                    <strong>
                      {item.gameId} · {item.version}
                    </strong>
                    <span>
                      {outcomeLabels[item.outcome]}：{item.message}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      {(error || readError) && (
        <p className="error-notice" role="alert">
          {error || readError}
        </p>
      )}
      {notice && (
        <p className="success-notice" role="status">
          {notice}
        </p>
      )}
      {!data && (error || readError) && (
        <button
          className="secondary"
          onClick={() => {
            setError('');
            setAttempt((value) => value + 1);
          }}
        >
          重试读取订阅
        </button>
      )}
    </div>
  );
}
export function GameSubscriptionPanel({ onChanged }: { onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="admin-guidance" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>官方游戏订阅</summary>
      {open && <SubscriptionSettings onChanged={onChanged} />}
    </details>
  );
}
