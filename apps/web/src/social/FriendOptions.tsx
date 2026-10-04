import { useEffect, useRef, useState } from 'react';

export function FriendOptions({ name, busy, onRemove }: {
  name: string;
  busy: boolean;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return <div className="friend-options" ref={container} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} className="secondary friend-options-trigger" aria-label={name + ' 的好友操作'} aria-expanded={open} onClick={() => setOpen(value => !value)}>更多 <span aria-hidden="true">⋯</span></button>
    {open && <div className="friend-options-menu">
      <button className="secondary friend-remove" disabled={busy} onClick={() => {
        setOpen(false);
        trigger.current?.focus();
        onRemove();
      }}>删除好友</button>
    </div>}
  </div>;
}
