import type {
  Activity,
  SourceType,
  VerificationStatus,
} from '@/types/activity';

/**
 * Ingestion contracts. Every data source — the local curated set today, real
 * networked APIs tomorrow — implements `SourceAdapter`. Normalization and
 * deduplication are source-agnostic (see INGESTION_ARCHITECTURE.md).
 */

/** Loose record a source emits before normalization. */
export type RawActivity = Omit<
  Activity,
  'sourceType' | 'sourceName' | 'verificationStatus' | 'lastCheckedAt'
> &
  Partial<
    Pick<
      Activity,
      'sourceType' | 'sourceName' | 'verificationStatus' | 'lastCheckedAt'
    >
  >;

export interface AdapterContext {
  /** Fetch timestamp (epoch ms) — becomes `lastCheckedAt`. */
  now: number;
  signal?: AbortSignal;
}

export interface SourceAdapter {
  id: string;
  sourceName: string;
  sourceType: SourceType;
  /** Trust this source confers by default (may be downgraded on normalize). */
  verificationBaseline: VerificationStatus;
  /** Must be fault-tolerant: a failing adapter must not break the feed. */
  fetch(ctx: AdapterContext): Promise<RawActivity[]>;
}

/** Metadata for a source we plan to integrate but haven't built yet. */
export interface PlannedAdapter {
  id: string;
  sourceName: string;
  sourceType: SourceType;
  verificationBaseline: VerificationStatus;
  /** Why it isn't active yet (e.g. "requires serverless proxy + API key"). */
  blockedBy: string;
}
