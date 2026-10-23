#!/usr/bin/env node
import { baselineMetrics } from './architectureContextLib.mjs';
console.log(JSON.stringify(baselineMetrics(), null, 2));
