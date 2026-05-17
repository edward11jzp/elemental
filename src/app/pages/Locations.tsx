import { MapPin, Phone, Truck } from 'lucide-react';
import { useApp } from '../context';

export default function Locations() {
  const { locations } = useApp();
  
  // Separar las tiendas físicas de la opción de envíos
  const physicalStores = locations.filter(loc => loc.id !== 'loc-6');
  const shippingOption = locations.find(loc => loc.id === 'loc-6');

  return (
    <div className="min-h-screen bg-black py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.3s' }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Nuestras Ubicaciones</h1>
          <p className="text-muted-foreground text-lg">
            Visítanos en cualquiera de nuestras tiendas físicas
          </p>
        </div>

        {/* Shipping Option Highlight */}
        {shippingOption && (
          <div className="mb-12">
            <div className="bg-gradient-to-r from-[#2A2A2A] via-[#1C1C1C] to-[#2A2A2A] border-2 border-white/20 rounded-2xl overflow-hidden hover:border-white/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/10 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>

              {shippingOption.image && (
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={shippingOption.image}
                    alt={shippingOption.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1C] to-transparent opacity-70"></div>
                </div>
              )}

              <div className="flex items-start gap-4 relative z-10 p-8">
                <div className="bg-white/10 p-4 rounded-lg hover:bg-white/20 transition-colors duration-300">
                  <Truck className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 text-white">
                    {shippingOption.name}
                  </h3>
                  <p className="text-lg text-muted-foreground mb-4">
                    {shippingOption.address} - Realizamos envíos a toda Venezuela
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">WhatsApp</p>
                        <a
                          href={`https://wa.me/${shippingOption.phone.replace(/[-\s]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-green-400 transition-colors text-lg font-semibold"
                        >
                          {shippingOption.phone}
                        </a>
                      </div>
                    </div>
                    
                    {shippingOption.hours && (
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5" /> {/* Spacer */}
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Horario de Atención</p>
                          <p className="text-white">{shippingOption.hours}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Physical Stores Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-center">Tiendas Físicas</h2>
          <p className="text-center text-muted-foreground mt-2">
            Visítanos en nuestras ubicaciones en centros comerciales
          </p>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {physicalStores.map((location) => (
            <div
              key={location.id}
              className="group bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] border-2 border-white/10 hover:border-white/30 rounded-2xl overflow-hidden hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></div>

              {/* Store Image */}
              {location.image && (
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={location.image}
                    alt={location.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1C] to-transparent opacity-60"></div>
                </div>
              )}

              <div className="relative z-10 p-6">
                {/* Store Name */}
                <h3 className="text-xl font-semibold mb-4">{location.name}</h3>

                {/* Shopping Center */}
                <div className="flex items-start gap-3 mb-4">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Centro Comercial</p>
                    <p className="text-white">{location.shoppingCenter}</p>
                    {location.address && (
                      <p className="text-sm text-muted-foreground mt-1">{location.address}</p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
                    <a
                      href={`tel:${location.phone}`}
                      className="text-white hover:text-muted-foreground transition-colors"
                    >
                      {location.phone}
                    </a>
                  </div>
                </div>

                {/* Store Hours */}
                {location.hours && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-1">Horario</p>
                    <p className="text-white text-sm">{location.hours}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {locations.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              Próximamente tendremos ubicaciones disponibles
            </p>
          </div>
        )}
      </div>
    </div>
  );
}