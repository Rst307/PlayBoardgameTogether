import { Component, type ButtonHTMLAttributes, type PropsWithChildren, type ReactNode } from 'react';
export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) { return <button {...props} />; }
export function Panel({ children, className = '' }: PropsWithChildren<{ className?: string }>) { return <section className={`panel ${className}`}>{children}</section>; }
export function StatusBadge({ state, children }: PropsWithChildren<{ state: 'ok' | 'warn' | 'error' | 'idle' }>) { return <span className={`status status--${state}`}>{children}</span>; }
export function ErrorNotice({ children }: PropsWithChildren) { return <div className="error-notice" role="alert">{children}</div>; }

export function PageFeedback({ title, children, retry, loading = false }: PropsWithChildren<{
  title: string; retry?: () => void; loading?: boolean;
}>) {
  return <section className="panel page-feedback" aria-busy={loading}>
    <h2>{title}</h2><div role={retry ? 'alert' : 'status'}>{children}</div>
    {loading && <div className="loading-placeholder" aria-hidden="true" />}
    {retry && <button className="secondary" onClick={retry}>重新加载</button>}
  </section>;
}

export function ActionHint({ title, children }: PropsWithChildren<{ title: string }>) {
  return <section className="action-hint" role="status" aria-live="polite">
    <strong>{title}</strong>{children && <p>{children}</p>}
  </section>;
}

export class GameErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render(): ReactNode {
    if (this.state.failed) return <PageFeedback title="游戏界面暂时无法显示" retry={() => this.setState({ failed: false })}>
      <p>已保存的对局仍保留。可重试界面，或使用上方入口返回房间。</p>
    </PageFeedback>;
    return this.props.children;
  }
}
