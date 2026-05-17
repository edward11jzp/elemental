import { Link } from 'react-router';
import { Facebook, Instagram, Twitter, Youtube, Linkedin, MessageCircle } from 'lucide-react';
import { useApp } from '../context';

const PLATFORM_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  tiktok: MessageCircle,
  youtube: Youtube,
  whatsapp: MessageCircle,
  linkedin: Linkedin,
  pinterest: MessageCircle,
};

export default function Footer() {
  const { socialMedia } = useApp();
  const activeSocialMedia = socialMedia.filter(s => s.active);

  return (
    <footer className="bg-secondary border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-white mb-4">ELEMENTAL</h3>
            <p className="text-muted-foreground text-sm">
              Tu idea, hecha realidad.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white mb-4">Tienda</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/men/t-shirts" className="text-muted-foreground hover:text-white transition-colors text-sm">
                  Hombre
                </Link>
              </li>
              <li>
                <Link to="/women/t-shirts" className="text-muted-foreground hover:text-white transition-colors text-sm">
                  Mujer
                </Link>
              </li>
              <li>
                <Link to="/kids/t-shirts" className="text-muted-foreground hover:text-white transition-colors text-sm">
                  Niños
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-white mb-4">Servicio al Cliente</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-white transition-colors text-sm">
                  Contáctanos
                </Link>
              </li>
              <li>
                <Link to="/locations" className="text-muted-foreground hover:text-white transition-colors text-sm">
                  Nuestras Tiendas
                </Link>
              </li>
              <li>
                <Link to="/account" className="text-muted-foreground hover:text-white transition-colors text-sm">
                  Mi Cuenta
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-white mb-4">Acerca de</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-white transition-colors text-sm">
                  Nuestra Historia
                </Link>
              </li>
              <li>
                <Link to="/wholesale" className="text-muted-foreground hover:text-white transition-colors text-sm">
                  Pedidos al Por Mayor
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="text-muted-foreground hover:text-white transition-colors text-sm">
                  Portal de Administrador
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Media */}
        {activeSocialMedia.length > 0 && (
          <div className="border-t border-border mt-8 pt-8">
            <div className="flex flex-col items-center">
              <h4 className="text-white mb-4 text-sm font-semibold">Síguenos en Redes Sociales</h4>
              <div className="flex gap-4">
                {activeSocialMedia.map((social) => {
                  const Icon = PLATFORM_ICONS[social.platform];
                  return (
                    <a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all duration-300 hover:scale-110"
                      aria-label={social.username}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2026 ELEMENTAL. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}