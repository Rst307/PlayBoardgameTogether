import { Fragment, type ReactNode } from 'react';

export function documentLink(value: string): string | undefined {
  if (/^(?:https:\/\/|\/(?!\/)|#)/i.test(value)) return value;
  return undefined;
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /`([^`]+)`|\[([^\]]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*/g;
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    nodes.push(text.slice(end, match.index));
    if (match[1] !== undefined) nodes.push(<code key={match.index}>{match[1]}</code>);
    else if (match[2] !== undefined) {
      const href = documentLink(match[3]!);
      nodes.push(href ? <a key={match.index} href={href}>{match[2]}</a> : match[2]);
    } else nodes.push(<strong key={match.index}>{match[4]}</strong>);
    end = match.index + match[0].length;
  }
  nodes.push(text.slice(end));
  return nodes;
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
const isTableRule = (line: string) => /^\|?\s*:?-{3,}/.test(line.trim());
const isList = (line: string) => /^(?:- |\d+\. )/.test(line);
const isBlock = (line: string) => !line.trim() || /^(?:#{1,3} |```|\|)/.test(line) || isList(line);

// Deliberately limited Markdown: React text escaping, no HTML, scripts, images or executable URLs.
export function DeveloperMarkdown({ source }: { source: string }) {
  const lines = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  const headings: Array<{ id: string; title: string }> = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const start = i;
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```')) code.push(lines[i++]!);
      i++;
      blocks.push(<div className="developer-code" key={start}><span>{language || 'text'}</span><pre tabIndex={0}><code>{code.join('\n')}</code></pre></div>);
      continue;
    }
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      const id = `doc-heading-${start}`;
      const content = inline(heading[2]!);
      if (heading[1]!.length === 2) headings.push({ id, title: heading[2]! });
      blocks.push(heading[1]!.length === 1 ? <h1 id={id} key={start}>{content}</h1> :
        heading[1]!.length === 2 ? <h2 id={id} key={start}>{content}</h2> : <h3 id={id} key={start}>{content}</h3>);
      i++;
      continue;
    }
    if (line.startsWith('|') && isTableRule(lines[i + 1] ?? '')) {
      const headers = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i]!.startsWith('|')) rows.push(cells(lines[i++]!));
      blocks.push(<div className="developer-table" role="region" aria-label={headers.join('、')} tabIndex={0} key={start}><table>
        <thead><tr>{headers.map((value, index) => <th scope="col" key={index}>{inline(value)}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell}>{inline(value)}</td>)}</tr>)}</tbody>
      </table></div>);
      continue;
    }
    if (isList(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: ReactNode[] = [];
      while (i < lines.length && (ordered ? /^\d+\. /.test(lines[i]!) : lines[i]!.startsWith('- '))) {
        items.push(<li key={i}>{inline(lines[i++]!.replace(/^(?:- |\d+\. )/, ''))}</li>);
      }
      blocks.push(ordered ? <ol key={start}>{items}</ol> : <ul key={start}>{items}</ul>);
      continue;
    }
    const paragraph = [line];
    i++;
    while (i < lines.length && !isBlock(lines[i]!)) paragraph.push(lines[i++]!);
    blocks.push(<p key={start}>{inline(paragraph.join(' '))}</p>);
  }
  return <>
    {headings.length > 0 && <details className="developer-toc"><summary>本页目录</summary><nav aria-label="本页目录">{headings.map(item => <a key={item.id} href={`#${item.id}`}>{item.title}</a>)}</nav></details>}
    {blocks.map((block, index) => <Fragment key={index}>{block}</Fragment>)}
  </>;
}
