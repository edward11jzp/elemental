import { useState } from 'react';
import { useApp } from '../context';
import { Button } from '../components/ui/button';
import { Save } from 'lucide-react';

export default function AdminSettings() {
  const { siteSettings, updateSiteSettings } = useApp();
  const [tagline, setTagline] = useState(siteSettings.tagline);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    updateSiteSettings({ tagline });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Configuración del Sitio</h1>
        <p className="text-muted-foreground">
          Personaliza el contenido y la apariencia de tu tienda
        </p>
      </div>

      <div className="bg-secondary rounded-lg p-6 border border-border">
        <h2 className="text-xl mb-6">Eslogan Principal</h2>

        <div className="mb-6">
          <label className="block text-sm text-muted-foreground mb-2">
            Eslogan que aparece en la página principal
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
            placeholder="Ej: Redefine Tu Estilo. Atrevido. Minimalista. Sin Disculpas."
          />
          <p className="text-xs text-muted-foreground mt-2">
            Este texto aparece debajo del logo ELEMENTAL en la página de inicio
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={handleSave}
            className="bg-white text-black hover:bg-gray-200"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>

          {isSaved && (
            <span className="text-green-400 text-sm">
              ✓ Cambios guardados exitosamente
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
