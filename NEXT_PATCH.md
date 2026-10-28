# P118.3.2 — Single version source and documentation audit

**Applied order:** P118.3 → P118.3.1 (CI repair) → P118.3.2 (this patch). Program version stays 118.

**What changed:** the version lives only in `package.json` (`patch`, `version`); every patch must include `package.json`; the version gate checks nothing else, so a version mismatch between files can no longer fail CI. Documentation brought in line with the real state (report, task, roadmap with the P118 exit gate, index, rules).

**Not evaluated:** hosted CI of P118.3.1/P118.3.2 and the live Architect run on the new build (the last live run executed the old engine, commit `7c51c5e`).

## Next action
Apply P118.3.1 then P118.3.2 → green CI → deploy → confirm `/health` commit → dispatch **p118-architect-live** once → record the result; P119 only after the P118 exit gate in `docs/AI-NATIVE-RENOVATION-ROADMAP.md`.

Charter conflicts: none
