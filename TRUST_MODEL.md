# NOW — Trust Model

> How NOW decides what it is allowed to claim about reality.
> The product promise is _"what is happening around me right now?"_ — so the
> single most important engineering constraint is: **never present something as
> live/true unless the data justifies it.**

This document is the source of truth for the verification and confidence system
implemented in `src/types/activity.ts`, `src/lib/status.ts`,
`src/lib/confidence.ts`, and `src/lib/verification.ts`.

---

## 1. The core rule

> NOW must not claim something is live unless it is based on real, verified,
> time-valid data.

Everything below exists to enforce that rule in code.

---

## 2. Verification model

Every activity carries a `verificationStatus`. There are exactly five values,
ordered by descending trust:

| Status               | Meaning                                                                 | Can support `live_now`? |
| -------------------- | ----------------------------------------------------------------------- | ----------------------- |
| `official_source`    | From an authoritative origin — city open data, the venue, the promoter. | ✅ (with a valid window) |
| `verified`           | Cross-checked against a real, reachable `sourceUrl`.                     | ✅ (with a valid window) |
| `curated`            | Hand-curated by NOW. Plausible, realistic, but **not** source-verified. | ❌ never                 |
| `community_reported` | Reported by a user / community channel. Unconfirmed.                    | ❌ never                 |
| `unknown`            | Provenance unknown. Shown muted; treated as `unverified`.               | ❌ never                 |

`sourceType` records _where_ the data came from (`official`, `ticketing`,
`listings`, `community`, `curated`) and is independent of trust level.

---

## 3. The `verifiedLive` gate (the anti-fake-live rule)

`live_now` is the only display state that asserts real-world truth, so it is the
most tightly gated state in the system. An activity is shown as **Live now**
if and only if **all** of these hold:

1. `verifiedLive === true` — an explicit, deliberate assertion in the data (it
   is never inferred from timing alone).
2. `endsAt` is present (rule: without an end time we can never know it is still
   happening).
3. The current time is within `[startsAt, endsAt)`.
4. `verificationStatus` is `official_source` or `verified`.

If any condition fails, the activity **cannot** be labelled Live now — full
stop. This is enforced in `deriveDisplayStatus()` and cannot be bypassed by the
UI.

> **Demo consequence:** the current curated dataset has `verifiedLive: false`
> on every activity, because none of it is source-verified live. Therefore the
> public demo shows **zero** "Live now" claims. The city still feels alive
> through ambient animation, honest "On now / Tonight" scheduling, and the
> activity density of the map — never through a false live claim.

---

## 4. Display status derivation

`displayStatus` is what the user sees. It is derived, never stored:

```
deriveTimeState(activity, now):
  ended      → now >= endsAt
  ongoing    → startsAt <= now < endsAt           (requires endsAt)
  soon       → starts within the next 60 minutes
  today      → starts later today
  tomorrow   → starts tomorrow
  later      → starts after tomorrow
  (started but no endsAt → "today", never "ongoing")

deriveDisplayStatus(activity, now):
  cancelled                      → ended
  timeState ended                → ended
  verificationStatus unknown     → unverified
  verifiedLive && ongoing && trusted → live_now      // the ONLY path to live
  soon                           → starting_soon
  ongoing | today                → tonight           // honest, never "live"
  tomorrow | later               → tomorrow
```

Rules enforced (mapping to the product requirements):

1. Live only inside `[startsAt, endsAt)`. ✔
2. Missing `endsAt` ⇒ never live. ✔
3. Demo/curated data ⇒ never live without `verifiedLive` + a visible label. ✔
4. Missing `sourceUrl` ⇒ shown as **Curated**, never **Verified**. ✔
   (Verification badge downgrades automatically.)
5. Stale data ⇒ confidence drops (see §5); never presented as live. ✔
6. Ended activities are filtered out of the Now view. ✔
7. Sports are never invented — fixtures must be `verified`/`official_source`
   with a `sourceUrl`, and are shown scheduled (Tonight/Tomorrow), never
   fabricated as live. ✔
8. Civic/protest activities are only shown when publicly sourced; otherwise
   `community_reported` with reduced confidence and no live claim. ✔

---

## 5. Confidence score

Independently of the live gate, every activity gets a continuous
`confidence ∈ [0,1]` (`src/lib/confidence.ts`) blending:

- **Verification weight** — `official_source` 1.0 → `unknown` 0.2.
- **Source presence** — a reachable `sourceUrl` boosts confidence.
- **Freshness** — decays from `lastCheckedAt`: ~full within 24h, degrading over
  a week. Stale data is visibly less confident.
- **Provider baseline** — the source's own `confidenceLevel`.

It surfaces to users only as a coarse, premium label (**High / Medium / Low**)
next to the verification badge — never as a raw number.

---

## 6. Source attribution

Trust is only meaningful if it is visible. Every activity in the bottom sheet
shows:

- a **verification badge** (Official source / Verified / Curated / Community /
  Unverified),
- the **source name**,
- a **View source** link when `sourceUrl` exists,
- a **"Checked …"** freshness line derived from `lastCheckedAt`.

At the app level, while the dataset is not live-verified, a subtle global
**"Curated preview"** chip discloses that NOW is showing a curated preview, not
live-verified reality. The user is never asked to take the map on faith.

---

## 7. What this guarantees

- No fabricated live events.
- No "live" implied by demo timing.
- No "Verified" badge without a source.
- Honest degradation: unknown/stale/community data looks less certain.
- A single, auditable code path (`deriveDisplayStatus`) for every live claim.
