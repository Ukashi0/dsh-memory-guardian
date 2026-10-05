# Changelog

## 0.1.1-beta.1 - 2026-10-05

- Require lexical evidence before importance, recency or pin boosts can admit a recall candidate.
- Add explicit replacement/coexistence review, fresh review tokens and HTTP 409 stale-review handling.
- Commit lifecycle changes transactionally within one Store instance; preserve committed state on persistence failure.
- Return same-topic alternatives together, with explicit metadata and whole-group budget warnings.
- Recheck conflicts on restore, identity edits and key attachment during deduplication.
- Share absolute project-directory normalization across dashboard API, tools and explicit capture; add project suggestions and manual legacy binding.
- Add Store, simulated Host and client request regression tests; update source, declarations and bundled lib.
- Real DSH Web installation and visual acceptance remain pending; no package has been published by this revision.

## 0.1.0 - 2026-09-09

- Added local-first persistent memory storage with atomic writes.
- Added secret rejection, personal-data quarantine, deduplication, semantic-key conflicts, scope, provenance, lifecycle, and audit records.
- Added bounded lexical recall with CJK support and explainable scoring.
- Added `memory_remember`, `memory_search`, and `memory_forget` model tools.
- Added explicit “remember” capture through the stable `session/event` contract.
- Added Memory Vault, Recall Lab, Review Queue, and Privacy Ledger Web views.
- Added Host API, JSON export, tests, security documentation, and DSH bundle metadata.
