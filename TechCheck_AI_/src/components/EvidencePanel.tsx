'use client';
import { FileText, Quote, Info } from 'lucide-react';
import { type Evidence, type SourceDocument, type ComparisonRow, parameterMeta, roleLabels } from '@/lib/schema';
import { formatValue } from '@/lib/normalizer';
import { Drawer, StatusBadge } from './ui';

function Highlight({ text, quote }: { text: string; quote: string }) {
  const index = text.indexOf(quote);
  return index < 0 ? <>{text}</> : <>{text.slice(0, index)}<mark>{quote}</mark>{text.slice(index + quote.length)}</>;
}
export function EvidencePanel({ documents, row, evidence, document: selectedDocument, onClose }: { documents: SourceDocument[]; row?: ComparisonRow; evidence?: Evidence; document?: SourceDocument; onClose: () => void }) {
  const items = row?.evidence ?? (evidence ? [evidence] : []);
  return <Drawer title={row ? parameterMeta[row.requirement.parameter].label : selectedDocument ? 'Текст документа' : 'Источник требования'} onClose={onClose}>
    {row && <div className="evidence-summary"><StatusBadge status={row.status} /><p>{row.reason}</p><div className="value-pair"><span>Требование<strong>{formatValue(row.requirement.value, row.requirement.unit)}</strong></span><span>Предложение<strong>{row.facts.map(f => formatValue(f.value, f.unit)).join(' / ') || 'Не найдено'}</strong></span></div>{row.requirement.origin === 'user' && <p className="notice small">Пользовательское правило. Исходная цитата ниже не является подтверждением изменённого значения.</p>}</div>}
    <p className="text-view-label"><Info size={16} />Извлечённый текст, не изображение PDF</p>
    {selectedDocument ? <div className="document-preview"><h3><FileText size={19} />{selectedDocument.name}</h3>{selectedDocument.blocks.map((block, i) => <section className="source-block" key={block.id}><span className="source-location">{block.page ? `Физическая страница ${block.page}` : `Текстовый блок ${i + 1}`}</span><pre>{block.text}</pre></section>)}</div> : items.map((item, index) => {
      const doc = documents.find(d => d.id === item.documentId), block = doc?.blocks.find(b => b.id === item.blockId);
      return <section className="evidence-card" key={`${item.blockId}-${index}`}><span className="eyebrow">{doc ? roleLabels[doc.role] : 'Неизвестный документ'}</span><h3><FileText size={18} />{doc?.name ?? item.documentId}</h3><span className="source-location">{item.page ? `Физическая страница ${item.page}` : `Текстовый блок ${doc ? doc.blocks.findIndex(b => b.id === item.blockId) + 1 : '—'}`}</span><blockquote><Quote size={17} />{item.quote}</blockquote><details open><summary>Окружающий контекст</summary><pre>{block ? <Highlight text={doc?.format === 'text' ? doc.blocks.slice(Math.max(0, doc.blocks.indexOf(block) - 1), doc.blocks.indexOf(block) + 2).map(b => b.text).join('\n') : block.text} quote={item.quote} /> : 'Блок не найден — источник не подтверждён.'}</pre></details></section>;
    })}
    {row && !row.facts.length && <p className="notice small">В прочитанном тексте поставщика подтверждающая запись не найдена. Цитата ТЗ показана отдельно.</p>}
  </Drawer>;
}
