import { test, expect } from '@playwright/test';
import { demoDocuments } from '../../src/lib/fixtures';

test('server validates strict input, page totals, AI access and session lifecycle', async ({ request }) => {
  const documents = demoDocuments('A');
  const base = { documents, mode: 'demo', selectedModel: 'DEMO-MOTOR-A', consent: false };
  const ai = await request.post('/api/extract', { data: { ...base, mode: 'ai', consent: true } });
  const { configured } = await (await request.get('/api/extract')).json();
  expect(ai.status()).toBe(configured ? 401 : 503);
  expect((await ai.json()).code).toBe(configured ? 'ACCESS_DENIED' : 'AI_NOT_CONFIGURED');
  const unknown = await request.post('/api/extract', { data: { ...base, override: 'approve' } }); expect(unknown.status()).toBe(400);
  const badModel = await request.post('/api/extract', { data: { ...base, selectedModel: '' } }); expect(badModel.status()).toBe(400);
  const tooMany = demoDocuments('C').map(d => ({ ...d, format: 'pdf', pages: 8, blocks: d.blocks.map(b => ({ ...b, page: 1 })) }));
  const limit = await request.post('/api/extract', { data: { ...base, mode: 'template', documents: tooMany } }); expect(limit.status()).toBe(413); expect((await limit.json()).code).toBe('TOTAL_PAGE_LIMIT');
  const response = await request.post('/api/extract', { data: base }); expect(response.ok()).toBe(true);
  const extraction = await response.json();
  const compare = { sessionId: extraction.sessionId, requirements: extraction.extraction.requirements, title: 'Server test', confirmed: true, supplierReviewed: true };
  const unconfirmed = await request.post('/api/compare', { data: { ...compare, confirmed: false } }); expect(unconfirmed.status()).toBe(400);
  const result = await request.post('/api/compare', { data: compare }); expect(result.ok()).toBe(true); expect((await result.json()).report.counts.MATCH).toBe(3);
  // A client cannot rewrite the original quotation stored by the server.
  compare.requirements[0].originalQuote = 'Forged requirement'; compare.requirements[0].evidence.quote = 'Forged quotation';
  const corrected = await request.post('/api/compare', { data: compare }); expect((await corrected.json()).report.rows[0].requirement.originalQuote).not.toBe('Forged requirement');
  const cleared = await request.delete('/api/extract', { data: { sessionId: extraction.sessionId } }); expect(cleared.ok()).toBe(true);
  const expired = await request.post('/api/compare', { data: compare }); expect(expired.status()).toBe(410);
});
