import { test, expect } from '@playwright/test';
const demoURL = 'https://example-learn.pages.dev/micro-frontend/communication/v1/';
test('lesson exports a lazy LiveDemo and renders an isolated iframe on demand', async ({page}) => {
  // A controlled fixture tests host wiring, not availability of an external Pages deployment.
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(demoURL, route => {
    requests.push(route.request().url());
    return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><button onclick="this.textContent=String(Number(this.textContent)+1)">2</button></html>'});
  });
  await page.goto('/docs/giao-tiep-va-trang-thai');
  const demo = page.locator('.live-demo');
  await expect(demo).toBeVisible();
  await expect(demo.locator('iframe')).toHaveCount(0);
  expect(requests).toEqual([]);
  await expect(demo.getByRole('link',{name:'Mở tab mới ↗'})).toHaveAttribute('href',demoURL);
  await expect(demo.getByRole('link',{name:'Source code ↗'})).toHaveAttribute('href',/github.com\/vanhiep99w\/example-learn/);
  await demo.getByRole('button',{name:'Chạy thử',exact:true}).click();
  await expect(demo.locator('iframe')).toHaveAttribute('sandbox','allow-scripts allow-same-origin');
  const frame = page.frameLocator('.live-demo iframe');
  await frame.getByRole('button',{name:'2',exact:true}).click();
  await expect(frame.getByRole('button',{name:'3',exact:true})).toBeVisible();
  await demo.getByRole('button',{name:'Tải lại demo'}).click();
  await expect(frame.getByRole('button',{name:'2',exact:true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('lesson exposes source and open links without JavaScript', async ({browser,baseURL}) => {
  const context = await browser.newContext({javaScriptEnabled:false});
  const page = await context.newPage();
  await page.goto(baseURL + '/docs/giao-tiep-va-trang-thai');
  await expect(page.locator('.live-demo iframe')).toHaveCount(0);
  await expect(page.locator('.live-demo').getByRole('link',{name:'Mở tab mới ↗'})).toBeVisible();
  await context.close();
});
