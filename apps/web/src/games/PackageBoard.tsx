import { useEffect, useRef } from 'react';

export function PackageBoard({ id, version, view, busy, events, onAction }: {
  id: string; version: string; view: unknown; busy: boolean; events: unknown[]; onAction: (action: unknown) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef({ view, busy, events, onAction });
  latest.current = { view, busy, events, onAction };
  const publish = () => {
    const { view, busy, events } = latest.current;
    frame.current?.contentWindow?.postMessage({ type: 'boardgame:view', view, busy, events }, '*');
  };
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== frame.current?.contentWindow || !event.data || typeof event.data !== 'object') return;
      const data = event.data;
      if ('type' in data && data.type === 'boardgame:ready') publish();
      if ('type' in data && data.type === 'boardgame:action' && 'action' in data && !latest.current.busy) {
        try {
          if (JSON.stringify(data.action).length <= 8192) latest.current.onAction(data.action);
        } catch { /* Malformed frame messages never reach the command transport. */ }
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(publish, [view, busy, events]);
  return <iframe ref={frame} title="在线游戏桌面" className="package-desktop"
    sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={publish}
    src={`/api/v1/game-packages/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/desktop`} />;
}
