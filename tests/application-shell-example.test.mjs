import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { loadSourceExamples } from '../scripts/source-examples.mjs';
import { buildSourceExamples } from '../scripts/build-source-examples.mjs';

const { projects, registry } = await loadSourceExamples();
const project = projects.get('kien-truc-application-shell');
const snapshot = project.snapshots.get(project.defaultSnapshot);
const files = new Map(snapshot.files.map((file) => [file.path, file.code]));

function evaluate(path, document, dependencies = {}, snapshotID = project.defaultSnapshot) {
  const selected = new Map(project.snapshots.get(snapshotID).files.map(file => [file.path, file.code]));
  assert(selected.has(path), `Missing example file: ${snapshotID}/${path}`);
  const result = ts.transpileModule(selected.get(path), {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: {
      allowJs: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  });
  assert.equal((result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0);
  const exports = {};
  runInNewContext(result.outputText, {
    exports,
    document,
    require(id) {
      assert(Object.hasOwn(dependencies, id), `Unimplemented dependency: ${id}`);
      return dependencies[id];
    },
  }, { filename: path, timeout: 1000 });
  return exports;
}

class Element {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.disabled = false;
  }
  append(...children) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }
  replaceChildren(...children) {
    for (const child of this.children) child.parent = undefined;
    this.children = [];
    this.textContent = '';
    this.append(...children);
  }
  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = undefined;
  }
}

function documentFixture() {
  const elements = new Map([...files.get('shell/index.html').matchAll(/id="([^"]+)"/g)]
    .map(([, id]) => ['#' + id, new Element('div')]));
  return {
    elements,
    document: {
      createElement: (tag) => new Element(tag),
      querySelector(selector) {
        assert(elements.has(selector), `Selector absent from HTML: ${selector}`);
        return elements.get(selector);
      },
    },
  };
}

test('each example has only its own complete set of files and imports', () => {
  assert.equal(project.defaultSnapshot, 'document');
  assert.equal(project.snapshots.size, 3);
  assert.equal(snapshot.defaultFile, 'shell/main.js');
  assert.deepEqual([...files.keys()].sort(), ['catalog/entry.js', 'shell/index.html', 'shell/main.js']);
  assert.match(files.get('shell/index.html'), /src="\.\/main\.js"/);
  for (const [id, current] of project.snapshots) {
    const selected = new Map(current.files.map(file => [file.path, file.code]));
    if (id !== 'document') {
      assert.deepEqual([...selected.keys()].sort(), ['cart/entry.js', 'catalog/entry.js', 'shell/index.html', 'shell/loader.js', 'shell/main.js', 'shell/navigator.js']);
      assert.equal(current.defaultFile, 'shell/navigator.js');
      assert.deepEqual([...new Set([...selected.keys()].map(path => path.split('/')[0]))].sort(), ['cart', 'catalog', 'shell']);
      assert(!selected.get('shell/main.js').includes('isBroken'));
      assert.equal(selected.get('shell/navigator.js').includes('latestRequestId'), id === 'race-fixed');
    }
    for (const [path, code] of selected) {
      for (const [, imported] of code.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*)['"]([^'"]+)['"]/g)) {
        assert(imported.startsWith('.'), `Example must not require unprovided packages: ${imported}`);
        const target = posix.join(posix.dirname(path), imported);
        assert(selected.has(target), `Missing import: ${id}/${path} -> ${imported}`);
        const owner = path.split('/')[0];
        const targetOwner = target.split('/')[0];
        if (owner !== 'shell') assert.equal(targetOwner, owner, 'Remotes must not depend on shell or another remote');
        else if (targetOwner !== owner) assert(target.endsWith('/entry.js'), 'Shell may only cross a module boundary through its public entry');
      }
    }
  }
});

test('remote mounts, updates and removes only its own UI, with independent instances', () => {
  const { document } = documentFixture();
  const { mount } = evaluate('catalog/entry.js', document);
  const container = new Element('div');
  const sibling = new Element('button');
  container.append(sibling);
  const catalog = mount(container, 'light');
  const panel = container.children[1];
  assert.equal(panel.children[0].textContent, 'Danh sách sản phẩm');
  assert.equal(panel.children[1].textContent, 'Áo thun — 200.000đ');
  assert.equal(panel.style.backgroundColor, '#ffffff');

  catalog.update('dark');
  assert.equal(panel.style.backgroundColor, '#111827');
  assert.equal(container.children.length, 2);

  const anotherContainer = new Element('div');
  const anotherCatalog = mount(anotherContainer, 'light');
  catalog.unmount();
  catalog.unmount();
  catalog.update('light');
  assert.deepEqual(container.children, [sibling]);
  assert.equal(panel.style.backgroundColor, '#111827', 'An unmounted instance must ignore updates');
  assert.equal(anotherContainer.children.length, 1);
  anotherCatalog.update('dark');
  assert.equal(anotherContainer.children[0].style.backgroundColor, '#111827');
  anotherCatalog.unmount();
  assert.equal(anotherContainer.children.length, 0);
});

