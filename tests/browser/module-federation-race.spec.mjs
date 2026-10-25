import { test, expect } from '@playwright/test';

const article = '/docs/module-federation/co-che';
const scenario = 'Chạy tình huống: Catalog → Cart';

test('Federation lesson separates complete source projects for broken and fixed hosts', async ({ page }) => {
  await page.goto(article);
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('link', { name: 'Source Module Federation — bản lỗi', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Phiên bản source', exact: true })).toHaveValue('broken');
  await expect(page.locator('select[aria-label="Chọn file source"] option')).toHaveCount(12);
  await expect(page.locator('.source-file-tab')).toContainText('shell/src/navigator.js');
  await expect(page.locator('.source-code')).not.toContainText('latestRequestId');
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Source Module Federation — đã xử lý', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Phiên bản source', exact: true })).toHaveValue('fixed');
  await expect(page.locator('select[aria-label="Chọn file source"] option')).toHaveCount(12);
  await expect(page.locator('.source-code')).toContainText('requestId !== latestRequestId');
  await expect(page.locator('#source-explorer [role="alert"], .source-reference-error')).toHaveCount(0);
});

test('Federation previews use the real local app and both versions reproduce the expected result', async ({ page }) => {
  test.skip(!process.env.FEDERATION_TEST_ORIGIN, 'Start example-learn locally and configure NEXT_PUBLIC_FEDERATION_DEMO_ORIGIN before building docs.');
  const origin = process.env.FEDERATION_TEST_ORIGIN;
  const errors = [];
  const entries = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.url().startsWith(origin) && request.url().includes('remoteEntry.js')) entries.push(request.url());
  });
  await page.goto(article);
  expect(entries).toEqual([]);
  await page.getByRole('link', { name: 'Preview Module Federation — bản lỗi', exact: true }).click();
  const frame = page.frameLocator('.example-dialog iframe');
  await frame.getByRole('button', { name: scenario, exact: true }).click();
  await expect(frame.getByRole('button', { name: scenario, exact: true })).toBeEnabled();
  await expect(frame.locator('#route')).toHaveText('#/cart');
  await expect(frame.locator('#outlet section')).toHaveAttribute('data-remote', 'catalog');

  await page.getByRole('combobox', { name: 'Phiên bản example', exact: true }).selectOption('fixed');
  await expect(frame.locator('#outlet')).toHaveText('Chưa chọn trang.');
  await frame.getByRole('button', { name: scenario, exact: true }).click();
  await expect(frame.getByRole('button', { name: scenario, exact: true })).toBeEnabled();
  await expect(frame.locator('#outlet section')).toHaveAttribute('data-remote', 'cart');
  await expect(frame.locator('#log li').last()).toHaveText('Bỏ kết quả cũ: catalog.');
  for (const variant of ['broken', 'fixed']) for (const remote of ['catalog', 'cart']) {
    expect(entries).toContain(`${origin}/micro-frontend/federation-race/v1/${variant}/${remote}/remoteEntry.js`);
  }
  await page.getByRole('button', { name: 'Đóng example', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(errors).toEqual([]);
});
