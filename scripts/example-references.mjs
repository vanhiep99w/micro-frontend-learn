import { readdir, readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';

const root = new URL('../content/docs/', import.meta.url);
/** Parse real MDX nodes, not ExampleRef strings inside code fences. */
export function extractExampleReferences(content, path = 'page.mdx') {
  const tree = unified().use(remarkParse).use(remarkMdx).parse(content);
  const references = [];
  function visit(node) {
    if (['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type) && node.name === 'ExampleRef') {
      const values = {};
      for (const key of ['example', 'version']) {
        const attribute = node.attributes.find(item => item.type === 'mdxJsxAttribute' && item.name === key);
        if (!attribute) continue;
        if (typeof attribute.value !== 'string') throw new Error(path + ': ExampleRef ' + key + ' must be a static string');
        values[key] = attribute.value;
      }
      if (!values.example) throw new Error(path + ': ExampleRef needs example');
      references.push({ ...values, line: node.position?.start.line });
    }
    for (const child of node.children ?? []) visit(child);
  }
  visit(tree);
  return references;
}
export async function loadExamplePages() {
  const pages = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith('.mdx')) {
        const relativePath = relative(fileURLToPath(root), fileURLToPath(path)).replaceAll('\\', '/');
        const references = extractExampleReferences(await readFile(path, 'utf8'), relativePath);
        if (references.length) pages.push({ path: relativePath, references });
      }
    }
  }
  await walk(root);
  return pages.sort((a,b) => a.path.localeCompare(b.path));
}
