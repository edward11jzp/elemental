import { Link } from 'react-router';
import { ShoppingCart, Package, DollarSign, Check, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Wholesale() {
  return (
    <div className="min-h-screen bg-black py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Precios al Por Mayor</h1>
          <p className="text-xl text-muted-foreground">
            Ahorra comprando en cantidad - ¡Es así de simple!
          </p>
        </div>

        {/* Main Info Card */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] border-2 border-white/20 rounded-2xl p-8 mb-12 hover:border-white/40 transition-all duration-300 hover:shadow-2xl hover:shadow-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-500/20 p-6 rounded-full">
                <TrendingUp className="h-12 w-12 text-green-400" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-center mb-6">
              ¿Cómo funciona el precio al por mayor?
            </h2>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Precio Regular */}
              <div className="bg-secondary/50 border border-border rounded-lg p-6">
                <div className="text-center mb-4">
                  <p className="text-muted-foreground mb-2">Precio Regular</p>
                  <p className="text-sm text-muted-foreground mb-4">(1-5 productos)</p>
                  <div className="text-5xl font-bold text-white">$9</div>
                  <p className="text-muted-foreground mt-2">por unidad</p>
                </div>
              </div>

              {/* Precio al Por Mayor */}
              <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-2 border-green-500/50 rounded-lg p-6 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    ¡MEJOR PRECIO!
                  </span>
                </div>
                <div className="text-center mb-4">
                  <p className="text-green-400 font-semibold mb-2">Precio al Por Mayor</p>
                  <p className="text-sm text-green-300/80 mb-4">(6+ productos)</p>
                  <div className="text-5xl font-bold text-green-400">$6.50</div>
                  <p className="text-green-300/80 mt-2">por unidad</p>
                </div>
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mt-4">
                  <p className="text-center text-green-400 font-semibold">
                    ¡Ahorras $2.50 por producto!
                  </p>
                </div>
              </div>
            </div>

            {/* Example calculation */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-blue-400 mb-4 text-center">
                Ejemplo de Ahorro
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-muted-foreground text-sm mb-2">6 productos</p>
                  <p className="text-2xl font-bold text-white">$39</p>
                  <p className="text-green-400 text-sm mt-1">Ahorras $15</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-2">12 productos</p>
                  <p className="text-2xl font-bold text-white">$78</p>
                  <p className="text-green-400 text-sm mt-1">Ahorras $30</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-2">24 productos</p>
                  <p className="text-2xl font-bold text-white">$156</p>
                  <p className="text-green-400 text-sm mt-1">Ahorras $60</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Feature 1 */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] border-2 border-white/10 hover:border-white/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="bg-purple-500/20 p-4 rounded-full w-fit mb-4">
                <Package className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Productos Mezclados</h3>
              <p className="text-muted-foreground">
                Combina diferentes productos, tallas y colores. Todos cuentan para el precio al por mayor.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <p className="text-sm text-muted-foreground">2 camisetas negras M</p>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <p className="text-sm text-muted-foreground">3 camisetas blancas L</p>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <p className="text-sm text-muted-foreground">1 gorra</p>
                </div>
                <p className="text-green-400 text-sm font-semibold mt-2">
                  = 6 productos = Precio al por mayor
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] border-2 border-white/10 hover:border-white/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="bg-blue-500/20 p-4 rounded-full w-fit mb-4">
                <ShoppingCart className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Aplicación Automática</h3>
              <p className="text-muted-foreground">
                El precio al por mayor se aplica automáticamente en tu carrito cuando alcanzas 6 o más productos.
              </p>
              <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-400">
                  <strong>No necesitas cupones ni códigos.</strong> El descuento se calcula al momento de pagar.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] border-2 border-white/10 hover:border-white/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="bg-green-500/20 p-4 rounded-full w-fit mb-4">
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Ahorro Garantizado</h3>
              <p className="text-muted-foreground">
                Ahorra hasta 28% en cada producto. Mientras más compres, más ahorras.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">6 productos:</span>
                  <span className="text-green-400 font-semibold">$15 de ahorro</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">12 productos:</span>
                  <span className="text-green-400 font-semibold">$30 de ahorro</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">24 productos:</span>
                  <span className="text-green-400 font-semibold">$60 de ahorro</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-white/10 to-white/5 border border-white/20 rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">¿Listo para ahorrar?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Explora nuestro catálogo completo y comienza a agregar productos a tu carrito.
            El precio al por mayor se aplicará automáticamente cuando llegues a 6 productos.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/men/t-shirts">
              <Button className="bg-white text-black hover:bg-gray-200 px-8 py-6 text-lg">
                Ver Productos para Hombres
              </Button>
            </Link>
            <Link to="/women/t-shirts">
              <Button className="bg-white text-black hover:bg-gray-200 px-8 py-6 text-lg">
                Ver Productos para Mujeres
              </Button>
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] border-2 border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Preguntas Frecuentes</h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="bg-secondary/50 border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-2">¿Debo comprar del mismo producto?</h3>
              <p className="text-sm text-muted-foreground">
                No. Puedes mezclar cualquier combinación de productos, tallas y colores. Lo importante es llegar a 6 unidades en total.
              </p>
            </div>
            <div className="bg-secondary/50 border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-2">¿Cómo sé si califico para el precio al por mayor?</h3>
              <p className="text-sm text-muted-foreground">
                En tu carrito verás claramente el precio aplicado. Cuando tengas 6 o más productos, automáticamente verás el precio de $6.50 por unidad.
              </p>
            </div>
            <div className="bg-secondary/50 border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-2">¿Los productos personalizados también califican?</h3>
              <p className="text-sm text-muted-foreground">
                Sí. Los productos con logos personalizados cuentan para el total. El precio base se reduce a $6.50 y solo pagas el costo adicional de la personalización.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
