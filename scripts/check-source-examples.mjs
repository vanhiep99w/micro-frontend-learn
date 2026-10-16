import { loadSourceExamples } from './source-examples.mjs';

const { snapshots, references } = await loadSourceExamples();
console.log(`OK: ${snapshots.size} Source Explorer projects, ${references} references (project/file/region/lines).`);
