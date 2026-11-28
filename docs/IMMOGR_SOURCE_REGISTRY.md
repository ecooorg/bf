# ImmoGR — Source Inventory

This document describes the source inventory as technical input to the search engine. The structured inventory is maintained in `config/immogr/sources.json`.

Each entry identifies a source, its category, canonical homepage and known product characteristics. The inventory is extensible: new sources can be added without creating a permission-status record. Source usefulness is determined by repeatable technical retrieval and extraction tests, with results recorded as observations rather than access-policy decisions.

The source inventory is not the search engine itself. It supplies source identity and technical metadata to the discovery, retrieval, parsing and evaluation stages.
