import { test, expect } from '@playwright/test';

const routes = {
  'code-walkthrough': 'module-federation/shared-dependencies',
  'code-diff': 'troubleshooting/remote-khong-tai',
  'terminal-session': 'bat-dau/chay-local',
  'protocol-exchange': 'trien-khai/caching',
  'span-waterfall': 'production/performance',
};
const fits = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => { throw error; });
});

test('walkthrough steps, diff layout and all five component themes fit narrow screens', async ({ page }) => {
  for (const [component, route] of Object.entries(routes)) {
    await page.goto('/docs/' + route);
    const figure = page.locator('figure.' + component);
    await figure.scrollIntoViewIfNeeded();
    await expect(figure).toBeVisible();
    for (const theme of ['dark', 'light']) {
      await page.evaluate((value) => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(value);
      }, theme);
      await fits(page);
      await expect(figure).toBeVisible();
      expect(await figure.evaluate((element) => getComputedStyle(element).fontSize)).not.toBe('0px');
    }
    if (component === 'code-walkthrough') {
      await expect(figure.locator('[data-highlighted="true"]')).toHaveCount(1);
      await figure.getByRole('button', { name: 'Bước sau', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(figure.locator('[data-highlighted="true"]')).toHaveCount(3);
      await expect(figure.locator('.code-walkthrough-note')).toContainText('Ghi lỗi bootstrap');
      await figure.getByLabel('Chọn bước', { exact: true }).selectOption('0');
      await expect(figure.locator('[data-highlighted="true"]')).toHaveCount(1);
    }
    if (component === 'code-diff') {
      await figure.getByRole('button', { name: 'Song song', exact: true }).click();
      await expect(figure).toHaveAttribute('data-view', 'split');
      await fits(page);
      await figure.getByRole('button', { name: 'Inline', exact: true }).click();
      await expect(figure).toHaveAttribute('data-view', 'inline');
      await expect(figure.locator('[data-type="remove"]')).toContainText("publicPath: '/'");
      await expect(figure.locator('[data-type="add"]')).toContainText("publicPath: 'auto'");
    }
  }
});

test('HTTP variants and waterfall retain readable details and truthful provenance', async ({ page }) => {
  await page.goto('/docs/' + routes['protocol-exchange']);
  const variant = page.locator('.protocol-exchange [data-variant="unchanged"]');
  await variant.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(variant.locator('.protocol-exchange-status-code')).toHaveText('304');
  await expect(variant).toContainText('If-None-Match');
  await expect(variant).toContainText('"config-demo-42"');
  await expect(variant.locator('.protocol-exchange-body')).toHaveCount(0);

  await page.goto('/docs/' + routes['span-waterfall']);
  const waterfall = page.locator('.span-waterfall');
  await expect(waterfall.locator('figcaption')).toContainText('Trace minh họa');
  await waterfall.locator('[data-span="data"] a').click();
  await expect(waterfall.locator('[data-detail="data"]')).toBeVisible();
  await expect(waterfall.locator('[data-detail="data"]')).toContainText('400 ms');
  await expect(waterfall.locator('[data-detail="data"]')).toContainText('650 ms');
  await waterfall.locator('.span-waterfall-table-disclosure > summary').click();
  await expect(waterfall.locator('table tbody tr')).toHaveCount(6);
  await fits(page);
});

test('copy returns original commands, snapshots, exact diff sides and HTTP validators', async ({ page, context, isMobile }) => {
  test.skip(isMobile, 'Clipboard permissions checked on desktop');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/docs/' + routes['terminal-session']);
  const session = page.locator('.terminal-session');
  const command = await session.locator('.terminal-session-command code').textContent();
  await session.getByRole('button', { name: 'Sao chép lệnh bước 1' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(command);
  expect(command).toContain("fetch('http://localhost:3001/remoteEntry.js')");
  await session.locator('.terminal-session-notes > summary').click();
  await expect(session).toContainText('MIME JavaScript');

  await page.goto('/docs/' + routes['code-walkthrough']);
  await page.locator('.code-walkthrough').getByRole('button', { name: 'Sao chép code', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(
    "import('./bootstrap').catch((error) => {\n  console.error('Shell bootstrap failed', error);\n  document.getElementById('root').textContent =\n    'Ứng dụng chưa khởi động được. Vui lòng tải lại trang.';\n});",
  );

  await page.goto('/docs/' + routes['code-diff']);
  await page.locator('.code-diff').getByRole('button', { name: 'Sao chép bản sau', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("output: {\n  publicPath: 'auto',\n}");

  await page.goto('/docs/' + routes['protocol-exchange']);
  const variant = page.locator('.protocol-exchange [data-variant="unchanged"]');
  await variant.locator('summary').click();
  await variant.getByRole('button', { name: 'Sao chép request — Browser đã lưu body — 304', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('If-None-Match: "config-demo-42"');
});

test('converted routing maps and embedded catalog icons render in both themes without network icons', async ({ page }) => {
  const external = [];
  page.on('request', (request) => { if (request.url().includes('icons.d2lang.com')) external.push(request.url()); });
  for (const route of ['giao-tiep-va-trang-thai/routing', 'ui-va-framework/react', 'ui-va-framework/vue']) {
    await page.goto('/docs/' + route);
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(value);
      }, theme);
      const diagram = page.locator('.d2-diagram').first();
      await diagram.scrollIntoViewIfNeeded();
      await expect(diagram.locator('.d2-diagram-' + theme)).toBeVisible();
      if (route.startsWith('ui-')) {
        const icons = diagram.locator('.d2-diagram-' + theme + ' image');
        expect(await icons.count()).toBeGreaterThan(0);
        for (const icon of await icons.all()) {
          expect(await icon.evaluate((element) => element.getAttribute('href') ?? element.getAttribute('xlink:href'))).toMatch(/^data:image\/svg\+xml;base64,/);
        }
      }
      await fits(page);
    }
    if (route.endsWith('/routing')) {
      await expect(page.locator('figure').filter({ hasText: 'Push tạo entry; Back quay về entry trước' })).toContainText('Back lần 2');
      await expect(page.locator('figure').filter({ hasText: 'Sau khi Catalog điều hướng:' })).toContainText('Chưa được cập nhật');
    }
  }
  expect(external).toEqual([]);
});

test('without JavaScript: all five learning examples, D2 and SourceRef links remain readable', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport });
  const page = await context.newPage();
  try {
    for (const [component, route] of Object.entries(routes)) {
      await page.goto('http://127.0.0.1:3210/docs/' + route);
      const figure = page.locator('figure.' + component);
      await figure.scrollIntoViewIfNeeded();
      await expect(figure).toBeVisible();
      if (component === 'code-walkthrough') await expect(figure.locator('noscript ol')).toContainText('Giữ thông báo lỗi tại shell');
      if (component === 'protocol-exchange') {
        await figure.locator('[data-variant="unchanged"] > summary').click();
        await expect(figure.locator('[data-variant="unchanged"]')).toContainText('If-None-Match');
      }
      if (component === 'span-waterfall') {
        await figure.locator('.span-waterfall-table-disclosure > summary').click();
        await expect(figure.locator('table')).toBeVisible();
      }
      await fits(page);
    }
    await page.goto('http://127.0.0.1:3210/docs/ui-va-framework/react');
    await expect(page.locator('.d2-diagram').first().locator('svg').first()).toBeVisible();
    await expect(page.locator('.source-ref').first()).toHaveAttribute('href', /source=/);
  } finally { await context.close(); }
});

test('all 81 published document URLs smoke without hydration errors or unrendered diagrams', async ({ page }) => {
  test.setTimeout(180_000);
  const { readFile } = await import('node:fs/promises');
  const inventory = JSON.parse(await readFile(new URL('../../docs-kit-inventory.json', import.meta.url), 'utf8'));
  for (const { path, counts } of inventory.rows.filter(({ path }) => path.endsWith('.mdx'))) {
    const slug = path.replace('content/docs/', '').replace(/\.mdx$/, '').replace(/(^|\/)index$/, '');
    const route = '/docs' + (slug ? '/' + slug : '');
    const response = await page.goto(route);
    expect(response.status(), route).toBe(200);
    await expect(page.locator('#nd-page h1')).toBeVisible();
    await expect(page.locator('.d2-diagram')).toHaveCount(counts.d2 ?? 0);
    for (const component of Object.keys(routes)) {
      await expect(page.locator('figure.' + component)).toHaveCount(counts[component] ?? 0);
    }
    await expect(page.locator('.source-reference-error')).toHaveCount(0);
  }
});
