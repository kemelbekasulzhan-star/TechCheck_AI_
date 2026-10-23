import 'server-only';
import { PDFParse } from 'pdf-parse';
import { LIMITS, type DocumentRole, type SourceDocument, textDocument } from '@/lib/schema';
import { AppError } from './errors';

export async function readFile(file: File, role: DocumentRole): Promise<SourceDocument> {
  if (!file.size) throw new AppError('EMPTY_FILE', 'Файл пуст. Выберите документ с текстом.');
  if (file.size > LIMITS.bytes) throw new AppError('FILE_LIMIT', 'Файл больше 5 МБ. Разделите документ перед загрузкой.', 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (/\.txt$/i.test(file.name)) {
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new AppError('ENCODING', 'TXT должен быть сохранён в UTF-8.'); }
    if (text.includes('\0')) throw new AppError('INVALID_TEXT', 'Файл не похож на текст UTF-8.');
    if (!text.trim()) throw new AppError('EMPTY_FILE', 'В текстовом файле нет содержимого.');
    if (text.length > LIMITS.text) throw new AppError('TEXT_LIMIT', 'В файле больше 120 000 символов. Сократите документ; текст не был обрезан.', 413);
    return { ...textDocument(role, text, file.name), size: file.size };
  }
  if (!/\.pdf$/i.test(file.name)) throw new AppError('UNSUPPORTED_FORMAT', 'Поддерживаются PDF с текстовым слоем и TXT в UTF-8. DOCX, XLSX и фото пока не поддерживаются.');
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new AppError('DAMAGED_PDF', 'Файл повреждён или не является PDF.');
  const parser = new PDFParse({ data: bytes });
  try {
    const info = await parser.getInfo();
    if (info.total > LIMITS.pages) throw new AppError('PAGE_LIMIT', 'В PDF больше 10 страниц. Разделите документ перед загрузкой.', 413);
    const result = await parser.getText();
    if (!result.pages.length || result.pages.every(p => p.text.replace(/\s/g, '').length < 10)) throw new AppError('SCAN_NO_TEXT', 'В PDF нет читаемого текстового слоя. OCR не подключён: вставьте текст или выберите текстовый PDF.');
    if (result.pages.some(p => p.text.replace(/\s/g, '').length < 10)) throw new AppError('PARTIAL_PDF', 'Не на всех страницах PDF найден текст. Проверьте сканы и пустые страницы; неполный документ не сравнивается.');
    if (result.text.length > LIMITS.text) throw new AppError('TEXT_LIMIT', 'В PDF больше 120 000 символов. Текст не был обрезан.', 413);
    const id = crypto.randomUUID();
    return { id, role, name: file.name, size: file.size, format: 'pdf', pages: info.total, readState: 'complete',
      blocks: result.pages.map(p => ({ id: `${id}-p${p.num}`, page: p.num, text: p.text.trim() })) };
  } catch (error) {
    if (error instanceof AppError) throw error;
    const name = error instanceof Error ? error.name : '';
    if (name.includes('Password')) throw new AppError('PASSWORD_PDF', 'PDF защищён паролем. Загрузите доступную копию без пароля.');
    throw new AppError('DAMAGED_PDF', 'PDF не удалось прочитать. Возможно, файл повреждён. Откройте его в просмотрщике и сохраните заново.');
  } finally { await parser.destroy(); }
}
