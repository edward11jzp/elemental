import { Link } from 'react-router';
import { Search, ShoppingCart, User, Menu, X } from 'lucide-react';
import { useApp } from '../context';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import CartPanel from './CartPanel';
import logo from 'figma:asset/480ee1658c29520edefebbfe9dcbc0d422f8424b.png';

export default function Navigation() {
  const { cartItemCount, searchQuery, setSearchQuery } = useApp();
  const [showSearch, setShowSearch] = useState(false);
  const [menOpen, setMenOpen] = useState(false);
  const [womenOpen, setWomenOpen] = useState(false);
  const [kidsOpen, setKidsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-black border-b border-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white hover:text-muted-foreground transition-colors"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img src={logo} alt="ELEMENTAL" className="h-8 w-auto" />
          </Link>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Men Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setMenOpen(true)}
              onMouseLeave={() => setMenOpen(false)}
            >
              <button className="text-white hover:text-muted-foreground apple-transition px-3 py-2">
                Hombre
              </button>
              {menOpen && (
                <div className="absolute left-0 top-full pt-2 w-48 apple-fade-in-up">
                  <div className="bg-secondary border border-border rounded-md shadow-lg py-2 apple-accelerate">
                    <Link
                      to="/men/t-shirts"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Camisetas
                    </Link>
                    <Link
                      to="/men/polos"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Polos
                    </Link>
                    <Link
                      to="/men/gorras"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Gorras
                    </Link>
                    <Link
                      to="/men/hoodies"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Hoodies
                    </Link>
                    <Link
                      to="/men/joggers"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Joggers
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Women Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setWomenOpen(true)}
              onMouseLeave={() => setWomenOpen(false)}
            >
              <button className="text-white hover:text-muted-foreground apple-transition px-3 py-2">
                Mujer
              </button>
              {womenOpen && (
                <div className="absolute left-0 top-full pt-2 w-48 apple-fade-in-up">
                  <div className="bg-secondary border border-border rounded-md shadow-lg py-2 apple-accelerate">
                    <Link
                      to="/women/t-shirts"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Camisetas
                    </Link>
                    <Link
                      to="/women/polos"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Polos
                    </Link>
                    <Link
                      to="/women/gorras"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Gorras
                    </Link>
                    <Link
                      to="/women/hoodies"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Hoodies
                    </Link>
                    <Link
                      to="/women/joggers"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Joggers
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Kids Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setKidsOpen(true)}
              onMouseLeave={() => setKidsOpen(false)}
            >
              <button className="text-white hover:text-muted-foreground apple-transition px-3 py-2">
                Niños
              </button>
              {kidsOpen && (
                <div className="absolute left-0 top-full pt-2 w-48 apple-fade-in-up">
                  <div className="bg-secondary border border-border rounded-md shadow-lg py-2 apple-accelerate">
                    <Link
                      to="/kids/t-shirts"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Camisetas
                    </Link>
                    <Link
                      to="/kids/polos"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Polos
                    </Link>
                    <Link
                      to="/kids/gorras"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Gorras
                    </Link>
                    <Link
                      to="/kids/hoodies"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Hoodies
                    </Link>
                    <Link
                      to="/kids/joggers"
                      className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                    >
                      Joggers
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Wholesale Link - Destacado */}
            <Link
              to="/wholesale"
              className="text-green-400 hover:text-green-300 transition-colors px-3 py-2 font-semibold"
            >
              Al Por Mayor
            </Link>

            {/* Locations Link */}
            <Link
              to="/locations"
              className="text-white hover:text-muted-foreground transition-colors px-3 py-2"
            >
              Ubicaciones
            </Link>
          </div>

          {/* Right Navigation */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="text-white hover:text-muted-foreground transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Account */}
            <Link
              to="/account"
              className="text-white hover:text-muted-foreground transition-colors"
            >
              <User className="h-5 w-5" />
            </Link>

            {/* Cart */}
            <Sheet>
              <SheetTrigger asChild>
                <button className="text-white hover:text-muted-foreground transition-colors relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-white text-black text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent className="bg-card border-border w-full sm:max-w-lg">
                <SheetTitle className="sr-only">Carrito de Compras</SheetTitle>
                <SheetDescription className="sr-only">
                  Revisa los productos en tu carrito de compras
                </SheetDescription>
                <CartPanel />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="pb-4">
            <Input
              type="search"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary border-border text-white placeholder:text-muted-foreground"
            />
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-secondary py-4 space-y-4">
            {/* Men Section */}
            <div>
              <div className="text-white px-4 py-2 font-semibold">Hombre</div>
              <Link
                to="/men/t-shirts"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Camisetas
              </Link>
              <Link
                to="/men/polos"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Polos
              </Link>
              <Link
                to="/men/gorras"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Gorras
              </Link>
              <Link
                to="/men/hoodies"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Hoodies
              </Link>
              <Link
                to="/men/joggers"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Joggers
              </Link>
            </div>

            {/* Women Section */}
            <div>
              <div className="text-white px-4 py-2 font-semibold">Mujer</div>
              <Link
                to="/women/t-shirts"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Camisetas
              </Link>
              <Link
                to="/women/polos"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Polos
              </Link>
              <Link
                to="/women/gorras"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Gorras
              </Link>
              <Link
                to="/women/hoodies"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Hoodies
              </Link>
              <Link
                to="/women/joggers"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Joggers
              </Link>
            </div>

            {/* Kids Section */}
            <div>
              <div className="text-white px-4 py-2 font-semibold">Niños</div>
              <Link
                to="/kids/t-shirts"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Camisetas
              </Link>
              <Link
                to="/kids/polos"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Polos
              </Link>
              <Link
                to="/kids/gorras"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Gorras
              </Link>
              <Link
                to="/kids/hoodies"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Hoodies
              </Link>
              <Link
                to="/kids/joggers"
                className="block px-8 py-2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Joggers
              </Link>
            </div>

            {/* Wholesale Link - Destacado */}
            <Link
              to="/wholesale"
              className="block px-4 py-2 text-green-400 font-semibold hover:text-green-300 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              🔥 Al Por Mayor - ¡Ahorra!
            </Link>

            <Link
              to="/locations"
              className="block px-4 py-2 text-white hover:text-muted-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Ubicaciones
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}