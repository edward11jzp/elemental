import { Link } from 'react-router';
import { useApp } from '../context';
import { Button } from './ui/button';
import { SheetClose } from './ui/sheet';
import { Trash2 } from 'lucide-react';
import {
  getUnitPrice,
  getRetailUnitPrice,
  getSizeUpcharge,
  WHOLESALE_THRESHOLD,
} from '../lib/pricing';

export default function CartPanel() {
  const { cart, removeFromCart, updateCartItemQuantity, cartTotal, cartItemCount } = useApp();

  // Subtotal "equivalente a retail": lo que costaría si TODO se cobrara al precio
  // por detal del propio producto (incluyendo el recargo de talla). Sirve como
  // referencia para mostrar el ahorro cuando el carrito está en wholesale.
  const regularPrice = cart.reduce((sum, item) => {
    const retailUnit = getRetailUnitPrice(item.product) + getSizeUpcharge(item.size);
    return sum + retailUnit * item.quantity;
  }, 0);
  const savings = cartItemCount >= WHOLESALE_THRESHOLD ? Math.max(0, regularPrice - cartTotal) : 0;

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">Tu carrito está vacío</p>
        <Link to="/">
          <Button className="bg-secondary hover:bg-accent text-white">
            Continuar Comprando
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-2xl mb-6">Carrito de Compras</h2>

      <div className="flex-1 overflow-y-auto">
        {/* Lista de productos */}
        <div>
          {cart.map((item, index) => {
            const itemPrice = getUnitPrice(item.product, item.size, cartItemCount);
            const itemTotal = itemPrice * item.quantity;

            return (
              <div key={`${item.product.id}-${item.size}-${item.color}-${index}`} className="mb-4 pb-4 border-b border-border">
                <div className="flex gap-4">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="text-white mb-1">{item.product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.size} / {item.color}
                    </p>
                    {item.isCustom && (
                      <p className="text-sm text-muted-foreground">Diseño Personalizado</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateCartItemQuantity(item.product.id, item.size, item.color, item.quantity - 1)}
                        className="px-2 py-1 bg-secondary hover:bg-accent rounded text-white"
                      >
                        -
                      </button>
                      <span className="text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateCartItemQuantity(item.product.id, item.size, item.color, item.quantity + 1)}
                        className="px-2 py-1 bg-secondary hover:bg-accent rounded text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="text-right">
                      <p className="text-white">${itemTotal.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        ${itemPrice.toFixed(2)} c/u
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen del carrito - justo después de la lista */}
        <div className="border-t border-border pt-4 mt-4">
          <div className="mb-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({cartItemCount} artículos)</span>
              <span className="text-white">${cartTotal.toFixed(2)}</span>
            </div>

            {cartItemCount >= WHOLESALE_THRESHOLD && savings > 0 && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-green-400 font-medium">¡Precio al por mayor aplicado!</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-300/80">Precio regular sería:</span>
                  <span className="text-green-300/80 line-through">${regularPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-green-500/30">
                  <span className="text-green-400 font-semibold">Te ahorras:</span>
                  <span className="text-green-400 font-semibold">${savings.toFixed(2)}</span>
                </div>
              </div>
            )}

            {cartItemCount < WHOLESALE_THRESHOLD && (
              <p className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-500/30 rounded p-2">
                Agrega {WHOLESALE_THRESHOLD - cartItemCount} artículo{(WHOLESALE_THRESHOLD - cartItemCount) !== 1 ? 's' : ''} más para obtener precio al por mayor.
              </p>
            )}
          </div>
          <SheetClose asChild>
            <Link to="/checkout" className="block">
              <Button className="w-full bg-white text-black hover:bg-gray-200">
                Proceder al Pago
              </Button>
            </Link>
          </SheetClose>
        </div>
      </div>
    </div>
  );
}