// HowItsMade.tsx — Scrollytelling al mayor para Elemental Fabrica.
//
// Filosofía: imágenes a pantalla completa con movimiento Ken Burns
// (zoom + pan sutil), texto mínimo sobreimpuesto, y un CTA final fuerte
// orientado a revendedores / negocios que buscan proveedor mayorista.
//
// Estructura:
//   <section h=N×100dvh>
//     <div sticky top-0 h-100dvh>
//       <ProgressBar />
//       <StageBlock × N />   ← cada uno con imagen full-bleed + overlay + texto
//     </div>
//   </section>
//
// Las imágenes se animan con scale + translate durante TODA la etapa
// (no solo en el fade), generando la sensación cinematográfica. El texto
// entra y sale con opacity + translateY.
//
// Móvil: se simplifica el Ken Burns (solo opacity + traslación leve, sin
// scale agresivo) y se eliminan los overlays animados costosos.

import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import type { MotionValue } from 'motion/react';
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';

// ─── Configuración de etapas ─────────────────────────────────────────────────

type StageVariant = 'hook' | 'capacity' | 'pricing' | 'whitelabel' | 'construction' | 'quality' | 'cta';

// Gradientes de fallback por etapa — se usan cuando la imagen no carga, para
// que cada slide tenga personalidad visual propia (no todas iguales = "negro").
// Todos monocromáticos para mantener la identidad de Elemental.
const STAGE_FALLBACK_GRADIENT: Record<StageVariant, string> = {
  // Hook: gradient radial intenso del centro hacia afuera (impacto inicial)
  hook: 'radial-gradient(ellipse at 50% 40%, #2a2a2a 0%, #0a0a0a 70%, #000 100%)',
  // Capacity: diagonal industrial, esquinas más claras
  capacity: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 50%, #1a1a1a 100%)',
  // Pricing: gradiente vertical que sube (sensación ascendente = valor)
  pricing: 'linear-gradient(180deg, #0a0a0a 0%, #1f1f1f 100%)',
  // Whitelabel: gradiente desde un lado (sensación de marca/personalización)
  whitelabel: 'linear-gradient(105deg, #1c1c1c 0%, #0a0a0a 60%, #1c1c1c 100%)',
  // Construction: gradiente con punto cálido (forja/construcción)
  construction: 'radial-gradient(ellipse at 30% 70%, #252525 0%, #0a0a0a 75%)',
  // Quality: gradient con un "spotlight" suave (inspección)
  quality: 'radial-gradient(ellipse at 50% 30%, #232323 0%, #0a0a0a 70%)',
  // CTA: gradient amplio + halo central (foco al botón)
  cta: 'radial-gradient(ellipse at center, #2c2c2c 0%, #0a0a0a 65%, #000 100%)',
};

interface Stage {
  id: string;
  variant: StageVariant;
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  // Origen del pan Ken Burns (de dónde a dónde se mueve el frame).
  panFrom: { x: string; y: string };
  panTo: { x: string; y: string };
  // Acento opcional: stat con contador, lista de tiers, CTA, etc.
  stat?: { value: number; suffix?: string; label: string };
  // Peso relativo de scroll de esta etapa (default 1 = una porción normal).
  // 0.5 = la mitad de scroll que una etapa normal, sin afectar a las demás.
  weight?: number;
}

