import { motion, useReducedMotion } from 'motion/react';
import { Truck, Sparkles, Flame } from 'lucide-react';

const MESSAGES = [
  { icon: Truck,    text: 'ENVÍOS NACIONALES' },
  { icon: Sparkles, text: 'PERSONALIZA TU PRENDA' },
  { icon: Flame,    text: 'PRECIOS AL POR MAYOR' },
  { icon: Truck,    text: 'COMPRA ONLINE Y RECIBE EN TODA VENEZUELA' },
];

function MarqueeRow() {
  return (
    <div className="flex items-center gap-12 px-6 shrink-0">
      {MESSAGES.map((m, i) => {
        const Icon = m.icon;
        return (
          <div
            key={i}
            className="flex items-center gap-2 whitespace-nowrap text-sm md:text-base font-bold tracking-[0.15em] text-white"
          >
            <Icon className="h-4 w-4 md:h-5 md:w-5" strokeWidth={2.4} />
            <span>{m.text}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function MarqueeBanner() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="bg-black border-y border-white/10 overflow-hidden py-2.5 relative">
      {/* Subtle fade at the edges so the loop seam feels less abrupt */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 z-10 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 z-10 bg-gradient-to-l from-black to-transparent" />

      {reduceMotion ? (
        <div className="flex">
          <MarqueeRow />
        </div>
      ) : (
        <motion.div
          className="flex w-max"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        >
          {/* Duplicate the row so the loop is seamless when the first copy reaches -50% */}
          <MarqueeRow />
          <MarqueeRow />
        </motion.div>
      )}
    </div>
  );
}
