import defaultMdxComponents from 'fumadocs-ui/mdx';
import { LiveDemo } from '@vanhiep99w/docs-kit/components/live-demo';
import { D2Diagram } from '@vanhiep99w/docs-kit/components/d2';
import { SourceRef } from '@vanhiep99w/docs-kit/components/source-explorer';
import { D2InteractiveDiagram } from '@vanhiep99w/docs-kit/components/d2-interactive';
import { CodeWalkthrough } from '@vanhiep99w/docs-kit/components/code-walkthrough';
import { CodeDiff } from '@vanhiep99w/docs-kit/components/code-diff';
import { TerminalSession } from '@vanhiep99w/docs-kit/components/terminal-session';
import { ProtocolExchange } from '@vanhiep99w/docs-kit/components/protocol-exchange';
import { SpanWaterfall } from '@vanhiep99w/docs-kit/components/span-waterfall';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    LiveDemo,
    D2Diagram,
    D2InteractiveDiagram,
    CodeWalkthrough,
    CodeDiff,
    TerminalSession,
    ProtocolExchange,
    SpanWaterfall,
    SourceRef,
    ...components,
  };
}
