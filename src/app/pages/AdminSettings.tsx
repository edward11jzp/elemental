import { useState } from 'react';
import { useApp } from '../context';
import { Button } from '../components/ui/button';
import { Save } from 'lucide-react';

export default function AdminSettings() {
  const { siteSettings, updateSiteSettings } = useApp();
  const [tagline, setTagline] = useState(siteSettings.tagline);
  // Input controlado como string para permitir vacío.
  // Si está vacío al guardar → se persiste como null (no se muestra al cliente).
  const [exchangeRate, setExchangeRate] = useState<string>(
    siteSettings.exchangeRate != null ? String(siteSettings.exchangeRate) : ''
  );
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    const trimmed = exchangeRate.trim();
    const parsed = trimmed === '' ? null : Number(trimmed);
    const rateToSave: number | null =
      parsed === null || Number.isNaN(parsed) || parsed <= 0 ? null : parsed;

    await updateSiteSettings({ tagline, exchangeRate: rateToSave });
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
      </div>

      <div className="bg-secondary rounded-lg p-6 border border-border mt-6">
        <h2 className="text-xl mb-6">Tasa de Cambio</h2>

        <div className="mb-2">
          <label className="block text-sm text-muted-foreground mb-2">
            Bolívares por cada $1 USD
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
            placeholder="Ej: 36.50"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Cuando esté configurada, el total en bolívares se mostrará al cliente en el checkout.
            Déjalo vacío o en 0 para ocultar la conversión.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-6">
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
  );
}
