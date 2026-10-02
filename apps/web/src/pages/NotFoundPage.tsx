export function NotFoundPage() {
  return <section className="empty">
    <p className="eyebrow">404</p>
    <h1>页面不存在</h1>
    <p className="muted">地址可能已变更。返回大厅继续游戏，或查看开发者文档。</p>
    <div className="recovery-actions">
      <a className="button-link" href="/">返回大厅</a>
      <a className="button-link secondary" href="/developers">开发者文档</a>
    </div>
  </section>;
}
