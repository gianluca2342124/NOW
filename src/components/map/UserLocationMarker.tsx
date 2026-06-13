import { motion, useReducedMotion } from 'framer-motion';

/**
 * Refined "you are here" marker — an Apple-Maps-style blue core with a soft
 * accuracy halo. Visually distinct from amber event bubbles so the user always
 * knows which dot is them. Pulse respects prefers-reduced-motion.
 */
export function UserLocationMarker() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="relative grid place-items-center">
      {!reduceMotion && (
        <motion.span
          className="absolute rounded-full"
          style={{ width: 22, height: 22, backgroundColor: '#3b82f6' }}
          animate={{ scale: [1, 3], opacity: [0.45, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <span
        className="absolute rounded-full blur-md"
        style={{ width: 34, height: 34, backgroundColor: '#3b82f6', opacity: 0.4 }}
      />
      <span
        className="relative rounded-full"
        style={{
          width: 16,
          height: 16,
          backgroundColor: '#3b82f6',
          border: '3px solid #fff',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
}
