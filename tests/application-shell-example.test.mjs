import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { loadSourceExamples } from '../scripts/source-examples.mjs';
import { buildSourceExamples } from '../scripts/build-source-examples.mjs';

const { projects } = await loadSourceExamples();
const project = projects.get('kien-truc-application-shell');
const snapshot = project.snapshots.get(project.defaultSnapshot);
const files = new Map(snapshot.files.map((file) => [file.path, file.code]));

function evaluate(path, document, dependencies = {}) {
  assert(files.has(path), `Missing example file: ${path}`);
  const result = ts.transpileModule(files.get(path), {
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
    this.disabled = false;
  }
  append(...children) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
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

test('application-shell example has exactly three files with all imports implemented', () => {
  assert.equal(project.defaultSnapshot, 'document');
  assert.equal(project.snapshots.size, 1, 'One complete example, not competing basic/advanced versions');
  assert.equal(snapshot.defaultFile, 'shell/main.js');
  assert.deepEqual([...files.keys()].sort(), ['catalog/entry.js', 'shell/index.html', 'shell/main.js']);
  assert.match(files.get('shell/index.html'), /src="\.\/main\.js"/);
  for (const [path, code] of files) {
    for (const [, imported] of code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      assert(imported.startsWith('.'), `Example must not require unprovided packages: ${imported}`);
      assert(files.has(posix.join(posix.dirname(path), imported)), `Missing import: ${path} -> ${imported}`);
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
    await writeFile(join(root, 'source-examples/registry.json'), JSON.stringify([{
      id: project.id,
      title: project.title,
      doc: 'kien-truc/application-shell.mdx',
      defaultFile: 'shell/main.js',
    }]));
    await buildSourceExamples({ root, log: () => {} });
    for (const [path, code] of files) {
      assert.equal(await readFile(join(root, 'public/examples/application-shell', path), 'utf8'), code + '\n');
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
