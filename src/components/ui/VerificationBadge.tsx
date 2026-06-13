import type { Activity } from '@/types/activity';
import { effectiveVerification, VERIFICATION_CONFIG } from '@/lib/verification';
import { computeConfidence, confidenceLabel } from '@/lib/confidence';

interface VerificationBadgeProps {
  activity: Activity;
  now: number;
  /** Show the coarse confidence label (High/Medium/Low) alongside. */
  showConfidence?: boolean;
}

/**
 * Source-attribution chip. Honestly reflects how much NOW trusts a record:
 * Official source / Verified / Curated / Community / Unverified — downgrading
 * to Curated when there's no source URL (TRUST_MODEL rule 4).
 */
export function VerificationBadge({
  activity,
  now,
  showConfidence = false,
}: VerificationBadgeProps) {
  const status = effectiveVerification(activity);
  const config = VERIFICATION_CONFIG[status];
  const Icon = config.icon;

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{
          color: config.color,
          backgroundColor: `${config.color}1f`,
          border: `1px solid ${config.color}40`,
        }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
        {config.label}
      </span>
      {showConfidence && (
        <span className="text-xs font-medium text-stone-400">
          {confidenceLabel(computeConfidence(activity, now))} confidence
        </span>
      )}
    </span>
  );
}
