import { motion, useReducedMotion } from 'motion/react';
import { UploadCloud, Zap } from 'lucide-react';

type Variant = 'blank' | 'upload' | 'design';

interface MiniShirtProps {
  variant: Variant;
  accentClass?: string;
  size?: number;
}

export function MiniShirt({ variant, accentClass = 'fill-white/20', size = 80 }: MiniShirtProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Soft glow behind */}
      <motion.div
        className={`absolute inset-0 ${accentClass} blur-xl opacity-60`}
        animate={reduceMotion ? undefined : { opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* T-shirt SVG */}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="relative"
      >
        {/* Sleeves + body silhouette */}
        <path
          d="M20 25 L35 15 Q40 12 50 12 Q60 12 65 15 L80 25 L88 40 L75 48 L75 88 Q75 90 73 90 L27 90 Q25 90 25 88 L25 48 L12 40 Z"
          fill="white"
          fillOpacity="0.08"
          stroke="white"
          strokeOpacity="0.85"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Neckline curve */}
        <path
          d="M40 13 Q50 22 60 13"
          fill="none"
          stroke="white"
          strokeOpacity="0.85"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>

      {/* Step-specific overlay content */}
      {variant === 'upload' && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pt-3"
          animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="rounded-lg border border-dashed border-white/50 bg-white/5 px-2 py-1 flex items-center justify-center">
            <UploadCloud className="w-5 h-5 text-white/80" strokeWidth={1.8} />
          </div>
        </motion.div>
      )}

      {variant === 'design' && (
        <div className="absolute inset-0 flex items-center justify-center pt-3">
          <motion.div
            className="relative"
            animate={
              reduceMotion
                ? undefined
                : { scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] }
            }
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute inset-0 bg-amber-300 blur-md opacity-70" />
            <Zap className="relative w-6 h-6 text-white fill-white" />
          </motion.div>
        </div>
      )}

      {/* Step 1: subtle shimmer over blank shirt */}
      {variant === 'blank' && !reduceMotion && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute top-[40%] left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        </motion.div>
      )}
    </div>
  );
}
