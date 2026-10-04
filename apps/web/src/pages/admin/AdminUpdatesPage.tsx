import { useEffect, useRef, useState } from 'react';
import type { AdminUpdateStatus } from '@boardgame/protocol';
import { Button } from '@boardgame/ui';
import { api } from '../../platform.js';
import { AdminLayout, adminError } from './AdminLayout.js';

const messages: Record<AdminUpdateStatus['phase'], string> = {
  unavailable: '当前服务未启用在线更新托管，或仍使用旧版更新器，请由维护者启用或重启后使用。',
  disabled: '在线更新已由部署配置停用。',
  idle: '可以检测已发布的新版本。',
  checking: '正在检测发布分支…',
  building: '发现新版本，正在后台安装依赖并构建…',
  current: '当前已是最新版本。',
  waiting: '新版已准备，等待请求静默且没有进行中的对局和实时连接后自动更新。',
  maintenance: '新版包含数据库迁移，需要维护者确认兼容性并备份后安排更新。',
  applying: '正在切换版本，服务可能短暂不可用。',
  updated: '新版本已更新成功。已打开的页面可手动刷新以使用新版界面。',
  failed: '更新未完成，请稍后重试；维护者可检查更新日志和服务就绪状态。',
};
const working = new Set(['checking', 'building', 'waiting', 'applying']);
const steps = ['检测发布版本', '安装依赖并构建', '等待安全切换', '切换并验证服务'];
const progressPhase: Partial<Record<AdminUpdateStatus['phase'], number>> = {
  checking: 0, building: 1, waiting: 2, maintenance: 2, applying: 3, updated: 4,
};

function UpdateProgress({ phase }: { phase: AdminUpdateStatus['phase'] }) {
  const active = progressPhase[phase];
  if (active === undefined) return null;
  return (
    <ol className="admin-update-progress" aria-label="更新步骤">
      {steps.map((label, index) => {
        const complete = index < active;
        const current = index === active;
        return (
          <li key={label} data-state={complete ? 'complete' : current ? 'active' : 'pending'}
            aria-current={current ? 'step' : undefined}>
            <span className="admin-update-step-number" aria-hidden="true">{complete ? '✓' : index + 1}</span>
            <span>{label}</span>
            <small>{complete ? '已完成' : current ? phase === 'waiting' || phase === 'maintenance' ? '等待中' : '进行中' : '待开始'}</small>
          </li>
        );
      })}
    </ol>
  );
}

function UpdatePanel() {
  const [status, setStatus] = useState<AdminUpdateStatus>();
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const mounted = useRef(false);
  const command = useRef<AbortController | null>(null);
  const retryId = useRef<string | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      const version = generation.current;
      try {
        const value = await api.adminUpdateStatus(controller.signal);
        if (!controller.signal.aborted && version === generation.current && !command.current) {
          setStatus(value);
          setError('');
        }
      } catch (cause) {
        if (!controller.signal.aborted && version === generation.current) setError(adminError(cause));
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(() => { void load(); }, 3000);
      }
    }
    void load();
    return () => {
      mounted.current = false;
      controller.abort();
      command.current?.abort();
      clearTimeout(timer);
    };
  }, []);
  async function check() {
    if (command.current) return;
    const controller = new AbortController();
    command.current = controller;
    generation.current++;
    setSending(true);
    setError('');
    retryId.current ??= crypto.randomUUID();
    try {
      const value = await api.checkAdminUpdate(retryId.current, controller.signal);
      if (mounted.current) { setStatus(value); retryId.current = null; }
    } catch (cause) {
      if (mounted.current) setError(adminError(cause));
    } finally {
      command.current = null;
      if (mounted.current) setSending(false);
    }
  }
  return (
    <section className="admin-update-section" aria-label="服务更新">
      <p role="status">{status ? messages[status.phase] : '正在读取更新状态…'}</p>
      {status && <UpdateProgress phase={status.phase} />}
      {status?.phase === 'waiting' && <div className="admin-update-waiting">
        <p>构建已完成，尚未切换版本。</p>
        <p className="muted">更新器会在后续检测周期重试。进行中的对局、实时连接或持续请求都可能延后切换；当前接口尚未提供具体阻塞项。此页每 3 秒刷新状态，查看进度不会延长请求静默等待。</p>
      </div>}
      <dl className="admin-update-details">
        <div><dt>发布分支</dt><dd>{status?.branch ?? '—'}</dd></div>
        <div><dt>当前版本</dt><dd>{status?.currentSha?.slice(0, 12) ?? '—'}</dd></div>
        {status?.candidateSha && <div><dt>候选版本</dt><dd>{status.candidateSha.slice(0, 12)}</dd></div>}
        <div><dt>最近检测</dt><dd>{status?.lastCheckedAt ? new Date(status.lastCheckedAt).toLocaleString('zh-CN') : '尚未检测'}</dd></div>
      </dl>
      {error && <p role="alert">{error}</p>}
      <Button onClick={() => { void check(); }} disabled={!status?.enabled || sending || working.has(status.phase)}>
        {sending ? '正在提交…' : status?.phase === 'waiting' ? '等待安全切换' : status && working.has(status.phase) ? '更新处理中…' : '立即检测并更新'}
      </Button>
      <p className="muted">检测已合并到发布分支的代码。更新不会强制中断对局或自动刷新玩家页面。</p>
    </section>
  );
}

export function AdminUpdatesPage() {
  return <AdminLayout path="/admin/updates" title="服务更新" description="检测发布版本，在安全条件满足后更新服务。">
    <UpdatePanel />
  </AdminLayout>;
}
