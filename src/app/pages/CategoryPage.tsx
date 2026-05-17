import { useParams, Link } from 'react-router';
import { useApp } from '../context';

export default function CategoryPage() {
  const { products: allProducts } = useApp();
  const { subcategory } = useParams<{ subcategory: string }>();
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];

  // Determine if this is a subcategory-only page or category/subcategory page
  let category: string;
  let actualSubcategory: string;
  let pageTitle: string;
  let products: any[];

  // Translate subcategory names to Spanish
  const subcategoryTranslations: Record<string, string> = {
    'gorras': 'Gorras',
    'hoodies': 'Hoodies',
    'joggers': 'Joggers',
    't-shirts': 'Camisetas',
    'polos': 'Polos',
  };

  // Translate category names to Spanish
  const categoryTranslations: Record<string, string> = {
    'men': 'Hombre',
    'women': 'Mujer',
    'kids': 'Niños',
  };

  // Routes like /shop/gorras, /shop/hoodies, /shop/joggers (show all products from that subcategory across all categories)
  if (firstSegment === 'shop') {
    actualSubcategory = subcategory || '';

    // Show all products with this subcategory, regardless of category
    products = allProducts.filter(p => p.subcategory === actualSubcategory);

    pageTitle = subcategoryTranslations[actualSubcategory] || actualSubcategory.charAt(0).toUpperCase() + actualSubcategory.slice(1);
  }
  // Routes like /men/t-shirts, /women/gorras, /kids/hoodies (show products filtered by both category and subcategory)
  else {
    category = firstSegment as 'men' | 'women' | 'kids';
    actualSubcategory = subcategory || '';

    // Filter by both category and subcategory
    products = allProducts.filter(
      p => p.category === category && p.subcategory === actualSubcategory
    );

    const categoryTitle = categoryTranslations[category] || category.charAt(0).toUpperCase() + category.slice(1);
    const subcategoryTitle = subcategoryTranslations[actualSubcategory] || actualSubcategory?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    pageTitle = `${categoryTitle} - ${subcategoryTitle}`;
  }

  return (
    <div className="bg-black min-h-screen py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl mb-2">
            {pageTitle}
          </h1>
          <p className="text-muted-foreground">
            {products.length} {products.length === 1 ? 'producto' : 'productos'}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No se encontraron productos en esta categoría.</p>
            <Link to="/" className="text-white hover:underline">
              Volver al Inicio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {products.map(product => (
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
                  <h3 className="mb-1 text-sm">{product.name}</h3>
                  <p className="text-muted-foreground text-sm">${product.price}</p>
                  {product.allowCustom && (
                    <p className="text-xs text-green-400 mt-1">Personalización Disponible</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}