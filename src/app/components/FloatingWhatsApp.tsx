import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { useApp } from '../context';

// Official WhatsApp glyph (simplified to a single path).
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M16.001 0C7.166 0 0 7.164 0 16.001c0 2.821.74 5.575 2.146 7.999L0 32l8.218-2.144A15.94 15.94 0 0 0 16.001 32C24.836 32 32 24.836 32 16.001 32 11.713 30.336 7.7 27.301 4.683A15.879 15.879 0 0 0 16.001 0Zm.001 29.221c-2.524 0-4.997-.68-7.155-1.965l-.513-.305-4.876 1.272 1.298-4.748-.334-.531a13.166 13.166 0 0 1-2.029-7.043C2.392 8.711 8.486 2.616 16.005 2.616c3.642 0 7.062 1.418 9.633 3.992a13.585 13.585 0 0 1 3.988 9.634c-.005 7.522-6.105 13.625-13.625 13.625Zm7.471-9.984c-.408-.205-2.418-1.193-2.793-1.329-.375-.137-.648-.205-.92.205-.273.41-1.054 1.328-1.295 1.602-.238.272-.479.306-.886.102-.41-.205-1.728-.638-3.293-2.034-1.217-1.086-2.038-2.426-2.278-2.836-.238-.41-.025-.633.18-.836.184-.184.41-.479.616-.717.205-.238.273-.41.41-.682.135-.273.068-.512-.033-.717-.102-.205-.92-2.219-1.262-3.039-.331-.797-.668-.69-.918-.703l-.781-.013c-.273 0-.717.102-1.092.512-.375.41-1.432 1.396-1.432 3.41 0 2.014 1.467 3.961 1.672 4.232.205.273 2.887 4.41 6.992 6.184.977.422 1.74.674 2.336.861.98.311 1.871.268 2.578.162.785-.117 2.418-.988 2.762-1.942.342-.953.342-1.769.238-1.942-.102-.171-.375-.272-.785-.476Z" />
    </svg>
  );
}

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
      <span className="relative flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-[#25D366] shadow-2xl shadow-green-500/40 ring-2 ring-white/10">
        <WhatsAppIcon className="h-8 w-8 md:h-9 md:w-9 text-white" />
      </span>

      {/* Label that appears on hover (desktop) */}
      <span className="hidden md:flex absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap items-center gap-2 bg-black border border-green-500/40 text-white text-sm rounded-full px-4 py-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none">
        Escríbenos por WhatsApp
      </span>
    </motion.a>
  );
}
