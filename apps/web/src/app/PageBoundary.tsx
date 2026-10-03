import { Component, type PropsWithChildren, type ReactNode } from 'react';

// Navigation remains usable when a page render or a lazy chunk fails.
// Remount on route changes; failed lazy imports need a fresh document to retry.
export class PageBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="panel page-feedback page-error-card" role="alert">
        <div className="page-error-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1>页面暂时无法显示</h1>
        <p>请检查连接后重新加载，也可以通过导航打开其他页面。</p>
        <div className="recovery-actions">
          <button onClick={() => window.location.reload()}>重新加载页面</button>
          <a className="button-link secondary" href="/">返回大厅</a>
        </div>
      </section>
    );
  }
}

