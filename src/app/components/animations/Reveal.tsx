import { motion, useReducedMotion, Variants } from 'motion/react';
import { ReactNode } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'scale' | 'blur';

interface RevealProps {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
  once?: boolean;
  amount?: number;
}

const buildVariants = (
  direction: Direction,
  distance: number,
  duration: number,
  delay: number,
): Variants => {
  const hidden: Record<string, number | string> = { opacity: 0 };
  const visible: Record<string, number | string> = { opacity: 1 };

  switch (direction) {
    case 'up':
      hidden.y = distance;
      visible.y = 0;
      break;
    case 'down':
      hidden.y = -distance;
      visible.y = 0;
      break;
    case 'left':
      hidden.x = distance;
      visible.x = 0;
      break;
    case 'right':
      hidden.x = -distance;
      visible.x = 0;
      break;
    case 'scale':
      hidden.scale = 0.85;
      visible.scale = 1;
      break;
    case 'blur':
      hidden.filter = 'blur(20px)';
      visible.filter = 'blur(0px)';
      hidden.y = distance / 2;
      visible.y = 0;
      break;
  }

  return {
    hidden,
    visible: {
      ...visible,
      transition: {
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };
};

export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 1.6,
  distance = 80,
  className = '',
  once = true,
  amount = 0.15,
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={buildVariants(direction, distance, duration, delay)}
    >
      {children}
    </motion.div>
  );
}
