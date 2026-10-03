import { Component, type ButtonHTMLAttributes, type PropsWithChildren, type ReactNode } from 'react';

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} />;
}

export function Panel({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function StatusBadge({ state, children }: PropsWithChildren<{ state: 'ok' | 'warn' | 'error' | 'idle' }>) {
  return (
    <span className={`status status--${state}`}>
      <span className="status-indicator" aria-hidden="true" />
      <span className="status-text">{children}</span>
    </span>
  );
}

export function ErrorNotice({ children }: PropsWithChildren) {
  return (
    <div className="error-notice" role="alert">
      <svg className="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div className="error-content">{children}</div>
    </div>
  );
}

export function PageFeedback({ title, children, retry, loading = false }: PropsWithChildren<{
  title: string; retry?: () => void; loading?: boolean;
}>) {
  return (
    <section className="panel page-feedback" aria-busy={loading}>
      {loading && (
        <div className="page-feedback-spinner" aria-hidden="true">
          <svg viewBox="0 0 50 50" width="32" height="32" className="spinner-icon">
            <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="80" strokeDashoffset="60" />
          </svg>
        </div>
      )}
      <h2>{title}</h2>
      <div role={retry ? 'alert' : 'status'}>{children}</div>
      {loading && <div className="loading-placeholder" aria-hidden="true" />}
      {retry && <button className="secondary" onClick={retry}>重新加载</button>}
    </section>
  );
}

export function ActionHint({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section className="action-hint" role="status" aria-live="polite">
      <span className="action-hint-glow" aria-hidden="true" />
      <div className="action-hint-body">
        <strong>{title}</strong>
        {children && <p>{children}</p>}
      </div>
    </section>
  );
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

