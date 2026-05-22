import { motion, useReducedMotion } from 'motion/react';

interface TextRevealProps {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  staggerChildren?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export function TextReveal({
  text,
  className = '',
  wordClassName = 'inline-block',
  delay = 0,
  staggerChildren = 0.12,
  as = 'p',
}: TextRevealProps) {
  const reduceMotion = useReducedMotion();
  const words = text.split(' ');

  if (reduceMotion) {
    const Tag = as as keyof JSX.IntrinsicElements;
    return <Tag className={className}>{text}</Tag>;
  }

  const container = {
    hidden: {},
    visible: {
      transition: { staggerChildren, delayChildren: delay },
    },
  };

  const child = {
    hidden: { y: '110%', opacity: 0 },
    visible: {
      y: '0%',
      opacity: 1,
      transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const Container = motion[as] as typeof motion.p;

  return (
    <Container
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      variants={container}
      aria-label={text}
    >
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block overflow-hidden align-bottom pb-1"
          aria-hidden
        >
          <motion.span className={wordClassName} variants={child}>
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </Container>
  );
}
