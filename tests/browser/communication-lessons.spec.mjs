import { test, expect } from '@playwright/test';
import { loadSourceExamples } from '../../scripts/source-examples.mjs';

// Exercise exactly the published MDX files, not parallel implementations.
const { projects } = await loadSourceExamples();
const lessons = ['events', 'state-ownership', 'routing', 'data-fetching', 'authentication'];
const files = new Map();
for (const slug of lessons) {
  const project = projects.get('giao-tiep-va-trang-thai-' + slug);
  const snapshot = project.snapshots.get(project.defaultSnapshot);
  for (const file of snapshot.files.filter((file) => file.path.startsWith('basic/'))) {
    files.set(slug + '/' + file.path.slice(6), file.code);
  }
}
const entry = (slug) => '/__section-example/' + slug + '/index.html';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => { throw error; });
  await page.route('**/__section-example/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace('/__section-example/', '');
    if (!files.has(path)) return route.fulfill({ status: 404, body: 'Unknown canonical example file' });
    return route.fulfill({
      contentType: path.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8',
      body: files.get(path),
    });
  });
});

test('events: publisher and subscriber share the bus; late mount does not replay; cleanup removes old listeners', async ({ page }) => {
  await page.goto(entry('events'));
  await page.getByRole('button', { name: 'Chọn sản phẩm 42', exact: true }).click();
  await expect(page.locator('#recommendations')).toHaveText('Gợi ý cho sản phẩm 42');
  await page.getByRole('button', { name: 'Tháo Recommendations', exact: true }).click();
  await expect(page.locator('#recommendations')).toBeEmpty();
  await page.getByRole('button', { name: 'Chọn sản phẩm 42', exact: true }).click();
  const result = await page.evaluate(async () => {
    const { createBus } = await import('/__section-example/events/bus.js');
    const { mount } = await import('/__section-example/events/recommendations.js');
    const bus = createBus();
    bus.publish('catalog.product-selected.v1', { productId: 'before-mount' });
    const container = document.createElement('div');
    document.body.append(container);
    const handle = mount({ container, bus });
    const label = container.querySelector('p');
    const initial = label.textContent;
    bus.publish('catalog.product-selected.v1', { productId: 'after-mount' });
    const current = label.textContent;
    handle.unmount();
    handle.unmount();
    bus.publish('catalog.product-selected.v1', { productId: 'after-unmount' });
    return { initial, current, detached: label.textContent };
  });
  expect(result).toEqual({
    initial: 'Chưa nhận thông báo chọn sản phẩm',
    current: 'Gợi ý cho sản phẩm after-mount',
    detached: 'Gợi ý cho sản phẩm after-mount',
  });
});

test('state: a late remote reads the shared snapshot; closing it does not reset the owner', async ({ page }) => {
  await page.goto(entry('state-ownership'));
  await page.getByRole('button', { name: 'Shell chọn tối', exact: true }).click();
  await page.getByRole('button', { name: 'Mở Settings', exact: true }).click();
  await expect(page.locator('#settings')).toHaveText('Remote đang dùng theme: dark');
  await page.getByRole('button', { name: 'Remote đang dùng theme: dark', exact: true }).click();
  await expect(page.locator('#shell-theme')).toHaveText('Shell đang dùng theme: light');
  await page.getByRole('button', { name: 'Đóng Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Shell chọn tối', exact: true }).click();
  await page.getByRole('button', { name: 'Mở Settings', exact: true }).click();
  await expect(page.locator('#settings')).toHaveText('Remote đang dùng theme: dark');
  const result = await page.evaluate(async () => {
    const { createTheme } = await import('/__section-example/state-ownership/theme.js');
    const theme = createTheme();
    const first = theme.getSnapshot();
    let notifications = 0;
    const off = theme.subscribe(() => notifications++);
    theme.setTheme('light');
    const stableWhenUnchanged = theme.getSnapshot() === first;
    theme.setTheme('dark');
    off(); off();
    theme.setTheme('light');
    let invalidRejected = false;
    try { theme.setTheme('invalid'); } catch { invalidRejected = true; }
    return { notifications, stableWhenUnchanged, oldTheme: first.theme, frozen: Object.isFrozen(first), invalidRejected };
  });
  expect(result).toEqual({ notifications: 1, stableWhenUnchanged: true, oldTheme: 'light', frozen: true, invalidRejected: true });
});

