#!/usr/bin/env node
/**
 * Read-only Phase 1 schema validator (no network, no writes except stdout/stderr).
 * Schemas live flat under docs/ as schema-<artifact-type>.json (no nested dirs).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCHEMA_DIR = path.join(ROOT, 'docs');

const ARTIFACT_TYPES = [
  'intent-policy-contract',
  'change-impact-plan',
  'verification-plan',
  'evidence-record',
  'artifact-manifest',
  'handoff-report',
  'approval-decision',
];

function schemaPathFor(artifactType) {
  return path.join(SCHEMA_DIR, `schema-${artifactType}.json`);
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadSchema(artifactType) {
  const file = schemaPathFor(artifactType);
  if (!fs.existsSync(file)) {
    throw new Error(`Schema not found for type "${artifactType}": ${file}`);
  }
  return loadJson(file);
}

function loadCommonDefs() {
  const common = loadJson(path.join(SCHEMA_DIR, 'schema-common.json'));
  return common.$defs || {};
}

function resolveRef(ref, localSchema, commonDefs) {
  if (ref.startsWith('#/$defs/')) {
    const key = ref.slice('#/$defs/'.length);
    const fromLocal = localSchema.$defs?.[key];
    if (fromLocal) return fromLocal;
    if (commonDefs[key]) return commonDefs[key];
    throw new Error(`Unresolved $ref: ${ref}`);
  }
  if (ref.includes('schema-common.json#/$defs/')) {
    const key = ref.split('#/$defs/')[1];
    if (!commonDefs[key]) throw new Error(`Unresolved common $ref: ${ref}`);
    return commonDefs[key];
  }
  // backward-compatible accept of older common.schema.json ref form
  if (ref.includes('common.schema.json#/$defs/')) {
    const key = ref.split('#/$defs/')[1];
    if (!commonDefs[key]) throw new Error(`Unresolved common $ref: ${ref}`);
    return commonDefs[key];
  }
  throw new Error(`Unsupported $ref: ${ref}`);
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function validate(value, schema, localSchema, commonDefs, pathParts, errors) {
  if (!schema || typeof schema !== 'object') return;

  if (schema.$ref) {
    validate(value, resolveRef(schema.$ref, localSchema, commonDefs), localSchema, commonDefs, pathParts, errors);
    return;
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeOf(value);
    const ok = types.some((t) => {
      if (t === 'integer') return actual === 'number' && Number.isInteger(value);
      return t === actual;
    });
    if (!ok) {
      errors.push(`${pathParts.join('.') || '$'}: expected type ${types.join('|')}, got ${actual}`);
      return;
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${pathParts.join('.') || '$'}: value ${JSON.stringify(value)} not in enum`);
  }

  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      errors.push(`${pathParts.join('.') || '$'}: string shorter than minLength ${schema.minLength}`);
    }
    if (typeof schema.pattern === 'string') {
      if (!new RegExp(schema.pattern).test(value)) {
        errors.push(`${pathParts.join('.') || '$'}: string does not match pattern ${schema.pattern}`);
      }
    }
  }

  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push(`${pathParts.join('.') || '$'}: number below minimum ${schema.minimum}`);
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      errors.push(`${pathParts.join('.') || '$'}: number above maximum ${schema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      errors.push(`${pathParts.join('.') || '$'}: array shorter than minItems ${schema.minItems}`);
    }
    if (schema.items) {
      value.forEach((item, i) => {
        validate(item, schema.items, localSchema, commonDefs, [...pathParts, String(i)], errors);
      });
    }
  }

  if (typeOf(value) === 'object') {
    for (const key of schema.required || []) {
      if (value[key] === undefined) {
        errors.push(`${pathParts.join('.') || '$'}: missing required property "${key}"`);
      }
    }
    const props = schema.properties || {};
    for (const [key, child] of Object.entries(value)) {
      if (props[key]) {
        validate(child, props[key], localSchema, commonDefs, [...pathParts, key], errors);
      } else if (schema.additionalProperties === false) {
        errors.push(`${pathParts.join('.') || '$'}: additional property "${key}" not allowed`);
      }
    }
  }
}

function evidenceFailClosed(instance, errors) {
  if (!instance || typeof instance !== 'object') return;
  if (instance.status !== 'PASS') return;
  for (const item of Array.isArray(instance.items) ? instance.items : []) {
    if (!item || item.critical !== true) continue;
    const p = item.provenance;
    if (!p || typeof p !== 'object') {
      errors.push(`evidence-record: critical item "${item.id || '?'}" cannot support PASS without provenance`);
      continue;
    }
    const bad = ['UNKNOWN', 'NOT_RUN', 'BLOCKED', 'TIMEOUT', 'PARTIAL', 'FAIL', 'SKIPPED_BY_POLICY'];
    if (bad.includes(p.status)) {
      errors.push(
        `evidence-record: critical item "${item.id || '?'}" has provenance.status=${p.status}; overall status PASS is not allowed`,
      );
    }
  }
}

export function validateArtifact(instance, artifactType) {
  const schema = loadSchema(artifactType);
  const commonDefs = loadCommonDefs();
  const errors = [];
  validate(instance, schema, schema, commonDefs, [], errors);
  if (artifactType === 'evidence-record') evidenceFailClosed(instance, errors);
  return { ok: errors.length === 0, errors, artifactType };
}

function parseArgs(argv) {
  const args = { files: [], type: null, dir: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--type') args.type = argv[++i];
    else if (a === '--file') args.files.push(argv[++i]);
    else if (a === '--dir') args.dir = argv[++i];
    else if (a === '--list-types') args.listTypes = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else args.files.push(a);
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/schemaValidate.mjs --type <artifact-type> --file <instance.json>
  node scripts/schemaValidate.mjs --type <artifact-type> --dir <directory>
  node scripts/schemaValidate.mjs --list-types

Schemas: docs/schema-<artifact-type>.json (flat docs/ tree)
Types:
  ${ARTIFACT_TYPES.join('\n  ')}
`;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(usage());
    process.exit(0);
  }
  if (args.listTypes) {
    process.stdout.write(`${ARTIFACT_TYPES.join('\n')}\n`);
    process.exit(0);
  }
  if (!args.type || !ARTIFACT_TYPES.includes(args.type)) {
    process.stderr.write(`error: --type must be one of: ${ARTIFACT_TYPES.join(', ')}\n`);
    process.exit(2);
  }
  let files = [...args.files];
  if (args.dir) {
    const dir = path.resolve(args.dir);
    files.push(...fs.readdirSync(dir).filter((n) => n.endsWith('.json')).map((n) => path.join(dir, n)));
  }
  if (!files.length) {
    process.stderr.write('error: provide --file and/or --dir\n');
    process.exit(2);
  }

  let failed = 0;
  for (const file of files) {
    const abs = path.resolve(file);
    let instance;
    try {
      instance = loadJson(abs);
    } catch (err) {
      process.stderr.write(`${abs}: FAIL (cannot parse JSON: ${err.message})\n`);
      failed += 1;
      continue;
    }
    const result = validateArtifact(instance, args.type);
    if (result.ok) process.stdout.write(`${abs}: PASS\n`);
    else {
      failed += 1;
      process.stderr.write(`${abs}: FAIL\n`);
      for (const e of result.errors) process.stderr.write(`  - ${e}\n`);
    }
  }
  process.exit(failed ? 1 : 0);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

export { ARTIFACT_TYPES, SCHEMA_DIR, schemaPathFor };
