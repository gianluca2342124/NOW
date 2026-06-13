# NOW — Barcelona

A map-first, real-time activity map for Barcelona. Open it and feel the city
come alive: animated bubbles for what's happening **now**, starting soon, or
on tonight.

This repository is the **Phase 2 public demo**. It makes NOW feel like a real
premium consumer app: live geolocation, premium iconography, filters, a
relevance-driven bubble hierarchy, and a refined bottom sheet. There is
intentionally **no backend, database, auth, accounts, AI, payments, or
ingestion** yet — all event data is hardcoded in `src/data/events.ts` with a
shape that mirrors a future API.

## Tech stack

- React + Vite + TypeScript
- Mapbox GL JS
- Tailwind CSS
- Framer Motion
- Zustand
- lucide-react (premium icons)
- PWA (vite-plugin-pwa)
- pnpm

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure your Mapbox token
cp .env.example .env
# then edit .env and paste your Mapbox public token

# 3. Run the dev server
pnpm dev
```

Open the printed local URL on your phone (same Wi-Fi) or in a mobile-emulated
browser viewport for the intended experience.

## Environment variables

| Variable             | Required | Description                                                                                  |
| -------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `VITE_MAPBOX_TOKEN`  | **Yes**  | Your Mapbox GL public access token. Get one at https://account.mapbox.com/access-tokens/     |
| `VITE_MAPBOX_STYLE`  | No       | Custom Mapbox Studio style URL. Falls back to `mapbox://styles/mapbox/dark-v11` when not set. |

Without a token the app renders a friendly "add your token" overlay instead of
the map.

## How to test the demo

1. Run `pnpm dev` with a valid `VITE_MAPBOX_TOKEN` (or open the deployed URL).
2. The map loads centered on Barcelona with animated event bubbles, and a
   premium **location primer** slides up over the live map.
3. **Location** — tap *Enable location*: the map flies to you, a refined blue
   "you are here" marker appears, distances become real, and nearer events grow
   more prominent. The recenter button (bottom-right) re-centers / re-requests.
   *Not now* falls back gracefully to Barcelona centre.
   > Geolocation only works over **HTTPS** (the Vercel URL) or `localhost`, not
   > over a LAN `http://192.168…` address.
4. **Bubble hierarchy** — size reflects *relevance* (live + proximity +
   importance + starting-soon); motion reflects live *status* so `live` events
   pulse hardest and `upcoming` ones stay calm.
5. **Filters** — the floating chips filter by time (**Now / Tonight /
   Tomorrow**) and category (Music, Nightlife, Sports, Culture, Food, Civic).
   Bubbles animate in/out; markers never churn.
6. **Tap a bubble** → a refined glass bottom sheet with category icon, status,
   real distance, time, venue, description, a **Go** button (Google Maps
   directions) and a small **View source** link when the event has one.
7. The header shows a live "N live now" pulse counter.

## Available scripts

```bash
pnpm dev        # start the dev server
pnpm build      # type-check + production build
pnpm preview    # preview the production build
pnpm typecheck  # type-check only
```

## Project structure

```
src/
├── App.tsx                       # composition: map + header + filters + sheet
├── main.tsx
├── index.css                     # Tailwind layers, glass + Mapbox styling
├── types/event.ts                # NowEvent, EventCategory, EventStatus
├── data/events.ts                # 19 curated Barcelona events (relative times)
├── lib/
│   ├── time.ts                   # status derivation + time labels
│   ├── geo.ts                    # distance + Google Maps deep link
│   ├── categories.ts             # category (Lucide icons) & status config
│   ├── filters.ts                # time + category filter predicates
│   ├── relevance.ts              # blended relevance scoring (bubble size)
│   └── bubble.ts                 # bubble geometry/motion constants
├── store/useNowStore.ts          # Zustand: selection, filters, user location
├── hooks/
│   ├── useNow.ts                 # ticking live clock
│   └── useGeolocation.ts         # live watchPosition + permission status
└── components/
    ├── map/MapView.tsx           # Mapbox GL init, stable markers, relevance
    ├── map/EventBubble.tsx       # animated bubble (Framer Motion + Lucide)
    ├── map/UserLocationMarker.tsx
    ├── map/RecenterButton.tsx
    ├── map/MapErrorState.tsx
    ├── filters/FilterBar.tsx     # floating time + category chips
    ├── permission/LocationPrimer.tsx
    ├── sheet/EventSheet.tsx      # glass bottom sheet
    ├── ui/StatusPill.tsx
    └── ErrorBoundary.tsx
```

## Notes & known limitations

- **Geolocation requires HTTPS** (deployed URL) or `localhost`. Over a LAN
  `http://` address the browser won't prompt; the app falls back to Barcelona
  centre and distances read "from centre".
- **Map style** is stock `dark-v11` with a warm overlay/fog tuning. A custom
  premium Mapbox Studio style can be dropped in later via `VITE_MAPBOX_STYLE`.
- Event data is hardcoded with times relative to app load, so on every open some
  events are live, some starting soon, some later tonight, and some tomorrow.
- PWA icons (192/512 + apple-touch-icon) are generated by `pnpm icons`
  (`scripts/generate-icons.mjs`) and committed to `public/icons`.
- All motion respects `prefers-reduced-motion` (pulses collapse to static
  glows). Missing/invalid/expired Mapbox tokens show a graceful on-brand error
  state, and the map is wrapped in an error boundary.
