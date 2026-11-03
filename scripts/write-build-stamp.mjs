#!/usr/bin/env node
/** Write build-stamp.json (commit, patch, time) at build time so diagnostics can compare it with the runtime commit. */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const env = process.env;
let commit = env.RENDER_GIT_COMMIT || env.RAILWAY_GIT_COMMIT_SHA || env.GIT_COMMIT || env.GITHUB_SHA || '';
if (!commit) { try { commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* no git */ } }
let pkg = {};
try { pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); } catch { /* ignore */ }
fs.writeFileSync('build-stamp.json', `${JSON.stringify({ commit: (commit || 'unknown').slice(0, 40), patch: pkg.patch || 'unknown', version: pkg.version || 'unknown', builtAt: new Date().toISOString() }, null, 2)}\n`);
console.log(`build-stamp.json written (commit ${(commit || 'unknown').slice(0, 7)}, patch ${pkg.patch})`);
