import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { useApp } from '../context';
import { MessageCircle } from 'lucide-react';

// Default WhatsApp link; overridden by the first active 'whatsapp' entry in socialMedia.
const DEFAULT_WA = 'https://wa.me/584124777970';

export function FloatingWhatsApp() {
  const { socialMedia } = useApp();
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  // Hide button briefly while scrolling fast; otherwise always visible.
  const scale = useTransform(scrollY, [0, 100], [0.85, 1]);
  const opacity = useTransform(scrollY, [0, 80], [0.7, 1]);

  const wa = socialMedia.find((s) => s.platform === 'whatsapp' && s.active)?.url ?? DEFAULT_WA;

  return (
    <motion.a
      href={wa}
      target="_blank"
      rel="noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed z-50 right-4 bottom-4 md:right-6 md:bottom-6 group"
      initial={{ opacity: 0, scale: 0.5, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 1.2, type: 'spring', stiffness: 280, damping: 20 }}
      style={reduceMotion ? undefined : { scale, opacity }}
      whileHover={reduceMotion ? undefined : { scale: 1.08 }}
      whileTap={reduceMotion ? undefined : { scale: 0.92 }}
    >
      {/* Pulse rings (decorative) */}
      {!reduceMotion && (
        <>
          <motion.span
            className="absolute inset-0 rounded-full bg-green-500/40"
            animate={{ scale: [1, 1.6, 1.6], opacity: [0.6, 0, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.span
            className="absolute inset-0 rounded-full bg-green-500/30"
            animate={{ scale: [1, 1.9, 1.9], opacity: [0.4, 0, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
          />
        </>
      )}

      {/* Button body */}
      <span className="relative flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-2xl shadow-green-500/40 ring-2 ring-white/10">
        <MessageCircle className="h-7 w-7 md:h-8 md:w-8 text-white" strokeWidth={2.2} />
      </span>

      {/* Label that appears on hover (desktop) */}
      <span className="hidden md:flex absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap items-center gap-2 bg-black border border-green-500/40 text-white text-sm rounded-full px-4 py-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none">
        Escríbenos por WhatsApp
      </span>
    </motion.a>
  );
}
