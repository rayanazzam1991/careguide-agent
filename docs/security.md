# Security and privacy decisions

- Synthetic demo identities and schedules only.
- No raw conversation text in the public operations dashboard.
- OpenAI response storage disabled.
- Same-origin mutation checks, 64 KB request limit, signed HttpOnly session cookies, and database-backed rate limiting.
- Strict tool schemas and server-side state validation remain authoritative over model output.
- Every booking requires explicit approval and an active session-owned hold.
- RLS is enabled on every table; direct public table grants are revoked.
- Public roles receive only narrow RPC execution grants.
- Holds and confirmations use row locks and idempotency keys.
- Containers run non-root, read-only, capability-free, and without Docker socket or persistent application storage.

The emergency matcher is intentionally conservative and non-diagnostic. It only interrupts explicit language and supplies fixed official Austrian contact numbers. It does not rank urgency or claim to assess the user.

Before accepting real data, add authenticated patient/provider roles, retention and deletion controls, consent records, encryption/key-management review, DPIA, vendor DPAs, regional processing verification, clinician-approved content governance, accessibility audit, penetration test, and incident-response ownership.
