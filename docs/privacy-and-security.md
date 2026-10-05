# Privacy and security

## Data flow

Memory content is accepted only through a model tool, an explicit user phrase or the authenticated local dashboard. Every path calls the same governance gate before persistence.

## Threats and controls

| Threat | Control | Remaining limitation |
|---|---|---|
| Credentials accidentally remembered | Private-key, bearer, API-key, JWT, password and AWS-key rules reject before disk | Novel secret formats may not match; users should still avoid submitting credentials |
| Personal data silently enters prompts | Email, phone and identity-number records are quarantined by default | Approved personal data remains plaintext locally |
| Conflicting facts silently influence the model | Same-scope, same-key changes are quarantined; replacement archives old records, coexistence returns alternatives together | Unkeyed or cross-scope contradictions require human judgment; coexistence needs applicable conditions |
| Memory dump consumes the context window | Item and body-character budgets; alternatives cannot be silently split | Metadata, warnings and tool output overhead are outside the body budget |
| Cross-project contamination | Canonical absolute project paths shared by every entry point; legacy unbound projects excluded | Incorrect Global selection remains globally visible; scopes are filtering, not access-control boundaries |
| Search history exposes user intent | Audit stores only a short SHA-256 query fingerprint | Returned memory content remains visible in the Session using it |
| Browser caller mutates memory | DSH Web authentication plus same-origin endpoints and JSON size limits | Do not expose DSH Web directly to untrusted networks |
| Local account compromise | User-only file mode where supported | Store is not application-level encrypted |

## Safe defaults

- no outbound requests;
- no automatic capture of ordinary conversation;
- explicit capture can be disabled;
- PII quarantine enabled;
- secret rejection cannot be disabled;
- quarantined and archived records excluded from recall;
- bounded audit history and recalled body length;
- failed writes leave the previously committed in-memory state intact;
- one Store instance per storage file (no cross-process locking).

## Deleting data

The UI “归档” action is recoverable and removes the item from recall. To permanently erase all plugin data, stop DSH and delete the configured `store.json`. This operation is intentionally not exposed as a one-click Web action.