const STAGES: Stage[] = [
  {
    id: 'hook',
    variant: 'hook',
    eyebrow: 'Proveedor al mayor',
    title: 'Tu marca merece\nun proveedor serio.',
    subtitle: 'Producimos para revendedores, marcas y emprendedores en toda Venezuela.',
    image: '/images/storytelling/origen.webp',
    imageAlt: 'Fábrica Elemental — vista general de producción',
    panFrom: { x: '-3%', y: '-3%' },
    panTo: { x: '3%', y: '3%' },
  },
  {
    id: 'capacity',
    variant: 'capacity',
    eyebrow: '01 · Capacidad',
    title: 'Producción\nque sí responde.',
    subtitle: 'Capacidad real para cumplir tu cronograma, sin promesas vacías.',
    image: '/images/storytelling/tela.webp',
    imageAlt: 'Operación de corte y costura a escala',
    panFrom: { x: '3%', y: '0%' },
    panTo: { x: '-3%', y: '0%' },
    stat: { value: 12000, suffix: '+', label: 'prendas / mes' },
    // Esta escena pedía "demasiado scroll" para que subiera el contador —
    // le damos la mitad de duración que a una escena normal.
    weight: 0.5,
  },
  {
    id: 'pricing',
    variant: 'pricing',
    eyebrow: '02 · Precios',
    title: 'Mientras más pides,\nmejor margen.',
    subtitle: 'Sin trucos. Sin letra chica. Cotización clara desde la primera prenda.',
    image: '/images/storytelling/corte.webp',
    imageAlt: 'Pilas de franelas listas para distribución',
    panFrom: { x: '0%', y: '-3%' },
    panTo: { x: '0%', y: '3%' },
  },
  {
    id: 'whitelabel',
    variant: 'whitelabel',
    eyebrow: '03 · Personalización',
    title: 'Tu logo. Tus etiquetas.\nTu marca.',
    subtitle: 'White label real: estampados y etiquetas privadas. No genérico.',
    image: '/images/storytelling/bordado.webp',
    imageAlt: 'Bordado y estampado artesanal',
    panFrom: { x: '-3%', y: '3%' },
    panTo: { x: '3%', y: '-3%' },
  },
  {
    id: 'construction',
    variant: 'construction',
    eyebrow: '04 · Construcción',
    title: 'Costuras reforzadas.\nDuran lo que prometen.',
    subtitle: 'Cada franela está hecha para resistir lavadas, uso y tiempo. Sin atajos.',
    image: '/images/storytelling/construccion.webp',
    imageAlt: 'Detalle de costuras reforzadas',
    panFrom: { x: '0%', y: '3%' },
    panTo: { x: '0%', y: '-3%' },
  },
  {
    id: 'quality',
    variant: 'quality',
    eyebrow: '05 · Calidad',
    title: 'Misma calidad.\nPedido tras pedido.',
    subtitle: 'Consistencia que tus clientes notan — y que te hace ganar recompras.',
    image: '/images/storytelling/inspeccion.webp',
    imageAlt: 'Control de calidad sobre las prendas',
    panFrom: { x: '3%', y: '3%' },
    panTo: { x: '-3%', y: '-3%' },
  },
  {
    id: 'cta',
    variant: 'cta',
    eyebrow: 'Hablemos',
    title: 'Empieza tu\npedido al mayor.',
    subtitle: 'Cotización rápida, sin compromiso. Te respondemos en menos de 24h.',
    image: '/images/storytelling/elemental.webp',
    imageAlt: 'Franelas Elemental terminadas listas para entrega',
    panFrom: { x: '0%', y: '0%' },
    panTo: { x: '0%', y: '-2%' },
  },
];

// ─── Hooks utilitarios ───────────────────────────────────────────────────────

