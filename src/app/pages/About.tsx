import { AnimatedSection } from '../components/AnimatedSection';

export default function About() {
  return (
    <div className="bg-black min-h-screen py-16 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2.5s' }}></div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <AnimatedSection animation="fade-in-up">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl mb-6 font-bold tracking-tight">
              Nuestra Historia
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-transparent via-white to-transparent mx-auto"></div>
          </div>
        </AnimatedSection>

        {/* Content Cards */}
        <div className="space-y-8">
          {/* First Paragraph */}
          <AnimatedSection animation="fade-in-up" delay={1}>
            <div className="apple-card bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-8 md:p-12 rounded-2xl border-2 border-white/10 hover:border-white/20 shadow-2xl hover:shadow-white/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 apple-transition"></div>
              <div className="relative z-10">
                <div className="text-6xl text-white/20 mb-4">"</div>
                <p className="text-lg md:text-xl text-white/90 leading-relaxed">
                  Nuestra historia nace de la pasión por ofrecer <span className="text-white font-semibold">calidad, compromiso y excelencia</span> en cada detalle. Con más de <span className="text-white font-semibold">10 años de experiencia</span> en la industria, hemos construido una reputación basada en la confianza de nuestros clientes y en la entrega constante de un servicio excepcional.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Second Paragraph with Icon */}
          <AnimatedSection animation="fade-in-up" delay={2}>
            <div className="apple-card bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-8 md:p-12 rounded-2xl border-2 border-white/10 hover:border-white/20 shadow-2xl hover:shadow-white/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 apple-transition"></div>
              <div className="relative z-10">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-white/10 p-3 rounded-lg flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-white mt-1">
                    Especialización y Dedicación
                  </h3>
                </div>
                <p className="text-lg md:text-xl text-white/90 leading-relaxed">
                  A lo largo de los años, nos hemos especializado en <span className="text-white font-semibold">bordados y estampados</span>, adaptándonos a las necesidades de cada proyecto y cuidando cada pieza como si fuera única. Nuestro equipo trabaja con <span className="text-white font-semibold">responsabilidad, dedicación y precisión</span>, asegurando resultados que no solo cumplen, sino que superan las expectativas.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Third Paragraph */}
          <AnimatedSection animation="fade-in-up" delay={3}>
            <div className="apple-card bg-gradient-to-br from-white via-white/95 to-white/90 p-8 md:p-12 rounded-2xl border-2 border-white shadow-2xl shadow-white/20 hover:shadow-white/30 transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-black p-3 rounded-lg flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-black mt-1">
                    Más que un Servicio
                  </h3>
                </div>
                <p className="text-lg md:text-xl text-black/80 leading-relaxed">
                  Más que un servicio, ofrecemos <span className="text-black font-semibold">soluciones personalizadas</span> que reflejan la identidad de cada cliente. Creemos que <span className="text-black font-semibold">cada diseño cuenta una historia</span>, y estamos aquí para ayudar a que la tuya se vea, se sienta y deje huella.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
            <div className="text-4xl font-bold text-white mb-2">10+</div>
            <div className="text-muted-foreground">Años de Experiencia</div>
          </div>
          <div className="text-center bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
            <div className="text-4xl font-bold text-white mb-2">100%</div>
            <div className="text-muted-foreground">Compromiso con Calidad</div>
          </div>
          <div className="text-center bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
            <div className="text-4xl font-bold text-white mb-2">∞</div>
            <div className="text-muted-foreground">Soluciones Personalizadas</div>
          </div>
        </div>
      </div>
    </div>
  );
}