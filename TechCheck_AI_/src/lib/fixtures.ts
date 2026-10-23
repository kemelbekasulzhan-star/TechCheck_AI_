import { textDocument, type SourceDocument } from './schema';

export const specText = `Синтетические данные. Учебное техническое задание.
Требуется один трёхфазный асинхронный электродвигатель.
Номинальная мощность: ровно 15 кВт.
Частота: 50 Гц.
Монтажное исполнение: IM B3.
Степень защиты: IP55.
Режим работы: S1.`;
export type DemoId = 'A' | 'B' | 'C';
export const demos = [
  { id: 'A' as const, letter: 'А', title: 'Найти расхождения', description: 'Разная частота и монтаж. В предложении не указана защита.', hint: '3 совпадения · 2 расхождения · 1 пропуск' },
  { id: 'B' as const, letter: 'Б', title: 'Сверить совпадения', description: 'Все шесть требований подтверждаются предложением.', hint: '6 совпадений' },
  { id: 'C' as const, letter: 'В', title: 'Разобрать противоречие', description: 'Предложение и паспорт указывают разную частоту.', hint: '5 совпадений · 1 уточнение' },
];
export function demoDocuments(id: DemoId): SourceDocument[] {
  const model = `DEMO-MOTOR-${id}`;
  const offer = `Синтетические данные. Учебное предложение ${id === 'A' ? 'А' : id === 'B' ? 'Б' : 'В'}.
Модель: ${model}.
Трёхфазный асинхронный электродвигатель.
Номинальная мощность: ${id === 'A' ? '15000 Вт' : '15 кВт'}.
Частота: ${id === 'A' ? '60' : '50'} Гц.
Монтажное исполнение: IM ${id === 'A' ? 'B5' : 'B3'}.
${id === 'A' ? '' : 'Степень защиты: IP55.\n'}Режим работы: S1.`;
  const docs = [textDocument('spec', specText, 'Синтетические данные — ТЗ.txt', 'demo-spec'), textDocument('offer', offer, `Синтетические данные — предложение ${id}.txt`, 'demo-offer')];
  if (id === 'C') docs.push(textDocument('passport', offer.replace('Учебное предложение В.', 'Учебный паспорт В.').replace('50 Гц', '60 Гц'), 'Синтетические данные — паспорт C.txt', 'demo-passport'));
  return docs;
}
export function isDemoSet(documents: SourceDocument[]): boolean {
  return (['A', 'B', 'C'] as DemoId[]).some(id => {
    const canonical = demoDocuments(id);
    return canonical.length === documents.length && canonical.every(d => {
      const candidate = documents.find(c => c.role === d.role);
      return candidate?.format === 'text' && candidate.readState === 'complete' && candidate.blocks.map(b => b.text).join('\n') === d.blocks.map(b => b.text).join('\n');
    });
  });
}
