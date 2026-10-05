# Security Policy

## Supported versions

Security fixes are provided for the latest released version.

## Reporting a vulnerability

Please open a private security report with the repository owner. Do not include live credentials, private conversation logs, or an unredacted memory store in a public issue.

Useful reports include the plugin version, DSH version, operating system, minimal reproduction, expected result, actual result, and a synthetic test payload.

## Security properties

- Known credential formats are rejected before persistence.
- Personal identifiers are quarantined by default.
- Quarantined and archived records are never returned by recall.
- Search audit entries retain a digest, not the raw query.
- The plugin performs no outbound network requests.
- Mutation requests are constrained to the authenticated same-origin DSH Web server and a bounded JSON body.

These controls reduce accidental leakage; they do not replace operating-system account isolation, disk encryption, DSH Web authentication, or network access controls.

