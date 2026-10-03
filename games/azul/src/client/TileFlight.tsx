import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { symbols, type Color } from '../shared/index.js';
import { scoreTiming } from './scoring.js';

export function TileFlight({ row, col, color }: { row: number; col: number; color: Color }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [geometry, setGeometry] = useState<CSSProperties>();
  useLayoutEffect(() => {
    const board = ref.current?.parentElement;
    const source = board?.querySelectorAll('.az-pattern')[row]?.querySelector('.az-slot:last-child');
    const target = board?.querySelectorAll('.az-wall-cell')[row * 5 + col];
    if (!board || !source || !target) return;
    const measure = () => {
      const bounds = board.getBoundingClientRect(), from = source.getBoundingClientRect(), to = target.getBoundingClientRect();
      setGeometry({
        left: from.left - bounds.left - board.clientLeft,
        top: from.top - bounds.top - board.clientTop,
        width: from.width, height: from.height,
        '--flight-x': `${to.left - from.left + (to.width - from.width) / 2}px`,
        '--flight-y': `${to.top - from.top + (to.height - from.height) / 2}px`,
        '--flight-time': `${scoreTiming.landing}ms`,
      } as CSSProperties);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    return () => observer.disconnect();
  }, [row, col]);
  return <span ref={ref} className={`az-tile az-${color} az-flying-tile`} aria-hidden="true"
    style={geometry ?? { visibility: 'hidden' }}><span>{symbols[color]}</span></span>;
}