test('routing: navigation API updates URL and remote; browser Back/Forward remounts the correct page', async ({ page }) => {
  await page.goto(entry('routing'));
  await page.getByRole('button', { name: 'Mở Catalog', exact: true }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.locator('#outlet h2')).toHaveText('Catalog: /');
  await page.getByRole('button', { name: 'Xem sản phẩm 42', exact: true }).click();
  await expect(page).toHaveURL(/\/catalog\/products\/42$/);
  await expect(page.locator('#outlet h2')).toHaveText('Catalog: /products/42');
  await page.getByRole('button', { name: 'Mở Cart', exact: true }).click();
  await expect(page.locator('#outlet')).toHaveText('Cart UI');
  await page.goBack();
  await expect(page.locator('#outlet h2')).toHaveText('Catalog: /products/42');
  await page.goForward();
  await expect(page.locator('#outlet')).toHaveText('Cart UI');
  const result = await page.evaluate(async () => {
    const { createNavigation } = await import('/__section-example/routing/navigation.js');
    const navigation = createNavigation();
    let notifications = 0;
    const off = navigation.subscribe(() => notifications++);
    let externalRejected = false;
    try { navigation.navigate('https://untrusted.invalid/cart'); } catch { externalRejected = true; }
    navigation.navigate('/catalog?category=books', { replace: true });
    const snapshot = navigation.getSnapshot();
    off(); off(); navigation.dispose();
    return { notifications, externalRejected, pathname: snapshot.pathname, search: snapshot.search };
  });
  expect(result).toEqual({ notifications: 1, externalRejected: true, pathname: '/catalog', search: '?category=books' });
});

test('cache: two mounted UIs share reads and refetch after a change', async ({ page }) => {
  await page.goto(entry('data-fetching'));
  await expect(page.locator('#header')).toHaveText('Header: 2 món');
  await expect(page.locator('#cart')).toHaveText('Cart: 2 món');
  await expect(page.locator('#reads')).toHaveText('Số lần đọc API giả: 1');
  await page.getByRole('button', { name: 'Thêm một món', exact: true }).click();
  await expect(page.locator('#header')).toHaveText('Header: 3 món');
  await expect(page.locator('#cart')).toHaveText('Cart: 3 món');
  await expect(page.locator('#reads')).toHaveText('Số lần đọc API giả: 2');
});

test('cache: invalidation prevents old reads overwriting cache, failures retry, detached UIs ignore responses', async ({ page }) => {
  await page.goto(entry('data-fetching'));
  const result = await page.evaluate(async () => {
    const { createCartData } = await import('/__section-example/data-fetching/cart-data.js');
    const { mount } = await import('/__section-example/data-fetching/summary.js');
    const queue = [];
    let calls = 0;
    const data = createCartData({
      getSummary() { calls++; return new Promise((resolve, reject) => queue.push({ resolve, reject })); },
      async addItem() {},
    });
    const first = data.getSummary();
    const shared = first === data.getSummary();
    await Promise.resolve(); // Start the adapter call without timing sleeps.
    data.invalidate();
    const second = data.getSummary();
    await Promise.resolve();
    queue[1].resolve({ itemCount: 4 });
    await second;
    queue[0].resolve({ itemCount: 2 });
    await first;
    const latest = await data.getSummary();
    data.invalidate();
    const failed = data.getSummary().then(() => false, () => true);
    await Promise.resolve();
    queue[2].reject(new Error('Controlled failure'));
    const failedCorrectly = await failed;
    const retry = data.getSummary();
    await Promise.resolve();
    queue[3].resolve({ itemCount: 5 });
    await retry;
    data.invalidate();
    const container = document.createElement('div');
    const ui = mount({ container, data, name: 'Detached' });
    const label = container.querySelector('p');
    ui.unmount();
    await Promise.resolve();
    queue[4].resolve({ itemCount: 99 });
    await data.getSummary();
    return { shared, latest: latest.itemCount, failedCorrectly, calls, detached: label.textContent };
  });
  expect(result).toEqual({ shared: true, latest: 4, failedCorrectly: true, calls: 5, detached: 'Detached: đang tải' });
});

