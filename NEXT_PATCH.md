# P118.3.3 — Code-stage file marker repair

**Applied order:** P118.3 → P118.3.1 → P118.3.2 → P118.3.3 (this patch). Program version stays 118.

**Why:** the live run on `9ff44ac` passed spec and plan, then failed on the first file: the model returned a complete `index.html` under the header `<<<FILE path>>>index.html` (it copied the placeholder from the prompt) and the parser rejected it.

**What changed:** the coder prompt names the real marker (`PROMPT_VERSION` → `static_site.v2`); the parser accepts three known slips for the expected path and reports them; one bounded repair call per file; precise failure reason; `unit_attempt` / `unit_repair` diagnostics.

**Not evaluated:** hosted CI, the next live run, the remaining units and validators, and ZIP packing/verification.

## Next action
Apply P118.3.3 → green CI → deploy → confirm `/health` commit → dispatch **p118-architect-live** once → record the result. P119 only after the P118 exit gate in `docs/AI-NATIVE-RENOVATION-ROADMAP.md`.

Charter conflicts: none
