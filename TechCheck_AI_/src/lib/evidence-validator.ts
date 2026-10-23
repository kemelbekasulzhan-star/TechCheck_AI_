import type { Fact, SourceDocument } from './schema';
import { documentModels, parseLine } from './template-extractor';
import { normalize } from './normalizer';

export function validateEvidence(fact: Fact, documents: SourceDocument[], selectedModel: string): string | null {
  const doc = documents.find(d => d.id === fact.evidence.documentId);
  const block = doc?.blocks.find(b => b.id === fact.evidence.blockId);
  if (!doc || !block || block.page !== fact.evidence.page) return 'Источник, блок или страница не подтверждены.';
  if (!block.text.includes(fact.evidence.quote)) return 'Дословная цитата не найдена в указанном блоке.';
  if (doc.readState !== 'complete') return 'Документ прочитан не полностью.';
  const models = documentModels(doc);
  if (doc.role !== 'spec' && (models.length !== 1 || models[0] !== selectedModel || fact.model !== selectedModel)) return 'Не подтверждена однозначная привязка к выбранной модели.';
  const expected = normalize(fact.parameter, fact.value, fact.unit);
  const supported = fact.evidence.quote.split(/\r?\n/).flatMap(parseLine).some(p => p.parameter === fact.parameter && normalize(p.parameter, p.value, p.unit) === expected && expected !== null && p.conditions === fact.conditions);
  if (!supported) return 'Цитата не подтверждает значение, единицу или интерпретацию; нужна ручная проверка.';
  if (fact.conditions || (fact.parameter === 'rated_voltage' && /[/ΔδYУ]|звезд|треуголь/i.test(fact.evidence.quote))) return 'Условия подключения или применимости требуют ручной проверки.';
  return null;
}
