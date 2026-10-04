import { useEffect, useRef, useState } from 'react';

// Original vector expressions. Stable text shortcuts keep old clients readable.
export const classicExpressions = ['微笑', '大笑', '眨眼', '难过', '惊讶', '流泪', '害羞', '酷', '捂脸', '鼓掌', '点赞', '爱心'] as const;
const emoji = ['😀', '😂', '🥹', '😍', '🤔', '😎', '😭', '🥳', '👍', '👏', '❤️', '🎉', '🎲', '☕', '🔥', '🤝'];

export function ClassicExpression({ name }: { name: string }) {
  if (name === '爱心') return <svg className="chat-expression" viewBox="0 0 40 40" role="img" aria-label={name}>
    <title>[爱心]</title><path d="M20 35C-8 17 8-4 20 10 32-4 48 17 20 35" fill="#ed687b" stroke="#ad324b" strokeWidth="1.3" />
    <path d="M9 13q1-4 5-3" fill="none" stroke="#ffe4e9" strokeWidth="3" strokeLinecap="round" />
  </svg>;
  if (name === '点赞' || name === '鼓掌') return <svg className="chat-expression" viewBox="0 0 40 40" role="img" aria-label={name}>
    <title>{`[${name}]`}</title>
    <path d="M10 19h6l4-9q1-6 5-3l1 5-2 7h8q4 0 3 5l-3 10H16l-6-3z" fill="#ffcf54" stroke="#b66f12" strokeWidth="1.4" />
    <path d="M5 20h7v15H5z" fill="#5f9feb" />
    {name === '鼓掌' && <g fill="none" stroke="#b66f12" strokeWidth="2" strokeLinecap="round"><path d="M6 8l3 3M13 4l1 4M32 5l-3 4" /><path d="M13 22l5 2 3 9H12" /></g>}
  </svg>;
  const sad = name === '难过' || name === '流泪';
  return <svg className="chat-expression" viewBox="0 0 40 40" role="img" aria-label={name}>
    <title>{`[${name}]`}</title>
    <circle cx="20" cy="20" r="18" fill="#ffcf54" stroke="#b66f12" strokeWidth="1.2" />
    {name === '酷' ? <g fill="#253446"><path d="M7 12h12v8H9zm14 0h12l-2 8H21z" /><path d="M17 14h7v2h-7z" /></g> :
      <g stroke="#55350e" strokeWidth="2.4" strokeLinecap="round">
        <path d={name === '眨眼' || name === '大笑' ? 'M10 16q3-5 6 0' : 'M13 14v3'} />
        <path d={name === '大笑' ? 'M24 16q3-5 6 0' : 'M27 14v3'} />
      </g>}
    {name === '惊讶' ? <ellipse cx="20" cy="27" rx="4" ry="5" fill="#55350e" /> :
      name === '大笑' ? <path d="M10 23h20q-2 13-10 11-8 0-10-11" fill="#55350e" /> :
      <path d={sad ? 'M12 29q8-10 16 0' : 'M12 24q8 10 16 0'} fill="none" stroke="#55350e" strokeWidth="2" strokeLinecap="round" />}
    {name === '流泪' && <path d="M8 18q-8 10 0 10 7 0 0-10" fill="#65bbf4" />}
    {name === '害羞' && <g fill="#ed8773"><ellipse cx="8" cy="23" rx="5" ry="3" /><ellipse cx="32" cy="23" rx="5" ry="3" /></g>}
    {name === '捂脸' && <g fill="#ffe3a0" stroke="#b66f12" strokeWidth="1.2"><path d="M19 35l-6-12-6-8q-2-4 1-4l7 7-5-10q0-4 3-2l6 10-3-11q1-4 3-1l5 11V7q2-4 4 0v14l3-5q4-3 4 1l-6 18z" /></g>}
  </svg>;
}

export function ChatText({ text }: { text: string }) {
  return <>{text.split(/(\[[^[\]\n]{1,8}\])/g).map((part, index) => {
    const name = part.slice(1, -1);
    return classicExpressions.some(item => item === name) && part.startsWith('[') && part.endsWith(']')
      ? <ClassicExpression key={index} name={name} /> : part;
  })}</>;
}

export function ExpressionPicker({ disabled, insert }: { disabled: boolean; insert: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [classic, setClassic] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return <div className="expression-control" ref={root}>
    <button type="button" className="secondary" ref={trigger} disabled={disabled}
      aria-expanded={open && !disabled} aria-label="选择表情" onClick={() => setOpen(value => !value)}>☺ 表情</button>
    {open && !disabled && <div className="expression-panel" role="group" aria-label="表情选择">
      <div className="expression-tabs">
        <button type="button" className="secondary" aria-pressed={classic} onClick={() => setClassic(true)}>经典表情</button>
        <button type="button" className="secondary" aria-pressed={!classic} onClick={() => setClassic(false)}>Emoji</button>
      </div>
      <div className="expression-grid">{(classic ? classicExpressions : emoji).map(value =>
        <button key={value} type="button" className="secondary" aria-label={`插入${value}`} title={value}
          onClick={() => { insert(classic ? `[${value}]` : value); setOpen(false); }}>
          {classic ? <ClassicExpression name={value} /> : value}
        </button>)}</div>
    </div>}
  </div>;
}
