import { useState } from 'react';
import { Button, Panel, StatusBadge } from '@boardgame/ui';
import { pingWebSocket } from '@boardgame/client-sdk';

type Check = { state: 'idle' | 'ok' | 'error' | 'warn'; label: string; detail: string };

const serviceIcons: Record<string, string> = {
  API: '⚡',
  数据库: '🗄️',
  实时连接: '🛰️',
};

export function StatusPage() {
  const [api, setApi] = useState<Check>({ state: 'idle', label: '未检查', detail: 'HTTP 进程状态' });
  const [db, setDb] = useState<Check>({ state: 'idle', label: '未检查', detail: '数据库与注册表' });
  const [ws, setWs] = useState<Check>({ state: 'idle', label: '未检查', detail: '实时 ping/pong' });
  const [time, setTime] = useState('—');
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    setApi({ state: 'idle', label: '检查中', detail: 'HTTP 进程状态' });
    setDb({ state: 'idle', label: '检查中', detail: '数据库与注册表' });
    setWs({ state: 'idle', label: '检查中', detail: '实时 ping/pong' });
    const started = performance.now();

    try {
      const live = await fetch('/health/live');
      setApi({
        state: live.ok ? 'ok' : 'error',
        label: live.ok ? '可用' : '失败',
        detail: `${Math.round(performance.now() - started)} ms`,
      });
    } catch {
      setApi({ state: 'error', label: '不可用', detail: '无法连接 API' });
    }

    try {
      const ready = await fetch('/health/ready');
      const body = await ready.json();
      setDb({
        state: ready.ok ? 'ok' : 'warn',
        label: ready.ok ? '就绪' : '未就绪',
        detail: body.data?.database?.reason ?? '迁移与扩展同步正常',
      });
    } catch {
      setDb({ state: 'error', label: '不可用', detail: '无法读取就绪状态' });
    }

    try {
      const ms = await pingWebSocket();
      setWs({ state: 'ok', label: '可用', detail: `${ms} ms` });
    } catch (e) {
      setWs({ state: 'error', label: '不可用', detail: e instanceof Error ? e.message : '连接失败' });
    }

    setTime(new Date().toLocaleTimeString());
    setChecking(false);
  }

  const items: Array<[string, Check]> = [
    ['API', api],
    ['数据库', db],
    ['实时连接', ws],
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">运行诊断</p>
          <h1>系统状态</h1>
          <p>API、数据库就绪和实时连接分别检查，不以进程存活冒充系统就绪。</p>
        </div>
        <Button onClick={check} disabled={checking}>
          {checking ? '正在检查…' : '立即检查'}
        </Button>
      </div>

      <div className="cards status-cards">
        {items.map(([name, item]) => (
          <Panel key={name} className={`status-service-card status-service--${item.state}`}>
            <div className="status-service-header">
              <span className="status-service-icon" aria-hidden="true">
                {serviceIcons[name] ?? '📊'}
              </span>
              <h2>{name}</h2>
            </div>
            <StatusBadge state={item.state}>{item.label}</StatusBadge>
            <p>{item.detail}</p>
          </Panel>
        ))}
      </div>

      <p className="muted">最近检查：{time}</p>
    </>
  );
}
