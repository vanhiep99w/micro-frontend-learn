import type { ExampleDefinition } from '@vanhiep99w/docs-kit/example-explorer';

const shop = 'https://example-learn.pages.dev/micro-frontend/communication/v1/';
const source = 'https://github.com/vanhiep99w/example-learn/tree/main/examples/micro-frontend/communication/v1';
const federationOrigin = process.env.NEXT_PUBLIC_FEDERATION_DEMO_ORIGIN
  || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:4175' : 'https://example-learn.pages.dev');

export const examples = [
  {
    id: 'application-shell',
    title: 'Shell và remote: mount, update, unmount',
    defaultVersion: 'document',
    versions: [{
      id: 'document',
      title: 'Đúng code trong bài',
      src: '/examples/application-shell/shell/index.html',
    }],
  },
  {
    id: 'application-shell-race',
    title: 'Navigation race: catalog trả về sau cart',
    defaultVersion: 'fixed',
    versions: [
      { id: 'broken', title: 'Bản lỗi — mount kết quả cũ', src: '/examples/application-shell/race/broken/shell/index.html' },
      { id: 'fixed', title: 'Đã xử lý — kiểm tra lượt tải', src: '/examples/application-shell/race/fixed/shell/index.html' },
    ],
  },
  {
    id: 'federation-navigation-race',
    title: 'Module Federation thật: navigation race',
    defaultVersion: 'fixed',
    versions: [
      { id: 'broken', title: 'Module Federation — bản lỗi', src: `${federationOrigin}/micro-frontend/federation-race/v1/broken/shell/index.html` },
      { id: 'fixed', title: 'Module Federation — đã xử lý', src: `${federationOrigin}/micro-frontend/federation-race/v1/fixed/shell/index.html` },
    ],
  },
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
  ...([
    ['css-isolation', 'CSS isolation', 'scoped', [
      ['scoped', 'Root namespace', '?mode=scoped'],
      ['global', 'Global (bản lỗi)', '?mode=global'],
      ['shadow', 'Shadow DOM', '?mode=shadow'],
    ]],
    ['routing', 'Navigation port và history', 'coordinated', [
      ['coordinated', 'Shell điều phối', '?mode=coordinated'],
      ['conflict', 'Remote tự đổi URL (bản lỗi)', '?mode=conflict'],
    ]],
    ['resilience', 'Failure boundary và retry', 'success', [
      ['success', 'Bình thường', '?mode=success'],
      ['transient', 'Transient fixture · retry 1 lần', '?mode=transient'],
      ['missing', 'Asset 404 thật', '?mode=missing'],
      ['contract', 'Sai contract', '?mode=contract'],
      ['render', 'Lỗi React render', '?mode=render'],
      ['timeout', 'Quá deadline', '?mode=timeout'],
    ]],
    ['query-cache', 'TanStack Query cache scope', 'shared', [
      ['shared', 'Cùng QueryClient', '?mode=shared'],
      ['separate', 'Hai QueryClient riêng', '?mode=separate'],
    ]],
    ['web-components', 'Custom element và lifecycle', 'v1', [
      ['v1', 'v1 — Shadow DOM + capability', ''],
    ]],
    ['iframe-bridge', 'iframe và postMessage', 'v1', [
      ['v1', 'v1 — INIT, THEME, RESIZE', ''],
    ]],
    ['design-tokens', 'Token contract React + Vue', 'shared', [
      ['shared', 'Cùng token contract', '?mode=shared'],
      ['drift', 'Vue override token (bản lệch)', '?mode=drift'],
    ]],
  ] as const).map(([id, title, defaultVersion, versions]) => ({
    id, title, defaultVersion,
    versions: versions.map(([idVersion, titleVersion, query]) => ({
      id: idVersion, title: titleVersion,
      src: `https://example-learn.pages.dev/micro-frontend/${id}/v1/${query}`,
      sourceUrl: `https://github.com/vanhiep99w/example-learn/tree/main/examples/micro-frontend/${id}/v1`,
    })),
  })),
] satisfies readonly ExampleDefinition[];
