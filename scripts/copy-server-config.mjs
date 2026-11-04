#!/usr/bin/env node
/** Copy runtime JSON configuration beside the compiled server bundle. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'config', 'source-policy.json');
const destinationDir = path.join(root, 'dist-server', 'config');
const destination = path.join(destinationDir, 'source-policy.json');
if (!fs.existsSync(source)) throw new Error(`Required runtime config is missing: ${path.relative(root, source)}`);
fs.mkdirSync(destinationDir, { recursive: true });
fs.copyFileSync(source, destination);
const sourceJson = JSON.parse(fs.readFileSync(source, 'utf8'));
const copiedJson = JSON.parse(fs.readFileSync(destination, 'utf8'));
if (JSON.stringify(sourceJson) !== JSON.stringify(copiedJson)) throw new Error('Runtime source-policy.json copy verification failed.');
console.log('Copied config/source-policy.json to dist-server/config/source-policy.json');
