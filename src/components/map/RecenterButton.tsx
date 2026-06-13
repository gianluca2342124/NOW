import { motion } from 'framer-motion';
import { LocateFixed } from 'lucide-react';

interface RecenterButtonProps {
  onClick: () => void;
  /** Highlights amber once we actually have the user's location. */
  active: boolean;
}

/** Glass FAB to recenter the map on the user (or re-request permission). */
export function RecenterButton({ onClick, active }: RecenterButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label="Recenter on my location"
      onClick={onClick}
      className="glass grid h-12 w-12 place-items-center rounded-full shadow-glass"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.9 }}
    >
      <LocateFixed
        className="h-5 w-5"
        strokeWidth={2.25}
        color={active ? '#fbbf24' : '#d6d3d1'}
      />
    </motion.button>
  );
}
