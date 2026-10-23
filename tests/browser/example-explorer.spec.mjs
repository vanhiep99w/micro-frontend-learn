import { test, expect } from '@playwright/test';
const shop='https://example-learn.pages.dev/micro-frontend/communication/v1/';
const events=shop+'?mode=events-only';
const bus='https://example-learn.pages.dev/browser/event-target/v1/';

async function mockApps(page,requests=[]) {
  // Controlled apps test docs wiring; example-learn separately tests the actual React/Vue app.
  await page.route('https://example-learn.pages.dev/**',route=>{
    const url=route.request().url();
    requests.push(url);
    const initial=url===events?10:url===bus?20:2;
    return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><h1>App fixture</h1><button onclick="this.textContent=String(Number(this.textContent)+1)">'+initial+'</button></html>'});
  });
}
test('page has compact example links and one modal with app/version selection, not an inline viewport',async({page})=>{
  const requests=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await mockApps(page,requests);
  await page.goto('/docs/giao-tiep-va-trang-thai');
  await expect(page.locator('.example-ref')).toHaveCount(3);
  await expect(page.locator('.live-demo,iframe,dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Mở example',exact:true})).toBeVisible();
  expect(requests).toEqual([]);
  const article=await page.locator('#nd-page').boundingBox();
  const opener=page.getByRole('link',{name:'Example: shop React + Vue',exact:true});
  await opener.click();
  const modal=page.locator('dialog.example-dialog');
  await expect(modal).toBeVisible();
  await expect(modal.locator('iframe')).toHaveAttribute('sandbox','allow-scripts allow-same-origin');
  const current=await page.locator('#nd-page').boundingBox();
  expect(current.width).toBeCloseTo(article.width,1);
  expect(await page.locator('body').getAttribute('data-source-drawer-open')).toBeNull();
  const frame=page.frameLocator('.example-dialog iframe');
  await frame.getByRole('button',{name:'2',exact:true}).click();
  await expect(frame.getByRole('button',{name:'3',exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:'Phiên bản example',exact:true}).selectOption('events-only');
  await expect(frame.getByRole('button',{name:'10',exact:true})).toBeVisible();
  await expect(page).toHaveURL(/example=mfe-cart&exampleVersion=events-only/);
  await page.getByRole('combobox',{name:'Chọn example',exact:true}).selectOption('event-target');
  await expect(frame.getByRole('button',{name:'20',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Mở example trong tab mới',exact:true})).toHaveAttribute('href',bus);
  await page.getByRole('button',{name:'Tải lại example',exact:true}).click();
  await expect(frame.getByRole('button',{name:'20',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Đóng example',exact:true}).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(errors).toEqual([]);
});
test('each reference selects its own version, deep links survive reload, and navigation clears page-specific examples',async({page})=>{
  await mockApps(page);
  await page.goto('/docs/giao-tiep-va-trang-thai?q=keep');
  await page.getByRole('link',{name:'Example: bản chỉ nghe event',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Phiên bản example',exact:true})).toHaveValue('events-only');
  await page.reload();
  await expect(page.getByRole('combobox',{name:'Phiên bản example',exact:true})).toHaveValue('events-only');
  await page.getByRole('button',{name:'Đóng example',exact:true}).press('Escape');
  await expect(page.locator('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\?q=keep$/);
  await page.getByRole('link',{name:'Example: EventTarget và cleanup',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Chọn example',exact:true})).toHaveValue('event-target');
  await page.getByRole('button',{name:'Đóng example',exact:true}).click();
  await page.getByRole('link',{name:'Hợp đồng giao tiếp',exact:true}).first().click();
  await expect(page).toHaveURL(/\/contracts$/);
  // Contracts now has its own shop reference; stale EventTarget selection must not leak across routes.
  await expect(page.locator('.example-ref')).toHaveCount(1);
  await page.getByRole('button',{name:'Mở example',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Chọn example',exact:true})).toHaveValue('mfe-cart');
  await expect(page.getByRole('combobox',{name:'Chọn example',exact:true}).locator('option')).toHaveCount(1);
  await page.getByRole('button',{name:'Đóng example',exact:true}).click();
  await page.getByRole('link',{name:'Micro-frontend Learning',exact:true}).first().click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole('button',{name:'Mở example',exact:true})).toHaveCount(0);
  await expect(page.locator('dialog,iframe')).toHaveCount(0);
});
test('no-JavaScript references open actual apps, with no placeholder/header/footer taking space',async({browser,baseURL})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto(baseURL+'/docs/giao-tiep-va-trang-thai');
  await expect(page.locator('.example-ref')).toHaveCount(3);
  await expect(page.getByRole('link',{name:'Example: shop React + Vue',exact:true})).toHaveAttribute('href',shop);
  await expect(page.getByRole('link',{name:'Example: bản chỉ nghe event',exact:true})).toHaveAttribute('href',events);
  await expect(page.locator('.live-demo,iframe,dialog')).toHaveCount(0);
  await context.close();
});
