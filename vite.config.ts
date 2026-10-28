import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const rootPackageJson = path.join(rootDir, 'package.json');

/** The browser bundle gets only package.json version/patch, never scripts or other fields. */
const VIRTUAL_PACKAGE = '\0version-only-package-json';
const versionOnlyPackageJson = () => ({
  name: 'version-only-package-json',
  enforce: 'pre' as const,
  async resolveId(this: any, source: string, importer?: string, options?: any) {
    if (!source.endsWith('package.json')) return null;
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
    return resolved && path.normalize(resolved.id) === rootPackageJson ? VIRTUAL_PACKAGE : null;
  },
  load(id: string) {
    if (id !== VIRTUAL_PACKAGE) return null;
    const { version, patch } = JSON.parse(fs.readFileSync(rootPackageJson, 'utf8'));
    return `export default ${JSON.stringify({ version, patch })};`;
  },
});

export default defineConfig(() => {
  return {
    plugins: [versionOnlyPackageJson(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

