import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../../out/source-examples/manifest.json', import.meta.url), 'utf8'));
async function snapshot(project, id) {
  const entry = manifest.find((entry) => entry.id === project);
  const target = entry.snapshots.find((item) => item.id === (id ?? entry.defaultSnapshot));
  return JSON.parse(await readFile(new URL('../../out/source-examples/' + target.asset, import.meta.url), 'utf8'));
}
const code = (page) => page.locator('#source-explorer .source-code .line[data-line="1"]');

// Fail every test on uncaught browser exceptions (including hydration failures).
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => { throw error; });
});

test('D2 themes render without fetching source assets; diagrams scroll inside mobile viewport', async ({ page }) => {
  const requests = [];
  page.on('request', (request) => { if (request.url().includes('/source-examples/')) requests.push(request.url()); });
  for (const route of ['nen-tang/micro-frontend-la-gi', 'kien-truc/application-shell', 'nen-tang/khi-nao-nen-dung', 'ui-va-framework/css-isolation']) {
    await page.goto('/docs/' + route);
    const figure = page.locator('.d2-diagram').first();
    // A lazy viewer may replace the static figure while Playwright begins scrolling.
    await expect(async () => {
      await figure.scrollIntoViewIfNeeded();
      await expect(figure).toBeVisible();
    }).toPass({ timeout: 10000 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
      }, theme);
      await expect(figure.locator('.d2-diagram-' + theme)).toBeVisible();
      await expect(figure.locator('.d2-diagram-' + (theme === 'dark' ? 'light' : 'dark'))).toBeHidden();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(requests).toEqual([]);
});

test('all seven newly covered articles open their default source with no reference errors', async ({ page }) => {
  for (const route of [
    'giao-tiep-va-trang-thai/events', 'cac-cach-tich-hop/web-components',
    'module-federation/types-contracts', 'giao-tiep-va-trang-thai/data-fetching',
    'kiem-thu-va-tooling/local-development', 'kiem-thu-va-tooling/observability', 'production/resilience',
  ]) {
    await page.goto('/docs/' + route);
    await page.locator('.source-ref--button').click();
    await expect(code(page)).toBeVisible();
    await expect(page.locator('#source-explorer [role="alert"], .source-reference-error')).toHaveCount(0);
    const data = await snapshot(route.replaceAll('/', '-'));
    await expect(page.locator('.source-file-tab')).toContainText(data.defaultFile);
    await page.keyboard.press('Escape');
    await expect(page.locator('#source-explorer')).toHaveCount(0);
  }
});

test('snapshot switch isolates same-path variants and survives reload', async ({ page, isMobile }) => {
  await page.goto('/docs/module-federation/types-contracts');
  await page.locator('.source-ref[href*="region=adapter"]').click();
  await expect(code(page)).toBeVisible();
  const manual = await snapshot('module-federation-types-contracts', 'manual-types');
  const boundary = manual.files.find((file) => file.path === 'shell/src/catalog-boundary.ts');
  const [start, end] = boundary.regions.adapter;
  await expect(page.locator('.source-code .is-highlighted')).toHaveCount(end - start + 1);
  await expect(page.locator('.source-code .is-highlighted').first()).toHaveAttribute('data-line', String(start));
  await page.getByLabel('Phiên bản source', { exact: true }).selectOption('generated-types');
  await expect(code(page)).toBeVisible();
  await expect(page).toHaveURL(/snapshot=generated-types/);
  await expect(page.locator('.source-file-tab')).toContainText('shell/webpack.config.cjs');
  if (isMobile) {
    await page.getByLabel('Chọn file source', { exact: true }).selectOption('shell/tsconfig.json');
  } else {
    await page.locator('.source-sidebar button[title="shell/tsconfig.json"]').click();
  }
  await expect(page.locator('.source-code')).toContainText('@mf-types');
  const generated = await snapshot('module-federation-types-contracts', 'generated-types');
  expect(generated.files.find((file) => file.path === 'shell/tsconfig.json').code)
    .not.toBe(manual.files.find((file) => file.path === 'shell/tsconfig.json').code);
  await page.reload();
  await expect(code(page)).toBeVisible();
  await expect(page.getByLabel('Phiên bản source', { exact: true })).toHaveValue('generated-types');
  await expect(page.locator('.source-file-tab')).toContainText('shell/tsconfig.json');
  await expect(page.locator('#source-explorer [role="alert"], .source-reference-error')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('drawer supports region deep links, query preservation, Escape and Back/Forward', async ({ page }) => {
  await page.goto('/docs/module-federation/dynamic-remotes?tracking=keep');
  await page.locator('.source-ref[href*="region=loader"]').click();
  await expect(code(page)).toBeVisible();
  await expect(page).toHaveURL(/region=loader/);
  expect(new URL(page.url()).searchParams.get('tracking')).toBe('keep');
  await page.keyboard.press('Escape');
  await expect(page.locator('#source-explorer')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('source')).toBe(false);
  await page.goForward();
  await expect(code(page)).toBeVisible();
  await page.reload();
  await expect(code(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#source-explorer')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('tracking')).toBe('keep');
});

test('desktop copy actions and client navigation reset the drawer', async ({ page, context, isMobile }) => {
  test.skip(isMobile, 'Clipboard permission and side-by-side article navigation checked on desktop');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/docs/giao-tiep-va-trang-thai/events');
  await page.locator('.source-ref--button').click();
  await expect(code(page)).toBeVisible();
  await expect(page.locator('#nd-toc')).toBeHidden();
  const data = await snapshot('giao-tiep-va-trang-thai-events');
  await page.getByRole('button', { name: 'Copy file', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(data.files.find((file) => file.path === data.defaultFile).code);
  await page.getByRole('button', { name: 'Copy link ↗', exact: true }).click();
  await expect.poll(async () => new URL(await page.evaluate(() => navigator.clipboard.readText())).searchParams.get('snapshot')).toBe('document');
  await page.locator('#nd-page a[href="/docs/giao-tiep-va-trang-thai/contracts"]').first().click();
  await expect(page).toHaveURL(/\/contracts$/);
  await expect(page.locator('#source-explorer')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('source')).toBe(false);
});

test('invalid deep link shows recoverable error instead of breaking the article', async ({ page }) => {
  await page.goto('/docs/module-federation/types-contracts?source=module-federation-types-contracts&snapshot=missing');
  await expect(page.locator('#source-explorer [role="alert"]')).toContainText('Phiên bản source không tồn tại');
  await page.keyboard.press('Escape');
  await expect(page.locator('#source-explorer')).toHaveCount(0);
  await expect(page.locator('#nd-page')).toBeVisible();
});
