import { readFile } from '@/server/pdf-reader';
import { errorResponse, AppError, checkOrigin } from '@/server/errors';
import { roleSchema, LIMITS } from '@/lib/schema';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    // Browser FormData always supplies Content-Length on this local Node server.
    const length = Number(request.headers.get('content-length'));
    if (!length || length > LIMITS.bytes + 16384) throw new AppError('FILE_LIMIT', 'Запрос должен содержать файл не больше 5 МБ.', 413);
    const form = await request.formData();
    const role = roleSchema.parse(form.get('role')); const file = form.get('file');
    if (!(file instanceof File)) throw new AppError('EMPTY_FILE', 'Выберите файл.');
    return Response.json({ document: await readFile(file, role) });
  } catch (error) { return errorResponse(error); }
}
