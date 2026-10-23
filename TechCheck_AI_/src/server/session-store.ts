import 'server-only';
import { type SourceDocument, type Extraction, type ProviderMetadata, type Mode } from '@/lib/schema';
import { AppError } from './errors';

export type AnalysisSession = { documents: SourceDocument[]; extraction: Extraction; selectedModel: string; mode: Mode; provider: ProviderMetadata; expiresAt: number };
const globalStore = globalThis as typeof globalThis & { techcheckSessions?: Map<string, AnalysisSession>; techcheckBudget?: { calls: number; busy: boolean } };
const sessions: Map<string, AnalysisSession> = globalStore.techcheckSessions ??= new Map<string, AnalysisSession>();
export const budget = globalStore.techcheckBudget ??= { calls: 0, busy: false };
const ttl = 30 * 60 * 1000;
function cleanup() { const now = Date.now(); for (const [id, s] of sessions) if (s.expiresAt <= now) sessions.delete(id); }
const timer = setInterval(cleanup, 60000); timer.unref();
export function saveSession(session: Omit<AnalysisSession, 'expiresAt'>) {
  cleanup();
  if (sessions.size >= 30) throw new AppError('SESSION_LIMIT', 'Сервер занят. Очистите старую проверку или повторите позже.', 429);
  const id = crypto.randomUUID(); sessions.set(id, { ...session, expiresAt: Date.now() + ttl }); return id;
}
export function getSession(id: string): AnalysisSession {
  cleanup(); const session = sessions.get(id);
  if (!session) throw new AppError('SESSION_EXPIRED', 'Сессия истекла или сервер перезапущен. Вернитесь к документам и повторите извлечение.', 410);
  return session;
}
export function deleteSession(id: string) { sessions.delete(id); }
