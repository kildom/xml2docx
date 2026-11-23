import * as fs from 'node:fs';
import { build } from 'esbuild';


await build({
    entryPoints: ['src/doctml.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    target: 'node18',
    sourcemap: true,
    outfile: 'dist/esm/doctml.js',
});

fs.writeFileSync(
    'dist/cjs/package.json',
    JSON.stringify({ type: 'commonjs' }, null, 4) + '\n',
    'utf8'
);
