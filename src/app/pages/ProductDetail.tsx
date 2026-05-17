import { useParams, Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { useApp } from '../context';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import { Upload, Check, ChevronDown, X, Plus, Trash2, HelpCircle } from 'lucide-react';
import backShirtImage from 'figma:asset/b830e653f860474b6908972729c57667f9dc6842.png';
import womenBackShirtImage from '../../imports/image-1.png';
import womenFrontShirtImage from '../../imports/Screenshot_2026-05-16_at_1.21.33_PM.png';

// Color mapping from Spanish names to hex codes
const COLOR_MAP: Record<string, string> = {
  // Blancos y Grises
  'Blanco': '#FFFFFF',
  'Blanco Hueso': '#FFFFF0',
  'Marfil': '#FFFFF0',
  'Gris Perla': '#E8E8E8',
  'Gris Plata': '#C0C0C0',
  'Gris Claro': '#D3D3D3',
  'Gris': '#808080',
  'Gris Medio': '#696969',
  'Gris Oscuro': '#4A4A4A',
  'Carbón': '#36454F',
  'Gris Grafito': '#2F2F2F',
  'Negro': '#000000',
  
  // Marrones y Beiges
  'Beige': '#F5F5DC',
  'Arena': '#C2B280',
  'Caqui': '#C3B091',
  'Camel': '#C19A6B',
  'Marrón Claro': '#CD853F',
  'Marrón': '#8B4513',
  'Café': '#6F4E37',
  'Chocolate': '#7B3F00',
  'Marrón Oscuro': '#654321',
  
  // Azules - Desde claros hasta oscuros
  'Azul Hielo': '#B0E0E6',
  'Azul Cielo': '#87CEEB',
  'Azul Claro': '#ADD8E6',
  'Azul Celeste': '#87CEFA',
  'Azul Pavo Real': '#1F75FE',
  'Azul': '#0000FF',
  'Azul Royal': '#4169E1',
  'Azul Eléctrico': '#7DF9FF',
  'Azul Cobalto': '#0047AB',
  'Azul Francia': '#318CE7',
  'Azul Marino': '#001F3F',
  'Azul Petróleo': '#014D4E',
  'Navy': '#000080',
  'Azul Oscuro': '#00008B',
  'Índigo': '#4B0082',
  
  // Cyan y Turquesas - Tonos vibrantes
  'Cyan': '#00FFFF',
  'Aqua': '#00FFFF',
  'Turquesa': '#40E0D0',
  'Turquesa Claro': '#AFEEEE',
  'Verde Azulado': '#008B8B',
  'Teal': '#008080',
  'Turquesa Vibrante': '#00CED1',
  'Aqua Neón': '#00FFEF',
  'Celeste Brillante': '#66CDFF',
  
  // Verdes - Desde neón hasta oscuros
  'Verde Menta': '#98FF98',
  'Verde Lima': '#32CD32',
  'Verde Neón': '#39FF14',
  'Verde Claro': '#90EE90',
  'Verde Kelly': '#4CBB17',
  'Verde': '#008000',
  'Verde Pasto': '#7CFC00',
  'Verde Esmeralda': '#50C878',
  'Verde Militar': '#4B5320',
  'Verde Bosque': '#228B22',
  'Verde Oliva': '#808000',
  'Verde Oscuro': '#006400',
  'Verde Musgo': '#8A9A5B',
  'Lima Brillante': '#CCFF00',
  'Verde Fluorescente': '#00FF00',
  
  // Amarillos - Vibrantes y brillantes
  'Amarillo Neón': '#FFFF00',
  'Amarillo': '#FFFF00',
  'Amarillo Limón': '#FFF44F',
  'Amarillo Claro': '#FFFFE0',
  'Amarillo Canario': '#FFEF00',
  'Dorado': '#FFD700',
  'Amarillo Mostaza': '#FFDB58',
  'Amarillo Oscuro': '#9B870C',
  'Amarillo Fluorescente': '#FFFF33',
  'Amarillo Brillante': '#FFEA00',
  
  // Naranjas - Desde pastel hasta neón
  'Naranja Neón': '#FF6600',
  'Naranja Claro': '#FFB347',
  'Naranja': '#FFA500',
  'Naranja Fuego': '#FF4500',
  'Naranja Quemado': '#CC5500',
  'Mandarina': '#FF8C00',
  'Calabaza': '#FF7518',
  'Melocotón': '#FFE5B4',
  'Naranja Brillante': '#FF9900',
  'Naranja Fluorescente': '#FF5F1F',
  
  // Rojos - Desde rosa coral hasta vino
  'Rosa Coral': '#FF6F61',
  'Coral': '#FF7F50',
  'Salmón': '#FA8072',
  'Rojo Claro': '#FF6B6B',
  'Rojo': '#FF0000',
  'Rojo Fuego': '#FF2400',
  'Rojo Sangre': '#8B0000',
  'Carmesí': '#DC143C',
  'Rojo Oscuro': '#8B0000',
  'Granate': '#800000',
  'Borgoña': '#800020',
  'Vino': '#722F37',
  'Rojo Brillante': '#EE0000',
  'Rojo Vibrante': '#FF1744',
  
  // Rosas - Desde pastel hasta neón
  'Rosa Claro': '#FFB6C1',
  'Rosa Pastel': '#FFD1DC',
  'Rosa': '#FFC0CB',
  'Rosa Chicle': '#FF69B4',
  'Rosa Fuerte': '#FF1493',
  'Fucsia': '#FF00FF',
  'Magenta': '#FF00FF',
  'Rosa Mexicano': '#E4007C',
  'Rosa Neón': '#FF10F0',
  'Rosa Fluorescente': '#FF007F',
  'Fucsia Vibrante': '#F400A1',
  'Rosa Brillante': '#FF007F',
  'Rosa Intenso': '#C71585',
  
  // Morados y Púrpuras - Desde lavanda hasta ciruela
  'Lavanda': '#E6E6FA',
  'Lila': '#C8A2C8',
  'Morado Claro': '#DDA0DD',
  'Orquídea': '#DA70D6',
  'Púrpura': '#9370DB',
  'Morado': '#800080',
  'Violeta': '#8F00FF',
  'Morado Oscuro': '#4B0082',
  'Berenjena': '#614051',
  'Ciruela': '#8E4585',
  'Morado Vibrante': '#9C27B0',
  'Púrpura Brillante': '#BF00FF',
  'Violeta Intenso': '#7B00FF',
  
  // Colores Adicionales Vibrantes
  'Lima Eléctrico': '#BFFF00',
  'Fucsia Eléctrico': '#FF00FF',
  'Azul Eléctrico Brillante': '#0AFFFF',
  'Verde Manzana': '#8DB600',
  'Menta Brillante': '#3EB489',
  'Coral Brillante': '#FF6F61',
  
  // Especiales y Combinaciones
  'Negro/Blanco': 'linear-gradient(90deg, #000000 50%, #FFFFFF 50%)',
  'Negro/Gris': 'linear-gradient(90deg, #000000 50%, #808080 50%)',
  'Multicolor': 'linear-gradient(90deg, #FF0000 0%, #FF7F00 16.66%, #FFFF00 33.33%, #00FF00 50%, #0000FF 66.66%, #4B0082 83.33%, #9400D3 100%)',
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, products, cartItemCount } = useApp();

  const product = products.find(p => p.id === id);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(6);
  const [isCustom, setIsCustom] = useState(false);
  const [logos, setLogos] = useState<string[]>([]);
  const [selectedLogoIndex, setSelectedLogoIndex] = useState<number>(0);
  const [logoInstances, setLogoInstances] = useState<Record<string, Array<{
    id: string;
    logoIndex: number;
    x: number;
    y: number;
    size: number;
    printSize?: 'small' | 'medium' | 'large';
  }>>>({
    front: [],
    back: [],
    sleeves: []
  });
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [isDraggingInstance, setIsDraggingInstance] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [customNotes, setCustomNotes] = useState('');
  const [logoPlacement, setLogoPlacement] = useState<string[]>([]);
  const [logoPosition, setLogoPosition] = useState<Record<string, string>>({});
  const [currentView, setCurrentView] = useState<'front' | 'back' | 'sleeves'>('front');
  const [selectedImage, setSelectedImage] = useState(0);
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [customPrintSize, setCustomPrintSize] = useState<'small' | 'medium' | 'large' | ''>('');

  if (!product) {
    return (
      <div className="bg-black min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl mb-4">Producto No Encontrado</h1>
          <Link to="/" className="text-white hover:underline">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
      toast.error('Por favor selecciona talla y color');
      return;
    }

    // Validate that all logo instances have a print size selected
    if (isCustom && product.customPricing) {
      const allInstances = [...logoInstances.front, ...logoInstances.back, ...logoInstances.sleeves];
      const hasInstancesWithoutSize = allInstances.some(instance => !instance.printSize);

      if (allInstances.length > 0 && hasInstancesWithoutSize) {
        toast.error('Por favor selecciona el tamaño de estampado para todos los logos');
        return;
      }
    }

    addToCart({
      product,
      quantity,
      size: selectedSize,
      color: selectedColor,
      isCustom,
      customLogo: isCustom && logos.length > 0 ? logos.join(',') : undefined,
      customNotes: isCustom ? customNotes : undefined,
      logoPlacement: isCustom && logoPlacement.length > 0 ? logoPlacement : undefined,
      logoPosition: isCustom && Object.keys(logoPosition).length > 0 ? logoPosition : undefined,
    });

    toast.success('¡Agregado al carrito!');
  };

  const handleFileUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      if (logos.length >= 3) {
        toast.error('Máximo 3 logos permitidos');
        return;
      }
      const newLogoUrl = URL.createObjectURL(file);
      setLogos([...logos, newLogoUrl]);
      setSelectedLogoIndex(logos.length);
      toast.success(`Logo ${logos.length + 1} subido exitosamente`);
    } else {
      toast.error('Por favor sube un archivo de imagen válido');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleLogoMouseDown = (e: React.MouseEvent, instanceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedInstanceId(instanceId);
    setIsDraggingInstance(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleLogoTouchStart = (e: React.TouchEvent, instanceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedInstanceId(instanceId);
    setIsDraggingInstance(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
  };

  const handleLogoMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingInstance || !selectedInstanceId) return;

    const container = e.currentTarget.getBoundingClientRect();
    const currentInstances = logoInstances[currentView];
    const instance = currentInstances.find(i => i.id === selectedInstanceId);
    if (!instance) return;

    const newX = e.clientX - container.left - dragOffset.x;
    const newY = e.clientY - container.top - dragOffset.y;

    setLogoInstances({
      ...logoInstances,
      [currentView]: currentInstances.map(i =>
        i.id === selectedInstanceId
          ? {
              ...i,
              x: Math.max(0, Math.min(newX, container.width - i.size)),
              y: Math.max(0, Math.min(newY, container.height - i.size)),
            }
          : i
      )
    });
  };

  const handleLogoTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingInstance || !selectedInstanceId) return;

    e.preventDefault();
    e.stopPropagation();

    const container = e.currentTarget.getBoundingClientRect();
    const currentInstances = logoInstances[currentView];
    const instance = currentInstances.find(i => i.id === selectedInstanceId);
    if (!instance) return;

    const touch = e.touches[0];
    const newX = touch.clientX - container.left - dragOffset.x;
    const newY = touch.clientY - container.top - dragOffset.y;

    setLogoInstances({
      ...logoInstances,
      [currentView]: currentInstances.map(i =>
        i.id === selectedInstanceId
          ? {
              ...i,
              x: Math.max(0, Math.min(newX, container.width - i.size)),
              y: Math.max(0, Math.min(newY, container.height - i.size)),
            }
          : i
      )
    });
  };

  const handleLogoMouseUp = () => {
    setIsDraggingInstance(false);
  };

  const handleLogoTouchEnd = () => {
    setIsDraggingInstance(false);
  };

  const addLogoInstance = () => {
    if (logos.length === 0) {
      toast.error('Primero sube un logo');
      return;
    }

    const newInstance = {
      id: `${currentView}-${Date.now()}-${Math.random()}`,
      logoIndex: selectedLogoIndex,
      x: 150,
      y: 150,
      size: currentView === 'sleeves' ? 80 : 100,
      printSize: undefined as 'small' | 'medium' | 'large' | undefined,
    };

    setLogoInstances({
      ...logoInstances,
      [currentView]: [...logoInstances[currentView], newInstance]
    });
    setSelectedInstanceId(newInstance.id);
    toast.success('Logo agregado a la vista');
  };

  const removeLogoInstance = (instanceId: string) => {
    setLogoInstances({
      ...logoInstances,
      [currentView]: logoInstances[currentView].filter(i => i.id !== instanceId)
    });
    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(null);
    }
    toast.success('Logo eliminado');
  };

  const updateInstanceSize = (instanceId: string, newSize: number) => {
    setLogoInstances({
      ...logoInstances,
      [currentView]: logoInstances[currentView].map(i =>
        i.id === instanceId ? { ...i, size: newSize } : i
      )
    });
  };

  const updateInstancePrintSize = (instanceId: string, printSize: 'small' | 'medium' | 'large') => {
    setLogoInstances({
      ...logoInstances,
      [currentView]: logoInstances[currentView].map(i =>
        i.id === instanceId ? { ...i, printSize } : i
      )
    });
  };

  const removeLogo = (index: number) => {
    const newLogos = logos.filter((_, i) => i !== index);
    setLogos(newLogos);

    // Remove all instances using this logo
    const updatedInstances = { ...logoInstances };
    Object.keys(updatedInstances).forEach(view => {
      updatedInstances[view] = updatedInstances[view].filter(instance => instance.logoIndex !== index)
        .map(instance => ({
          ...instance,
          logoIndex: instance.logoIndex > index ? instance.logoIndex - 1 : instance.logoIndex
        }));
    });
    setLogoInstances(updatedInstances);

    if (selectedLogoIndex >= newLogos.length) {
      setSelectedLogoIndex(Math.max(0, newLogos.length - 1));
    }
    toast.success('Logo eliminado');
  };

  const getShirtImageForView = (view: 'front' | 'back' | 'sleeves') => {
    // First priority: use product-specific customization images if available
    if (product.customizationImages) {
      const customImage = product.customizationImages[view];
      if (customImage) {
        return customImage;
      }
    }

    // Second priority: use category-specific images
    if (product.category === 'women') {
      const womenImages = {
        front: womenFrontShirtImage,
        back: womenBackShirtImage,
        sleeves: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500'
      };
      return womenImages[view];
    }

    // Default fallback images for men's products
    const images = {
      front: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
      back: backShirtImage,
      sleeves: 'https://images.unsplash.com/photo-1666358777012-46a226113c84?w=500'
    };
    return images[view];
  };

  const getViewLabel = (view: 'front' | 'back' | 'sleeves') => {
    const labels = {
      front: 'Vista Frontal',
      back: 'Vista Trasera',
      sleeves: 'Vista Lateral'
    };
    return labels[view];
  };

  const calculatePrice = (qty: number): number => {
    let basePrice;
    const totalItemsInCart = cartItemCount + qty;
    if (totalItemsInCart >= 6) {
      basePrice = 6.5; // 6+ total items = $6.5 per unit
    } else {
      basePrice = 9; // Less than 6 total items = $9 per unit
    }

    // Calculate total customization price from all logo instances
    if (isCustom && product.customPricing) {
      const allInstances = [...logoInstances.front, ...logoInstances.back, ...logoInstances.sleeves];
      const totalCustomPrice = allInstances.reduce((sum, instance) => {
        if (instance.printSize) {
          return sum + (product.customPricing![instance.printSize] || 0);
        }
        return sum;
      }, 0);
      return basePrice + totalCustomPrice;
    }

    return basePrice;
  };

  const currentPrice = calculatePrice(quantity);

  return (
    <div className="bg-black min-h-screen py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.4s' }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <div className="aspect-square bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] rounded-2xl overflow-hidden mb-4 border-2 border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded overflow-hidden ${
                      selectedImage === idx ? 'ring-2 ring-white' : ''
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-4xl mb-4">{product.name}</h1>
            <div className="mb-6">
              <p className="text-3xl mb-2">${currentPrice.toFixed(2)}</p>
              {quantity >= 6 && (
                <p className="text-green-400 text-sm">
                  ¡Precio al por mayor aplicado! $6.5 por artículo
                </p>
              )}
              {isCustom && product.customPricing && (() => {
                const allInstances = [...logoInstances.front, ...logoInstances.back, ...logoInstances.sleeves];
                const totalCustomPrice = allInstances.reduce((sum, instance) => {
                  if (instance.printSize) {
                    return sum + (product.customPricing![instance.printSize] || 0);
                  }
                  return sum;
                }, 0);
                const instanceCount = allInstances.length;

                if (totalCustomPrice > 0 && instanceCount > 0) {
                  return (
                    <p className="text-blue-400 text-sm mt-1">
                      Incluye personalización: {instanceCount} logo{instanceCount > 1 ? 's' : ''} (+${totalCustomPrice.toFixed(2)})
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            <p className="text-muted-foreground mb-8">{product.description}</p>

            {/* Size Selection */}
            <div className="mb-6">
              <Label className="mb-2 block">Talla</Label>
              <div className="flex gap-2 flex-wrap">
                {product.sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded border ${
                      selectedSize === size
                        ? 'bg-white text-black border-white'
                        : 'bg-secondary border-border text-white hover:border-white'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div className="mb-6">
              <Label className="mb-2 block">Color</Label>

              {/* Color Dropdown Bar */}
              <button
                type="button"
                onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                className="w-full flex items-center justify-between bg-secondary border border-border rounded-md px-4 py-3 text-white hover:bg-secondary/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {selectedColor ? (
                    <>
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white/30"
                        style={{ backgroundColor: selectedColor.startsWith('#') ? selectedColor : COLOR_MAP[selectedColor] }}
                      />
                      <span className="text-sm">
                        {selectedColor.startsWith('#') ? 'Color seleccionado' : selectedColor}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Seleccionar color</span>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isColorDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown with color palette */}
              {isColorDropdownOpen && (
                <div className="mt-2 bg-secondary border border-border rounded-md p-4 max-h-[300px] overflow-y-auto">
                  {product.colorPalette && product.colorPalette.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {product.colorPalette.map((colorValue, index) => {
                        const isWhite = colorValue === '#FFFFFF';

                        return (
                          <button
                            key={index}
                            onClick={() => {
                              setSelectedColor(colorValue);
                              setIsColorDropdownOpen(false);
                            }}
                            className={`relative w-12 h-12 rounded-full border-2 transition-all hover:scale-110 ${
                              selectedColor === colorValue
                                ? 'border-white ring-2 ring-white ring-offset-2 ring-offset-black'
                                : isWhite
                                ? 'border-gray-600 hover:border-white'
                                : 'border-gray-700 hover:border-white'
                            }`}
                            style={{ backgroundColor: colorValue }}
                            title={colorValue}
                          >
                            {selectedColor === colorValue && (
                              <Check
                                className={`absolute inset-0 m-auto h-6 w-6 ${
                                  isWhite ? 'text-black' : 'text-white'
                                }`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      No hay colores disponibles
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <Label className="mb-2 block">Cantidad</Label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 bg-secondary hover:bg-accent rounded text-white"
                >
                  -
                </button>
                <span className="text-xl w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2 bg-secondary hover:bg-accent rounded text-white"
                >
                  +
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Ordena 6+ artículos en total (todo el carrito) por solo $6.5 c/u
              </p>
              {cartItemCount > 0 && (
                <p className="text-sm text-white mt-1">
                  Tienes {cartItemCount} artículo{cartItemCount !== 1 ? 's' : ''} en tu carrito
                </p>
              )}
            </div>

            {/* Custom Option */}
            {product.allowCustom && (
              <div className="mb-6 p-6 bg-secondary rounded-lg">
                <Label className="mb-4 block">Personalización</Label>
                <RadioGroup value={isCustom ? 'custom' : 'plain'} onValueChange={(v) => setIsCustom(v === 'custom')}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="plain" id="plain" />
                    <Label htmlFor="plain" className="cursor-pointer">Simple</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom" className="cursor-pointer">Diseño Personalizado</Label>
                  </div>
                </RadioGroup>

                {isCustom && (
                  <div className="mt-4 space-y-4">
                    {/* Pricing Buttons - Show immediately when custom is selected */}
                    {product.customPricing && (
                      <div className="border-2 border-white/20 rounded-lg p-5 bg-gradient-to-br from-blue-900/30 to-purple-900/30">
                        <Label className="mb-3 block text-base font-bold text-white">Precios de Personalización por Estampado</Label>
                        <p className="text-sm text-muted-foreground mb-4">
                          Cada logo que agregues tendrá uno de estos precios según el tamaño que selecciones
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex flex-col items-center justify-center px-4 py-5 rounded-lg border-2 border-blue-500 bg-blue-500/10 hover:bg-blue-500/20 transition-all">
                            <span className="text-sm font-bold text-white mb-1">Pequeño</span>
                            <span className="text-2xl font-bold text-blue-400">+${product.customPricing.small.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground mt-1">por logo</span>
                          </div>
                          <div className="flex flex-col items-center justify-center px-4 py-5 rounded-lg border-2 border-purple-500 bg-purple-500/10 hover:bg-purple-500/20 transition-all">
                            <span className="text-sm font-bold text-white mb-1">Mediano</span>
                            <span className="text-2xl font-bold text-purple-400">+${product.customPricing.medium.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground mt-1">por logo</span>
                          </div>
                          <div className="flex flex-col items-center justify-center px-4 py-5 rounded-lg border-2 border-pink-500 bg-pink-500/10 hover:bg-pink-500/20 transition-all">
                            <span className="text-sm font-bold text-white mb-1">Grande</span>
                            <span className="text-2xl font-bold text-pink-400">+${product.customPricing.large.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground mt-1">por logo</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm">Subir Logos (Máximo 3)</Label>
                        <span className="text-xs text-muted-foreground">{logos.length}/3 logos</span>
                      </div>

                      {/* Logo Upload Area */}
                      {logos.length < 3 && (
                        <>
                          <label
                            htmlFor="custom-logo-upload"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer block ${
                              isDragging
                                ? 'border-white bg-secondary/50 scale-105'
                                : 'border-border hover:border-muted'
                            }`}
                          >
                            <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              {isDragging ? 'Suelta el archivo aquí' : 'Haz clic o arrastra tu logo aquí'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF</p>
                          </label>
                          <Input
                            id="custom-logo-upload"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(file);
                              }
                            }}
                            className="hidden"
                          />
                        </>
                      )}

                      {/* Uploaded Logos Gallery */}
                      {logos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {logos.map((logo, index) => (
                            <div
                              key={index}
                              onClick={() => setSelectedLogoIndex(index)}
                              className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                                selectedLogoIndex === index
                                  ? 'border-white ring-2 ring-white ring-offset-2 ring-offset-secondary'
                                  : 'border-border hover:border-white'
                              }`}
                            >
                              <img
                                src={logo}
                                alt={`Logo ${index + 1}`}
                                className="w-full h-full object-contain bg-white/5 p-2"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeLogo(index);
                                }}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              {selectedLogoIndex === index && (
                                <div className="absolute bottom-1 left-1 right-1 bg-white text-black text-xs py-0.5 text-center rounded">
                                  Seleccionado
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Visual Logo Editor */}
                    {logos.length > 0 && (
                      <div className="space-y-3">
                        <Label className="block text-sm">Editor de Logo</Label>

                        {/* View Selector Tabs */}
                        <div className="flex gap-2 bg-secondary rounded-lg p-1">
                          <button
                            onClick={() => setCurrentView('front')}
                            className={`flex-1 px-4 py-2 rounded text-sm transition-colors ${
                              currentView === 'front'
                                ? 'bg-white text-black'
                                : 'text-white hover:bg-secondary/80'
                            }`}
                          >
                            Adelante
                          </button>
                          <button
                            onClick={() => setCurrentView('back')}
                            className={`flex-1 px-4 py-2 rounded text-sm transition-colors ${
                              currentView === 'back'
                                ? 'bg-white text-black'
                                : 'text-white hover:bg-secondary/80'
                            }`}
                          >
                            Atrás
                          </button>
                          <button
                            onClick={() => setCurrentView('sleeves')}
                            className={`flex-1 px-4 py-2 rounded text-sm transition-colors ${
                              currentView === 'sleeves'
                                ? 'bg-white text-black'
                                : 'text-white hover:bg-secondary/80'
                            }`}
                          >
                            Lateral
                          </button>
                        </div>

                        {/* Add Logo Button */}
                        <button
                          onClick={addLogoInstance}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Plus className="h-5 w-5" />
                          <span>Agregar Logo a {getViewLabel(currentView)}</span>
                        </button>

                        {/* Canvas with T-shirt and Logo Instances */}
                        <div
                          className="relative w-full bg-secondary rounded-lg overflow-hidden border-2 border-border cursor-crosshair"
                          style={{
                            height: '500px',
                            backgroundImage: `url(${getShirtImageForView(currentView)})`,
                            backgroundSize: currentView === 'back' ? 'cover' : 'contain',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            touchAction: 'none'
                          }}
                          onMouseMove={handleLogoMouseMove}
                          onMouseUp={handleLogoMouseUp}
                          onMouseLeave={handleLogoMouseUp}
                          onTouchMove={handleLogoTouchMove}
                          onTouchEnd={handleLogoTouchEnd}
                        >
                          {/* Render all logo instances for current view */}
                          {logoInstances[currentView].map((instance) => (
                            <div
                              key={instance.id}
                              className={`absolute cursor-move select-none transition-all ${
                                selectedInstanceId === instance.id ? 'ring-2 ring-white' : ''
                              }`}
                              style={{
                                left: `${instance.x}px`,
                                top: `${instance.y}px`,
                                width: `${instance.size}px`,
                                height: `${instance.size}px`,
                                touchAction: 'none'
                              }}
                              onMouseDown={(e) => handleLogoMouseDown(e, instance.id)}
                              onTouchStart={(e) => handleLogoTouchStart(e, instance.id)}
                            >
                              <img
                                src={logos[instance.logoIndex]}
                                alt="Logo"
                                className="w-full h-full object-contain pointer-events-none"
                                draggable={false}
                              />
                              {selectedInstanceId === instance.id && (
                                <>
                                  {/* Delete button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeLogoInstance(instance.id);
                                    }}
                                    className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors z-10"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                  {/* Resize handle */}
                                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white rounded-full border-2 border-black flex items-center justify-center">
                                    <div className="w-2 h-2 bg-black rounded-full"></div>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}

                          {/* Instructions overlay */}
                          <div className="absolute top-3 left-3 bg-black/70 text-white px-3 py-2 rounded text-xs max-w-xs">
                            {getViewLabel(currentView)} - {logoInstances[currentView].length} logo(s) - Haz clic en un logo para seleccionarlo
                          </div>
                        </div>

                        {/* Size Controls for Selected Instance */}
                        {selectedInstanceId && (() => {
                          const instance = logoInstances[currentView].find(i => i.id === selectedInstanceId);
                          return instance ? (
                            <div className="space-y-4 bg-secondary/50 p-4 rounded-lg">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-2 block">
                                  Tamaño del Logo Seleccionado
                                </Label>
                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={() => updateInstanceSize(selectedInstanceId, Math.max(50, instance.size - 10))}
                                    className="px-4 py-2 bg-secondary hover:bg-accent rounded text-white"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="range"
                                    min="50"
                                    max="300"
                                    value={instance.size}
                                    onChange={(e) => updateInstanceSize(selectedInstanceId, parseInt(e.target.value))}
                                    className="flex-1"
                                  />
                                  <button
                                    onClick={() => updateInstanceSize(selectedInstanceId, Math.min(300, instance.size + 10))}
                                    className="px-4 py-2 bg-secondary hover:bg-accent rounded text-white"
                                  >
                                    +
                                  </button>
                                  <span className="text-sm text-muted-foreground w-16">{instance.size}px</span>
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })()}

                        {/* Logo List with Print Size Selection - Always Visible */}
                        {(() => {
                          const allInstances = [
                            ...logoInstances.front.map(i => ({ ...i, view: 'front' as const })),
                            ...logoInstances.back.map(i => ({ ...i, view: 'back' as const })),
                            ...logoInstances.sleeves.map(i => ({ ...i, view: 'sleeves' as const }))
                          ];

                          if (allInstances.length === 0 || !product.customPricing) return null;

                          return (
                            <div className="border border-border rounded-lg p-4 bg-secondary/50 mt-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Label className="text-sm font-semibold text-white">Selecciona el Tamaño de Estampado para Cada Logo</Label>
                                <div className="relative group">
                                  <div className="relative">
                                    <HelpCircle className="h-6 w-6 text-blue-400 cursor-help transition-all duration-300 group-hover:text-blue-300 group-hover:scale-110 animate-pulse" />
                                    <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-sm group-hover:bg-blue-400/40 transition-all duration-300"></div>
                                  </div>
                                  <div className="absolute right-0 top-8 w-72 bg-gradient-to-br from-gray-900 to-black border-2 border-blue-400/50 rounded-xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 shadow-2xl">
                                    <p className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                                      <span className="w-1 h-4 bg-blue-400 rounded"></span>
                                      Guía de Tamaños:
                                    </p>
                                    <div className="space-y-2.5">
                                      <div className="flex items-start gap-3 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                        <span className="text-sm font-bold text-blue-400 min-w-[70px]">Pequeño:</span>
                                        <span className="text-sm text-gray-300">5cm - 10cm aprox</span>
                                      </div>
                                      <div className="flex items-start gap-3 p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
                                        <span className="text-sm font-bold text-purple-400 min-w-[70px]">Mediano:</span>
                                        <span className="text-sm text-gray-300">10cm - 15cm aprox</span>
                                      </div>
                                      <div className="flex items-start gap-3 p-2 rounded-lg bg-pink-500/5 border border-pink-500/20">
                                        <span className="text-sm font-bold text-pink-400 min-w-[70px]">Grande:</span>
                                        <span className="text-sm text-gray-300">15cm - 20cm aprox</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mb-4">
                                Cada logo necesita un tamaño de estampado. Los precios se sumarán al total.
                              </p>
                              <div className="space-y-3">
                                {allInstances.map((instance, idx) => {
                                  const viewLabels = {
                                    front: 'Adelante',
                                    back: 'Atrás',
                                    sleeves: 'Lateral'
                                  };

                                  return (
                                    <div key={instance.id} className="p-3 bg-secondary rounded-lg border border-border">
                                      <div className="flex items-center gap-3 mb-3">
                                        <img
                                          src={logos[instance.logoIndex]}
                                          alt="Logo preview"
                                          className="w-12 h-12 object-contain bg-white/5 rounded border border-border"
                                        />
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-white">
                                            Logo #{idx + 1} - {viewLabels[instance.view]}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {instance.printSize
                                              ? `Tamaño: ${instance.printSize === 'small' ? 'Pequeño' : instance.printSize === 'medium' ? 'Mediano' : 'Grande'}`
                                              : 'Sin tamaño seleccionado'}
                                          </p>
                                        </div>
                                        {!instance.printSize && (
                                          <span className="text-xs text-yellow-400 font-medium">⚠ Requerido</span>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-3 gap-2">
                                        <button
                                          onClick={() => {
                                            setLogoInstances({
                                              ...logoInstances,
                                              [instance.view]: logoInstances[instance.view].map(i =>
                                                i.id === instance.id ? { ...i, printSize: 'small' } : i
                                              )
                                            });
                                          }}
                                          className={`flex flex-col items-center justify-center px-3 py-3 rounded border transition-all ${
                                            instance.printSize === 'small'
                                              ? 'bg-white text-black border-white'
                                              : 'bg-secondary border-border text-white hover:border-white'
                                          }`}
                                        >
                                          <span className="text-xs font-medium">Pequeño</span>
                                          <span className="text-xs mt-1">+${product.customPricing.small.toFixed(2)}</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setLogoInstances({
                                              ...logoInstances,
                                              [instance.view]: logoInstances[instance.view].map(i =>
                                                i.id === instance.id ? { ...i, printSize: 'medium' } : i
                                              )
                                            });
                                          }}
                                          className={`flex flex-col items-center justify-center px-3 py-3 rounded border transition-all ${
                                            instance.printSize === 'medium'
                                              ? 'bg-white text-black border-white'
                                              : 'bg-secondary border-border text-white hover:border-white'
                                          }`}
                                        >
                                          <span className="text-xs font-medium">Mediano</span>
                                          <span className="text-xs mt-1">+${product.customPricing.medium.toFixed(2)}</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setLogoInstances({
                                              ...logoInstances,
                                              [instance.view]: logoInstances[instance.view].map(i =>
                                                i.id === instance.id ? { ...i, printSize: 'large' } : i
                                              )
                                            });
                                          }}
                                          className={`flex flex-col items-center justify-center px-3 py-3 rounded border transition-all ${
                                            instance.printSize === 'large'
                                              ? 'bg-white text-black border-white'
                                              : 'bg-secondary border-border text-white hover:border-white'
                                          }`}
                                        >
                                          <span className="text-xs font-medium">Grande</span>
                                          <span className="text-xs mt-1">+${product.customPricing.large.toFixed(2)}</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <div>
                      <Label className="mb-2 block text-sm">Notas de Personalización</Label>
                      <Textarea
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="Ingresa los requisitos de personalización..."
                        className="bg-card border-border text-white"
                        rows={4}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add to Cart */}
            <Button
              onClick={handleAddToCart}
              className="w-full bg-white text-black hover:bg-gray-200 py-6 text-lg"
            >
              Agregar al Carrito - ${(currentPrice * quantity).toFixed(2)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}