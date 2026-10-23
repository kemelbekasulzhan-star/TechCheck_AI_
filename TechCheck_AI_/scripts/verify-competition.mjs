import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const base = process.argv[2] || 'http://127.0.0.1:3001';
const root = process.cwd();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const external = [], errors = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol === 'file:' || url.hostname === '127.0.0.1') return route.continue();
    external.push(url.hostname); return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.name));
  assert.equal((await (await context.request.get(base + '/api/extract')).json()).configured, false);
  await page.goto(base);
  await page.getByRole('button', { name: 'Открыть учебный пример', exact: true }).click();
  await page.getByRole('button', { name: 'Извлечь требования', exact: true }).click();
  async function confirm() {
    await page.getByRole('checkbox', { name: /Я просмотрел текст/ }).check();
    await page.getByRole('checkbox', { name: /Я проверил найденные/ }).check();
    await page.getByRole('button', { name: 'Подтвердить и сравнить' }).click();
    await expect(page.getByRole('heading', { name: 'Сравнение характеристик' })).toBeVisible();
  }
  await confirm();
  for (const [status, count] of [['MATCH', '3'], ['MISMATCH', '2'], ['NOT_STATED', '1']]) await expect(page.getByTestId('count-' + status)).toHaveText(count);
  await page.getByRole('button', { name: 'Открыть основание: Частота', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Частота: 60 Гц.');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Изменить требования' }).click();
  await page.getByRole('textbox', { name: 'Частота: значение', exact: true }).fill('60');
  await confirm();
  await expect(page.getByTestId('count-MATCH')).toHaveText('4');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать JSON' }).click();
  const report = JSON.parse(await fs.readFile(await (await downloadPromise).path(), 'utf8'));
  assert.equal(report.counts.MATCH, 4);
  assert.equal(report.provider.called, false);
  await page.goto(base);
  await page.getByRole('button', { name: 'Начать проверку', exact: true }).click();
  await page.getByLabel('Точная модель двигателя').fill('UPLOAD-MOTOR');
  await page.getByLabel('Загрузить: Техническое задание', { exact: true }).setInputFiles(path.join(root, 'tests/fixtures/spec.txt'));
  await expect(page.getByText('spec.txt', { exact: true })).toBeVisible();
  await page.getByLabel('Загрузить: Предложение поставщика', { exact: true }).setInputFiles(path.join(root, 'tests/fixtures/offer.pdf'));
  await expect(page.getByText('offer.pdf', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Извлечь требования', exact: true }).click();
  await confirm();
  await expect(page.getByTestId('count-MISMATCH')).toHaveText('2');
  await page.goto(pathToFileURL(path.join(root, 'competition/Offline-Demo.html')).href);
  await page.locator('img').last().scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  await page.goto(pathToFileURL(path.join(root, 'competition/Presentation-KK.html')).href);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('қазақша');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  }
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, demo: '3/2/1 then 4/1/1', jsonExport: true, pdfUpload: true, offlineImages: 5, kazakhText: true, externalRequests: external.length, browserErrors: errors.length }));
} finally { await browser.close(); }
