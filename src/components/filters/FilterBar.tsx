import { motion } from 'framer-motion';
import type { EventCategory } from '@/types/event';
import { CATEGORY_CONFIG, CATEGORY_ORDER } from '@/lib/categories';
import { TIME_FILTERS } from '@/lib/filters';
import { useNowStore } from '@/store/useNowStore';

/**
 * Floating filter controls over the map: a time segmented control on top and a
 * horizontally-scrollable category chip row below. Glass + minimal so the map
 * stays the hero. Selecting filters animates bubbles in/out (handled in the
 * map via AnimatePresence) — this component only owns selection state.
 */
export function FilterBar() {
  const timeFilter = useNowStore((s) => s.timeFilter);
  const setTimeFilter = useNowStore((s) => s.setTimeFilter);
  const activeCategories = useNowStore((s) => s.activeCategories);
  const toggleCategory = useNowStore((s) => s.toggleCategory);

  return (
    <div className="pointer-events-none flex flex-col gap-2.5">
      {/* Time segmented control */}
      <div className="pointer-events-auto mx-auto inline-flex rounded-full bg-ink-900/70 p-1 backdrop-blur-xl ring-1 ring-white/10">
        {TIME_FILTERS.map(({ id, label }) => (
          <TimeSegment
            key={id}
            label={label}
            active={timeFilter === id}
            onClick={() => setTimeFilter(id)}
          />
        ))}
      </div>

      {/* Category chips */}
      <div className="pointer-events-auto -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORY_ORDER.map((cat) => (
          <CategoryChip
            key={cat}
            category={cat}
            active={activeCategories.has(cat)}
            onClick={() => toggleCategory(cat)}
          />
        ))}
      </div>
    </div>
  );
}

function TimeSegment({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
    >
      {active && (
        <motion.span
          layoutId="time-pill"
          className="absolute inset-0 rounded-full bg-gradient-to-b from-now-soft to-now"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
      <span
        className={`relative ${active ? 'text-ink-900' : 'text-stone-300'}`}
      >
        {label}
      </span>
    </button>
  );
}

function CategoryChip({
  category,
  active,
  onClick,
}: {
  category: EventCategory;
  active: boolean;
  onClick: () => void;
}) {
  const { label, color, icon: Icon } = CATEGORY_CONFIG[category];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold backdrop-blur-xl transition-all"
      style={{
        backgroundColor: active ? `${color}26` : 'rgba(12,10,9,0.7)',
        color: active ? color : '#d6d3d1',
        boxShadow: active ? `inset 0 0 0 1px ${color}80` : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      <Icon className="h-4 w-4" strokeWidth={2.25} />
      {label}
    </button>
  );
}
