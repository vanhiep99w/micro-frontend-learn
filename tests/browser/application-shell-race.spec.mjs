import { test, expect } from '@playwright/test';

const article = '/docs/kien-truc/application-shell';
const preview = '/examples/application-shell/race/';
const scenario = 'Chạy tình huống: Catalog → Cart';

for (const variant of ['broken', 'fixed']) {
  test(`${variant} preview reproduces late catalog on both first and cached module loads`, async ({ page }) => {
    const errors = [];
    const loadedModules = [];
    page.on('request', request => loadedModules.push(new URL(request.url()).pathname));
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(preview + variant + '/shell/index.html');
    expect(loadedModules).not.toContain(preview + variant + '/catalog/entry.js');
    expect(loadedModules).not.toContain(preview + variant + '/cart/entry.js');
    for (let run = 0; run < 2; run++) {
      await page.getByRole('button', { name: scenario, exact: true }).click();
      await expect(page.getByRole('button', { name: scenario, exact: true })).toBeEnabled();
      await expect(page.locator('#route')).toHaveText('#/cart');
      expect(new URL(page.url()).hash).toBe('#/cart');
      await expect(page.locator('#outlet section')).toHaveCount(1);
      await expect(page.locator('#outlet section')).toHaveAttribute('data-remote', variant === 'broken' ? 'catalog' : 'cart');
      await expect(page.locator('#log li').last()).toHaveText(variant === 'broken' ? 'Đã mount catalog.' : 'Bỏ kết quả cũ: catalog.');
      if (variant === 'fixed') await expect(page.locator('#log')).not.toContainText('Đã mount catalog.');
    }
    expect(loadedModules).toContain(preview + variant + '/shell/navigator.js');
    expect(loadedModules).toContain(preview + variant + '/catalog/entry.js');
    expect(loadedModules).toContain(preview + variant + '/cart/entry.js');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('article opens both real variants and offers matching before/after shell source', async ({ page }) => {
  const requests = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith(preview)) requests.push(request.url());
  });
  await page.goto(article);
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(requests).toEqual([]);
  await page.getByRole('link', { name: 'Preview: catalog cũ ghi đè cart — bản lỗi', exact: true }).click();
  const frame = page.frameLocator('.example-dialog iframe');
  await expect(frame.locator('#variant')).toHaveText('Bản lỗi');
  await frame.getByRole('button', { name: scenario, exact: true }).click();
  await expect(frame.getByRole('button', { name: scenario, exact: true })).toBeEnabled();
  await expect(frame.locator('#outlet section')).toHaveAttribute('data-remote', 'catalog');

  await page.getByRole('combobox', { name: 'Phiên bản example', exact: true }).selectOption('fixed');
  await expect(frame.locator('#variant')).toHaveText('Đã xử lý');
  await expect(frame.locator('#outlet')).toHaveText('Chưa chọn trang.');
  await frame.getByRole('button', { name: scenario, exact: true }).click();
  await expect(frame.getByRole('button', { name: scenario, exact: true })).toBeEnabled();
  await expect(frame.locator('#outlet section')).toHaveAttribute('data-remote', 'cart');
  await expect(frame.locator('#route')).toHaveText('#/cart');
  await expect(page).toHaveURL(/example=application-shell-race&exampleVersion=fixed/);
  await page.reload();
  await expect(frame.locator('#variant')).toHaveText('Đã xử lý');
  await page.getByRole('button', { name: 'Đóng example', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);

  await page.getByRole('link', { name: 'Source bản lỗi: shell không kiểm tra lượt tải', exact: true }).click();
  await expect(page.locator('.source-file-tab')).toContainText('shell/navigator.js');
  await expect(page.getByRole('combobox', { name: 'Phiên bản source', exact: true })).toHaveValue('race-broken');
  await expect(page.locator('.source-code')).not.toContainText('latestRequestId');
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Source đã xử lý: kiểm tra số lượt trước khi mount', exact: true }).click();
  await expect(page.locator('.source-file-tab')).toContainText('shell/navigator.js');
  await expect(page.getByRole('combobox', { name: 'Phiên bản source', exact: true })).toHaveValue('race-fixed');
  await expect(page.locator('.source-code')).toContainText('requestId !== latestRequestId');
});

test('source picker isolates the basic example and both complete race examples', async ({ page }) => {
  await page.goto(article);
  await page.getByRole('link', { name: 'Xem đủ code shell và remote', exact: true }).click();
  const picker = page.getByRole('combobox', { name: 'Phiên bản source', exact: true });
  const fileOptions = page.locator('select[aria-label="Chọn file source"] option');
  await expect(picker).toHaveValue('document');
  await expect(fileOptions).toHaveText(['shell/index.html', 'shell/main.js', 'catalog/entry.js']);
  await expect(picker.locator('option')).toHaveCount(3);

  const raceFiles = ['shell/navigator.js', 'shell/index.html', 'shell/main.js', 'shell/loader.js', 'catalog/entry.js', 'cart/entry.js'];
  await picker.selectOption('race-broken');
  await expect(fileOptions).toHaveText(raceFiles);
  await expect(page.locator('.source-code')).not.toContainText('latestRequestId');
  await picker.selectOption('race-fixed');
  await expect(fileOptions).toHaveText(raceFiles);
  await expect(page.locator('.source-code')).toContainText('latestRequestId');
  await page.reload();
  await expect(picker).toHaveValue('race-fixed');
  await expect(fileOptions).toHaveText(raceFiles);
  await picker.selectOption('document');
  await expect(fileOptions).toHaveCount(3);
  await expect(page.locator('.source-file-tab')).toContainText('shell/main.js');
  await expect(page.locator('#source-explorer [role="alert"], .source-reference-error')).toHaveCount(0);
});
