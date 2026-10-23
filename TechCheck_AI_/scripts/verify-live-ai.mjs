// Explicit manual smoke test: one paid extraction, using synthetic documents only.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

if (process.env.TECHCHECK_LIVE_TEST !== '1') throw new Error('Set TECHCHECK_LIVE_TEST=1 to authorize one live extraction.');
process.loadEnvFile('.env.local');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.name));
  await page.goto('http://127.0.0.1:3000/');
  await page.getByRole('button', { name: 'Открыть учебный пример', exact: true }).click();
  await page.getByRole('combobox', { name: 'Способ обработки' }).selectOption('ai');
  await page.getByLabel('Код закрытого доступа').fill(process.env.TECHCHECK_ACCESS_TOKEN);
  await page.getByRole('checkbox', { name: /Разрешаю отправить/ }).check();
  const extractionPromise = page.waitForResponse(r => r.url().endsWith('/api/extract') && r.request().method() === 'POST', { timeout: 60000 });
  await page.getByRole('button', { name: 'Извлечь требования', exact: true }).click();
  const extractionResponse = await extractionPromise;
  const extraction = await extractionResponse.json();
  if (!extractionResponse.ok()) {
    console.log(JSON.stringify({ stage: 'extraction', status: extractionResponse.status(), code: extraction.code, message: extraction.error }));
    process.exitCode = 1;
  } else {
    assert.equal(extraction.provider.called, true);
    assert.ok(extraction.provider.responseId);
    await page.getByRole('heading', { name: 'Подтвердите требования' }).waitFor();
    await page.getByRole('checkbox', { name: /Я просмотрел текст/ }).check();
    await page.getByRole('checkbox', { name: /Я проверил найденные/ }).check();
    await page.getByRole('button', { name: 'Подтвердить и сравнить' }).click();
    await page.getByRole('heading', { name: 'Сравнение характеристик' }).waitFor();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Скачать JSON' }).click();
    const download = await downloadPromise;
    const report = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
    assert.equal(report.mode, 'ai');
    assert.equal(report.provider.called, true);
    assert.equal(report.rows.length, 6);
    assert.equal(report.counts.MISMATCH, 2);
    assert.deepEqual(errors, []);
    await fs.mkdir('test-results', { recursive: true });
    await fs.writeFile('test-results/live-ai-report.json', JSON.stringify(report, null, 2));
    await page.screenshot({ path: 'test-results/live-ai-report.png', fullPage: true });
    console.log(JSON.stringify({ stage: 'report-and-download', model: report.provider.model, counts: report.counts, browserErrors: errors.length, success: true }));
  }
} finally {
  await browser.close();
}