test('complete shell calls the real remote, then handles theme and close buttons', () => {
  const { document, elements } = documentFixture();
  const remote = evaluate('catalog/entry.js', document);
  evaluate('shell/main.js', document, { '../catalog/entry.js': remote });
  const container = elements.get('#catalog-slot');
  const darkButton = elements.get('#dark-theme');
  const closeButton = elements.get('#close-catalog');
  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].style.backgroundColor, '#ffffff');

  darkButton.onclick();
  assert.equal(container.children[0].style.backgroundColor, '#111827');
  closeButton.onclick();
  assert.equal(container.children.length, 0);
  assert.equal(darkButton.disabled, true);
  assert.equal(closeButton.disabled, true);
});

test('preview is generated from the same source snapshot and updates when the lesson changes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'application-shell-preview-'));
  const page = await readFile(new URL('../content/docs/kien-truc/application-shell.mdx', import.meta.url), 'utf8');
  const docPath = join(root, 'content/docs/kien-truc/application-shell.mdx');
  try {
    await mkdir(join(root, 'content/docs/kien-truc'), { recursive: true });
    await mkdir(join(root, 'source-examples'), { recursive: true });
    await writeFile(docPath, page);
    await writeFile(join(root, 'source-examples/registry.json'), JSON.stringify([
      registry.find(entry => entry.id === project.id),
    ]));
    await buildSourceExamples({ root, log: () => {} });
    for (const [id, directory] of [['document', ''], ['race-broken', 'race/broken'], ['race-fixed', 'race/fixed']]) {
      for (const file of project.snapshots.get(id).files) {
        assert.equal(await readFile(join(root, 'public/examples/application-shell', directory, file.path), 'utf8'), file.code + '\n');
      }
    }
    await writeFile(docPath, page.replace('Áo thun — 200.000đ', 'Áo hoodie — 300.000đ'));
    await buildSourceExamples({ root, log: () => {} });
    const updated = await readFile(join(root, 'public/examples/application-shell/catalog/entry.js'), 'utf8');
    assert.match(updated, /Áo hoodie — 300\.000đ/);
    assert.doesNotMatch(updated, /Áo thun/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

for (const variant of ['broken', 'fixed']) {
  test(`race ${variant}: actual shell and remotes demonstrate the expected late-catalog outcome`, async () => {
    const { document } = documentFixture();
    const { createNavigator } = evaluate('shell/navigator.js', document, {}, `race-${variant}`);
    const catalog = evaluate('catalog/entry.js', document, {}, `race-${variant}`);
    const cart = evaluate('cart/entry.js', document, {}, `race-${variant}`);
    const container = new Element('main');
    const waitingCatalog = deferred();
    const waitingCart = deferred();
    const logs = [];
    const show = createNavigator(container,
      name => name === 'catalog' ? waitingCatalog.promise : waitingCart.promise,
      message => logs.push(message));

    const openingCatalog = show('catalog');
    const openingCart = show('cart');
    waitingCart.resolve(cart);
    await openingCart;
    assert.equal(container.children[0].dataset.remote, 'cart');
    const cartPanel = container.children[0];

    waitingCatalog.resolve(catalog);
    await openingCatalog;
    assert.equal(container.children.length, 1);
    if (variant === 'broken') {
      assert.equal(container.children[0].dataset.remote, 'catalog');
      assert.equal(cartPanel.parent, undefined, 'The stale catalog incorrectly unmounted cart');
      assert.equal(logs.at(-1), 'Đã mount catalog.');
    } else {
      assert.equal(container.children[0], cartPanel, 'Ignore the old result without touching current UI');
      assert.equal(logs.at(-1), 'Bỏ kết quả cũ: catalog.');
      assert(!logs.includes('Đã mount catalog.'));
    }
  });
}

test('fixed race distinguishes two requests for the same remote and cleans the previous mounted instance', async () => {
  const { document } = documentFixture();
  const { createNavigator } = evaluate('shell/navigator.js', document, {}, 'race-fixed');
  const catalog = evaluate('catalog/entry.js', document, {}, 'race-fixed');
  const cart = evaluate('cart/entry.js', document, {}, 'race-fixed');
  const requests = [deferred(), deferred(), deferred(), deferred()];
  let index = 0;
  const container = new Element('main');
  const logs = [];
  const show = createNavigator(container, () => requests[index++].promise, message => logs.push(message));
  const firstCatalog = show('catalog');
  const openingCart = show('cart');
  const newestCatalog = show('catalog');
  requests[2].resolve(catalog);
  await newestCatalog;
  const currentPanel = container.children[0];

  requests[0].resolve(catalog);
  requests[1].resolve(cart);
  await Promise.all([firstCatalog, openingCart]);
  assert.equal(container.children[0], currentPanel);
  assert.equal(logs.filter(message => message === 'Đã mount catalog.').length, 1);
  assert(logs.includes('Bỏ kết quả cũ: catalog.'));
  assert(logs.includes('Bỏ kết quả cũ: cart.'));

  const nextCart = show('cart');
  assert.equal(currentPanel.parent, undefined, 'Navigation cleans the previous mounted remote');
  assert.equal(container.children.length, 0);
  requests[3].resolve(cart);
  await nextCart;
  assert.equal(container.children[0].dataset.remote, 'cart');
});
