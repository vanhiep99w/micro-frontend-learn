import { loadSourceExamples } from './source-examples.mjs';

const { projects, snapshots, references } = await loadSourceExamples();
console.log(`OK: ${projects.size} Source Explorer projects, ${snapshots.size} snapshots, ${references} references (project/snapshot/file/region/lines).`);
