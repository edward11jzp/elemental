import { Link } from 'react-router';
import { useApp } from '../context';
import { Button } from '../components/ui/button';

export default function Cart() {
  const { cart } = useApp();

  return (
    <div className="bg-black min-h-screen py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.9s' }}></div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h1 className="text-4xl mb-8">Carrito de Compras</h1>
        
        {cart.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] rounded-2xl border-2 border-white/10 p-12">
            <p className="text-muted-foreground mb-4 text-lg">Tu carrito está vacío</p>
            <Link to="/">
              <Button className="bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl">
                Continuar Comprando
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            <Link to="/checkout">
              <Button className="w-full bg-white text-black hover:bg-gray-200 mb-4 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-2xl py-6 text-lg">
                Proceder al Pago
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}