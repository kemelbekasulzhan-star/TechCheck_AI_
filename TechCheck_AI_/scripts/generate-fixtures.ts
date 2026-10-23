import fs from 'node:fs/promises';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { demoDocuments, type DemoId } from '../src/lib/fixtures';

async function main() {
  const root = path.resolve('public/examples'); await fs.mkdir(root, { recursive: true });
  for (const id of ['A', 'B', 'C'] as DemoId[]) for (const doc of demoDocuments(id)) await fs.writeFile(path.join(root, `${doc.role === 'spec' ? 'spec' : doc.role === 'offer' ? `offer-${id}` : `passport-${id}`}.txt`), doc.blocks.map(b => b.text).join('\n'), 'utf8');
  const testRoot = path.resolve('tests/fixtures'); await fs.mkdir(testRoot, { recursive: true });
  await fs.writeFile(path.join(testRoot, 'spec.txt'), demoDocuments('A')[0].blocks.map(b => b.text).join('\n'), 'utf8');
  const offer = 'Synthetic data. Test offer.\nModel: UPLOAD-MOTOR.\nThree-phase asynchronous motor.\nRated power: 15000 W.\nFrequency: 60 Hz.\nMounting: IM B5.\nDuty: S1.';
  async function pdf(name: string, options: PDFKit.PDFDocumentOptions = {}, pageCount = 1, blank = false) {
    const doc = new PDFDocument({ size: 'A4', margin: 45, ...options }); const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
    for (let i = 0; i < pageCount; i++) { if (i) doc.addPage(); if (blank) doc.rect(60, 60, 400, 400).fill('#dddddd'); else doc.font('Helvetica').fontSize(14).text(offer, { lineGap: 8 }); }
    doc.end(); await fs.writeFile(path.join(testRoot, name), await done);
  }
  await pdf('offer.pdf'); await pdf('scan.pdf', {}, 1, true); await pdf('password.pdf', { userPassword: 'test-password', ownerPassword: 'test-owner' }); await pdf('eleven-pages.pdf', {}, 11);
  await fs.writeFile(path.join(testRoot, 'broken.pdf'), '%PDF-1.7\nThis is not a valid PDF.');
  console.log('Generated 5 downloadable TXT examples and PDF/TXT fixtures (including encrypted, scanned, damaged and oversized-page PDFs).');
}
void main();
