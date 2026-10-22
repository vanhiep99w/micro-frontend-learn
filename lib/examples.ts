import type { ExampleDefinition } from '@vanhiep99w/docs-kit/example-explorer';

const shop = 'https://example-learn.pages.dev/micro-frontend/communication/v1/';
const source = 'https://github.com/vanhiep99w/example-learn/tree/main/examples/micro-frontend/communication/v1';

export const examples = [
  {
    id: 'mfe-cart',
    title: 'Shop React + Vue',
    defaultVersion: 'snapshot',
    versions: [
      { id: 'snapshot', title: 'Snapshot + subscription', src: shop, sourceUrl: source },
      { id: 'events-only', title: 'Event-only (bản lỗi)', src: shop + '?mode=events-only', sourceUrl: source },
    ],
  },
  {
    id: 'event-target',
    title: 'EventTarget và cleanup',
    defaultVersion: 'v1',
    versions: [{
      id: 'v1', title: 'v1 — JavaScript thuần',
      src: 'https://example-learn.pages.dev/browser/event-target/v1/',
      sourceUrl: 'https://github.com/vanhiep99w/example-learn/tree/main/examples/browser/event-target/v1',
    }],
  },
] satisfies readonly ExampleDefinition[];
