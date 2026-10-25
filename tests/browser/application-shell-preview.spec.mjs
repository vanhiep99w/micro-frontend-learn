import { test, expect } from '@playwright/test';

const article = '/docs/kien-truc/application-shell';
const app = '/examples/application-shell/shell/index.html';
const label = 'Preview: thử shell và remote';

test('shell preview is lazy and runs the real mount, update and unmount code', async ({ page }) => {
  const requests = [];
  const errors = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/examples/application-shell/')) requests.push(request.url());
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(article);
  await expect(page.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', app);
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(requests).toEqual([]);

  await page.getByRole('link', { name: label, exact: true }).click();
  const dialog = page.locator('dialog.example-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('iframe')).toHaveAttribute('src', app);
  const frame = page.frameLocator('.example-dialog iframe');
  await expect(frame.getByRole('heading', { name: 'Danh sách sản phẩm' })).toBeVisible();
  await expect(frame.locator('#catalog-slot section')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await frame.getByRole('button', { name: 'Đổi catalog sang dark theme' }).click();
  await expect(frame.locator('#catalog-slot section')).toHaveCSS('background-color', 'rgb(17, 24, 39)');
  await frame.getByRole('button', { name: 'Đóng catalog', exact: true }).click();
  await expect(frame.locator('#catalog-slot section')).toHaveCount(0);
  await expect(frame.getByRole('heading', { name: 'Shop của mình' })).toBeVisible();
  await expect(frame.locator('#dark-theme')).toBeDisabled();

  await page.getByRole('button', { name: 'Tải lại example', exact: true }).click();
  await expect(frame.getByRole('heading', { name: 'Danh sách sản phẩm' })).toBeVisible();
  await expect(frame.locator('#catalog-slot section')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('link', { name: 'Mở example trong tab mới', exact: true })).toHaveAttribute('href', app);
  await page.getByRole('button', { name: 'Đóng example', exact: true }).click();
  await expect(page.locator('dialog,iframe')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('shell preview deep links reload correctly and no-JavaScript markup retains a standalone link', async ({ page, browser, baseURL }) => {
  await page.goto(article + '?q=keep&example=application-shell&exampleVersion=document#chạy-và-theo-dõi-ví-dụ');
  const frame = page.frameLocator('.example-dialog iframe');
  await expect(frame.getByRole('heading', { name: 'Danh sách sản phẩm' })).toBeVisible();
  await page.reload();
  await expect(frame.getByRole('heading', { name: 'Danh sách sản phẩm' })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng example', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('q')).toBe('keep');
  expect(decodeURIComponent(new URL(page.url()).hash)).toBe('#chạy-và-theo-dõi-ví-dụ');

  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const fallback = await context.newPage();
    await fallback.goto(baseURL + article);
    await expect(fallback.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', app);
    await expect(fallback.locator('dialog,iframe')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
