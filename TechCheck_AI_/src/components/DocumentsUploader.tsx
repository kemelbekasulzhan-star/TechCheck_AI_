'use client';
import { useEffect, useRef, useState } from 'react';
import { FileText, Upload, Eye, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { LIMITS, roleLabels, textDocument, type SourceDocument, type DocumentRole } from '@/lib/schema';
import { Busy } from './ui';

type Props = { role: DocumentRole; document?: SourceDocument; disabled: boolean; onChange: (doc?: SourceDocument) => void; onView: (doc: SourceDocument) => void; onBusy: (busy: boolean) => void; onDirty: () => void };
export function DocumentCard({ role, document: doc, disabled, onChange, onView, onBusy, onDirty }: Props) {
  const [error, setError] = useState(''), [reading, setReading] = useState(false), [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState(false), [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null), controller = useRef<AbortController | null>(null), sequence = useRef(0), pending = useRef(false);
  const busyCallback = useRef(onBusy); busyCallback.current = onBusy;
  useEffect(() => () => { sequence.current++; controller.current?.abort(); if (pending.current) { pending.current = false; busyCallback.current(false); } }, []);
  async function upload(file?: File) {
    if (!file || disabled || reading) return;
    setError(''); onDirty();
    if (file.size > LIMITS.bytes) { setError('Файл больше 5 МБ. Выберите меньший документ.'); return; }
    if (!/\.(pdf|txt)$/i.test(file.name)) { setError('Поддерживаются только PDF с текстовым слоем и TXT в UTF-8.'); return; }
    const seq = ++sequence.current; controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setReading(true); pending.current = true; onBusy(true);
    try {
      const form = new FormData(); form.set('role', role); form.set('file', file);
      const response = await fetch('/api/documents', { method: 'POST', body: form, signal: abort.signal });
      const result = await response.json();
      if (seq !== sequence.current) return;
      if (!response.ok) throw new Error(result.error);
      onChange(result.document); setPaste(false); setDraft('');
    } catch (e) { if (seq === sequence.current && !abort.signal.aborted) setError(e instanceof Error ? e.message : 'Файл не удалось прочитать.'); }
    finally { if (seq === sequence.current) { setReading(false); pending.current = false; onBusy(false); } }
  }
  function saveText() {
    if (!draft.trim()) { setError('Вставьте текст документа.'); return; }
    if (draft.length > LIMITS.text) { setError('Лимит — 120 000 символов. Текст не был обрезан.'); return; }
    onChange(textDocument(role, draft, `${roleLabels[role]} — вставленный текст`)); setPaste(false); setError(''); setDraft('');
  }
  return <article className={`document-card ${doc ? 'has-document' : ''}`}>
    <div className="card-top"><span className="document-icon"><FileText size={24} /></span><span className={`small-tag ${role === 'passport' ? '' : 'required-tag'}`}>{role === 'passport' ? 'Дополнительно' : 'Обязательно'}</span></div>
    <h3>{roleLabels[role]}</h3><p className="card-description">{role === 'spec' ? 'Что требуется вашему проекту' : role === 'offer' ? 'Что предлагает поставщик' : 'Подтверждающие характеристики'}</p>
    <input ref={inputRef} className="sr-only" type="file" accept=".pdf,.txt" aria-label={`Загрузить: ${roleLabels[role]}`} disabled={disabled || reading} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
    <button className={`drop-zone ${drag ? 'dragging' : ''}`} disabled={disabled || reading} onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); void upload(e.dataTransfer.files[0]); }}>
      {reading ? <Busy text="Читаем документ…" /> : doc ? <><CheckCircle2 className="teal" size={25} /><strong className="file-name">{doc.name}</strong><span>{(doc.size / 1024).toFixed(1)} КБ · {doc.format === 'pdf' ? `${doc.pages} стр.` : `${doc.blocks.length} блоков`} · Прочитан</span><small>Нажмите или перетащите файл для замены</small></> : <><Upload size={27} /><strong>Выберите файл</strong><span>или перетащите его сюда</span><small>PDF / TXT · до 5 МБ</small></>}
    </button>
    <div className="document-actions">{doc && <button className="text-button" disabled={reading || disabled} onClick={() => onView(doc)}><Eye size={16} />Просмотр текста</button>}<button className="text-button" disabled={reading || disabled} onClick={() => { setPaste(!paste); setDraft(doc?.format === 'text' ? doc.blocks.map(b => b.text).join('\n') : ''); }}>{paste ? 'Закрыть ввод' : 'Вставить текст'}</button>{doc && <button className="icon-button danger" disabled={reading || disabled} aria-label={`Удалить: ${roleLabels[role]}`} onClick={() => { onChange(undefined); setDraft(''); setPaste(false); setError(''); }}><Trash2 size={17} /></button>}</div>
    {paste && <div className="paste-area"><label htmlFor={`paste-${role}`}>Текст документа</label><textarea id={`paste-${role}`} value={draft} onChange={e => { setDraft(e.target.value); onDirty(); }} rows={8} placeholder="Вставьте текст с характеристиками…" /><button className="button secondary full" disabled={disabled || reading} onClick={saveText}>Прочитать текст</button><small>Изменения применяются кнопкой «Прочитать текст».</small></div>}
    {error && <p className="inline-error" role="alert"><AlertCircle size={17} />{error}</p>}
  </article>;
}
