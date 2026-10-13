# Evidence JSON → Markdown renderer (pilot tool candidate)

The dependency-free pilot CLI is `scripts/evidence-to-markdown.mjs` (under 100 lines). To trial it in `ecooorg/biforge-e01-lab`, copy that file to the lab repository and run:

```sh
node scripts/evidence-to-markdown.mjs --input evidence.json --out evidence.md
```

It only reads JSON and writes Markdown; it does not call services, change evidence, push commits, open PRs, or approve gates. It renders a small allowlist of fields, sanitizes common token/secret patterns, and labels the output as a rendering rather than independent verification. Review the output before using it as a report; source evidence remains authoritative.

The current repository acceptance test is `tests/evidence-markdown.test.mjs`; `npm run test:evidence-markdown` is included in `npm run check`.
