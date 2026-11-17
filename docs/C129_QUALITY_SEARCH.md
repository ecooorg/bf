# C129 — Quality Search (ImmoFinder)

## Status of the product

**Searcher construction is finished** (through P128.x): whitelist communes, Serper discovery, catalogues, two-stage waves, geo/agency filters, contact enrich, price extraction (`parsePrice` / `resolveListingPrice`), Drive/email/Telegram, settings UI, reset/wipe.

**C129 onwards is quality work**, not greenfield feature scaffolding:

- more **live private** long-term leads per day;
- reliable **CHF prices** and contacts on cards;
- **coverage of all communes** without one giant burst;
- less agency/junk/booking noise.

## Operating modes

| Profile / wave | Intent |
|---|---|
| **carousel** (default schedule) | Next *N* communes (default **2**) via Google (Serper) + model extract. Catalogues skipped on the tick. `cycle = realRunCount`. ~22 hourly ticks → full whitelist. |
| **priority (Stage 1)** | Burst: high-value search slice + phase-1 catalogues, ~10 min budget. |
| **extended (Stage 2)** | Remaining discovery + phase ≥2 sources. |
| **full** | Stage 1 + Stage 2; may cover all communes in discovery when `allCommunes` is on. |

Settings: `search.profile = carousel | burst`, `carouselCommunesPerRun`, schedule hourly recommended for carousel.

## External models + Google

- **Serper** = live URLs/snippets (source of truth for what exists today).
- **LLM (Gemini etc. via BiForge model router)** = extract facts from fetched/snippet text (`price_quote`, rooms, agency). Router policy rotates models on limits — same carousel idea as commune ticks.
- Do **not** treat bare model answers without URL verification as listings.

## For the next assistant

1. Prefer **quality metrics** (kept private with phone/email, price filled, in-zone) over new sources unless evidence says a source is dead.
2. Read `docs/EXPERIMENTS.md` EXP-IMMO-3 and latest CHANGELOG P129.
3. Do not re-litigate pipeline basics (seen-cache, wave flags, polite fetch) unless broken.
4. Carousel + price extraction are the primary levers for “too few / no price” complaints.

## Navigator quick check

1. Settings → profile **Carousel**, communes per tick **2**, schedule **every 1h** (or 3h).
2. Save → **Carousel tick** once → progress must name a small commune subset.
3. After many ticks (or forced cycle), other communes must appear.
4. Cards: price when the page text contains CHF/Fr.
