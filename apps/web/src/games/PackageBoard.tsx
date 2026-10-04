import { useEffect, useRef, useState } from 'react';

export function PackageBoard({ id, version, view, busy, events, onAction }: {
  id: string; version: string; view: unknown; busy: boolean; events: unknown[]; onAction: (action: unknown) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>();
  const [fitViewport, setFitViewport] = useState(false);
  const fitting = useRef(false);
  useEffect(() => {
    fitting.current = false;
    setFitViewport(false);
    setHeight(undefined);
  }, [id, version]);
  useEffect(() => {
    if (!fitViewport) return;
    const resize = () => {
      const element = frame.current;
      if (!element) return;
      const top = Math.max(0, element.getBoundingClientRect().top + window.scrollY);
      setHeight(Math.max(180, Math.min(4096, Math.floor(window.innerHeight - top - 16))));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(document.body);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [fitViewport, id, version]);
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
      if ('type' in data && data.type === 'boardgame:resize' && 'height' in data &&
        typeof data.height === 'number' && Number.isFinite(data.height) &&
        data.height >= 320 && data.height <= 4096) {
        if ('fit' in data && data.fit === 'viewport') {
          fitting.current = true;
          setFitViewport(true);
        } else if (!fitting.current) {
          setHeight(Math.ceil(data.height));
        }
      }
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
  return <iframe key={`${id}@${version}`} ref={frame} title="在线游戏桌面" className="package-desktop"
    style={height === undefined ? undefined : { height, minHeight: 0 }}
    sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={publish}
    src={`/api/v1/game-packages/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/desktop`} />;
}
