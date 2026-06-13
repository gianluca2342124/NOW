import type { Activity } from '@/types/activity';
import type { RawActivity, SourceAdapter } from './types';

/**
 * Raw → Activity. This is where provenance becomes trust.
 *
 * Rule 4 (TRUST_MODEL): an activity without a `sourceUrl` can never be
 * "verified" — it is downgraded to "curated". `verifiedLive` is never set here;
 * only a source that genuinely vouches for a live window may set it upstream.
 */
export function normalize(
  raw: RawActivity,
  adapter: SourceAdapter,
  now: number,
): Activity {
  const sourceType = raw.sourceType ?? adapter.sourceType;
  const sourceName = raw.sourceName ?? adapter.sourceName;
  let verificationStatus = raw.verificationStatus ?? adapter.verificationBaseline;

  if (verificationStatus === 'verified' && !raw.sourceUrl) {
    verificationStatus = 'curated';
  }

  return {
    ...raw,
    sourceType,
    sourceName,
    verificationStatus,
    lastCheckedAt: raw.lastCheckedAt ?? new Date(now).toISOString(),
  };
}
