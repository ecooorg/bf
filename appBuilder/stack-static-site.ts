/** static_site stack: template plan and limits. Pure data; no execution of generated code. */
import { SCHEMA_VERSION, type Plan, type Spec, type Unit } from './core-types.ts';
import { sha256 } from './core-cache.ts';

export const STATIC_SITE_ID = 'static_site';
export const MAX_FILES = 8;
export const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

function unit(id: string, path: string, purpose: string, dependsOn: string[], contract: string, maxOutputTokens: number): Unit {
  return { id, kind: 'file', path, purpose, dependsOn, exports: [], contract, maxOutputTokens, status: 'pending', attempts: 0 };
}

/** Default plan used when model planning fails. Files open by double-click: no build tools, no CDN. */
export function templatePlan(spec: Spec): Plan {
  const units = [
    unit('style', 'style.css', `Styles for: ${spec.goal}`, [], 'CSS classes/ids used by index.html', 1500),
    unit('app', 'app.js', `Behaviour for: ${spec.goal}`, [], 'Plain browser JS; uses DOM ids from index.html; no imports', 2048),
    unit('index', 'index.html', `Entry page for: ${spec.title}`, ['style', 'app'], 'Links style.css and app.js (relative paths)', 1500),
    unit('readme', 'README.md', 'How to open and use the project', ['index'], 'Short usage notes', 600),
  ];
  return { schemaVersion: SCHEMA_VERSION, specHash: sha256(JSON.stringify(spec)), units, order: units.map((u) => u.id) };
}
