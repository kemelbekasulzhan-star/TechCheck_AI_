import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// Keep local startup self-contained and avoid writing global telemetry settings.
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ''} --preserve-symlinks`.trim();
const require = createRequire(import.meta.url);
await import(pathToFileURL(require.resolve('next/dist/bin/next')).href);
