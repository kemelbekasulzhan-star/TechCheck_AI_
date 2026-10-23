import { type Requirement, type SourceDocument, type Fact, type Parameter, type ComparisonRow, type Status } from './schema';
import { normalize } from './normalizer';
import { validateEvidence } from './evidence-validator';
import { documentModels } from './template-extractor';

export const RULES_VERSION = '1.0.0';
export function compare(requirements: Requirement[], facts: Fact[], documents: SourceDocument[], selectedModel: string, uncertain: Parameter[] = [], supplierReviewed = false): ComparisonRow[] {
  const suppliers = documents.filter(d => d.role !== 'spec');
  return requirements.map(requirement => {
    const relevant = facts.filter(f => f.parameter === requirement.parameter && suppliers.some(d => d.id === f.evidence.documentId));
    const row = (status: Status, reason: string): ComparisonRow => ({ requirement, status, reason, facts: relevant, evidence: [...(requirement.evidence ? [requirement.evidence] : []), ...relevant.map(f => f.evidence)] });
    if (requirement.operator === 'manual') return row('NEEDS_REVIEW', 'Для требования выбрана ручная проверка.');
    if (!suppliers.length || suppliers.some(d => d.readState !== 'complete')) return row('NEEDS_REVIEW', 'Не все документы поставщика прочитаны полностью.');
    if (suppliers.some(d => { const m = documentModels(d); return m.length !== 1 || m[0] !== selectedModel; })) return row('NEEDS_REVIEW', 'Модель в документах не установлена однозначно или отличается от выбранной.');
    if (requirement.origin === 'extracted') {
      if (!requirement.evidence) return row('NEEDS_REVIEW', 'У извлечённого требования нет источника.');
      const invalid = validateEvidence({ parameter: requirement.parameter, value: requirement.value, unit: requirement.unit, model: null, conditions: null, evidence: requirement.evidence }, documents, selectedModel);
      if (invalid) return row('NEEDS_REVIEW', `Требование: ${invalid}`);
    }
    if (uncertain.includes(requirement.parameter)) return row('NEEDS_REVIEW', 'В документах есть запись параметра вне поддерживаемого шаблона. Отсутствие распознанного значения не означает отсутствие записи.');
    if (!relevant.length) return row(supplierReviewed ? 'NOT_STATED' : 'NEEDS_REVIEW', supplierReviewed ? 'Запись не найдена в прочитанных документах. Пользователь подтвердил проверку исходного текста.' : 'Значение не распознано. Проверьте исходный текст поставщика и подтвердите полноту просмотра.');
    const invalid = relevant.map(f => validateEvidence(f, documents, selectedModel)).find(Boolean);
    if (invalid) return row('NEEDS_REVIEW', invalid);
    const values = relevant.map(f => normalize(f.parameter, f.value, f.unit));
    if (new Set(values).size > 1) return row('NEEDS_REVIEW', 'Источники противоречат друг другу. Показаны все значения и обе цитаты; уточните у поставщика.');
    const wanted = normalize(requirement.parameter, requirement.value, requirement.unit);
    const actual = values[0];
    if (wanted === null || actual === null) return row('NEEDS_REVIEW', 'Значение или единица не поддерживается для однозначного сравнения.');
    if (requirement.parameter === 'ip_code' && wanted !== actual) return row('NEEDS_REVIEW', 'Различные IP-коды требуют инженерной оценки; арифметическое сравнение неприменимо.');
    let matches: boolean;
    if (requirement.operator === 'eq') matches = wanted === actual;
    else if (typeof wanted !== 'number' || typeof actual !== 'number') return row('NEEDS_REVIEW', 'Неравенства и диапазоны применяются только к числовым параметрам.');
    else if (requirement.operator === 'gte') matches = actual >= wanted;
    else if (requirement.operator === 'lte') matches = actual <= wanted;
    else {
      const upper = normalize(requirement.parameter, requirement.upperValue, requirement.unit);
      if (typeof upper !== 'number' || upper < wanted) return row('NEEDS_REVIEW', 'Границы диапазона не заданы или перепутаны.');
      matches = actual >= wanted && actual <= upper;
    }
    return row(matches ? 'MATCH' : 'MISMATCH', matches ? 'Значения соответствуют подтверждённому правилу после приведения единиц.' : requirement.parameter === 'mounting_code' ? 'Монтажные коды различаются. Взаимозаменяемость оборудования не оценивалась.' : 'Значение не соответствует подтверждённому правилу. Допуски не предполагались.');
  });
}
export function countRows(rows: ComparisonRow[]): Record<Status, number> {
  return rows.reduce((acc, row) => { acc[row.status]++; return acc; }, { MATCH: 0, MISMATCH: 0, NOT_STATED: 0, NEEDS_REVIEW: 0 });
}
export function conclusion(rows: ComparisonRow[]): string {
  const c = countRows(rows);
  return c.MISMATCH ? 'Обнаружены документальные расхождения' : c.NOT_STATED || c.NEEDS_REVIEW ? 'Есть сведения, требующие уточнения' : 'По проверенным требованиям расхождений не найдено. Инженерное согласование не выполнено';
}
