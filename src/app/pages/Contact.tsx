import { MessageCircle, Phone } from 'lucide-react';
import { Button } from '../components/ui/button';
import { AnimatedSection } from '../components/AnimatedSection';

export default function Contact() {
  const whatsappNumber = '584124777970'; // Formato internacional
  const displayNumber = '0412-477-7970'; // Formato de visualización
  const whatsappLink = `https://wa.me/${whatsappNumber}`;

  return (
    <div className="bg-black min-h-screen py-16 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-green-500 rounded-full blur-3xl animate-pulse opacity-20" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <AnimatedSection animation="fade-in-up">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl mb-6 font-bold tracking-tight">
              Contáctanos
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-transparent via-white to-transparent mx-auto mb-6"></div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Estamos aquí para ayudarte. Ponte en contacto con nosotros a través de WhatsApp.
            </p>
          </div>
        </AnimatedSection>

        {/* Main Contact Card */}
        <AnimatedSection animation="fade-in-up" delay={1}>
          <div className="bg-gradient-to-br from-green-600 via-green-500 to-green-600 p-1 rounded-3xl mb-8 apple-card shadow-2xl shadow-green-500/20 hover:shadow-green-500/40">
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-8 md:p-12 rounded-3xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 apple-transition"></div>
              
              <div className="relative z-10">
                {/* WhatsApp Icon */}
                <div className="flex justify-center mb-6">
                  <div className="bg-green-500 p-6 rounded-full shadow-lg shadow-green-500/50 group-hover:scale-110 transition-transform duration-300">
                    <MessageCircle className="h-12 w-12 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-white">
                  Escríbenos por WhatsApp
                </h2>

                {/* Phone Number */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  <Phone className="h-6 w-6 text-green-400" />
                  <a 
                    href={`tel:${displayNumber}`}
                    className="text-3xl md:text-4xl font-bold text-white hover:text-green-400 transition-colors"
                  >
                    {displayNumber}
                  </a>
                </div>

                {/* WhatsApp Button */}
                <div className="flex justify-center">
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full max-w-md"
                  >
                    <Button className="w-full bg-green-500 hover:bg-green-600 text-white text-lg py-7 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3">
                      <MessageCircle className="h-6 w-6" />
                      Abrir WhatsApp
                    </Button>
                  </a>
                </div>

                {/* Description */}
                <p className="text-center text-white/70 mt-6 text-lg">
                  Haz clic en el botón para iniciar una conversación con nosotros
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Horario Card */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-6 rounded-2xl border-2 border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="bg-white/10 p-3 rounded-lg w-fit mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Horario de Atención</h3>
              <p className="text-white/70">
                Lunes a Sábado<br />
                9:00 AM - 6:00 PM
              </p>
            </div>
          </div>

          {/* Respuesta Rápida Card */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-6 rounded-2xl border-2 border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="bg-white/10 p-3 rounded-lg w-fit mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="m3 11 18-5v12L3 14v-3z"/>
                  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Respuesta Rápida</h3>
              <p className="text-white/70">
                Nuestro equipo te responderá en el menor tiempo posible
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-8 rounded-2xl border-2 border-white/10">
          <h3 className="text-2xl font-semibold mb-4 text-white">¿Tienes preguntas sobre pedidos?</h3>
          <p className="text-white/70 text-lg mb-4">
            Nuestro equipo está listo para ayudarte con cotizaciones, personalización de productos, seguimiento de pedidos y cualquier consulta que tengas.
          </p>
          <p className="text-green-400 font-semibold text-lg">
            ¡Esperamos tu mensaje!
          </p>
        </div>
      </div>
    </div>
  );
}