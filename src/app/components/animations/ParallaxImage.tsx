import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { useRef } from 'react';

interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string;
  speed?: number;
  scale?: number;
}

export function ParallaxImage({
  src,
  alt,
  className = '',
  speed = 0.25,
  scale = 1.15,
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 100}%`]);
  const scaleValue = useTransform(scrollYProgress, [0, 0.5, 1], [scale, 1, scale]);

  if (reduceMotion) {
    return (
      <div ref={ref} className={`relative overflow-hidden ${className}`}>
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        style={{ y, scale: scaleValue }}
        className="w-full h-full object-cover will-change-transform"
      />
    </div>
  );
}
