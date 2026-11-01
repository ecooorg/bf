/**
 * C123 P123.3 — Load model sources catalog (config/model-sources.json).
 * Secrets stay in env; this file is public metadata only.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface CatalogModel {
  id: string;
  role?: 'light' | 'strong' | string;
}

export interface CatalogSource {
  id: string;
  channel: 'api' | 'browser';
  provider: string;
  adapter: string;
  enabled: boolean;
  priority: number;
  data_classes: string[];
  models: CatalogModel[];
  base_url?: string;
  key_pool?: { env_names: string[]; max_slots?: number };
  notes?: string;
}

export interface ModelSourcesCatalog {
  schema_version: number;
  sources: CatalogSource[];
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_PATH = path.join(root, 'config', 'model-sources.json');

export function loadModelSourcesCatalog(filePath: string = DEFAULT_PATH): ModelSourcesCatalog {
  if (!existsSync(filePath)) {
    return { schema_version: 1, sources: [] };
  }
  const raw = JSON.parse(readFileSync(filePath, 'utf8')) as ModelSourcesCatalog;
  if (raw.schema_version !== 1) {
    throw new Error(`Unsupported model-sources schema_version: ${raw.schema_version}`);
  }
  if (!Array.isArray(raw.sources)) {
    throw new Error('model-sources.sources must be an array');
  }
  return raw;
}

/** Enabled sources sorted by priority (desc). */
export function enabledSources(
  catalog: ModelSourcesCatalog,
  dataClass: string = 'public'
): CatalogSource[] {
  return catalog.sources
    .filter((s) => s.enabled && (s.data_classes || ['public']).includes(dataClass))
    .sort((a, b) => b.priority - a.priority);
}

/** Source is runnable only if at least one key env is non-empty. */
export function sourceHasCredentials(source: CatalogSource, env: NodeJS.ProcessEnv = process.env): boolean {
  const names = source.key_pool?.env_names || [];
  return names.some((n) => Boolean(String(env[n] || '').trim()));
}

export function runnableSources(
  catalog: ModelSourcesCatalog,
  env: NodeJS.ProcessEnv = process.env,
  dataClass: string = 'public'
): CatalogSource[] {
  return enabledSources(catalog, dataClass).filter((s) => sourceHasCredentials(s, env));
}

/**
 * P123.5: optionally treat a disabled catalog source as enabled when its first key env is set
 * and CAROUSEL_AUTO_ENABLE=true (ops/experimental). Default off — Navigator enables sources in JSON.
 */
export function withEnvAutoEnable(
  catalog: ModelSourcesCatalog,
  env: NodeJS.ProcessEnv = process.env
): ModelSourcesCatalog {
  if (env.CAROUSEL_AUTO_ENABLE !== 'true') return catalog;
  return {
    ...catalog,
    sources: catalog.sources.map((s) => {
      if (s.enabled) return s;
      if (!sourceHasCredentials(s, env)) return s;
      return { ...s, enabled: true };
    }),
  };
}
