import { test, expect } from '@playwright/test';
import { loadSourceExamples } from '../../scripts/source-examples.mjs';

// Serve the canonical MDX snippets, not a separately maintained demo/mock.
const { projects } = await loadSourceExamples();
const project = projects.get('giao-tiep-va-trang-thai-contracts');
const snapshot = project.snapshots.get(project.defaultSnapshot);
const files = new Map(snapshot.files
  .filter((file) => file.path.startsWith('basic/'))
  .map((file) => [file.path.slice('basic/'.length), file.code]));

test.beforeEach(async ({ page }) => {
  await page.route('**/__contract-example/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace('/__contract-example/', '');
    if (!files.has(path)) return route.fulfill({ status: 404, body: 'Unknown example file' });
    return route.fulfill({
      contentType: path.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8',
      body: files.get(path),
    });
  });
});

test('contracts opens the simple shell source first and keeps full types optional', async ({ page }) => {
  await page.goto('/docs/giao-tiep-va-trang-thai/contracts');
  const fullTypes = page.locator('details').filter({
    has: page.getByText('Xem type đầy đủ của mount API', { exact: true }),
  });
  await expect(fullTypes).not.toHaveAttribute('open');
  await page.locator('.source-ref--button').click();
  await expect(page.locator('.source-file-tab')).toContainText('basic/shell.js');
  await expect(page.locator('.source-code')).toContainText("import { mount } from './catalog.js'");
  await expect(page.locator('#source-explorer [role="alert"], .source-reference-error')).toHaveCount(0);
});

test('published shell and remote snippets demonstrate callbacks, props updates and unmount', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/__contract-example/index.html');
  const productButton = page.getByRole('button', { name: 'Thêm cốc', exact: true });
  await expect(page.locator('#message')).toHaveText('Chưa có yêu cầu.');
  await productButton.click();
  await expect(page.locator('#message')).toHaveText('Shell nhận yêu cầu thêm: mug');
  await page.getByRole('button', { name: 'Đổi sang nền tối', exact: true }).click();
  await expect(productButton).toHaveCSS('background-color', 'rgb(34, 34, 34)');
  await page.getByRole('button', { name: 'Tháo Catalog', exact: true }).click();
  await expect(productButton).toHaveCount(0);
  await expect(page.locator('#catalog')).toBeEmpty();
  await expect(page.locator('#message')).toHaveText('Shell nhận yêu cầu thêm: mug');
  await expect(page.locator('#dark')).toBeDisabled();
  await page.locator('#remove').click();
  expect(errors).toEqual([]);
});

test('published remote keeps its instance on update and removes callbacks on repeated cleanup', async ({ page }) => {
  await page.goto('/__contract-example/index.html');
  const result = await page.evaluate(async () => {
    const { mount } = await import('/__contract-example/catalog.js');
    const container = document.createElement('div');
    const sibling = document.createElement('p');
    sibling.textContent = 'Shell-owned sibling';
    document.body.append(container, sibling);
    const calls = [];
    const handle = mount({
      container,
      props: { theme: 'light' },
      onAddItem: (id) => calls.push(['first', id]),
    });
    const button = container.querySelector('button');
    button.click();
    handle.updateProps({ theme: 'dark' });
    const sameButton = container.querySelector('button') === button;
    handle.unmount();
    handle.unmount();
    button.click(); // A detached button must no longer invoke the old callback.
    let updateRejected = false;
    try { handle.updateProps({ theme: 'light' }); } catch { updateRejected = true; }
    const next = mount({
      container,
      props: { theme: 'light' },
      onAddItem: (id) => calls.push(['second', id]),
    });
    handle.unmount(); // An old handle must not remove the new instance.
    const newInstanceSurvives = container.childElementCount === 1;
    container.querySelector('button').click();
    next.unmount();
    return {
      calls, sameButton, updateRejected, newInstanceSurvives,
      emptyAfterCleanup: container.childElementCount === 0,
      siblingText: sibling.textContent,
    };
  });
  expect(result).toEqual({
    calls: [['first', 'mug'], ['second', 'mug']],
    sameButton: true,
    updateRejected: true,
    newInstanceSurvives: true,
    emptyAfterCleanup: true,
    siblingText: 'Shell-owned sibling',
  });
});
