import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const configuredOrigin = process.env.RAILWAY_API_ORIGIN?.trim();

if (!configuredOrigin) {
  throw new Error('Set RAILWAY_API_ORIGIN in Netlify to the Railway API service origin.');
}

let railwayApiOrigin;

try {
  railwayApiOrigin = new URL(configuredOrigin);
} catch {
  throw new Error('RAILWAY_API_ORIGIN must be a valid HTTPS origin, for example https://your-api.up.railway.app.');
}

if (
  railwayApiOrigin.protocol !== 'https:' ||
  railwayApiOrigin.pathname !== '/' ||
  railwayApiOrigin.search ||
  railwayApiOrigin.hash
) {
  throw new Error('RAILWAY_API_ORIGIN must be the HTTPS service origin only, with no path, query, or fragment.');
}

const redirects = [
  `/api/* ${railwayApiOrigin.origin}/api/:splat 200!`,
  '/* /index.html 200',
  '',
].join('\n');

await writeFile(resolve('dist', '_redirects'), redirects, 'utf8');