import { Outlet } from 'react-router';
import { Suspense } from 'react';
import Navigation from '../components/Navigation';
import MarqueeBanner from '../components/MarqueeBanner';
import Footer from '../components/Footer';
import ScrollToTop from '../components/ScrollToTop';
import { ScrollProgress } from '../components/animations/ScrollProgress';
import { FloatingWhatsApp } from '../components/FloatingWhatsApp';
import backgroundImage from 'figma:asset/aea30adc924240815831e87ef3429993d8977f69.png';

// Loader simple para rutas lazy. Evita layout shift y da feedback inmediato.
function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
}

export default function Root() {
  return (
    <>
      <ScrollToTop />
      <ScrollProgress />
      <div className="min-h-screen bg-black text-white relative">
        {/* Background image with blur effect */}
        <div
          className="fixed inset-0 z-0 opacity-20"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(8px)',
          }}
        />

        {/* Dark overlay to maintain readability */}
        <div className="fixed inset-0 z-0 bg-black/60" />

        {/* Content */}
        <div className="relative z-10">
          <Navigation />
          <MarqueeBanner />
          <main>
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </main>
          <Footer />
        </div>
        <FloatingWhatsApp />
      </div>
    </>
  );
}