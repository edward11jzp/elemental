import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Button } from '../components/ui/button';
import { useApp } from '../context';
import { Reveal } from '../components/animations/Reveal';
import { TextReveal } from '../components/animations/TextReveal';
import { ParallaxImage } from '../components/animations/ParallaxImage';
import { MagneticButton } from '../components/animations/MagneticButton';
import { CustomizationSteps } from '../components/CustomizationSteps';
import logo from 'figma:asset/480ee1658c29520edefebbfe9dcbc0d422f8424b.png';
import heroImage from 'figma:asset/d562ab79e646ba503bef3f9807ee4a9fffec1d55.png';
import hatImage from 'figma:asset/1b3b90e9f13e6f0bfe2e2ccee076db293bf3180e.png';
import hoodieImage from 'figma:asset/000b79075e554c3caa9cda5c12cfc602e256af3d.png';
import menImage from 'figma:asset/d34a77067b13abc7af031b55d2f7ac2a556ba76a.png';
import joggersImage from 'figma:asset/e6c2eb959acec89a78c0621a4c3d5c23a3f7fda7.png';
import womenImage from 'figma:asset/9f8a99366f1dd435750f8f7443c9f181ed8cd617.png';
import featuredBg from '../../assets/20230807_175751.jpg';

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function Home() {
  const { products, siteSettings } = useApp();
  const featuredProducts = products.filter(p => p.featured);

  // Hero parallax setup
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroImageY = useTransform(heroProgress, [0, 1], ['0%', '40%']);
  const heroImageScale = useTransform(heroProgress, [0, 1], [1, 1.2]);
  const heroContentY = useTransform(heroProgress, [0, 1], ['0%', '-30%']);
  const heroContentOpacity = useTransform(heroProgress, [0, 0.7, 1], [1, 0.6, 0]);

  const categories = [
    { to: '/shop/gorras', label: 'GORRAS', image: hatImage, scale: 'scale-150 group-hover:scale-[1.65]', objectFit: 'object-contain', alignTop: true },
    { to: '/shop/hoodies', label: 'HOODIES', image: hoodieImage, scale: 'group-hover:scale-110', objectFit: 'object-cover object-top', translateY: '-15%' },
    { to: '/shop/joggers', label: 'JOGGERS', image: joggersImage, scale: 'group-hover:scale-110', objectFit: 'object-cover' },
    { to: '/men/t-shirts', label: 'CABALLEROS', image: menImage, scale: 'group-hover:scale-110', objectFit: 'object-cover object-top', translateY: '-15%' },
    { to: '/women/t-shirts', label: 'DAMAS', image: womenImage, scale: 'group-hover:scale-110', objectFit: 'object-cover object-top', translateY: '-15%' },
  ];

  return (
    <div className="bg-black">
      {/* Hero Section with Parallax */}
      <section ref={heroRef} className="relative h-[700px] flex items-center justify-center overflow-hidden">
        {/* Parallax background image */}
        <motion.div
          className="absolute inset-0 will-change-transform"
          style={{ y: heroImageY, scale: heroImageScale }}
        >
          <img src={heroImage} alt="Streetwear Hero" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
        </motion.div>

        {/* Animated background glows */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <motion.div
            className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-64 h-64 bg-white rounded-full blur-3xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          />
        </div>

        {/* Hero content with scroll fade */}
        <motion.div
          className="relative text-center px-10 sm:px-8 md:px-4 z-10 max-w-[320px] sm:max-w-md md:max-w-3xl mx-auto"
          style={{ y: heroContentY, opacity: heroContentOpacity }}
        >
          <motion.img
            src={logo}
            alt="ELEMENTAL"
            className="w-auto h-16 sm:h-20 md:h-32 mx-auto mb-4 md:mb-6"
            initial={{ opacity: 0, scale: 1.5, filter: 'blur(30px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 2.2, ease: easeOut }}
          />
          <TextReveal
            as="p"
            text={siteSettings.tagline}
            className="text-sm sm:text-base md:text-2xl text-muted-foreground mb-6 md:mb-8 max-w-3xl mx-auto tracking-wide leading-snug"
            delay={1.2}
            staggerChildren={0.14}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 2.6, ease: easeOut }}
          >
            <MagneticButton>
              <Link to="/men/t-shirts">
                <Button className="group bg-white text-black hover:bg-gray-200 px-5 sm:px-7 md:px-10 py-4 sm:py-5 md:py-7 text-sm sm:text-base md:text-lg shadow-lg hover:shadow-2xl active:scale-95 transition-transform">
                  Explorar Colección
                  <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
            </MagneticButton>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.4, duration: 1.4 }}
        >
          <motion.div
            className="w-[1px] h-12 bg-gradient-to-b from-white/0 via-white to-white/0"
            animate={{ scaleY: [0.3, 1, 0.3], originY: [0, 0.5, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </section>

      {/* Customization Steps Banner */}
      <CustomizationSteps />

      {/* Bulk Pricing Banner */}
      <section className="bg-gradient-to-b from-black via-[#1C1C1C] to-black py-12 md:py-20 border-y border-border relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <motion.div
            className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"
            animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"
            animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Reveal direction="up" className="text-center mb-8 md:mb-12">
            <TextReveal
              as="h2"
              text="Precios Especiales"
              className="text-3xl md:text-5xl mb-3 md:mb-4 tracking-tight font-bold"
              staggerChildren={0.18}
            />
            <Reveal direction="up" delay={0.6}>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto px-2">
                Mejores precios por cantidad. Perfecto para equipos, eventos o negocios.
              </p>
            </Reveal>
          </Reveal>

          <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-8 mt-8 md:mt-12">
            <Reveal direction="right" delay={0.3} duration={1.8} distance={120} className="flex-1 max-w-sm mx-auto md:mx-0 w-full">
              <motion.div whileTap={{ scale: 0.98 }} className="group bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-6 md:p-8 rounded-2xl border-2 border-white/10 hover:border-white/30 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="inline-block bg-white/10 px-3 md:px-4 py-1.5 md:py-2 rounded-full mb-4 md:mb-6">
                    <p className="text-xs md:text-sm font-semibold text-white/80">PRECIO DETAL</p>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">$9</span>
                      <span className="text-xl md:text-2xl text-muted-foreground ml-2">/pieza</span>
                    </div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4" />
                  <p className="text-muted-foreground text-base md:text-lg">1 - 5 artículos</p>
                  <p className="text-xs md:text-sm text-white/60 mt-2">Ideal para compras personales</p>
                </div>
              </motion.div>
            </Reveal>

            <Reveal direction="left" delay={0.6} duration={1.8} distance={120} className="flex-1 max-w-sm mx-auto md:mx-0 w-full">
              <motion.div whileTap={{ scale: 0.98 }} className="group bg-gradient-to-br from-white via-white/95 to-white/90 p-6 md:p-8 rounded-2xl border-2 border-white shadow-2xl shadow-white/20 hover:shadow-white/30 transition-all duration-500 hover:scale-105 relative overflow-hidden">
                <motion.div
                  className="absolute top-0 right-0 bg-black text-white px-4 md:px-6 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-bl-2xl"
                  initial={{ x: 150 }}
                  whileInView={{ x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.4, duration: 1.2, ease: easeOut }}
                >
                  ¡AHORRA 28%!
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="inline-block bg-black px-3 md:px-4 py-1.5 md:py-2 rounded-full mb-4 md:mb-6">
                    <p className="text-xs md:text-sm font-semibold text-white">PRECIO MAYORISTA</p>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-black via-[#1C1C1C] to-black bg-clip-text text-transparent">$6.5</span>
                      <span className="text-xl md:text-2xl text-[#2A2A2A] ml-2">/pieza</span>
                    </div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-black/20 to-transparent mb-4" />
                  <p className="text-[#1C1C1C] text-base md:text-lg font-semibold">6+ artículos</p>
                  <p className="text-xs md:text-sm text-black/60 mt-2">Perfecto para equipos y revendedores</p>
                </div>
              </motion.div>
            </Reveal>
          </div>

          <Reveal direction="up" delay={1.0} className="text-center mt-12">
            <p className="text-white/70 text-sm">
              💡 El precio mayorista se aplica automáticamente al agregar 6 o más artículos al carrito
            </p>
          </Reveal>
        </div>
      </section>

      {/* Main Categories Grid */}
      <section className="py-12 md:py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TextReveal
            as="h2"
            text="Comprar por Categoría"
            className="text-3xl md:text-4xl mb-8 md:mb-12 text-center tracking-tight"
            staggerChildren={0.16}
          />
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
            {categories.map((cat, i) => (
              <Reveal key={cat.to} direction="up" delay={i * 0.12} duration={1.2} distance={80}>
                <motion.div whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 280, damping: 18 }}>
                  <Link
                    to={cat.to}
                    className="group relative h-64 md:h-96 bg-secondary rounded-xl md:rounded-lg overflow-hidden hover:ring-2 hover:ring-white transition-all duration-500 block"
                  >
                    {cat.alignTop ? (
                      <div className="w-full h-full flex items-start justify-center pt-4 md:pt-8">
                        <img
                          src={cat.image}
                          alt={cat.label}
                          className={`w-full h-auto ${cat.objectFit} ${cat.scale} transition-transform duration-700`}
                        />
                      </div>
                    ) : (
                      <img
                        src={cat.image}
                        alt={cat.label}
                        className={`w-full h-full ${cat.objectFit} ${cat.scale} transition-transform duration-700`}
                        style={cat.translateY ? { transform: `translateY(${cat.translateY})` } : undefined}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex items-end pointer-events-none">
                      <div className="p-3 md:p-6 w-full">
                        <h3 className="text-lg md:text-3xl mb-1 md:mb-2 tracking-tight transition-transform duration-500 group-hover:-translate-y-1">
                          {cat.label}
                        </h3>
                        <p className="text-xs md:text-base text-muted-foreground flex items-center">
                          Comprar
                          <ArrowRight className="ml-1.5 md:ml-2 h-3.5 w-3.5 md:h-4 md:w-4 transition-transform duration-500 group-hover:translate-x-2" />
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="relative py-12 md:py-20 overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <motion.div
              className="absolute top-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
            />
          </div>

          <div className="absolute inset-0 opacity-25">
            <ParallaxImage
              src={featuredBg}
              alt="Fondo - franelas Elemental"
              className="w-full h-full"
              speed={0.3}
            />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
            <TextReveal as="h2" text="Productos Destacados" className="text-3xl md:text-4xl mb-8 md:mb-12 tracking-tight" staggerChildren={0.15} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {featuredProducts.map((product, i) => (
                <Reveal key={product.id} direction="up" delay={i * 0.12} duration={1.2} distance={70}>
                  <motion.div whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 280, damping: 18 }}>
                    <Link
                      to={`/product/${product.id}`}
                      className="group bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] rounded-xl overflow-hidden hover:ring-2 hover:ring-white transition-all duration-500 border border-white/10 hover:border-white/30 hover:scale-105 hover:shadow-2xl hover:shadow-white/5 relative block"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="aspect-square overflow-hidden bg-secondary">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      </div>
                      <div className="p-3 md:p-4 relative z-10">
                        <h3 className="mb-1 text-sm md:text-lg transition-transform duration-500 group-hover:translate-x-1 line-clamp-1">{product.name}</h3>
                        <p className="text-muted-foreground text-sm md:text-base">${product.price}</p>
                      </div>
                    </Link>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
