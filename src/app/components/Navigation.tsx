import { Link, useNavigate } from 'react-router';
import { Search, ShoppingCart, Menu, X, Tag, Package, Layers, ChevronDown } from 'lucide-react';
import { useApp } from '../context';
import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import CartPanel from './CartPanel';
import logo from 'figma:asset/480ee1658c29520edefebbfe9dcbc0d422f8424b.png';

// Categorías raíz exactas mostradas en el nav (label visible -> slug interno)
const ROOT_CATEGORIES = [
  { slug: 'men',   label: 'Caballeros' },
  { slug: 'women', label: 'Damas' },
  { slug: 'kids',  label: 'Niños' },
] as const;

// Normaliza para búsqueda: minúsculas, sin acentos
const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export default function Navigation() {
  const { cartItemCount, searchQuery, setSearchQuery, products, subcategories } = useApp();
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [menOpen, setMenOpen] = useState(false);
  const [womenOpen, setWomenOpen] = useState(false);
  const [kidsOpen, setKidsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Acordeón móvil: qué sección de género está expandida (null = ninguna)
  const [mobileSection, setMobileSection] = useState<'men' | 'women' | 'kids' | null>(null);

  // Cierra el menú móvil y resetea el acordeón al navegar a una sub.
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMobileSection(null);
  };

  // Toggle acordeón: si tocan la misma sección, se cierra. Si tocan otra, esa se abre.
  const toggleMobileSection = (gender: 'men' | 'women' | 'kids') => {
    setMobileSection((prev) => (prev === gender ? null : gender));
  };

  // Subcategorías que tienen al menos un producto publicado por categoría raíz.
  // Permite ocultar dropdown items vacíos en el nav (desktop y mobile).
  const availableByCategory = useMemo(() => {
    const map: Record<'men' | 'women' | 'kids', Set<string>> = {
      men: new Set(),
      women: new Set(),
      kids: new Set(),
    };
    for (const p of products) {
      if (p.category && p.subcategory && map[p.category]) {
        map[p.category].add(p.subcategory);
      }
    }
    return map;
  }, [products]);

  // Helper: subcategorías visibles para una categoría raíz dada.
  const visibleSubsFor = (gender: 'men' | 'women' | 'kids') =>
    subcategories.filter((s) => availableByCategory[gender].has(s.value));

  // Build matching results from categories, subcategories and product names.
  type Result =
    | { type: 'category'; label: string; href: string }
    | { type: 'subcategory'; label: string; href: string; from: string }
    | { type: 'product'; label: string; href: string; image?: string };

  const results = useMemo<Result[]>(() => {
    const q = normalize(searchQuery);
    if (!q) return [];

    const out: Result[] = [];

    // Root categories
    for (const c of ROOT_CATEGORIES) {
      if (normalize(c.label).includes(q)) {
        out.push({ type: 'category', label: c.label, href: `/${c.slug}/t-shirts` });
      }
    }

    // Subcategories — link to gender-neutral /shop/:slug for browsing
    for (const s of subcategories) {
      if (normalize(s.label).includes(q) || normalize(s.value).includes(q)) {
        out.push({ type: 'subcategory', label: s.label, href: `/shop/${s.value}`, from: 'Subcategoría' });
      }
    }

    // Products (top 6 matches)
    const matchedProducts = products.filter((p) => normalize(p.name).includes(q)).slice(0, 6);
    for (const p of matchedProducts) {
      out.push({ type: 'product', label: p.name, href: `/product/${p.id}`, image: p.image });
    }

    return out.slice(0, 12);
  }, [searchQuery, subcategories, products]);

  const handleResultClick = (href: string) => {
    setSearchQuery('');
    setShowSearch(false);
    navigate(href);
  };

  return (
    <nav className="sticky top-0 z-50 bg-black border-b border-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Menu Button */}
          <button
            onClick={() => {
              if (mobileMenuOpen) {
                closeMobileMenu();
              } else {
                setMobileMenuOpen(true);
              }
            }}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-2 -ml-2 text-white hover:text-muted-foreground transition-colors"
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
                Caballeros
              </button>
              {menOpen && (
                <div className="absolute left-0 top-full pt-2 w-48 apple-fade-in-up">
                  <div className="bg-secondary border border-border rounded-md shadow-lg py-2 apple-accelerate">
                    {visibleSubsFor('men').map((s) => (
                      <Link
                        key={s.value}
                        to={`/men/${s.value}`}
                        className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                      >
                        {s.label}
                      </Link>
                    ))}
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
                Damas
              </button>
              {womenOpen && (
                <div className="absolute left-0 top-full pt-2 w-48 apple-fade-in-up">
                  <div className="bg-secondary border border-border rounded-md shadow-lg py-2 apple-accelerate">
                    {visibleSubsFor('women').map((s) => (
                      <Link
                        key={s.value}
                        to={`/women/${s.value}`}
                        className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                      >
                        {s.label}
                      </Link>
                    ))}
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
                    {visibleSubsFor('kids').map((s) => (
                      <Link
                        key={s.value}
                        to={`/kids/${s.value}`}
                        className="block px-4 py-2 text-white hover:bg-accent apple-transition"
                      >
                        {s.label}
                      </Link>
                    ))}
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
          <div className="pb-4 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                autoFocus
                placeholder="Buscar categorías, subcategorías o productos…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary border-border text-white placeholder:text-muted-foreground pl-9 pr-9 text-base"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-white"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results dropdown */}
            {searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-secondary border border-border rounded-md shadow-2xl max-h-[60vh] overflow-y-auto z-50">
                {results.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Sin resultados para "{searchQuery}"
                  </div>
                ) : (
                  <ul className="py-2">
                    {results.map((r, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => handleResultClick(r.href)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
                        >
                          {r.type === 'product' ? (
                            r.image ? (
                              <img src={r.image} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                            ) : (
                              <Package className="w-5 h-5 text-muted-foreground shrink-0" />
                            )
                          ) : r.type === 'category' ? (
                            <Layers className="w-5 h-5 text-white/80 shrink-0" />
                          ) : (
                            <Tag className="w-5 h-5 text-white/80 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{r.label}</p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {r.type === 'category' && 'Categoría'}
                              {r.type === 'subcategory' && 'Subcategoría'}
                              {r.type === 'product' && 'Producto'}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mobile Menu (acordeón + scrollable) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-secondary max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain">
            <div className="py-2">
              {/* Caballeros */}
              {visibleSubsFor('men').length > 0 && (
                <div className="border-b border-secondary/50">
                  <button
                    type="button"
                    onClick={() => toggleMobileSection('men')}
                    aria-expanded={mobileSection === 'men'}
                    className="w-full flex items-center justify-between px-4 py-3 text-white font-semibold active:bg-secondary/60 transition-colors"
                  >
                    <span>Caballeros</span>
                    <ChevronDown
                      className={`h-5 w-5 transition-transform duration-200 ${
                        mobileSection === 'men' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {mobileSection === 'men' && (
                    <div className="pb-2">
                      {visibleSubsFor('men').map((s) => (
                        <Link
                          key={s.value}
                          to={`/men/${s.value}`}
                          className="block px-8 py-2.5 text-muted-foreground active:text-white active:bg-secondary/60 transition-colors"
                          onClick={closeMobileMenu}
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Damas */}
              {visibleSubsFor('women').length > 0 && (
                <div className="border-b border-secondary/50">
                  <button
                    type="button"
                    onClick={() => toggleMobileSection('women')}
                    aria-expanded={mobileSection === 'women'}
                    className="w-full flex items-center justify-between px-4 py-3 text-white font-semibold active:bg-secondary/60 transition-colors"
                  >
                    <span>Damas</span>
                    <ChevronDown
                      className={`h-5 w-5 transition-transform duration-200 ${
                        mobileSection === 'women' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {mobileSection === 'women' && (
                    <div className="pb-2">
                      {visibleSubsFor('women').map((s) => (
                        <Link
                          key={s.value}
                          to={`/women/${s.value}`}
                          className="block px-8 py-2.5 text-muted-foreground active:text-white active:bg-secondary/60 transition-colors"
                          onClick={closeMobileMenu}
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Niños */}
              {visibleSubsFor('kids').length > 0 && (
                <div className="border-b border-secondary/50">
                  <button
                    type="button"
                    onClick={() => toggleMobileSection('kids')}
                    aria-expanded={mobileSection === 'kids'}
                    className="w-full flex items-center justify-between px-4 py-3 text-white font-semibold active:bg-secondary/60 transition-colors"
                  >
                    <span>Niños</span>
                    <ChevronDown
                      className={`h-5 w-5 transition-transform duration-200 ${
                        mobileSection === 'kids' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {mobileSection === 'kids' && (
                    <div className="pb-2">
                      {visibleSubsFor('kids').map((s) => (
                        <Link
                          key={s.value}
                          to={`/kids/${s.value}`}
                          className="block px-8 py-2.5 text-muted-foreground active:text-white active:bg-secondary/60 transition-colors"
                          onClick={closeMobileMenu}
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Wholesale */}
              <Link
                to="/wholesale"
                className="block px-4 py-3 text-green-400 font-semibold active:text-green-300 active:bg-secondary/60 border-b border-secondary/50 transition-colors"
                onClick={closeMobileMenu}
              >
                🔥 Al Por Mayor - ¡Ahorra!
              </Link>

              {/* Ubicaciones */}
              <Link
                to="/locations"
                className="block px-4 py-3 text-white active:text-muted-foreground active:bg-secondary/60 transition-colors"
                onClick={closeMobileMenu}
              >
                Ubicaciones
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}