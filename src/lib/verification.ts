import type { LucideIcon } from 'lucide-react';
import { BadgeCheck, HelpCircle, ShieldCheck, Sparkles, Users } from 'lucide-react';
import type { Activity, VerificationStatus } from '@/types/activity';

export interface VerificationConfig {
  label: string;
  color: string;
  icon: LucideIcon;
  /** Short trust framing used in the sheet. */
  blurb: string;
}

export const VERIFICATION_CONFIG: Record<VerificationStatus, VerificationConfig> = {
  official_source: {
    label: 'Official source',
    color: '#22c55e',
    icon: BadgeCheck,
    blurb: 'From an official source',
  },
  verified: {
    label: 'Verified',
    color: '#38bdf8',
    icon: ShieldCheck,
    blurb: 'Cross-checked against a source',
  },
  curated: {
    label: 'Curated',
    color: '#fbbf24',
    icon: Sparkles,
    blurb: 'Curated preview · not source-verified',
  },
  community_reported: {
    label: 'Community',
    color: '#a855f7',
    icon: Users,
    blurb: 'Community reported · unconfirmed',
  },
  unknown: {
    label: 'Unverified',
    color: '#94a3b8',
    icon: HelpCircle,
    blurb: 'Unverified',
  },
};

/**
 * Honest verification status to display: rule 4 — without a sourceUrl an
 * activity can never present as "Verified"; it downgrades to "Curated".
 */
export function effectiveVerification(activity: Activity): VerificationStatus {
  if (activity.verificationStatus === 'verified' && !activity.sourceUrl) {
    return 'curated';
  }
  return activity.verificationStatus;
}

/** Whether the feed is purely curated (no real source contributed). */
export function isCuratedPreview(activities: Activity[]): boolean {
  return !activities.some((a) => a.sourceType !== 'curated');
}

/** Distinct names of the real (non-curated) sources currently in the feed. */
export function realSourceNames(activities: Activity[]): string[] {
  const names = new Set<string>();
  for (const a of activities) {
    if (a.sourceType !== 'curated') names.add(a.sourceName);
  }
  return [...names];
}
