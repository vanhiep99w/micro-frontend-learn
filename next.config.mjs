import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Cloudflare Pages serves static assets; Next.js exports them into out/.
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default withMDX(config);
