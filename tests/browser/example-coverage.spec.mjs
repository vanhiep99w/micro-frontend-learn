import { test, expect } from '@playwright/test';
const lessons=[
 ['bat-dau/bai-toan-shop','mfe-cart','snapshot',1],
 ['kien-truc/chia-domain','mfe-cart','snapshot',1],
 ['giao-tiep-va-trang-thai/events','mfe-cart','snapshot',2],
 ['giao-tiep-va-trang-thai/state-ownership','mfe-cart','snapshot',1],
 ['giao-tiep-va-trang-thai/contracts','mfe-cart','snapshot',1],
 ['ui-va-framework/css-isolation','css-isolation','global',1],
 ['giao-tiep-va-trang-thai/routing','routing','coordinated',1],
 ['production/resilience','resilience','transient',1],
 ['giao-tiep-va-trang-thai/data-fetching','query-cache','shared',1],
 ['cac-cach-tich-hop/web-components','web-components','v1',1],
 ['cac-cach-tich-hop/iframe','iframe-bridge','v1',1],
 ['ui-va-framework/design-system','design-tokens','shared',1],
];
test('all additional lessons open the correct runnable example/version with no SSR frame or stale selections',async({page})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://example-learn.pages.dev/**',route=>route.fulfill({
  contentType:'text/html',
  body:'<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><p>Controlled demo fixture</p><button>App action</button></html>',
 }));
 for(const [slug,id,version,count] of lessons){
  await page.goto('/docs/'+slug);
  await expect(page.locator('.example-ref')).toHaveCount(count);
  await expect(page.locator('iframe,dialog')).toHaveCount(0);
  await page.locator('.example-ref').first().click();
  await expect(page.getByRole('combobox',{name:'Chọn example',exact:true})).toHaveValue(id);
  await expect(page.getByRole('combobox',{name:'Phiên bản example',exact:true})).toHaveValue(version);
  await expect(page.frameLocator('.example-dialog iframe').getByRole('button',{name:'App action',exact:true})).toBeVisible();
  expect(await page.locator('body').getAttribute('data-source-drawer-open')).toBeNull();
  await page.getByRole('button',{name:'Đóng example',exact:true}).click();
  await expect(page.locator('iframe,dialog')).toHaveCount(0);
 }
 expect(errors).toEqual([]);
});
