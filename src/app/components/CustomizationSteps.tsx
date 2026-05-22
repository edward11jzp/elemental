import { Link } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Reveal } from './animations/Reveal';
import { TextReveal } from './animations/TextReveal';
import { MiniShirt } from './MiniShirt';

const easeOut = [0.16, 1, 0.3, 1] as const;

const steps = [
  {
    number: '01',
    shirt: 'blank' as const,
    title: 'Elige Tu Prenda',
    description: 'Selecciona el modelo, color y talla que mejor se adapte a tu estilo.',
    accent: 'from-cyan-400 to-blue-500',
    glow: 'fill-cyan-400/40',
  },
  {
    number: '02',
    shirt: 'upload' as const,
    title: 'Sube Tu Diseño',
    description: 'Carga tu logo, ilustración o frase favorita. Acepta PNG, JPG y SVG.',
    accent: 'from-fuchsia-400 to-purple-500',
    glow: 'fill-fuchsia-400/40',
  },
  {
    number: '03',
    shirt: 'design' as const,
    title: 'Personaliza a Tu Gusto',
    description: 'Ajusta posición, tamaño y vista previa hasta que sea perfecto.',
    accent: 'from-amber-400 to-orange-500',
    glow: 'fill-amber-400/40',
  },
];

export function CustomizationSteps() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative py-14 md:py-24 bg-black overflow-hidden">
      {/* Decorative animated gradient orbs */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] bg-gradient-to-r from-fuchsia-500/40 to-purple-600/40"
          animate={reduceMotion ? undefined : { x: [0, 80, 0], y: [0, -40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] bg-gradient-to-r from-cyan-500/30 to-blue-600/30"
          animate={reduceMotion ? undefined : { x: [0, -60, 0], y: [0, 50, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      {/* Lightning bolt accent */}
      <Reveal direction="scale" className="flex justify-center mb-6">
        <motion.div
          className="relative"
          animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute inset-0 bg-white blur-2xl opacity-40" />
          <Zap className="relative w-10 h-10 text-white fill-white" />
        </motion.div>
      </Reveal>

      {/* Heading */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-4">
        <TextReveal
          as="h2"
          text="Crea Tu Prenda Única"
          className="text-3xl md:text-6xl font-bold tracking-tight bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent"
          staggerChildren={0.18}
        />
      </div>

      <Reveal direction="up" delay={0.4} className="relative z-10 max-w-2xl mx-auto px-4 text-center mb-20">
        <p className="text-lg text-white/70">
          Tres pasos simples para diseñar algo que es 100% tuyo.
        </p>
      </Reveal>

      {/* Steps Grid */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Animated connecting line (desktop) */}
        <div className="hidden md:block absolute top-[140px] left-[16%] right-[16%] h-[2px] z-0">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400/60 via-fuchsia-400/60 to-amber-400/60 origin-left"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 2, delay: 0.8, ease: easeOut }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
          {steps.map((step, i) => {
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 80 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 1.4,
                  delay: 0.4 + i * 0.3,
                  ease: easeOut,
                }}
                className="group relative"
              >
                {/* Mini-shirt badge with glow */}
                <div className="relative flex justify-center mb-8">
                  <motion.div
                    whileHover={reduceMotion ? undefined : { scale: 1.08, y: -4 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                    className="relative"
                  >
                    {/* Outer glow */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${step.accent} blur-2xl opacity-50 group-hover:opacity-90 transition-opacity duration-500`}
                    />
                    {/* Gradient ring */}
                    <div
                      className={`relative w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br ${step.accent} p-[2px] shadow-2xl`}
                    >
                      <div className="relative w-full h-full rounded-full bg-black flex flex-col items-center justify-center gap-1 overflow-hidden">
                        <MiniShirt
                          variant={step.shirt}
                          accentClass={step.glow}
                          size={84}
                        />
                        <span className="text-[10px] tracking-[0.4em] text-white/50 mt-1">
                          {step.number}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Card */}
                <div className="text-center px-4">
                  <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-white transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-white/60 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow between steps (mobile vertical) */}
                {i < steps.length - 1 && (
                  <div className="md:hidden flex justify-center mt-8">
                    <motion.div
                      animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <ArrowRight className="w-6 h-6 text-white/40 rotate-90" />
                    </motion.div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <Reveal direction="up" delay={0.6} className="flex justify-center mt-20">
          <Link to="/men/t-shirts">
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.05 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Button
                className="group relative bg-white text-black hover:bg-white px-10 py-7 text-lg font-semibold shadow-2xl overflow-hidden"
              >
                {/* Gradient sheen on hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-400 opacity-0 group-hover:opacity-20"
                  transition={{ duration: 0.6 }}
                />
                <span className="relative flex items-center">
                  Comienza Ahora
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Button>
            </motion.div>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
