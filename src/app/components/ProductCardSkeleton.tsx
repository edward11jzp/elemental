// Esqueleto de tarjeta de producto. Se renderiza al instante mientras
// los productos reales cargan desde Supabase. Reduce la percepción de espera
// porque el usuario ve "algo cargando" en lugar de un grid vacío.

export function ProductCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] rounded-xl overflow-hidden border border-white/10 relative animate-pulse">
      <div className="aspect-square bg-secondary/60" />
      <div className="p-3 md:p-4 space-y-2">
        <div className="h-4 bg-secondary/60 rounded w-3/4" />
        <div className="h-4 bg-secondary/60 rounded w-1/3" />
      </div>
    </div>
  );
}

// Grid de N esqueletos para llenar mientras carga.
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
