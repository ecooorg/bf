## P130.16 — Human-style listing verify (in progress)

- **GOAL:** Reject sale objects mis-read as rent (Flims Zweitwohnung / Kaufpreis CHF 1'380'000 stored as 1390/month).
- **LANDED:** ensure-repair wires `immofinder-p13016-verify-hygiene.mjs`; scripts-integrity allowlist; `tests/immofinder-verify.test.mjs` (Flims fixture); refresh restored after placeholder incident.
- **PENDING on next green CI:** apply full core L1/L4 patches (Zweitwohnung, sale-context parsePrice, price_sale_mismatch, verifyListingFromPageText, crossSourceIndicatesSale) via hygiene on main; L2 hide on Recheck feed; package patch 130.16.
- **VERSION:** targeting patch 130.16 / REPAIR 130.16.5.

