import type { ReactNode } from 'react';

export type MapErrorVariant = 'missing' | 'auth' | 'unknown';

interface MapErrorStateProps {
  variant: MapErrorVariant;
}

const COPY: Record<MapErrorVariant, { title: string; body: ReactNode }> = {
  missing: {
    title: 'Almost there',
    body: (
      <>
        Add a Mapbox public token to see the city come alive. Create a{' '}
        <Code>.env</Code> file with <Code>VITE_MAPBOX_TOKEN</Code>, then restart
        the dev server.
      </>
    ),
  },
  auth: {
    title: 'Map unavailable',
    body: (
      <>
        Your Mapbox token was rejected — it may be invalid, expired, or
        URL-restricted. Check <Code>VITE_MAPBOX_TOKEN</Code> and restart the dev
        server.
      </>
    ),
  },
  unknown: {
    title: 'The map stumbled',
    body: (
      <>
        We couldn&apos;t load the map right now. Check your connection and try
        again in a moment.
      </>
    ),
  },
};

/**
 * Graceful, on-brand full-screen state shown when the map can't render
 * (missing/invalid/expired token, or an unexpected map failure). Keeps the NOW
 * mood instead of exposing a raw Mapbox error.
 */
export function MapErrorState({ variant }: MapErrorStateProps) {
  const { title, body } = COPY[variant];
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-ink-900 px-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-b from-now-soft to-now-deep shadow-[0_8px_30px_rgba(245,158,11,0.35)]">
          <span className="text-2xl font-extrabold text-ink-900">N</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-400">{body}</p>
      </div>
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-ink-700 px-1.5 py-0.5 text-now-soft">
      {children}
    </code>
  );
}
