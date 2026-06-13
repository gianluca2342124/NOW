import type { DisplayStatus } from '@/types/activity';
import { DISPLAY_STATUS_CONFIG } from '@/lib/categories';

interface StatusPillProps {
  status: DisplayStatus;
}

/**
 * Display-status badge. Only `live_now` gets the pulsing "hot" treatment — the
 * single visual that asserts real-world liveness (see TRUST_MODEL.md).
 */
export function StatusPill({ status }: StatusPillProps) {
  const config = DISPLAY_STATUS_CONFIG[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        color: config.color,
        backgroundColor: `${config.color}1f`,
        border: `1px solid ${config.color}40`,
      }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.hot ? 'animate-ping-slow' : ''}`}
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
