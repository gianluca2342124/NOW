# NOW — Ingestion Architecture

> How real Barcelona activity data flows from heterogeneous sources into one
> honest, deduplicated, trust-scored feed the map can render.
>
> The **architecture** described here is implemented in `src/ingestion/` today.
> The **curated adapter** is live; networked adapters are typed and registered
> as _planned_ (they require the serverless layer described in §6).

---

## 1. Design goals

1. **Honesty first** — every activity carries provenance + verification +
   confidence before it ever reaches the UI (see `TRUST_MODEL.md`).
2. **Source-pluggable** — adding a source = adding one `SourceAdapter`. Nothing
   else changes.
3. **Normalized** — all sources collapse into a single `Activity` shape.
4. **Deduplicated** — the same gig from three sources becomes one activity with
   merged attribution and the highest trust.
5. **Churn-safe for the client** — the map consumes a stable array; ingestion
   never re-mounts markers.

---

## 2. Pipeline

```
        ┌─────────────┐   raw   ┌────────────┐  Activity[]  ┌──────────┐
sources │  Adapter A  ├────────►│            ├─────────────►│          │
 (Tier  │  Adapter B  ├────────►│ normalize  ├─────────────►│  dedupe  ├──► Activity[]
 1–3)   │  Adapter C  ├────────►│  + score   ├─────────────►│  + merge │      (sorted)
        └─────────────┘         └────────────┘              └──────────┘
                                       │                          │
                                 verificationStatus         merge attribution,
                                 confidence, freshness       keep highest trust
```

Stages (code):

| Stage | File | Responsibility |
| --- | --- | --- |
| Adapter | `src/ingestion/adapters/*` | Fetch a source, emit `RawActivity[]`. |
| Normalize | `src/ingestion/normalize.ts` | Raw → `Activity`; assign `verificationStatus` baseline, `sourceType`, `confidenceLevel`, `lastCheckedAt`. |
| Score | `src/lib/confidence.ts` | Continuous confidence per activity. |
| Dedupe | `src/ingestion/dedupe.ts` | Merge near-duplicates (title+venue+time), keep best trust, collect sources. |
| Aggregate | `src/ingestion/index.ts` | Run registry → normalize → dedupe → sort. |
| Consume | `src/hooks/useActivities.ts` | Stable feed for the map. |

---

## 3. The `SourceAdapter` contract

```ts
interface SourceAdapter {
  id: string;
  sourceName: string;            // e.g. "Bandsintown"
  sourceType: SourceType;        // official | ticketing | listings | community | curated
  verificationBaseline: VerificationStatus; // trust this source confers
  /** May call a serverless proxy. Must be cancellable + fault-tolerant. */
  fetch(ctx: AdapterContext): Promise<RawActivity[]>;
}
```

A new source is integrated by implementing this once and registering it. The
normalizer and dedupe are source-agnostic.

---

## 4. Normalization & trust assignment

`normalize()` is where provenance becomes trust:

- `verificationStatus` ← adapter baseline, **downgraded** if `sourceUrl` is
  missing (`verified` → `curated`) per the Trust Model.
- `sourceType`, `sourceName`, `sourceUrl` ← from the adapter.
- `lastCheckedAt` ← fetch time (drives freshness/confidence decay).
- `confidenceLevel` ← provider baseline; final confidence computed downstream.
- `verifiedLive` ← **never set by normalization**. Only Tier-1 adapters with a
  valid time window may set it explicitly.

---

## 5. Deduplication & merge

Activities key on `slug(title) + slug(venue) + roundedStartHour`. On collision:

- keep the record with the **highest verification trust**,
- union the `sources` (so the sheet can show "via Bandsintown + Songkick"),
- prefer the most **recent** `lastCheckedAt`,
- keep the tightest known `[startsAt, endsAt]`.

Result: one honest activity, maximally attributed.

---

## 6. Networked sources need a thin serverless layer (the next phase)

NOW is a client-only PWA today. Real third-party ingestion **cannot** run in the
browser because:

- API keys (Eventbrite, Ticketmaster, Bandsintown…) must stay secret — they
  cannot ship in client JS.
- Most of these APIs block cross-origin browser calls (CORS).
- Rate limits and caching belong server-side.

**Recommended minimal architecture (no full backend, no database required):**

```
Browser (PWA)  ──►  /api/activities  (Vercel serverless / edge function)
                         │
                         ├─ fan-out to Tier 1–2 adapters (server-side, with keys)
                         ├─ normalize + dedupe + confidence
                         └─ cache (e.g. 5–15 min, in-memory / KV)
                         ▼
                    Activity[] (already trust-scored)
```

- A single read-only endpoint, scheduled/cached refresh (cron every N minutes).
- No user accounts, no write path, no relational DB — a KV/edge cache suffices.
- The client keeps the exact same `useActivities()` contract; only the curated
  adapter is swapped for an HTTP adapter hitting `/api/activities`.

This is the smallest step that turns NOW from _curated preview_ into _real_,
and it is intentionally **not** built yet — it is the proposed next phase.

---

## 7. Refresh & freshness

- Serverless cache TTL 5–15 min per source class (nightlife faster, museums
  slower).
- Each activity's `lastCheckedAt` feeds confidence decay so stale data visibly
  loses certainty rather than silently lying.
- The client polls `/api/activities` on app focus + a low-frequency interval;
  the stable-reference contract prevents marker churn.

---

## 8. Current implementation status

| Component | Status |
| --- | --- |
| `Activity` model + trust fields | ✅ implemented |
| `deriveTimeState` / `deriveDisplayStatus` (anti-fake-live) | ✅ implemented |
| Confidence scoring | ✅ implemented |
| `SourceAdapter` contract + registry | ✅ implemented |
| Curated adapter (local, honest) | ✅ implemented & live |
| Normalize + dedupe pipeline | ✅ implemented |
| Networked adapters (Eventbrite/Bandsintown/Open Data) | 🔜 scaffolded, require serverless layer (§6) |
| Serverless `/api/activities` | 🔜 next phase |
