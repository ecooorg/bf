/**
 * Aggregated source text for static contract tests after the p73/p74 module split.
 * Prefer these helpers over reading only server.ts / App.tsx.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  const p = join(root, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

/** server.ts + extracted route modules */
export function serverSources() {
  return [
    read('server.ts'),
    read('server/projectRoutes.ts'),
    read('server/authRoutes.ts'),
    read('server/opsRoutes.ts'),
    read('server/compatibilityRoutes.ts'),
    read('server/healthRoutes.ts'),
  ].join('\n');
}

/** App shell + extracted UI modules */
export function appSources() {
  return [
    read('src/App.tsx'),
    read('src/AppHeader.tsx'),
    read('src/ExpertStepScreens.tsx'),
    read('src/ConversationScreens.tsx'),
    read('src/appApi.ts'),
    read('src/ErrorBoundary.tsx'),
  ].join('\n');
}

export { root as repoRoot, read as readRepoFile };
