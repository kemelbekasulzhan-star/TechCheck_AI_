'use client';
import { useEffect, useRef } from 'react';
import { Check, X, Minus, TriangleAlert, ShieldCheck, LoaderCircle } from 'lucide-react';
import { statusLabels, type Status } from '@/lib/schema';
export function Brand() { return <span className="brand"><span className="brand-icon"><ShieldCheck size={25} /></span><span>TechCheck <b>AI</b></span></span>; }
export function StatusBadge({ status }: { status: Status }) {
  const Icon = status === 'MATCH' ? Check : status === 'MISMATCH' ? X : status === 'NOT_STATED' ? Minus : TriangleAlert;
  return <span className={`badge status-${status}`}><Icon size={15} aria-hidden />{statusLabels[status]}</span>;
}
export function Busy({ text }: { text: string }) { return <span className="busy" role="status"><LoaderCircle size={19} className="spin" />{text}</span>; }
export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    ref.current?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.stopImmediatePropagation(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const items = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', key, true);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', key, true); before?.focus(); };
  }, []);
  return <div className="drawer-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1} ref={ref}>
    <div className="drawer-head"><div><span className="eyebrow">ПРОВЕРЯЕМЫЙ ИСТОЧНИК</span><h2 id="drawer-title">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Закрыть панель"><X /></button></div>{children}
  </aside></div>;
}
