import { z } from 'zod';

export const PARAMETERS = ['rated_power', 'phase_count', 'rated_frequency', 'mounting_code', 'ip_code', 'duty_code', 'rated_voltage', 'model_reference'] as const;
export const parameterSchema = z.enum(PARAMETERS);
export type Parameter = z.infer<typeof parameterSchema>;
export const parameterMeta: Record<Parameter, { label: string; unit: string; units: string[] }> = {
  rated_power: { label: 'Мощность', unit: 'кВт', units: ['кВт', 'Вт'] },
  phase_count: { label: 'Число фаз', unit: '', units: [''] },
  rated_frequency: { label: 'Частота', unit: 'Гц', units: ['Гц'] },
  mounting_code: { label: 'Монтажное исполнение', unit: '', units: [''] },
  ip_code: { label: 'Степень защиты', unit: '', units: [''] },
  duty_code: { label: 'Режим работы', unit: '', units: [''] },
  rated_voltage: { label: 'Напряжение', unit: 'В', units: ['В', 'кВ'] },
  model_reference: { label: 'Модель', unit: '', units: [''] },
};
export const roleSchema = z.enum(['spec', 'offer', 'passport']);
export type DocumentRole = z.infer<typeof roleSchema>;
export const roleLabels: Record<DocumentRole, string> = { spec: 'Техническое задание', offer: 'Предложение поставщика', passport: 'Паспорт' };
export const blockSchema = z.object({ id: z.string().min(1).max(100), page: z.number().int().min(1).max(10).nullable(), text: z.string().min(1).max(40000) }).strict();
export const documentSchema = z.object({
  id: z.string().min(1).max(100), role: roleSchema, name: z.string().min(1).max(200),
  size: z.number().int().min(0).max(5 * 1024 * 1024), format: z.enum(['pdf', 'text']),
  pages: z.number().int().min(0).max(10), blocks: z.array(blockSchema).min(1).max(2000),
  readState: z.enum(['complete', 'partial']),
}).strict();
export type SourceDocument = z.infer<typeof documentSchema>;
export const evidenceSchema = z.object({
  documentId: z.string(), blockId: z.string(), page: z.number().int().nullable(), quote: z.string().min(1),
}).strict();
export type Evidence = z.infer<typeof evidenceSchema>;
export const factSchema = z.object({
  parameter: parameterSchema, value: z.string().nullable(), unit: z.string().nullable(),
  model: z.string().nullable(), conditions: z.string().nullable(), evidence: evidenceSchema,
}).strict();
export type Fact = z.infer<typeof factSchema>;
export const operatorSchema = z.enum(['eq', 'gte', 'lte', 'range', 'manual']);
export type Operator = z.infer<typeof operatorSchema>;
export const operatorLabels: Record<Operator, string> = { eq: 'Точно', gte: 'Не меньше', lte: 'Не больше', range: 'Диапазон', manual: 'Ручная проверка' };
export const requirementSchema = z.object({
  id: z.string().min(1).max(100), parameter: parameterSchema, value: z.string().max(100),
  upperValue: z.string().max(100), unit: z.string().max(20), operator: operatorSchema,
  required: z.boolean(), origin: z.enum(['extracted', 'user']),
  originalQuote: z.string().max(40000), evidence: evidenceSchema.nullable(),
}).strict();
export type Requirement = z.infer<typeof requirementSchema>;
export const modeSchema = z.enum(['demo', 'template', 'ai']);
export type Mode = z.infer<typeof modeSchema>;
export const modeLabels: Record<Mode, string> = {
  demo: 'Учебные данные • ИИ не вызывался', template: 'Шаблонное извлечение • ИИ не вызывался', ai: 'ИИ-анализ',
};
export const STATUSES = ['MATCH', 'MISMATCH', 'NOT_STATED', 'NEEDS_REVIEW'] as const;
export type Status = typeof STATUSES[number];
export const statusLabels: Record<Status, string> = { MATCH: 'Совпадение', MISMATCH: 'Расхождение', NOT_STATED: 'Нет сведений', NEEDS_REVIEW: 'Уточнить' };
export type ComparisonRow = {
  requirement: Requirement; status: Status; reason: string; facts: Fact[]; evidence: Evidence[];
};
export type Extraction = { facts: Fact[]; requirements: Requirement[]; warnings: string[]; uncertain: Parameter[] };
export type ProviderMetadata = { called: boolean; model: string | null; responseId: string | null };
export type Report = {
  id: string; title: string; selectedModel: string; createdAt: string; rulesVersion: string;
  mode: Mode; provider: ProviderMetadata; rows: ComparisonRow[]; counts: Record<Status, number>;
  documents: SourceDocument[]; requirementsConfirmed: true; supplierReviewed: boolean; conclusion: string;
};
export const LIMITS = { bytes: 5 * 1024 * 1024, pages: 10, totalPages: 20, text: 120000, requestBytes: 1600000 };
export function textDocument(role: DocumentRole, text: string, name = roleLabels[role], id = crypto.randomUUID()): SourceDocument {
  return { id, role, name, size: new TextEncoder().encode(text).length, format: 'text', pages: 0, readState: 'complete',
    blocks: text.split(/\r?\n/).map(t => t.trim()).filter(Boolean).map((t, i) => ({ id: `${id}-b${i + 1}`, page: null, text: t })) };
}
