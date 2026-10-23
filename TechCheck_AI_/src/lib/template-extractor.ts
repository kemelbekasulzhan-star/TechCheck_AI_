import { PARAMETERS, type Parameter, type SourceDocument, type Fact, type Extraction, type Requirement } from './schema';

// Deliberately narrow, anchored grammar. Arbitrary text never becomes a command.
export function parseLine(text: string): { parameter: Parameter; value: string; unit: string; conditions: string | null }[] {
  const t = text.trim().replace(/[.;]$/, '');
  const result: ReturnType<typeof parseLine> = [];
  const add = (parameter: Parameter, value: string, unit = '', conditions: string | null = null) => result.push({ parameter, value, unit, conditions });
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(?:Номинальная мощность|Мощность|Rated power|Power)\s*:\s*(?:ровно\s+|не меньше\s+|не более\s+|не больше\s+|от\s+)?(\d+(?:[.,]\d+)?)(?:\s*(?:–|-|до)\s*\d+(?:[.,]\d+)?)?\s*(кВт|Вт|kW|W)$/i))) add('rated_power', m[1], m[2]);
  if ((m = t.match(/^(?:Номинальная частота|Частота|Frequency)\s*:\s*(?:ровно\s+|не меньше\s+|не более\s+|не больше\s+|от\s+)?(\d+(?:[.,]\d+)?)(?:\s*(?:–|-|до)\s*\d+(?:[.,]\d+)?)?\s*(Гц|Hz)$/i))) add('rated_frequency', m[1], m[2]);
  if ((m = t.match(/^(?:Номинальное напряжение|Напряжение|Voltage)\s*:\s*(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?)\s*(кВ|В|kV|V)(.*)$/i))) add('rated_voltage', m[1], m[2], m[3].trim() || null);
  if ((m = t.match(/^(?:Число фаз|Фазы|Phases)\s*:\s*(\d+)$/i))) add('phase_count', m[1]);
  if (/^(?:Требуется один )?тр[её]хфазный асинхронный электродвигатель$/i.test(t) || /^Three.phase asynchronous motor$/i.test(t)) add('phase_count', '3');
  if ((m = t.match(/^(?:Монтажное исполнение|Монтаж|Mounting)\s*:\s*(IM\s*(?:B|V)?\d{1,4})$/i))) add('mounting_code', m[1]);
  if ((m = t.match(/^(?:Степень защиты|Защита|Protection|IP code)\s*:\s*(IP\s*\d{2})$/i))) add('ip_code', m[1]);
  if ((m = t.match(/^(?:Режим работы|Режим|Duty)\s*:\s*(S[1-9])$/i))) add('duty_code', m[1]);
  if ((m = t.match(/^(?:Модель|Model)\s*:\s*([\wА-Яа-яЁё][\wА-Яа-яЁё.\-/ ]{0,99}?)$/i))) add('model_reference', m[1].trim());
  return result;
}
const mentions: Record<Parameter, RegExp> = {
  rated_power: /мощност|power/i, rated_voltage: /напряжен|voltage/i, rated_frequency: /частот|frequency/i,
  phase_count: /фаз|phase/i, mounting_code: /монтаж|mounting|\bIM\s*[BV]/i,
  ip_code: /защит|protection|\bIP\d/i, duty_code: /режим|duty/i, model_reference: /модель|model/i,
};
export function documentModels(document: SourceDocument): string[] {
  return [...new Set(document.blocks.flatMap(b => b.text.split(/\r?\n/).flatMap(t => parseLine(t).filter(p => p.parameter === 'model_reference').map(p => p.value))))];
}
export function extractTemplates(documents: SourceDocument[]): Extraction {
  const facts: Fact[] = [], requirements: Requirement[] = [], warnings: string[] = [];
  const uncertain = new Set<Parameter>();
  for (const doc of documents) {
    const models = documentModels(doc);
    if (doc.role !== 'spec' && models.length !== 1) warnings.push(`${doc.name}: ${models.length ? 'несколько моделей — требуется ручная привязка' : 'точная модель не распознана'}.`);
    for (const block of doc.blocks) for (const line of block.text.split(/\r?\n/).map(t => t.trim()).filter(Boolean)) {
      const parsed = parseLine(line);
      if (doc.role !== 'spec') for (const p of PARAMETERS) if (mentions[p].test(line) && !parsed.some(f => f.parameter === p)) uncertain.add(p);
      for (const item of parsed) {
        const fact: Fact = { ...item, model: models.length === 1 ? models[0] : null, evidence: { documentId: doc.id, blockId: block.id, page: block.page, quote: line } };
        facts.push(fact);
        if (doc.role === 'spec') {
          const duplicate = requirements.find(r => r.parameter === item.parameter);
          if (duplicate) { duplicate.operator = 'manual'; warnings.push(`В ТЗ несколько записей параметра «${item.parameter}». Сверьте их вручную.`); continue; }
          const range = line.match(/(\d+(?:[.,]\d+)?)\s*(?:–|-|до)\s*(\d+(?:[.,]\d+)?)/);
          requirements.push({ id: `req-${item.parameter}`, parameter: item.parameter, value: item.value, upperValue: range?.[2] ?? '', unit: item.unit,
            operator: range ? 'range' : /не меньше/i.test(line) ? 'gte' : /не (?:более|больше)/i.test(line) ? 'lte' : 'eq',
            required: true, origin: 'extracted', originalQuote: line, evidence: fact.evidence });
        }
      }
      if (doc.role === 'spec' && !parsed.length && Object.values(mentions).some(re => re.test(line))) warnings.push(`Не распознана строка ТЗ: «${line}». При необходимости добавьте требование вручную.`);
    }
  }
  return { facts, requirements, warnings: [...new Set(warnings)], uncertain: [...uncertain] };
}