function useIsMobile(maxWidth = 767) {
  const query = `(max-width: ${maxWidth}px)`;
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return isMobile;
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function HowItsMade() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();

  const sectionInView = useInView(containerRef, {
    amount: 0.05,
    margin: '0px 0px -10% 0px',
  });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Mobile: 50dvh por etapa "normal" (weight 1) = recorrido más compacto,
  // ~3.5 swipes para las 7 etapas. Desktop: 45dvh por etapa normal.
  // Una etapa con weight < 1 (ej. Capacidad, weight 0.5) toma proporcionalmente
  // menos scroll sin afectar la duración de las demás.
  const stageHeight = isMobile ? 50 : 45;

  // Offsets acumulados por peso: start/end de cada etapa como fracción del
  // scroll total de la sección (0 a 1), respetando el weight de cada una.
  const totalWeight = STAGES.reduce((sum, s) => sum + (s.weight ?? 1), 0);
  const stageOffsets = (() => {
    let acc = 0;
    return STAGES.map((s) => {
      const w = s.weight ?? 1;
      const start = acc / totalWeight;
      acc += w;
      const end = acc / totalWeight;
      return { start, end };
    });
  })();

  // IMPORTANTE: en móvil usamos svh (small viewport height) para la altura
  // del sticky. svh NO cambia cuando aparece/desaparece la barra de URL en
  // iOS Safari, evitando que el sticky "salte" durante el scroll. En desktop
  // usamos dvh que es equivalente.
  const stickyHeightUnit = isMobile ? 'svh' : 'dvh';

  return (
    <section
      ref={containerRef}
      aria-label="Elemental al por mayor"
      className="relative bg-black"
      style={{ height: `${totalWeight * stageHeight}dvh` }}
    >
      <div
        className="sticky top-0 w-full overflow-hidden"
        style={{ height: `100${stickyHeightUnit}` }}
      >
        <ProgressBar progress={scrollYProgress} />

        {STAGES.map((stage, i) => (
          <StageScene
            key={stage.id}
            stage={stage}
            index={i}
            total={STAGES.length}
            start={stageOffsets[i].start}
            end={stageOffsets[i].end}
            progress={scrollYProgress}
            isMobile={isMobile}
            reduceMotion={!!reduceMotion}
            sectionInView={sectionInView}
          />
        ))}

        {/* Hint de scroll en la primera etapa */}
        <ScrollHint progress={scrollYProgress} />
      </div>
    </section>
  );
}

// ─── StageScene: una escena cinematográfica ──────────────────────────────────

interface StageSceneProps {
  stage: Stage;
  index: number;
  total: number;
  // Tramo de progreso [0-1] que ocupa esta etapa dentro del scroll total de
  // la sección — ya viene ponderado por `stage.weight` desde el padre.
  start: number;
  end: number;
  progress: MotionValue<number>;
  isMobile: boolean;
  reduceMotion: boolean;
  sectionInView: boolean;
}

