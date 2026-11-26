# C131 P131.9 — Source-first replacement and live quality (2026-11-26)
- **OBSERVED:** Three earlier bounded source-first production runs admitted 0 listings; Core CI #45862026277 on d8aa670 failed 15 ImmoFinder assertions. The production service was running d8aa670 when this remediation began.
- **CHANGE:** Align current category tests with the C131 source-first runner, remove automatic legacy-search restoration, and preserve hard locality/room/detail gates.
- **NOT_RUN:** post-change CI, live source workflow, production health identity after this patch, provider availability/spend, three reviewed L1/L2 leads and owner task outcome.

