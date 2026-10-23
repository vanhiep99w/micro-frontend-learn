import { validateExamples, resolveExample } from '@vanhiep99w/docs-kit/example-explorer';
import { examples } from '../lib/examples.ts';
import { loadExamplePages } from './example-references.mjs';

validateExamples(examples);
const pages = await loadExamplePages();
let count = 0;
for (const page of pages) {
  for (const reference of page.references) {
    try { resolveExample(examples, reference); }
    catch (error) { throw new Error(page.path + ':' + reference.line + ': ' + error.message); }
    count++;
  }
}
console.log(`OK: ${pages.length} pages, ${count} ExampleRef references, ${examples.length} example definitions; all IDs/versions resolve.`);
