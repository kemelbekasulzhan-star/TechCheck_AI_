import 'server-only';
export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) return Response.json({ code: error.code, error: error.message }, { status: error.status });
  return Response.json({ code: 'INVALID_REQUEST', error: 'Данные не прошли проверку. Проверьте документы и повторите действие.' }, { status: 400 });
}
export async function boundedJson(request: Request, limit = 1600000): Promise<unknown> {
  if (!request.body) throw new AppError('EMPTY_REQUEST', 'Запрос пуст.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new AppError('TOO_LARGE', 'Превышен лимит текста запроса.', 413); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const source = new URL(origin), target = new URL(request.url);
  // Next may normalize request.url to localhost while the browser uses 127.0.0.1.
  // Host is supplied by the actual HTTP request; never trust X-Forwarded-Host here.
  if (source.host !== (request.headers.get('host') ?? target.host) || source.protocol !== target.protocol) throw new AppError('ORIGIN', 'Запрос с другого сайта запрещён.', 403);
}
