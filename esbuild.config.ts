import esbuild from 'esbuild';

const commonOptions: esbuild.BuildOptions = {
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  sourcemap: true,
  outdir: 'dist',
  packages: 'external',
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
};

await Promise.all([
  esbuild.build({ ...commonOptions, entryPoints: ['src/main.ts'] }),
  esbuild.build({ ...commonOptions, entryPoints: ['src/cluster.ts'] }),
]);

console.log('Build complete.');
