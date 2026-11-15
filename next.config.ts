import type { NextConfig } from 'next';
// Keep byte-identical portable releases: default CSS merging can reorder modules
// across builds. Preserve source import order instead of weakening artifact pins.
const config: NextConfig = { output: 'export', trailingSlash: true, images: { unoptimized: true }, experimental: { cssChunking: false } };
export default config;
