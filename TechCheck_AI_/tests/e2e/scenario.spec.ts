import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { demoDocuments } from '../../src/lib/fixtures';

async function demo(page: Page, id = 'А') {
  await page.goto('/');
  if (id === 'А') await page.getByRole('button', { name: 'Открыть учебный пример', exact: true }).click();
  else { await page.getByRole('button', { name: 'Учебные примеры', exact: true }).click(); await page.getByRole('button', { name: `Открыть пример ${id}`, exact: true }).click(); }
  await page.getByRole('button', { name: 'Извлечь требования', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Подтвердите требования' })).toBeVisible();
}
async function confirm(page: Page) {
  await page.getByRole('checkbox', { name: /Я просмотрел текст/ }).check();
  await page.getByRole('checkbox', { name: /Я проверил найденные/ }).check();
  await page.getByRole('button', { name: 'Подтвердить и сравнить' }).click();
  await expect(page.getByRole('heading', { name: 'Сравнение характеристик' })).toBeVisible();
}
test('A: full flow, filters, evidence, edit, invalidation, JSON, print, presentation and clear', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await demo(page); await confirm(page);
  await expect(page.getByTestId('count-MATCH')).toHaveText('3'); await expect(page.getByTestId('count-MISMATCH')).toHaveText('2'); await expect(page.getByTestId('count-NOT_STATED')).toHaveText('1');
  await page.getByRole('button', { name: 'Расхождения 2', exact: true }).click(); await expect(page.locator('.comparison-table tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Уточнить 0', exact: true }).click(); await expect(page.getByText('Таких результатов нет')).toBeVisible();
  await page.getByRole('button', { name: 'Все 6', exact: true }).click();
  await page.getByRole('button', { name: 'Открыть основание: Частота', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Частота: 60 Гц.'); await expect(page.getByRole('dialog')).toContainText('Текстовый блок 5');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Изменить требования' }).click(); await page.getByRole('textbox', { name: 'Частота: значение', exact: true }).fill('60');
  await expect(page.getByRole('button', { name: 'Подтвердить и сравнить' })).toBeDisabled();
  await page.getByRole('button', { name: 'Обзор', exact: true }).first().click(); await page.getByRole('button', { name: 'Открыть отчёт' }).click();
  await expect(page.getByRole('button', { name: 'Скачать JSON' })).toBeDisabled(); await expect(page.getByRole('button', { name: 'Печать / PDF через браузер' })).toBeDisabled();
  await page.getByRole('button', { name: 'Изменить требования' }).click(); await page.getByRole('checkbox', { name: /Я проверил найденные/ }).check(); await page.getByRole('button', { name: 'Подтвердить и сравнить' }).click();
  await expect(page.getByTestId('count-MATCH')).toHaveText('4'); await expect(page.getByTestId('count-MISMATCH')).toHaveText('1');
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Скачать JSON' }).click(); const download = await downloadPromise;
  const file = await download.path(); const fs = await import('node:fs/promises'); const report = JSON.parse(await fs.readFile(file!, 'utf8'));
  expect(report.counts.MATCH).toBe(4); expect(report.rulesVersion).toBe('1.0.0'); expect(report.mode).toBe('demo'); expect(report.provider.called).toBe(false);
  expect(report.rows.find((r: { requirement: { parameter: string } }) => r.requirement.parameter === 'rated_frequency').requirement.originalQuote).toBe('Частота: 50 Гц.');
  await page.evaluate(() => { window.print = () => { document.body.dataset.printed = 'yes'; }; });
  await page.getByRole('button', { name: 'Печать / PDF через браузер' }).click(); await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes');
  await page.emulateMedia({ media: 'print' }); await expect(page.locator('.sidebar')).toBeHidden(); await expect(page.locator('.print-sources')).toBeVisible(); await page.pdf({ path: 'test-results/report.pdf', format: 'A4', landscape: true }); await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'Режим показа', exact: true }).click(); await expect(page.locator('.app-shell')).toHaveClass(/presentation/); await page.keyboard.press('Escape'); await expect(page.locator('.app-shell')).not.toHaveClass(/presentation/);
  await page.getByRole('button', { name: 'Восстановить исходный пример' }).click(); await page.getByRole('button', { name: 'Извлечь требования' }).click(); await confirm(page); await expect(page.getByTestId('count-MATCH')).toHaveText('3');
  await page.getByRole('button', { name: 'Очистить проверку' }).click(); await expect(page.getByRole('heading', { name: 'Здесь появится ваша первая проверка' })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]); expect(errors).toEqual([]);
});
test('B and C use same workflow; conflicting sources are both visible', async ({ page }) => {
  await demo(page, 'Б'); await confirm(page); await expect(page.getByTestId('count-MATCH')).toHaveText('6');
  await demo(page, 'В'); await confirm(page); await expect(page.getByTestId('count-MATCH')).toHaveText('5'); await expect(page.getByTestId('count-NEEDS_REVIEW')).toHaveText('1');
  await page.getByRole('button', { name: 'Открыть основание: Частота', exact: true }).click();
  await expect(page.getByRole('dialog').locator('blockquote')).toHaveCount(3);
  await expect(page.getByRole('dialog')).toContainText('паспорт C.txt'); await expect(page.getByRole('dialog')).toContainText('Частота: 60 Гц.');
});
test('real PDF and UTF-8 TXT uploads through UI, physical page and current document comparison', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Начать проверку', exact: true }).click();
  await page.getByLabel('Точная модель двигателя').fill('UPLOAD-MOTOR');
  await page.getByLabel('Загрузить: Техническое задание', { exact: true }).setInputFiles(path.resolve('tests/fixtures/spec.txt'));
  await expect(page.getByText('spec.txt', { exact: true })).toBeVisible();
  await page.getByLabel('Загрузить: Предложение поставщика', { exact: true }).setInputFiles(path.resolve('tests/fixtures/offer.pdf'));
  await expect(page.getByText('offer.pdf', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Просмотр текста' }).nth(1).click(); await expect(page.getByRole('dialog')).toContainText('Frequency: 60 Hz.'); await expect(page.getByRole('dialog')).toContainText('Физическая страница 1'); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Извлечь требования' }).click(); await confirm(page);
  await expect(page.getByTestId('count-MATCH')).toHaveText('3'); await expect(page.getByTestId('count-MISMATCH')).toHaveText('2'); await expect(page.getByTestId('count-NOT_STATED')).toHaveText('1');
  await page.getByRole('button', { name: 'Открыть основание: Частота', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('Физическая страница 1'); await expect(page.getByRole('dialog')).toContainText('Frequency: 60 Hz.');
});
test('read errors are explicit and do not erase fields or substitute demo', async ({ page, request }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Начать проверку', exact: true }).click(); await page.getByLabel('Точная модель двигателя').fill('MY-MOTOR');
  const input = page.getByLabel('Загрузить: Техническое задание', { exact: true });
  for (const [file, error] of [['broken.pdf', /повреждён/i], ['scan.pdf', /нет читаемого текстового слоя/i], ['password.pdf', /защищён паролем/i], ['eleven-pages.pdf', /больше 10 страниц/i]]) {
    await input.setInputFiles(path.resolve(`tests/fixtures/${file}`)); await expect(page.locator('main').getByRole('alert')).toContainText(error); await expect(page.getByLabel('Точная модель двигателя')).toHaveValue('MY-MOTOR');
  }
  await input.setInputFiles({ name: 'sheet.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('fake') }); await expect(page.locator('main').getByRole('alert')).toContainText('Поддерживаются только PDF');
  await input.setInputFiles({ name: 'large.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }); await expect(page.locator('main').getByRole('alert')).toContainText('больше 5 МБ');
  await page.getByRole('combobox', { name: 'Способ обработки' }).selectOption('ai'); await expect(page.getByRole('button', { name: 'Извлечь требования' })).toBeDisabled();
  const { configured } = await (await request.get('/api/extract')).json();
  if (configured) await expect(page.getByLabel('Код закрытого доступа')).toBeVisible();
  else await expect(page.getByText('Внешний ИИ не подключён', { exact: true }).last()).toBeVisible();
});
test('AI billing failure keeps documents and allows a free template comparison', async ({ page }) => {
  await page.route('**/api/extract', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { configured: true } });
    const payload = route.request().postDataJSON();
    if (payload.mode === 'ai') return route.fulfill({ status: 429, json: {
      code: 'AI_CREDITS_EXHAUSTED', error: 'На API-балансе OpenAI закончились средства. Пополните баланс в OpenAI Platform → Settings → Billing.',
    } });
    return route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть учебный пример', exact: true }).click();
  await page.getByRole('combobox', { name: 'Способ обработки' }).selectOption('ai');
  await page.getByLabel('Код закрытого доступа').fill('synthetic-test-code');
  await page.getByRole('checkbox', { name: /Разрешаю отправить/ }).check();
  await page.getByRole('button', { name: 'Извлечь требования', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('Billing');
  await expect(page.getByLabel('Точная модель двигателя')).toHaveValue('DEMO-MOTOR-A');
  await expect(page.getByRole('heading', { name: 'Сравнение характеристик' })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Способ обработки' }).selectOption('template');
  await page.getByRole('button', { name: 'Извлечь требования', exact: true }).click();
  await confirm(page);
  await expect(page.getByTestId('count-MATCH')).toHaveText('3');
  await expect(page.getByTestId('count-MISMATCH')).toHaveText('2');
  await expect(page.getByTestId('count-NOT_STATED')).toHaveText('1');
});

test('paste, drag-and-drop, replacement, model changes and unavailable network preserve user data', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Начать проверку', exact: true }).click();
  await page.getByLabel('Точная модель двигателя').fill('DEMO-MOTOR-A');
  const docs = demoDocuments('A');
  await page.locator('.document-card').nth(0).getByRole('button', { name: 'Вставить текст' }).click();
  await page.getByLabel('Текст документа', { exact: true }).fill(docs[0].blocks.map(b => b.text).join('\n'));
  await page.getByRole('button', { name: 'Прочитать текст' }).click();
  await page.locator('.document-card').nth(1).locator('.drop-zone').evaluate((element, text) => {
    const transfer = new DataTransfer(); transfer.items.add(new File([text], 'dropped-offer.txt', { type: 'text/plain' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, docs[1].blocks.map(b => b.text).join('\n'));
  await expect(page.getByText('dropped-offer.txt', { exact: true })).toBeVisible();
  await page.route('**/api/extract', route => route.abort()); await page.getByRole('button', { name: 'Извлечь требования' }).click();
  await expect(page.locator('main').getByRole('alert')).toBeVisible(); await expect(page.getByLabel('Точная модель двигателя')).toHaveValue('DEMO-MOTOR-A');
  await page.unroute('**/api/extract'); await page.getByRole('button', { name: 'Извлечь требования' }).click(); await confirm(page); await expect(page.getByTestId('count-MATCH')).toHaveText('3');
  await page.getByRole('button', { name: 'Новая проверка', exact: true }).click(); await page.getByLabel('Точная модель двигателя').fill('WRONG-MODEL');
  await page.getByRole('button', { name: 'Обзор', exact: true }).first().click(); await page.getByRole('button', { name: 'Открыть отчёт' }).click(); await expect(page.getByRole('button', { name: 'Скачать JSON' })).toBeDisabled();
  await page.getByRole('button', { name: 'Изменить требования' }).click(); await page.getByRole('button', { name: 'Извлечь требования' }).click(); await confirm(page); await expect(page.getByTestId('count-NEEDS_REVIEW')).toHaveText('6');
});
for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  test(`responsive screens, navigation and focus ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto('/');
    async function capture(name: string) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); await page.screenshot({ path: `test-results/${viewport.width}-${name}.png`, fullPage: true }); }
    await capture('home'); await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'К содержимому' })).toBeFocused();
    await page.getByRole('button', { name: 'Открыть учебный пример', exact: true }).click(); await capture('documents');
    await page.getByRole('button', { name: 'Извлечь требования' }).click(); await expect(page.getByRole('heading', { name: 'Подтвердите требования' })).toBeVisible(); await capture('requirements'); await confirm(page); await capture('report');
    await page.getByRole('button', { name: 'Открыть основание: Частота', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await capture('evidence');
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true); await page.keyboard.press('Escape');
    if (viewport.width < 760) await page.getByRole('button', { name: 'Открыть меню' }).click();
    await page.getByRole('button', { name: 'Как работает', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Как работает TechCheck' })).toBeVisible();
  });
}
