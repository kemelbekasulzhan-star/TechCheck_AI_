'use client';
import { Plus, FileText, Trash2, ArrowRight, Info } from 'lucide-react';
import { useState } from 'react';
import { PARAMETERS, parameterMeta, operatorLabels, type Requirement, type Parameter, type Operator, type SourceDocument, type Evidence } from '@/lib/schema';
import { Busy } from './ui';

export function RequirementsEditor({ requirements, documents, warnings, supplierReviewed, confirmed, busy, onChange, onSupplierReviewed, onConfirmed, onCompare, onBack, onEvidence }: {
  requirements: Requirement[]; documents: SourceDocument[]; warnings: string[]; supplierReviewed: boolean; confirmed: boolean; busy: string;
  onChange: (next: Requirement[]) => void; onSupplierReviewed: (value: boolean) => void; onConfirmed: (value: boolean) => void;
  onCompare: () => void; onBack: () => void; onEvidence: (evidence: Evidence) => void;
}) {
  const [add, setAdd] = useState<Parameter | ''>('');
  function update(index: number, patch: Partial<Requirement>) { onChange(requirements.map((r, i) => i === index ? { ...r, ...patch, origin: 'user' } : r)); }
  function addRow() { if (!add) return; onChange([...requirements, { id: crypto.randomUUID(), parameter: add, value: '', upperValue: '', unit: parameterMeta[add].unit, operator: 'eq', required: true, origin: 'user', originalQuote: '', evidence: null }]); setAdd(''); }
  return <>
    <div className="section-heading"><div><span className="eyebrow">ШАГ 02 / ПРОВЕРКА ТРЕБОВАНИЙ</span><h1>Подтвердите требования</h1><p>Сверьте найденные значения с ТЗ. Добавьте пропущенные параметры.</p></div><span className="small-tag">{requirements.length} требований</span></div>
    <div className="notice"><Info size={21} /><div>Автоматическое извлечение — только первый шаг. Операторы сравнения и полноту требований подтверждаете вы. Изменённое значение сохраняется как пользовательское правило.</div></div>
    {warnings.length > 0 && <details className="warning-box"><summary>Замечания к извлечению ({warnings.length})</summary><ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>}
    <div className="panel table-scroll"><table className="requirements-table"><thead><tr><th>Параметр / исходная запись</th><th>Значение</th><th>Единица</th><th>Оператор</th><th>Обязат.</th><th>Источник</th><th><span className="sr-only">Удалить</span></th></tr></thead><tbody>
      {requirements.map((r, i) => <tr key={r.id}><td><strong>{parameterMeta[r.parameter].label}</strong><span className={`origin ${r.origin}`}>{r.origin === 'user' ? 'Пользовательское правило' : 'Извлечено из ТЗ'}</span><span className="original-quote">{r.originalQuote || 'Добавлено вручную — записи в ТЗ нет'}</span></td>
        <td><input aria-label={`${parameterMeta[r.parameter].label}: значение`} value={r.value} disabled={!!busy} onChange={e => update(i, { value: e.target.value })} />{r.operator === 'range' && <input aria-label={`${parameterMeta[r.parameter].label}: верхняя граница`} placeholder="Верхняя граница" value={r.upperValue} disabled={!!busy} onChange={e => update(i, { upperValue: e.target.value })} />}</td>
        <td><select aria-label={`${parameterMeta[r.parameter].label}: единица`} value={r.unit} disabled={!!busy} onChange={e => update(i, { unit: e.target.value })}>{[...new Set([...parameterMeta[r.parameter].units, r.unit])].map(u => <option key={u} value={u}>{u || '—'}</option>)}</select></td>
        <td><select aria-label={`${parameterMeta[r.parameter].label}: оператор`} value={r.operator} disabled={!!busy} onChange={e => update(i, { operator: e.target.value as Operator })}>{Object.entries(operatorLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></td>
        <td><input type="checkbox" aria-label={`${parameterMeta[r.parameter].label}: обязательно`} checked={r.required} disabled={!!busy} onChange={e => update(i, { required: e.target.checked })} /></td>
        <td>{r.evidence ? <button className="text-button" onClick={() => onEvidence(r.evidence!)}><FileText size={16} />ТЗ</button> : <span className="muted">Вручную</span>}</td><td><button className="icon-button danger" aria-label={`Удалить требование: ${parameterMeta[r.parameter].label}`} disabled={!!busy} onClick={() => onChange(requirements.filter((_, n) => n !== i))}><Trash2 size={16} /></button></td></tr>)}
    </tbody></table>{!requirements.length && <div className="empty-state compact"><h3>Требования не распознаны</h3><p>Добавьте поддерживаемые параметры вручную после чтения ТЗ.</p></div>}
    <div className="add-requirement"><select aria-label="Добавить параметр" value={add} onChange={e => setAdd(e.target.value as Parameter)} disabled={!!busy}><option value="">Добавить параметр…</option>{PARAMETERS.filter(p => !requirements.some(r => r.parameter === p)).map(p => <option key={p} value={p}>{parameterMeta[p].label}</option>)}</select><button className="button secondary" onClick={addRow} disabled={!add || !!busy}><Plus size={17} />Добавить</button></div></div>
    <div className="panel confirmation-panel"><h3>Проверьте перед сравнением</h3><label className="check-label"><input type="checkbox" checked={confirmed} disabled={!!busy} onChange={e => onConfirmed(e.target.checked)} /><span>Я проверил найденные и пропущенные требования, значения и операторы сравнения.</span></label><label className="check-label"><input type="checkbox" checked={supplierReviewed} disabled={!!busy} onChange={e => onSupplierReviewed(e.target.checked)} /><span>Я просмотрел текст {documents.some(d => d.role === 'passport') ? 'предложения и паспорта' : 'предложения'}. Нераспознанные записи не скрывают дополнительные значения.<small>Без этого подтверждения пропуски направляются на ручную проверку.</small></span></label></div>
    <div className="bottom-actions"><button className="button secondary" disabled={!!busy} onClick={onBack}>К документам</button>{busy ? <Busy text={busy} /> : <button className="button primary" onClick={onCompare} disabled={!confirmed || !requirements.length || requirements.some(r => !r.value.trim())}>Подтвердить и сравнить<ArrowRight size={18} /></button>}</div>
  </>;
}
