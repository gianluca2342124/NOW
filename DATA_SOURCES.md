# NOW — Barcelona Data Sources

> Real-data acquisition strategy for answering _"what is happening in Barcelona
> right now?"_ from verifiable sources.
>
> Sources are tiered by reliability. For each: expected coverage, integration
> difficulty, freshness, legal considerations, recommended phase, and — most
> importantly — **whether it can support a `live_now` claim** (see
> `TRUST_MODEL.md`).

Legend — Difficulty: ⬤ low · ⬤⬤ medium · ⬤⬤⬤ high. Freshness: how close to
real-time the data realistically is.

---

## Tier 1 — Structured / official / legal

The backbone of a trustworthy product. High legal safety, high trust, can back
`verified` / `official_source`.

| Source | Coverage | Difficulty | Freshness | Legal | Live-capable | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| **Barcelona Open Data (opendata-ajuntament.barcelona.cat)** | Cultural agenda, markets, civic events, fairs | ⬤⬤ | Daily / scheduled | ✅ Open license (CC-BY) | ⚠️ Scheduled, rarely intra-day live | **2** |
| **Ajuntament "Agenda" / cultura feeds** | Official city cultural & civic agenda | ⬤⬤ | Daily | ✅ Open | ⚠️ Scheduled | **2** |
| **Cultural institutions (MACBA, CCCB, MNAC, Fundació Miró…)** | Exhibitions, late openings, talks | ⬤⬤ | Daily–weekly | ✅ Public listings; confirm reuse | ✅ With opening hours → live window | **2** |
| **Museum / venue official calendars (iCal / JSON)** | Per-venue programming | ⬤⬤ | Daily | ✅ Usually public | ✅ Hours define live window | **2–3** |
| **Sports fixture APIs (LaLiga / FCB official, ACB)** | Football, basketball fixtures | ⬤⬤ | Real-time on matchday | ⚠️ Official APIs gated; respect ToS | ✅ Kickoff/end → true live | **3** |
| **Ticketing APIs (official venue box offices)** | On-sale & scheduled events | ⬤⬤ | Daily | ⚠️ Per-API ToS + keys | ✅ Start times | **3** |

**Why Tier 1 first:** it is the only tier that can legally and reliably support
real `live_now` claims (institutional opening hours and verified fixtures).

---

## Tier 2 — Semi-structured platforms (APIs / partner)

Broad coverage, good for nightlife/music/food. Generally requires API keys and
ToS compliance; trust level `verified` when source-linked.

| Source | Coverage | Difficulty | Freshness | Legal | Live-capable | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| **Eventbrite API** | Food, community, workshops, some music | ⬤ | Hourly–daily | ⚠️ API ToS, attribution | ⚠️ Scheduled; start times reliable | **2** |
| **Meetup API** | Community, tech, social, sports meetups | ⬤⬤ | Daily | ⚠️ API ToS (gated) | ⚠️ Scheduled | **2** |
| **Bandsintown API** | Live music / concerts | ⬤ | Daily | ⚠️ API ToS, attribution | ✅ Set times for live music | **2** |
| **Songkick API** | Concerts, festivals | ⬤⬤ | Daily | ⚠️ API key + ToS | ✅ Set times | **2–3** |
| **Ticketmaster Discovery API** | Large venues, concerts, sports | ⬤ | Daily | ⚠️ API ToS, attribution | ✅ Start times | **3** |
| **Fever** | Experiences, exhibitions, nightlife | ⬤⬤⬤ | Daily | ⚠️ No open API; partnership/manual | ⚠️ Scheduled | **3–4** |
| **DICE** | Nightlife, gigs | ⬤⬤⬤ | Daily | ⚠️ No public API; partnership | ✅ Set times | **3–4** |
| **Resident Advisor (RA)** | Electronic / club nights | ⬤⬤⬤ | Daily | ⚠️ Partnership / manual only | ✅ Set times | **4 / manual** |

**Why Tier 2:** fastest path to _volume_. Eventbrite + Bandsintown are the two
quickest real integrations (open-ish APIs, good Barcelona coverage).

---

## Tier 3 — Manual / editorial curation

Human-in-the-loop. High trust when done well, low scale. Backs `curated`.

| Source | Coverage | Difficulty | Freshness | Legal | Live-capable | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| **NOW editorial curation** | Hand-picked highlights, all categories | ⬤ | Manual | ✅ Own content | ❌ `curated` only | **1 (now)** |
| **Promoter / venue newsletters** | Nightlife, music | ⬤ | Weekly | ✅ With consent | ❌ until verified | **3** |
| **University / institution pages** | Talks, culture, civic | ⬤⬤ | Weekly | ✅ Public | ⚠️ Scheduled | **3** |
| **Local community calendars / RSS** | Neighborhood, civic, markets | ⬤ | Daily | ✅ RSS is designed for reuse | ⚠️ Scheduled | **2–3** |
| **Monitored Instagram venue accounts (manual)** | Nightlife, food pop-ups | ⬤⬤ | Same-day (manual) | ⚠️ Manual viewing only; no scraping | ⚠️ Manual confirm | **3** |

---

## Tier 4 — Risky / avoid for now

Do **not** build on these yet. Legal/ToS/ethical risk outweighs value.

| Source | Why avoid | Status |
| --- | --- | --- |
| Scraping Instagram | ToS violation, fragile, legal risk | ❌ Avoid |
| Scraping Facebook Events | ToS violation, anti-bot, legal risk | ❌ Avoid |
| Private WhatsApp / Telegram channels | Consent + privacy + unverifiable | ❌ Avoid |
| Generic web scraping of ticketing sites | ToS + reliability | ❌ Avoid |

---

## City coverage strategy

Target balanced coverage across NOW's categories. Primary source per category
(first realistic integration in **bold**):

| Category | Primary sources |
| --- | --- |
| **Nightlife** | **Bandsintown**, DICE (partner), RA (manual), venue IG (manual) |
| **Music** | **Bandsintown**, Songkick, Ticketmaster, venue calendars |
| **Sports** | **Official fixture APIs (LaLiga/FCB/ACB)** — verified only |
| **Culture** | **Cultural institution calendars**, Barcelona Open Data |
| **Food** | **Eventbrite**, markets open data, curation |
| **Community / civic** | **Barcelona Open Data / city agenda**, Meetup, RSS |
| **Markets** | **Barcelona Open Data (markets)**, venue calendars |
| **Exhibitions** | **Museum feeds (MACBA/CCCB/MNAC)**, institution calendars |

**Recommended first three integrations (days–weeks):**
1. **Barcelona Open Data** (culture + markets + civic) — open license, high trust.
2. **Eventbrite API** (food + community + workshops) — easy API, good volume.
3. **Bandsintown API** (live music) — easy API, real set times → live-capable.

These three give honest, source-attributed coverage across most categories with
the lowest legal/integration risk, and two of them can back real live windows.

---

## Source → trust mapping

| Source class | `sourceType` | Default `verificationStatus` | Live-capable |
| --- | --- | --- | --- |
| City open data / official venue | `official` | `official_source` | ✅ |
| Ticketing / listings API (source-linked) | `ticketing` / `listings` | `verified` | ✅ (set times) |
| RSS / community calendar | `listings` | `verified` (if linkable) else `curated` | ⚠️ |
| Community / user report | `community` | `community_reported` | ❌ |
| NOW editorial | `curated` | `curated` | ❌ |
