import { useEffect, useState } from 'react';
import { DeveloperMarkdown } from './DeveloperMarkdown.js';
import '../styles/developers.css';
import { guides } from '../app/developer-guides.js';



export function DevelopersPage({ slug = 'index' }: { slug?: string }) {
  const guide = guides.find(item => item.slug === slug);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!guide) return;
    const controller = new AbortController();
    setSource('');
    setError(false);
    void fetch(`/developer-docs/${guide.slug}.md`, { signal: controller.signal }).then(async response => {
      if (!response.ok || !/^(?:text\/|application\/octet-stream)/i.test(response.headers.get('content-type') ?? '')) throw new Error('Document unavailable');
      const text = await response.text();
      if (!controller.signal.aborted) setSource(text);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => { controller.abort(); };
  }, [guide, attempt]);
  if (!guide) return <section><h1>未找到开发文档</h1><a href="/developers">返回开发者中心</a></section>;
  const visible = guides.filter(item => `${item.title} ${item.summary}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="developers-page">
    <div className="developer-heading"><p className="eyebrow">DEVELOPER DOCUMENTATION · SDK 0.1.0</p><p>为人类开发者与 AI 编码代理提供同一份可核验的接口说明。</p></div>
    <div className="developer-layout">
      <aside className="developer-sidebar">
        <label htmlFor="developer-search">查找指南</label>
        <input id="developer-search" type="search" placeholder="SDK、API、添加游戏…" value={query} onChange={event => setQuery(event.target.value)} />
        <nav aria-label="开发文档">{visible.map(item => <a key={item.slug} href={item.slug === 'index' ? '/developers' : `/developers/${item.slug}`} aria-current={item.slug === slug ? 'page' : undefined}><strong>{item.title}</strong><small>{item.summary}</small></a>)}</nav>
        {visible.length === 0 && <p role="status">没有匹配指南，试试 SDK 或 API。</p>}
        <div className="developer-downloads"><strong>下载与 AI 入口</strong>
          <a href={`/developer-docs/${guide.slug}.md`} download>下载本页 Markdown</a>
          <a href="/developer-sdk/sdk-sources.json" download>下载 SDK 源码包</a>
          <a href="/llms.txt">llms.txt 文档索引</a>
          <a href="/llms-full.txt" download>完整指南纯文本</a>
        </div>
      </aside>
      <article className="developer-article" aria-label={guide.title} aria-busy={!source && !error}>
        {error ? <><h1>文档暂时无法加载</h1><p>检查网络连接后重试，也可以直接打开 Markdown。</p><button onClick={() => setAttempt(value => value + 1)}>重新加载</button><a href={`/developer-docs/${guide.slug}.md`}>打开 Markdown</a></> : source ? <DeveloperMarkdown source={source} /> : <p role="status">正在加载开发文档…</p>}
      </article>
    </div>
  </section>;
}
