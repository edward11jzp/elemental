import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useApp } from '../context';
import logo from 'figma:asset/480ee1658c29520edefebbfe9dcbc0d422f8424b.png';
import heroImage from 'figma:asset/d562ab79e646ba503bef3f9807ee4a9fffec1d55.png';
import hatImage from 'figma:asset/1b3b90e9f13e6f0bfe2e2ccee076db293bf3180e.png';
import hoodieImage from 'figma:asset/000b79075e554c3caa9cda5c12cfc602e256af3d.png';
import menImage from 'figma:asset/d34a77067b13abc7af031b55d2f7ac2a556ba76a.png';
import joggersImage from 'figma:asset/e6c2eb959acec89a78c0621a4c3d5c23a3f7fda7.png';
import womenImage from 'figma:asset/9f8a99366f1dd435750f8f7443c9f181ed8cd617.png';

export default function Home() {
  const { products, siteSettings } = useApp();
  const featuredProducts = products.filter(p => p.featured);
  const trendingProducts = products.filter(p => p.trending);

  return (
    <div className="bg-black">
      {/* Hero Section with Background Image */}
      <section className="relative h-[700px] flex items-center justify-center overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>
        
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Streetwear Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative text-center px-4 z-10">
          <img 
            src={logo} 
            alt="ELEMENTAL" 
            className="w-auto h-24 md:h-32 mx-auto mb-6 animate-fade-in" 
          />
          <p className="text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto tracking-wide animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {siteSettings.tagline}
          </p>
          <Link to="/men/t-shirts">
            <Button className="bg-white text-black hover:bg-gray-200 px-10 py-7 text-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl animate-fade-in" style={{ animationDelay: '0.4s' }}>
              Explorar Colección
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Bulk Pricing Banner */}
      <section className="bg-gradient-to-b from-black via-[#1C1C1C] to-black py-20 border-y border-border relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl mb-4 tracking-tight font-bold">Precios Especiales</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Mejores precios por cantidad. Perfecto para equipos, eventos o negocios.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row justify-center gap-8 mt-12">
            {/* Retail Price Card */}
            <div className="group bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-8 rounded-2xl border-2 border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-white/5 flex-1 max-w-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="inline-block bg-white/10 px-4 py-2 rounded-full mb-6">
                  <p className="text-sm font-semibold text-white/80">PRECIO DETAL</p>
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-6xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">$9</span>
                    <span className="text-2xl text-muted-foreground ml-2">/pieza</span>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4"></div>
                <p className="text-muted-foreground text-lg">1 - 5 artículos</p>
                <p className="text-sm text-white/60 mt-2">Ideal para compras personales</p>
              </div>
            </div>

            {/* Wholesale Price Card - Featured */}
            <div className="group bg-gradient-to-br from-white via-white/95 to-white/90 p-8 rounded-2xl border-2 border-white shadow-2xl shadow-white/20 hover:shadow-white/30 transition-all duration-300 hover:scale-105 flex-1 max-w-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-black text-white px-6 py-2 text-sm font-bold rounded-bl-2xl">
                ¡AHORRA 28%!
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="inline-block bg-black px-4 py-2 rounded-full mb-6">
                  <p className="text-sm font-semibold text-white">PRECIO MAYORISTA</p>
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-6xl font-bold bg-gradient-to-r from-black via-[#1C1C1C] to-black bg-clip-text text-transparent">$6.5</span>
                    <span className="text-2xl text-[#2A2A2A] ml-2">/pieza</span>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-black/20 to-transparent mb-4"></div>
                <p className="text-[#1C1C1C] text-lg font-semibold">6+ artículos</p>
                <p className="text-sm text-black/60 mt-2">Perfecto para equipos y revendedores</p>
              </div>
            </div>
          </div>

          {/* Additional info */}
          <div className="text-center mt-12">
            <p className="text-white/70 text-sm">
              💡 El precio mayorista se aplica automáticamente al agregar 6 o más artículos al carrito
            </p>
          </div>
        </div>
      </section>

      {/* Main Categories Grid */}
      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-12 text-center tracking-tight">Comprar por Categoría</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Gorras */}
            <Link
              to="/shop/gorras"
              className="group relative h-96 bg-secondary rounded-lg overflow-hidden hover:ring-2 hover:ring-white transition-all"
            >
              <div className="w-full h-full flex items-start justify-center pt-8">
                <img
                  src={hatImage}
                  alt="Gorras"
                  className="w-full h-auto object-contain scale-150 group-hover:scale-[1.65] transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex items-end pointer-events-none">
                <div className="p-6 w-full">
                  <h3 className="text-3xl mb-2 tracking-tight">GORRAS</h3>
                  <p className="text-muted-foreground flex items-center">
                    Comprar Ahora <ArrowRight className="ml-2 h-4 w-4" />
                  </p>
                </div>
              </div>
            </Link>

            {/* Hoodies */}
            <Link
              to="/shop/hoodies"
              className="group relative h-96 bg-secondary rounded-lg overflow-hidden hover:ring-2 hover:ring-white transition-all"
            >
              <img
                src={hoodieImage}
                alt="Hoodies"
                className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                style={{ transform: 'translateY(-15%)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex items-end">
                <div className="p-6 w-full">
                  <h3 className="text-3xl mb-2 tracking-tight">HOODIES</h3>
                  <p className="text-muted-foreground flex items-center">
                    Comprar Ahora <ArrowRight className="ml-2 h-4 w-4" />
                  </p>
                </div>
              </div>
            </Link>

            {/* Joggers */}
            <Link
              to="/shop/joggers"
              className="group relative h-96 bg-secondary rounded-lg overflow-hidden hover:ring-2 hover:ring-white transition-all"
            >
              <img
                src={joggersImage}
                alt="Joggers"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex items-end">
                <div className="p-6 w-full">
                  <h3 className="text-3xl mb-2 tracking-tight">JOGGERS</h3>
                  <p className="text-muted-foreground flex items-center">
                    Comprar Ahora <ArrowRight className="ml-2 h-4 w-4" />
                  </p>
                </div>
              </div>
            </Link>

            {/* Men */}
            <Link
              to="/men/t-shirts"
              className="group relative h-96 bg-secondary rounded-lg overflow-hidden hover:ring-2 hover:ring-white transition-all"
            >
              <img
                src={menImage}
                alt="Colección de Hombre"
                className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                style={{ transform: 'translateY(-15%)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex items-end">
                <div className="p-6 w-full">
                  <h3 className="text-3xl mb-2 tracking-tight">HOMBRE</h3>
                  <p className="text-muted-foreground flex items-center">
                    Comprar Ahora <ArrowRight className="ml-2 h-4 w-4" />
                  </p>
                </div>
              </div>
            </Link>

            {/* Women */}
            <Link
              to="/women/t-shirts"
              className="group relative h-96 bg-secondary rounded-lg overflow-hidden hover:ring-2 hover:ring-white transition-all"
            >
              <img
                src={womenImage}
                alt="Colección de Mujer"
                className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                style={{ transform: 'translateY(-15%)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex items-end">
                <div className="p-6 w-full">
                  <h3 className="text-3xl mb-2 tracking-tight">MUJER</h3>
                  <p className="text-muted-foreground flex items-center">
                    Comprar Ahora <ArrowRight className="ml-2 h-4 w-4" />
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products with Background */}
      {featuredProducts.length > 0 && (
        <section className="relative py-20 overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.2s' }}></div>
          </div>

          <div className="absolute inset-0 opacity-10">
            <img
              src="https://images.unsplash.com/photo-1691995016747-d367c51c7d65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1cmJhbiUyMHN0cmVldCUyMGdyYWZmaXRpJTIwd2FsbHxlbnwxfHx8fDE3NzI2NjE3NDd8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Fondo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
            <h2 className="text-4xl mb-12 tracking-tight">Productos Destacados</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {featuredProducts.map(product => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] rounded-xl overflow-hidden hover:ring-2 hover:ring-white transition-all duration-300 border border-white/10 hover:border-white/30 hover:scale-105 hover:shadow-2xl hover:shadow-white/5 relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="aspect-square overflow-hidden bg-secondary">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 relative z-10">
                    <h3 className="mb-1 text-lg">{product.name}</h3>
                    <p className="text-muted-foreground">${product.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}