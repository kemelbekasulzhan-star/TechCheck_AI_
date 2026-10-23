import { z } from 'zod';
import { requirementSchema, type Report } from '@/lib/schema';
import { compare, countRows, conclusion, RULES_VERSION } from '@/lib/comparison-engine';
import { getSession } from '@/server/session-store';
import { AppError, boundedJson, checkOrigin, errorResponse } from '@/server/errors';
export const runtime = 'nodejs';
const inputSchema = z.object({ sessionId: z.string().uuid(), requirements: z.array(requirementSchema).min(1).max(8), title: z.string().trim().min(1).max(120), confirmed: z.literal(true), supplierReviewed: z.boolean() }).strict();
export async function POST(request: Request) {
  try {
    checkOrigin(request); const input = inputSchema.parse(await boundedJson(request, 350000));
    if (new Set(input.requirements.map(r => r.parameter)).size !== input.requirements.length) throw new AppError('DUPLICATE_REQUIREMENT', 'Каждый параметр можно добавить только один раз.');
    const session = getSession(input.sessionId);
    const requirements = input.requirements.map(r => {
      const original = session.extraction.requirements.find(o => o.parameter === r.parameter);
      const unchanged = original && ['value', 'upperValue', 'unit', 'operator', 'required'].every(k => original[k as keyof typeof original] === r[k as keyof typeof r]);
      return { ...r, origin: unchanged && r.origin === 'extracted' ? 'extracted' as const : 'user' as const, originalQuote: original?.originalQuote ?? '', evidence: original?.evidence ?? null };
    });
    const rows = compare(requirements, session.extraction.facts, session.documents, session.selectedModel, session.extraction.uncertain, input.supplierReviewed);
    const report: Report = { id: crypto.randomUUID(), title: input.title, selectedModel: session.selectedModel, createdAt: new Date().toISOString(), rulesVersion: RULES_VERSION, mode: session.mode, provider: session.provider, documents: session.documents, requirementsConfirmed: true, supplierReviewed: input.supplierReviewed, rows, counts: countRows(rows), conclusion: conclusion(rows) };
    return Response.json({ report });
  } catch (error) { return errorResponse(error); }
}
