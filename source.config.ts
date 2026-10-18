import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { remarkD2 } from '@vanhiep99w/docs-kit/d2';
import { remarkCodeWalkthrough } from '@vanhiep99w/docs-kit/code-walkthrough';
import { remarkCodeDiff } from '@vanhiep99w/docs-kit/code-diff';
import { remarkTerminalSession } from '@vanhiep99w/docs-kit/terminal-session';
import { remarkProtocolExchange } from '@vanhiep99w/docs-kit/protocol-exchange';
import { remarkSpanWaterfall } from '@vanhiep99w/docs-kit/span-waterfall';

export const docs = defineDocs({
  dir: 'content/docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [[remarkD2, {
      cacheDir: '.next/cache/docs-kit/d2',
      defaultCaption: 'Sơ đồ',
      assetsRoot: 'content/d2-icons',
    }], remarkCodeWalkthrough, remarkCodeDiff, remarkTerminalSession,
      remarkProtocolExchange, remarkSpanWaterfall],
  },
});
