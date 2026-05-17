import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="bg-black min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <div className="text-center relative z-10 px-4">
        <h1 className="text-8xl mb-4 font-bold bg-gradient-to-r from-white via-white/80 to-white bg-clip-text text-transparent">404</h1>
        <p className="text-2xl text-muted-foreground mb-8">Página no encontrada</p>
        <Link 
          to="/" 
          className="inline-block bg-white text-black px-8 py-4 rounded-lg hover:bg-gray-200 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-2xl font-semibold"
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}