const StageScene = memo(function StageScene({
  stage,
  index,
  total,
  start,
  end,
  progress,
  isMobile,
  reduceMotion,
  sectionInView,
}: StageSceneProps) {
  // Tramo de progreso de esta etapa (ya calculado por el padre según weight).
  const seg = end - start;
  const fadeIn = start + seg * 0.2;
  const fadeOut = end - seg * 0.2;

  // ── OPACITY del bloque entero ─────────────────────────────────────────────
  // Stage 0 fade-in normal: así, mientras la sección apenas asoma al viewport
  // (antes de que el sticky se pinee), no se ven sus textos pisando el
  // contenido superior. Solo la última etapa mantiene la opacity al final.
  const opacityKeyframes =
    index === total - 1
      ? ([start, fadeIn] as const)
      : ([start, fadeIn, fadeOut, end] as const);
  const opacityValues =
    index === total - 1
      ? ([0, 1] as const)
      : ([0, 1, 1, 0] as const);
  const opacity = useTransform(
    progress,
    opacityKeyframes as unknown as number[],
    opacityValues as unknown as number[],
  );

  // ── KEN BURNS de la imagen (durante toda la etapa) ────────────────────────
  // Scale: 1.10 → 1.0 (desktop) | 1.05 → 1.0 (mobile, más sutil)
  const scaleMax = isMobile ? 1.05 : 1.1;
  const imgScale = useTransform(progress, [start, end], [scaleMax, 1.0]);

  // Pan X / Y de la imagen — pasamos string para que motion los aplique
  // como translate %.
  const imgX = useTransform(progress, [start, end], [stage.panFrom.x, stage.panTo.x]);
  const imgY = useTransform(progress, [start, end], [stage.panFrom.y, stage.panTo.y]);

  // ── TEXTO: entra desde abajo y sale hacia arriba ──────────────────────────
  const textYDelta = isMobile ? 24 : 48;
  const textYKeyframes =
    index === total - 1
      ? ([start, fadeIn, end] as const)
      : ([start, fadeIn, fadeOut, end] as const);
  const textYValues =
    index === total - 1
      ? ([textYDelta, 0, 0] as const)
      : ([textYDelta, 0, 0, -textYDelta] as const);
  const textY = useTransform(
    progress,
    textYKeyframes as unknown as number[],
    textYValues as unknown as number[],
  );

  // Imagen: en móvil eliminamos Ken Burns (scale + pan continuo es caro en
  // iOS Safari y causa repaints en cada frame). Solo opacity, dejando que
  // el texto tenga toda la prioridad de la GPU. En desktop sí Ken Burns.
  // Reduce-motion: solo opacity en cualquier caso.
  const imgStyle =
    reduceMotion || isMobile
      ? { opacity }
      : { opacity, scale: imgScale, x: imgX, y: imgY };
  const textStyle = reduceMotion ? { opacity } : { opacity, y: textY };

  return (
    <>
      {/* Imagen full-bleed. Usamos background-image en un div: si la imagen
          no existe (aún), el navegador NO muestra el icono de imagen rota,
          solo queda visible el gradiente único de la etapa (diseñado para
          que no se sienta vacío). */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{
          ...imgStyle,
          backgroundImage: `url('${stage.image}'), ${STAGE_FALLBACK_GRADIENT[stage.variant]}`,
          backgroundSize: 'cover, cover',
          backgroundPosition: 'center, center',
          backgroundRepeat: 'no-repeat, no-repeat',
        }}
        role="img"
        aria-label={stage.imageAlt}
      >
        {/* Patrón sutil de textura — apenas perceptible pero le quita la
            sensación de pantalla totalmente apagada cuando no hay imagen. */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Overlay oscuro para legibilidad del texto (más suave que antes
            para no aplastar el gradiente intencional). */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/70" />
        {/* Vignette para enfocar al centro */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.45) 90%)',
          }}
        />
      </motion.div>

      {/* Texto / contenido */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center px-6 sm:px-10 md:px-16 will-change-transform"
        style={textStyle}
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Eyebrow */}
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-white/60 mb-5 md:mb-7">
            {stage.eyebrow}
          </p>

          {/* Título */}
          <h3 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-semibold text-white leading-[1.05] tracking-tight mb-6 md:mb-8 whitespace-pre-line">
            {stage.title}
          </h3>

          {/* Subtítulo */}
          <p className="text-base sm:text-lg md:text-xl text-white/75 leading-relaxed max-w-2xl mx-auto">
            {stage.subtitle}
          </p>

          {/* Stat con contador animado */}
          {stage.stat && (
            <StatCounter
              value={stage.stat.value}
              suffix={stage.stat.suffix}
              label={stage.stat.label}
              progress={progress}
              start={start}
              fadeIn={fadeIn}
              active={sectionInView}
            />
          )}

          {/* CTA final */}
          {stage.variant === 'cta' && (
            <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/wholesale">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  className="group inline-flex items-center gap-3 bg-white text-black px-7 py-4 md:px-10 md:py-5 text-sm md:text-base font-semibold uppercase tracking-[0.15em] rounded-full shadow-2xl shadow-white/20 hover:bg-white/90 transition-colors"
                >
                  Solicitar cotización
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </Link>
              <Link
                to="/contact"
                className="text-sm md:text-base text-white/70 hover:text-white underline underline-offset-4 transition-colors"
              >
                o conversemos por WhatsApp
              </Link>
            </div>
          )}

          {/* Tiers visuales solo en la etapa "pricing" */}
          {stage.variant === 'pricing' && (
            <PricingTiers progress={progress} start={start} fadeIn={fadeIn} />
          )}
        </div>
      </motion.div>
    </>
  );
});

// ─── Contador animado (los stats arrancan al entrar la etapa) ────────────────

