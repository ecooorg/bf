> ImmoFinder was permanently retired on 2026-11-27. ImmoGR is the sole active property-search product. This document is part of the current ImmoGR authority set.

# ImmoGR — Owner Decisions

## D-IMMOGR-001 — Clean replacement, not ImmoFinder repair (2026-11-27)
ImmoFinder is permanently stopped and archived. ImmoGR is a new product with independent source code, engine, configuration, data, search processes, UI, API, and tests. Prior work may be studied only to extract abstract lessons; no legacy code or business logic may be imported, copied, or depended upon.

## D-IMMOGR-002 — Two distinct result categories (2026-11-27)
Direct Rental and Private Owner Prospect have separate mandatory facts, price semantics, and acceptance gates. A seasonal property with unknown long-term price is not a Direct Rental. A prospect score is not a rental offer.

## D-IMMOGR-003 — Preserve legacy archive; no cross-read (2026-11-27)
Keep ImmoFinder source, migrations, tables, snapshots, and diagnostics as historical evidence. ImmoGR must not read or mutate them. No legacy data migration is approved.

## D-IMMOGR-007 — Quarantine legacy runtime and migrations (2026-11-27)

ImmoFinder server modules and the legacy `src/immoCard.ts` helper are excluded from the production server build. Historical migrations 020–030 remain in Git but are excluded before the active migration runner reads migration contents or checks their versions. Existing legacy schema and rows remain preserved unchanged.

## D-IMMOGR-008 — Manual owner signals are not long-term offers (2026-11-27)

A tourism-provider page can be a valuable Private Owner Prospect when it explicitly identifies private/family ownership and provides a property-level contact route. Weekly holiday availability does not prove long-term availability. The Chalet Willi/Arosa page is a manual research example only: it is not a Direct Rental and is not an admitted listing.

## D-IMMOGR-009 — Locality-based target geography (2026-11-27)

The search geography is the exact 44-place list supplied by the owner: 22 important group-1 localities and 22 secondary group-2 localities. Settings may enable group 1, group 2, or both. Every other locality is out of scope. Municipalities are administrative containers and must never be treated as interchangeable with advertised localities or used to broaden a search. Search input, validation, matching, and listing records use the locality name/ID. The prior 100-municipality catalogue and 44-municipality rating workflow are retired.

## D-IMMOGR-014 — Keep official locality names; add postcodes only (2026-11-27)

The Owner confirms that the existing official names for the 44 target localities are sufficient. Do not expand the locality catalogue with spelling aliases, historical names or language variants. A later additive enrichment may add verified official postal codes to the existing locality records without changing names, IDs, group assignments or search geography.

## D-IMMOGR-015 — Chur as a standalone search target (2026-11-27)

Chur is an explicit fourth locality selection, separate from group 1, group 2, and both groups. It is not added to either 22-locality group. The existing 44 owner-defined localities and their group membership remain unchanged; Chur is stored as a standalone locality with target_group 0 and is returned only when groupMode=chur.

## D-IMMOGR-017 — Separate discovery and local research cards (2026-11-27)

Discovery results are rendered as unverified candidate cards and never treated as listings. User-selected local copies may be previewed and saved as human-observed research cards, with an explicit Direct Rental or Private Owner Prospect category. Saved research cards are not admitted listings; qualification requires evidence-backed facts and review.

## D-IMMOGR-018 — Evidence-backed listing extraction from local page copies (2026-11-27)

The Owner wants individual property cards rather than search-result URLs. The first implementation is user-triggered AI analysis of a page copy selected and imported locally. Gemini may split a catalogue into multiple listing candidates, but the server validates every fact against a quotation in submitted text, permits only the original page URL or observed same-source links, and exact-matches localities. Direct Rental and Private Owner Prospect use independent evidence gates. AI suggestions are not saved or admitted automatically. Remote URL Context and browser acquisition are technical retrieval options; extracted candidates remain unverified until evidence validation.
