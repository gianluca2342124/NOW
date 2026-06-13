import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Lightweight error boundary. Catches render/runtime errors in the map subtree
 * (e.g. a Mapbox GL initialisation failure) and shows an on-brand fallback
 * instead of a blank white screen.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Prototype: log for visibility. A real build would report to telemetry.
    console.error('[NOW] Map subtree crashed:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultFallback />;
    }
    return this.props.children;
  }
}

function DefaultFallback() {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-ink-900 px-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-b from-now-soft to-now-deep shadow-[0_8px_30px_rgba(245,158,11,0.35)]">
          <span className="text-2xl font-extrabold text-ink-900">N</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Something went dark
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-400">
          NOW hit an unexpected error. Reload to bring the city back.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-2xl bg-gradient-to-b from-now-soft to-now px-6 py-3 text-sm font-extrabold text-ink-900 active:scale-[0.98]"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