function StatCounter({
  value,
  suffix = '',
  label,
  progress,
  start,
  fadeIn,
  active,
}: {
  value: number;
  suffix?: string;
  label: string;
  progress: MotionValue<number>;
  start: number;
  fadeIn: number;
  active: boolean;
}) {
  // Mapeamos el progreso del fade-in (start → fadeIn) a 0 → value.
  // Spring más rígido (stiffness alto) para que el contador seleccione el
  // ritmo del scroll en vez de sentirse retrasado — antes con stiffness
  // bajo, el número tardaba en "alcanzar" la posición real del scroll,
  // dando sensación de necesitar mucho más scroll del que realmente hace falta.
  const raw = useTransform(progress, [start, fadeIn], [0, value]);
  const smooth = useSpring(raw, { stiffness: 220, damping: 26 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) return;
    return smooth.on('change', (v) => setDisplay(Math.round(v)));
  }, [smooth, active]);

  const formatted = new Intl.NumberFormat('es-VE').format(display);

  return (
    <div className="mt-10 md:mt-12">
      <p className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tabular-nums tracking-tight">
        {formatted}
        <span className="text-white/80">{suffix}</span>
      </p>
      <p className="mt-2 text-xs md:text-sm uppercase tracking-[0.3em] text-white/50">
        {label}
      </p>
    </div>
  );
}

// ─── Tiers de precio visuales (etapa "pricing") ──────────────────────────────

function PricingTiers({
  progress,
  start,
  fadeIn,
}: {
  progress: MotionValue<number>;
  start: number;
  fadeIn: number;
}) {
  const tiers = [
    { range: '1 – 5', label: 'Detal', note: 'Probemos primero' },
    { range: '6 +', label: 'Mayorista', note: 'Margen real', highlight: true },
    { range: '100 +', label: 'Especial', note: 'Cotización personalizada' },
  ];
  // Las tarjetas entran con un pequeño stagger basado en el sub-progreso.
  return (
    <div className="mt-10 md:mt-14 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 max-w-3xl mx-auto">
      {tiers.map((tier, i) => {
        const offset = i * 0.08;
        const tStart = start + offset * (fadeIn - start);
        const tEnd = fadeIn + offset * (fadeIn - start);
        const tierOpacity = useTransform(progress, [tStart, tEnd], [0, 1]);
        const tierY = useTransform(progress, [tStart, tEnd], [24, 0]);
        return (
          <motion.div
            key={tier.range}
            style={{ opacity: tierOpacity, y: tierY }}
            className={
              tier.highlight
                ? 'rounded-2xl border-2 border-white bg-white text-black px-5 py-5 md:py-6 shadow-2xl shadow-white/20'
                : 'rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm text-white px-5 py-5 md:py-6'
            }
          >
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-70 mb-1">
              {tier.label}
            </p>
            <p className="text-2xl md:text-3xl font-bold tracking-tight">
              {tier.range}
              <span className="text-sm font-normal opacity-60 ml-1">unidades</span>
            </p>
            <p className="mt-2 text-xs md:text-sm opacity-70">{tier.note}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Hint visual de scroll, solo en la primera etapa ─────────────────────────

function ScrollHint({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0, 0.08], [1, 0]);
  return (
    <motion.div
      style={{ opacity }}
      className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-none"
    >
      <span className="text-[10px] uppercase tracking-[0.4em] text-white/60">
        Desliza
      </span>
      <motion.div
        className="w-px h-10 bg-gradient-to-b from-white/80 via-white/40 to-transparent"
        animate={{ scaleY: [0.3, 1, 0.3], originY: [0, 0.5, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: 'top' }}
      />
    </motion.div>
  );
}

// ─── Barra de progreso superior ──────────────────────────────────────────────

function ProgressBar({ progress }: { progress: MotionValue<number> }) {
  const scaleX = useTransform(progress, [0, 1], [0, 1]);
  return (
    <div className="absolute top-0 left-0 right-0 h-px bg-white/10 z-20">
      <motion.div
        className="h-full bg-white/90 origin-left will-change-transform"
        style={{ scaleX }}
      />
    </div>
  );
}

// Suprimimos warning de `useMotionValue` no usado al importarlo
// (lo dejo en imports por si necesitas extender con motion values manuales).
const _suppressUnused: typeof useMotionValue | undefined = useMotionValue;
void _suppressUnused;