test('session: mock identity is shared with late remote; closing a remote is not logout', async ({ page }) => {
  await page.goto(entry('authentication'));
  await expect(page.locator('#header')).toHaveText('Header: anonymous');
  await page.getByRole('button', { name: 'Mô phỏng user A', exact: true }).click();
  await page.getByRole('button', { name: 'Mở Account', exact: true }).click();
  await expect(page.locator('#account')).toHaveText('Account: User A giả lập');
  await page.getByRole('button', { name: 'Đóng Account', exact: true }).click();
  await expect(page.locator('#header')).toHaveText('Header: User A giả lập');
  await page.getByRole('button', { name: 'Logout giả lập', exact: true }).click();
  await page.getByRole('button', { name: 'Mở Account', exact: true }).click();
  await expect(page.locator('#account')).toHaveText('Account: chưa đăng nhập');
});

test('session: check in flight cannot restore old identity after logout and transport failures stay locked', async ({ page }) => {
  await page.goto(entry('authentication'));
  const result = await page.evaluate(async () => {
    const { createSession } = await import('/__section-example/authentication/session.js');
    let resolveCheck;
    const session = createSession({
      getSession: () => new Promise((resolve) => { resolveCheck = resolve; }),
      async logout() {},
    });
    const checking = session.revalidate();
    await session.logout();
    resolveCheck({ user: { displayName: 'Old user' } });
    await checking;
    const afterLateResponse = session.getSnapshot().status;
    const failing = createSession({
      async getSession() { throw new Error('Network'); },
      async logout() { throw new Error('Unconfirmed logout'); },
    });
    await failing.revalidate();
    const failedCheck = failing.getSnapshot().status;
    let logoutRejected = false;
    try { await failing.logout(); } catch { logoutRejected = true; }
    return { afterLateResponse, failedCheck, logoutRejected, failedLogout: failing.getSnapshot().status };
  });
  expect(result).toEqual({ afterLateResponse: 'anonymous', failedCheck: 'unavailable', logoutRejected: true, failedLogout: 'unavailable' });
});

test('all lessons expose a beginner source first and valid rendered anchors', async ({ page }) => {
  for (const slug of lessons) {
    await page.goto('/docs/giao-tiep-va-trang-thai/' + slug);
    const broken = await page.locator('#nd-page a[href^="#"]').evaluateAll((links) => links
      .map((link) => link.getAttribute('href'))
      .filter((href) => href.length > 1 && !document.getElementById(decodeURIComponent(href.slice(1)))));
    expect(broken, slug).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), slug).toBe(true);
    await page.locator('.source-ref--button').click();
    await expect(page.locator('.source-file-tab')).toContainText('basic/shell.js');
    await expect(page.locator('#source-explorer [role="alert"], .source-reference-error')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('#source-explorer')).toHaveCount(0);
  }
});

test('whole section remains readable in both themes without JavaScript', async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: testInfo.project.use.viewport,
  });
  const page = await context.newPage();
  try {
    for (const slug of ['', 'contracts', ...lessons]) {
      await page.goto('/docs/giao-tiep-va-trang-thai' + (slug ? '/' + slug : ''));
      await expect(page.locator('#nd-page h1')).toHaveCount(1);
      await expect(page.locator('iframe')).toHaveCount(0);
      const broken = await page.locator('#nd-page a[href^="#"]').evaluateAll((links) => links
        .map((link) => link.getAttribute('href'))
        .filter((href) => href.length > 1 && !document.getElementById(decodeURIComponent(href.slice(1)))));
      expect(broken, slug).toEqual([]);
      const diagram = page.locator('.d2-diagram').first();
      for (const theme of ['light', 'dark']) {
        await page.evaluate((value) => {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(value);
        }, theme);
        await diagram.scrollIntoViewIfNeeded();
        await expect(diagram.locator('.d2-diagram-' + theme)).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), slug).toBe(true);
      }
      if (slug && slug !== 'contracts') {
        const localHtml = page.locator('#nd-page details').filter({ hasText: 'basic/index.html' }).first();
        await expect(localHtml).not.toHaveAttribute('open');
        await localHtml.locator('summary').click();
        await expect(localHtml).toHaveAttribute('open', '');
      }
    }
  } finally {
    await context.close();
  }
});
