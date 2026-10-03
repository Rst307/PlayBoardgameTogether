export function NotFoundPage() {
  return (
    <section className="empty not-found-card">
      <div className="empty-illustration" aria-hidden="true">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" fill="rgba(59, 130, 246, 0.08)" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1.5" strokeDasharray="4 4" />
          <rect x="26" y="26" width="28" height="28" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" transform="rotate(-6 40 40)" />
          <circle cx="34" cy="34" r="3" fill="#60a5fa" />
          <circle cx="46" cy="46" r="3" fill="#60a5fa" />
          <circle cx="40" cy="40" r="3" fill="#93c5fd" />
        </svg>
      </div>
      <p className="eyebrow">404 · 迷路的棋子</p>
      <h1>页面不存在</h1>
      <p className="muted">这个地址可能已变更或尚未开桌。返回大厅继续游戏，或查看开发者文档。</p>
      <div className="recovery-actions">
        <a className="button-link" href="/">返回大厅</a>
        <a className="button-link secondary" href="/developers">开发者文档</a>
      </div>
    </section>
  );
}

