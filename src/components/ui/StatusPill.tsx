import type { EventStatus } from '@/types/event';
import { STATUS_CONFIG } from '@/lib/categories';

interface StatusPillProps {
  status: EventStatus;
}

/** Small live-status badge. Pulses a dot for live/ending states. */
export function StatusPill({ status }: StatusPillProps) {
  const config = STATUS_CONFIG[status];
  const isHot = status === 'live' || status === 'ending';

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
        className={`h-1.5 w-1.5 rounded-full ${isHot ? 'animate-ping-slow' : ''}`}
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
