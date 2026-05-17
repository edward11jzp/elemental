import { Outlet } from 'react-router';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import ScrollToTop from '../components/ScrollToTop';
import backgroundImage from 'figma:asset/aea30adc924240815831e87ef3429993d8977f69.png';

export default function Root() {
  return (
    <>
      <ScrollToTop />
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
          <main>
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </>
  );
}