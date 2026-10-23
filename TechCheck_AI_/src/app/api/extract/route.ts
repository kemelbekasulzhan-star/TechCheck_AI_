import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import { documentSchema, modeSchema, LIMITS } from '@/lib/schema';
import { extract, aiConfigured } from '@/server/extraction-provider';
import { saveSession, deleteSession, budget } from '@/server/session-store';
import { AppError, boundedJson, checkOrigin, errorResponse } from '@/server/errors';
export const runtime = 'nodejs';
const inputSchema = z.object({ documents: z.array(documentSchema).min(2).max(3), mode: modeSchema, selectedModel: z.string().trim().min(1).max(100), consent: z.boolean(), accessToken: z.string().max(300).optional() }).strict();
export async function GET() { return Response.json({ configured: aiConfigured() }); }
export async function POST(request: Request) {
  let aiStarted = false;
  try {
    checkOrigin(request);
    const input = inputSchema.parse(await boundedJson(request));
    if (!input.documents.some(d => d.role === 'spec') || !input.documents.some(d => d.role === 'offer') || new Set(input.documents.map(d => d.role)).size !== input.documents.length || new Set(input.documents.map(d => d.id)).size !== input.documents.length) throw new AppError('DOCUMENTS_REQUIRED', 'Нужны уникальные документы: ТЗ и предложение, при необходимости паспорт.');
    if (input.documents.reduce((sum, d) => sum + d.pages, 0) > LIMITS.totalPages) throw new AppError('TOTAL_PAGE_LIMIT', 'В комплекте больше 20 страниц.', 413);
    if (input.documents.some(d => d.blocks.reduce((sum, b) => sum + b.text.length, 0) > LIMITS.text)) throw new AppError('TEXT_LIMIT', 'В одном документе больше 120 000 символов.', 413);
    for (const d of input.documents) {
      if (new Set(d.blocks.map(b => b.id)).size !== d.blocks.length || d.blocks.some(b => d.format === 'text' ? b.page !== null : b.page === null || b.page > d.pages)) throw new AppError('INVALID_BLOCKS', 'Некорректная структура страниц или блоков.');
    }
    if (input.mode === 'ai') {
      if (!aiConfigured()) throw new AppError('AI_NOT_CONFIGURED', 'Внешний ИИ не подключён. Выберите другой режим.', 503);
      if (!input.consent) throw new AppError('CONSENT_REQUIRED', 'Подтвердите отправку текста документов провайдеру.', 400);
      const actual = Buffer.from(input.accessToken ?? ''); const expected = Buffer.from(process.env.TECHCHECK_ACCESS_TOKEN!);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new AppError('ACCESS_DENIED', 'Неверный код закрытого доступа к ИИ.', 401);
      const max = Number(process.env.TECHCHECK_AI_MAX_CALLS || '5');
      if (!Number.isInteger(max) || max < 1 || budget.calls >= Math.min(max, 20) || budget.busy) throw new AppError('AI_BUDGET_LIMIT', 'Достигнут серверный лимит ИИ или запрос уже выполняется.', 429);
      budget.calls++; budget.busy = true; aiStarted = true;
    }
    const result = await extract(input.mode, input.documents, input.selectedModel);
    const sessionId = saveSession({ ...result, documents: input.documents, selectedModel: input.selectedModel, mode: input.mode });
    return Response.json({ sessionId, ...result });
  } catch (error) { return errorResponse(error); }
  finally { if (aiStarted) budget.busy = false; }
}
export async function DELETE(request: Request) {
  try { checkOrigin(request); const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(await boundedJson(request, 2000)); deleteSession(sessionId); return Response.json({ cleared: true }); }
  catch (error) { return errorResponse(error); }
}
