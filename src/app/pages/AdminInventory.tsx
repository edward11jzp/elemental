import { useApp } from '../context';
import { useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import AdminNav from '../components/AdminNav';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Pencil, Trash2, Upload, X, Star, ChevronDown, ChevronUp, Plus, Ruler } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { PALETTE as AVAILABLE_COLORS } from '../colors';
import { loadSizes, saveCustomSize, deleteCustomSize, groupSizes, GROUP_LABELS, type Size, type SizeGroup } from '../sizes';
import { loadSubcategories, saveCustomSubcategory, deleteCustomSubcategory, isDefaultSubcategory, type Subcategory } from '../subcategories';

export default function AdminInventory() {
  const { currentUser, products, addProduct, updateProduct, deleteProduct } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'men',
    subcategory: 't-shirts',
    price: '',
    retailPrice: '',
    wholesalePrice: '',
    stock: '',
    description: '',
    image: '',
    allowCustom: false,
    colorPalette: [] as string[],
    sizes: [] as string[],
    customizationImages: {
      front: '',
      back: '',
      sleeves: ''
    }
  });
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const [isEditColorDropdownOpen, setIsEditColorDropdownOpen] = useState(false);
  const [isSizesDropdownOpen, setIsSizesDropdownOpen] = useState(false);
  const [isEditSizesDropdownOpen, setIsEditSizesDropdownOpen] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<Size[]>(() => loadSizes());
  const [newSizeLabel, setNewSizeLabel] = useState('');
  const [newSizeGroup, setNewSizeGroup] = useState<SizeGroup>('otras');
  const [availableSubcategories, setAvailableSubcategories] = useState<Subcategory[]>(() => loadSubcategories());
  const [isManageSubcategoriesOpen, setIsManageSubcategoriesOpen] = useState(false);
  const [newSubcategoryLabel, setNewSubcategoryLabel] = useState('');
  const [customImagePreviews, setCustomImagePreviews] = useState({
    front: '',
    back: '',
    sleeves: ''
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
    } else if (currentUser.role !== 'admin') {
      navigate('/admin/orders');
    }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'admin') return null;

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = async () => {
    // Validation
    if (!newProduct.name.trim()) {
      toast.error('Por favor ingresa un nombre de producto');
      return;
    }
    if (!newProduct.retailPrice || parseFloat(newProduct.retailPrice) <= 0) {
      toast.error('Por favor ingresa un precio al por detal válido');
      return;
    }
    if (!newProduct.wholesalePrice || parseFloat(newProduct.wholesalePrice) <= 0) {
      toast.error('Por favor ingresa un precio al por mayor válido');
      return;
    }
    if (!newProduct.stock || parseInt(newProduct.stock) < 0) {
      toast.error('Por favor ingresa una cantidad de stock válida');
      return;
    }
    if (!newProduct.image.trim()) {
      toast.error('Por favor proporciona una URL de imagen o sube una imagen');
      return;
    }

    const productToAdd = {
      name: newProduct.name,
      category: newProduct.category as 'men' | 'women' | 'kids',
      subcategory: newProduct.subcategory,
      price: parseFloat(newProduct.retailPrice),
      retailPrice: parseFloat(newProduct.retailPrice),
      wholesalePrice: parseFloat(newProduct.wholesalePrice),
      image: newProduct.image,
      images: [newProduct.image],
      description: newProduct.description,
      sizes: newProduct.sizes.length > 0 ? newProduct.sizes : ['S', 'M', 'L', 'XL', '2XL'],
      colors: [],
      colorPalette: newProduct.colorPalette,
      stock: parseInt(newProduct.stock),
      allowCustom: newProduct.allowCustom,
      featured: false,
      trending: false,
      customizationImages: newProduct.customizationImages,
    };

    try {
      await addProduct(productToAdd);
      toast.success('¡Producto agregado exitosamente!');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo guardar el producto');
      return;
    }
    setIsAddModalOpen(false);
    setImagePreview('');
    setCustomImagePreviews({ front: '', back: '', sleeves: '' });
    setNewProduct({
      name: '',
      category: 'men',
      subcategory: 't-shirts',
      price: '',
      retailPrice: '',
      wholesalePrice: '',
      stock: '',
      description: '',
      image: '',
      allowCustom: false,
      colorPalette: [],
      sizes: [],
      customizationImages: {
        front: '',
        back: '',
        sleeves: ''
      }
    });
  };

  // Toggle a size selection in newProduct
  const toggleNewSize = (value: string) => {
    setNewProduct((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(value)
        ? prev.sizes.filter((s) => s !== value)
        : [...prev.sizes, value],
    }));
  };

  // Toggle a size selection in editingProduct
  const toggleEditSize = (value: string) => {
    const current: string[] = Array.isArray(editingProduct?.sizes) ? editingProduct.sizes : [];
    setEditingProduct({
      ...editingProduct,
      sizes: current.includes(value) ? current.filter((s) => s !== value) : [...current, value],
    });
  };

  // Persist a new global size (admin can extend the catalog at any time)
  const handleAddCustomSize = () => {
    const value = newSizeLabel.trim();
    if (!value) return;
    if (availableSizes.some((s) => s.value.toLowerCase() === value.toLowerCase())) {
      toast.error('Esa talla ya existe');
      return;
    }
    const size: Size = { value, label: value, group: newSizeGroup };
    saveCustomSize(size);
    setAvailableSizes(loadSizes());
    setNewSizeLabel('');
    toast.success(`Talla "${value}" agregada al catálogo`);
  };

  const handleDeleteCustomSize = (value: string) => {
    deleteCustomSize(value);
    setAvailableSizes(loadSizes());
    toast.success('Talla eliminada del catálogo');
  };

  const handleAddCustomSubcategory = () => {
    const created = saveCustomSubcategory(newSubcategoryLabel);
    if (!created) {
      toast.error('Nombre inválido o subcategoría ya existe');
      return;
    }
    setAvailableSubcategories(loadSubcategories());
    setNewSubcategoryLabel('');
    toast.success(`Subcategoría "${created.label}" agregada`);
  };

  const handleDeleteCustomSubcategory = (value: string) => {
    if (isDefaultSubcategory(value)) {
      toast.error('No se puede eliminar una subcategoría por defecto');
      return;
    }
    deleteCustomSubcategory(value);
    setAvailableSubcategories(loadSubcategories());
    toast.success('Subcategoría eliminada');
  };

  // Custom-size identifier: anything not in the default master list
  const isCustomSize = (value: string) => {
    const defaults = new Set([
      'Talla Única','2-4','4-6','6-8','8-10','10-12','12-14','14-16',
      'XS','S','M','L','XL','2XL','3XL','4XL',
    ]);
    return !defaults.has(value);
  };

  // Renders the size picker (used in Add and Edit modals)
  const renderSizesPicker = (
    selected: string[],
    onToggle: (v: string) => void,
    isOpen: boolean,
    setOpen: (v: boolean) => void,
  ) => {
    const grouped = groupSizes(availableSizes);
    const order: SizeGroup[] = ['unica', 'ninos', 'adultos', 'otras'];

    return (
      <div>
        <Label>Tallas Disponibles</Label>
        <button
          type="button"
          onClick={() => setOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-secondary border border-border rounded-md px-4 py-3 text-white hover:bg-secondary/80 transition-colors"
        >
          <span className="text-sm">
            {selected.length > 0
              ? `${selected.length} tallas seleccionadas`
              : 'Seleccionar tallas'}
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isOpen && (
          <div className="mt-2 bg-secondary border border-border rounded-md p-4 max-h-[360px] overflow-y-auto space-y-4">
            {order.map((g) =>
              grouped[g].length > 0 ? (
                <div key={g}>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{GROUP_LABELS[g]}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {grouped[g].map((size) => {
                      const isSelected = selected.includes(size.value);
                      const custom = isCustomSize(size.value);
                      return (
                        <div
                          key={size.value}
                          className={`group flex items-center justify-between rounded-md px-2 py-2 border transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-white bg-white/10'
                              : 'border-border bg-black/30 hover:border-white/40'
                          }`}
                          onClick={() => onToggle(size.value)}
                        >
                          <span className="text-sm text-white">{size.label}</span>
                          {custom && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomSize(size.value);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                              title="Eliminar del catálogo"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null
            )}

            {/* Add new size */}
            <div className="border-t border-border pt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Agregar nueva talla al catálogo
              </p>
              <div className="flex gap-2 items-center">
                <Input
                  value={newSizeLabel}
                  onChange={(e) => setNewSizeLabel(e.target.value)}
                  placeholder="Ej: 5XL, 16-18, Bebé..."
                  className="bg-black/40 border-border text-white"
                />
                <select
                  value={newSizeGroup}
                  onChange={(e) => setNewSizeGroup(e.target.value as SizeGroup)}
                  className="bg-black/40 border border-border rounded-md px-2 py-2 text-white text-sm"
                >
                  <option value="unica">Única</option>
                  <option value="ninos">Niños</option>
                  <option value="adultos">Adultos</option>
                  <option value="otras">Otras</option>
                </select>
                <Button
                  type="button"
                  onClick={handleAddCustomSize}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {selected.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">
              Tallas seleccionadas ({selected.length}):
            </p>
            <div className="flex gap-2 flex-wrap">
              {selected.map((v) => (
                <span
                  key={v}
                  className="bg-white/10 border border-white/20 text-white text-sm px-3 py-1 rounded-md"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleEditProduct = async () => {
    // Validation
    if (!editingProduct.name.trim()) {
      toast.error('Por favor ingresa un nombre de producto');
      return;
    }
    const retailPrice = editingProduct.retailPrice || editingProduct.price;
    const wholesalePrice = editingProduct.wholesalePrice;

    if (!retailPrice || parseFloat(retailPrice.toString()) <= 0) {
      toast.error('Por favor ingresa un precio al por detal válido');
      return;
    }
    if (!wholesalePrice || parseFloat(wholesalePrice.toString()) <= 0) {
      toast.error('Por favor ingresa un precio al por mayor válido');
      return;
    }
    if (!editingProduct.stock || parseInt(editingProduct.stock.toString()) < 0) {
      toast.error('Por favor ingresa una cantidad de stock válida');
      return;
    }
    if (!editingProduct.image.trim()) {
      toast.error('Por favor proporciona una URL de imagen o sube una imagen');
      return;
    }

    try {
      await updateProduct(editingProduct.id, {
        name: editingProduct.name,
        category: editingProduct.category,
        subcategory: editingProduct.subcategory,
        price: typeof retailPrice === 'string' ? parseFloat(retailPrice) : retailPrice,
        retailPrice: typeof retailPrice === 'string' ? parseFloat(retailPrice) : retailPrice,
        wholesalePrice: typeof wholesalePrice === 'string' ? parseFloat(wholesalePrice) : wholesalePrice,
        image: editingProduct.image,
        images: [editingProduct.image],
        description: editingProduct.description,
        stock: typeof editingProduct.stock === 'string' ? parseInt(editingProduct.stock) : editingProduct.stock,
        allowCustom: editingProduct.allowCustom,
        colorPalette: Array.isArray(editingProduct.colorPalette) ? editingProduct.colorPalette : [],
        sizes: Array.isArray(editingProduct.sizes) && editingProduct.sizes.length > 0
          ? editingProduct.sizes
          : ['S', 'M', 'L', 'XL', '2XL'],
        customizationImages: editingProduct.customizationImages,
      });
      toast.success('¡Producto actualizado exitosamente!');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo actualizar el producto');
      return;
    }
    setIsEditModalOpen(false);
    setImagePreview('');
    setCustomImagePreviews({ front: '', back: '', sleeves: '' });
    setEditingProduct(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El tamaño de la imagen debe ser menor a 5MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor sube un archivo de imagen');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        if (isEditModalOpen && editingProduct) {
          setEditingProduct({ ...editingProduct, image: result });
        } else {
          setNewProduct({ ...newProduct, image: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomizationImageUpload = (view: 'front' | 'back' | 'sleeves', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El tamaño de la imagen debe ser menor a 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Por favor sube un archivo de imagen');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCustomImagePreviews(prev => ({ ...prev, [view]: result }));
        if (isEditModalOpen && editingProduct) {
          setEditingProduct({
            ...editingProduct,
            customizationImages: {
              ...editingProduct.customizationImages,
              [view]: result
            }
          });
        } else {
          setNewProduct({
            ...newProduct,
            customizationImages: {
              ...newProduct.customizationImages,
              [view]: result
            }
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImagePreview = () => {
    setImagePreview('');
    if (isEditModalOpen && editingProduct) {
      setEditingProduct({ ...editingProduct, image: '' });
    } else {
      setNewProduct({ ...newProduct, image: '' });
    }
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      deleteProduct(productId).then(() => {
        toast.success('Producto eliminado exitosamente');
      }).catch((err: any) => {
        toast.error(err?.message ?? 'No se pudo eliminar el producto');
      });
    }
  };

  const toggleFeatured = (productId: string, currentFeatured: boolean) => {
    const newFeaturedState = !currentFeatured;
    updateProduct(productId, { featured: newFeaturedState });

    const product = products.find(p => p.id === productId);
    console.log(`Producto "${product?.name}" ${newFeaturedState ? 'marcado' : 'desmarcado'} como destacado`);

    toast.success(
      newFeaturedState
        ? `¡${product?.name} ahora aparece en la página principal!`
        : `${product?.name} removido de la página principal`
    );
  };

  return (
    <div className="bg-black min-h-screen">
      <AdminNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl">Gestión de Inventario</h1>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-white text-black hover:bg-gray-200"
          >
            + Agregar Producto
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card p-6 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-secondary border-border text-white"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-secondary border border-border rounded-md px-4 py-2 text-white"
            >
              <option value="all">Todas las Categorías</option>
              <option value="men">Caballeros</option>
              <option value="women">Damas</option>
              <option value="kids">Niños</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-4">Producto</th>
                  <th className="text-left p-4">Categoría</th>
                  <th className="text-left p-4">Precio Detal</th>
                  <th className="text-left p-4">Precio Mayor</th>
                  <th className="text-left p-4">Stock</th>
                  <th className="text-left p-4">Personalizado</th>
                  <th className="text-center p-4">Destacado</th>
                  <th className="text-left p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id} className="border-b border-border">
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div>
                          <p>{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.subcategory}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 capitalize">{product.category}</td>
                    <td className="p-4">${product.retailPrice || product.price}</td>
                    <td className="p-4 text-green-400">${product.wholesalePrice || 6.5}</td>
                    <td className="p-4">
                      <span className={product.stock < 50 ? 'text-red-400' : ''}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-4">
                      {product.allowCustom ? (
                        <span className="text-green-400">Sí</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleFeatured(product.id, product.featured || false)}
                        className="transition-colors hover:scale-110 transform"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            product.featured
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-400'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border"
                          onClick={() => {
                            setEditingProduct(product);
                            setImagePreview(product.image || '');
                            setCustomImagePreviews({
                              front: product.customizationImages?.front || '',
                              back: product.customizationImages?.back || '',
                              sleeves: product.customizationImages?.sleeves || ''
                            });
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-red-400 hover:text-red-300"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-muted-foreground text-sm">
          Mostrando {filteredProducts.length} de {products.length} productos
        </div>

        {/* Add Product Dialog Content */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="bg-card border-border text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Agregar Nuevo Producto</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Completa los detalles para agregar un nuevo producto a tu inventario.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-name">Nombre del Producto</Label>
                  <Input
                    id="add-name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="bg-secondary border-border text-white"
                    placeholder="Ingresa el nombre del producto"
                  />
                </div>

                <div>
                  <Label htmlFor="add-stock">Cantidad en Stock</Label>
                  <Input
                    id="add-stock"
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="bg-secondary border-border text-white"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-retailPrice">Precio al por Detal ($)</Label>
                  <Input
                    id="add-retailPrice"
                    type="number"
                    step="0.01"
                    value={newProduct.retailPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, retailPrice: e.target.value })}
                    className="bg-secondary border-border text-white"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Precio para 1-5 unidades
                  </p>
                </div>

                <div>
                  <Label htmlFor="add-wholesalePrice">Precio al por Mayor ($)</Label>
                  <Input
                    id="add-wholesalePrice"
                    type="number"
                    step="0.01"
                    value={newProduct.wholesalePrice}
                    onChange={(e) => setNewProduct({ ...newProduct, wholesalePrice: e.target.value })}
                    className="bg-secondary border-border text-white"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Precio para 6+ unidades
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-category">Categoría Principal</Label>
                  <select
                    id="add-category"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                  >
                    <option value="men">Caballeros</option>
                    <option value="women">Damas</option>
                    <option value="kids">Niños</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="add-subcategory">Subcategoría</Label>
                    <button
                      type="button"
                      onClick={() => setIsManageSubcategoriesOpen(true)}
                      className="text-xs text-white/70 hover:text-white flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Gestionar
                    </button>
                  </div>
                  <select
                    id="add-subcategory"
                    value={newProduct.subcategory}
                    onChange={(e) => setNewProduct({ ...newProduct, subcategory: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                  >
                    {availableSubcategories.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="add-stock">Cantidad en Stock</Label>
                <Input
                  id="add-stock"
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  className="bg-secondary border-border text-white"
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="add-description">Descripción</Label>
                <Textarea
                  id="add-description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="bg-secondary border-border text-white min-h-[100px]"
                  placeholder="Ingresa la descripción del producto"
                />
              </div>

              <div>
                <Label>Paleta de Colores</Label>
                <button
                  type="button"
                  onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                  className="w-full flex items-center justify-between bg-secondary border border-border rounded-md px-4 py-3 text-white hover:bg-secondary/80 transition-colors"
                >
                  <span className="text-sm">
                    {newProduct.colorPalette.length > 0
                      ? `${newProduct.colorPalette.length} colores seleccionados`
                      : 'Seleccionar colores'}
                  </span>
                  {isColorDropdownOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {isColorDropdownOpen && (
                  <div className="mt-2 bg-secondary border border-border rounded-md p-4 max-h-[300px] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                      {AVAILABLE_COLORS.map((color) => (
                        <label
                          key={color.value}
                          className="flex items-center gap-3 p-2 rounded hover:bg-secondary/80 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={newProduct.colorPalette.includes(color.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewProduct({
                                  ...newProduct,
                                  colorPalette: [...newProduct.colorPalette, color.value],
                                });
                              } else {
                                setNewProduct({
                                  ...newProduct,
                                  colorPalette: newProduct.colorPalette.filter(c => c !== color.value),
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div
                            className="w-6 h-6 rounded border-2 border-white/20 shrink-0"
                            style={{ background: color.swatch }}
                          />
                          <span className="text-sm text-white">{color.name} - {color.code}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {newProduct.colorPalette.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Colores seleccionados ({newProduct.colorPalette.length}):
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {newProduct.colorPalette.map((colorValue, index) => {
                        const colorInfo = AVAILABLE_COLORS.find(c => c.value === colorValue);
                        return (
                          <div
                            key={index}
                            className="w-10 h-10 rounded border-2 border-white/30"
                            style={{ background: colorInfo?.swatch ?? colorValue }}
                            title={colorInfo ? `${colorInfo.name} - ${colorInfo.code}` : colorValue}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {renderSizesPicker(
                newProduct.sizes,
                toggleNewSize,
                isSizesDropdownOpen,
                setIsSizesDropdownOpen,
              )}

              <div>
                <Label htmlFor="add-image">URL de la Imagen</Label>
                <Input
                  id="add-image"
                  value={newProduct.image}
                  onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                  className="bg-secondary border-border text-white"
                  placeholder="https://example.com/image.jpg"
                />

                <div className="mt-4">
                  <Label htmlFor="add-imageUpload">O Subir Imagen</Label>
                  <div className="mt-2">
                    <label 
                      htmlFor="add-imageUpload" 
                      className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-border rounded-lg cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          Haz clic para subir o arrastra y suelta
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, GIF hasta 5MB
                        </p>
                      </div>
                      <input
                        id="add-imageUpload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>

                  {imagePreview && !isEditModalOpen && (
                    <div className="mt-4 relative">
                      <div className="relative w-full h-48 bg-secondary rounded-lg overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={clearImagePreview}
                          className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black rounded-full transition-colors"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Imagen subida exitosamente
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="add-allowCustom"
                  checked={newProduct.allowCustom}
                  onChange={(e) => setNewProduct({ ...newProduct, allowCustom: e.target.checked })}
                  className="w-4 h-4 bg-secondary border-border rounded"
                />
                <Label htmlFor="add-allowCustom" className="cursor-pointer">
                  Permitir diseños personalizados
                </Label>
              </div>

              {newProduct.allowCustom && (
                <div className="border border-border rounded-lg p-4 bg-secondary/50">
                  <h3 className="text-lg font-semibold mb-4 text-white">Precios de Personalización por Estampado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configura los precios para personalizar este producto según el tamaño
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="add-customPricing-small">Pequeño - $</Label>
                      <Input
                        id="add-customPricing-small"
                        type="number"
                        step="0.01"
                        value={(newProduct as any).customPricing?.small || ''}
                        onChange={(e) => setNewProduct({
                          ...newProduct,
                          customPricing: {
                            ...(newProduct as any).customPricing,
                            small: parseFloat(e.target.value) || 0,
                            medium: (newProduct as any).customPricing?.medium || 0,
                            large: (newProduct as any).customPricing?.large || 0,
                          }
                        } as any)}
                        className="bg-secondary border-border text-white"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="add-customPricing-medium">Mediano - $</Label>
                      <Input
                        id="add-customPricing-medium"
                        type="number"
                        step="0.01"
                        value={(newProduct as any).customPricing?.medium || ''}
                        onChange={(e) => setNewProduct({
                          ...newProduct,
                          customPricing: {
                            small: (newProduct as any).customPricing?.small || 0,
                            medium: parseFloat(e.target.value) || 0,
                            large: (newProduct as any).customPricing?.large || 0,
                          }
                        } as any)}
                        className="bg-secondary border-border text-white"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="add-customPricing-large">Grande - $</Label>
                      <Input
                        id="add-customPricing-large"
                        type="number"
                        step="0.01"
                        value={(newProduct as any).customPricing?.large || ''}
                        onChange={(e) => setNewProduct({
                          ...newProduct,
                          customPricing: {
                            small: (newProduct as any).customPricing?.small || 0,
                            medium: (newProduct as any).customPricing?.medium || 0,
                            large: parseFloat(e.target.value) || 0,
                          }
                        } as any)}
                        className="bg-secondary border-border text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Sección de Imágenes de Personalización */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="text-md font-semibold mb-3 text-white">Imágenes de Personalización</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Sube las imágenes que se mostrarán cuando el cliente personalice este producto (opcional)
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Vista Frontal */}
                      <div>
                        <Label className="text-white">Vista Frontal</Label>
                        <label
                          htmlFor="add-custom-front"
                          className="flex flex-col items-center justify-center w-full h-32 mt-2 border-2 border-dashed border-border rounded-lg cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          {customImagePreviews.front ? (
                            <div className="relative w-full h-full p-1">
                              <img src={customImagePreviews.front} alt="Vista frontal" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                              <p className="mt-1 text-xs text-muted-foreground">Subir imagen</p>
                            </div>
                          )}
                          <input
                            id="add-custom-front"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleCustomizationImageUpload('front', e)}
                          />
                        </label>
                      </div>

                      {/* Vista Trasera */}
                      <div>
                        <Label className="text-white">Vista Trasera</Label>
                        <label
                          htmlFor="add-custom-back"
                          className="flex flex-col items-center justify-center w-full h-32 mt-2 border-2 border-dashed border-border rounded-lg cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          {customImagePreviews.back ? (
                            <div className="relative w-full h-full p-1">
                              <img src={customImagePreviews.back} alt="Vista trasera" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                              <p className="mt-1 text-xs text-muted-foreground">Subir imagen</p>
                            </div>
                          )}
                          <input
                            id="add-custom-back"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleCustomizationImageUpload('back', e)}
                          />
                        </label>
                      </div>

                      {/* Vista Lateral */}
                      <div>
                        <Label className="text-white">Vista Lateral</Label>
                        <label
                          htmlFor="add-custom-sleeves"
                          className="flex flex-col items-center justify-center w-full h-32 mt-2 border-2 border-dashed border-border rounded-lg cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          {customImagePreviews.sleeves ? (
                            <div className="relative w-full h-full p-1">
                              <img src={customImagePreviews.sleeves} alt="Vista lateral" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                              <p className="mt-1 text-xs text-muted-foreground">Subir imagen</p>
                            </div>
                          )}
                          <input
                            id="add-custom-sleeves"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleCustomizationImageUpload('sleeves', e)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="border-border"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddProduct}
                className="bg-white text-black hover:bg-gray-200"
              >
                Agregar Producto
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog Content */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="bg-card border-border text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Editar Producto</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Actualiza los detalles del producto.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Nombre del Producto</Label>
                  <Input
                    id="edit-name"
                    value={editingProduct?.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="bg-secondary border-border text-white"
                    placeholder="Ingresa el nombre del producto"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-stock">Cantidad en Stock</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    value={editingProduct?.stock || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    className="bg-secondary border-border text-white"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-retailPrice">Precio al por Detal ($)</Label>
                  <Input
                    id="edit-retailPrice"
                    type="number"
                    step="0.01"
                    value={editingProduct?.retailPrice || editingProduct?.price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, retailPrice: e.target.value })}
                    className="bg-secondary border-border text-white"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Precio para 1-5 unidades
                  </p>
                </div>

                <div>
                  <Label htmlFor="edit-wholesalePrice">Precio al por Mayor ($)</Label>
                  <Input
                    id="edit-wholesalePrice"
                    type="number"
                    step="0.01"
                    value={editingProduct?.wholesalePrice || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, wholesalePrice: e.target.value })}
                    className="bg-secondary border-border text-white"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Precio para 6+ unidades
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-category">Categoría Principal</Label>
                  <select
                    id="edit-category"
                    value={editingProduct?.category || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                  >
                    <option value="men">Caballeros</option>
                    <option value="women">Damas</option>
                    <option value="kids">Niños</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="edit-subcategory">Subcategoría</Label>
                    <button
                      type="button"
                      onClick={() => setIsManageSubcategoriesOpen(true)}
                      className="text-xs text-white/70 hover:text-white flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Gestionar
                    </button>
                  </div>
                  <select
                    id="edit-subcategory"
                    value={editingProduct?.subcategory || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, subcategory: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 text-white"
                  >
                    {availableSubcategories.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-stock">Cantidad en Stock</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={editingProduct?.stock || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                  className="bg-secondary border-border text-white"
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={editingProduct?.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="bg-secondary border-border text-white min-h-[100px]"
                  placeholder="Ingresa la descripción del producto"
                />
              </div>

              <div>
                <Label>Paleta de Colores</Label>
                <button
                  type="button"
                  onClick={() => setIsEditColorDropdownOpen(!isEditColorDropdownOpen)}
                  className="w-full flex items-center justify-between bg-secondary border border-border rounded-md px-4 py-3 text-white hover:bg-secondary/80 transition-colors"
                >
                  <span className="text-sm">
                    {editingProduct?.colorPalette && Array.isArray(editingProduct.colorPalette) && editingProduct.colorPalette.length > 0
                      ? `${editingProduct.colorPalette.length} colores seleccionados`
                      : 'Seleccionar colores'}
                  </span>
                  {isEditColorDropdownOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {isEditColorDropdownOpen && (
                  <div className="mt-2 bg-secondary border border-border rounded-md p-4 max-h-[300px] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                      {AVAILABLE_COLORS.map((color) => (
                        <label
                          key={color.value}
                          className="flex items-center gap-3 p-2 rounded hover:bg-secondary/80 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={
                              editingProduct?.colorPalette
                                ? Array.isArray(editingProduct.colorPalette)
                                  ? editingProduct.colorPalette.includes(color.value)
                                  : false
                                : false
                            }
                            onChange={(e) => {
                              const currentPalette = Array.isArray(editingProduct?.colorPalette)
                                ? editingProduct.colorPalette
                                : [];

                              if (e.target.checked) {
                                setEditingProduct({
                                  ...editingProduct,
                                  colorPalette: [...currentPalette, color.value],
                                });
                              } else {
                                setEditingProduct({
                                  ...editingProduct,
                                  colorPalette: currentPalette.filter(c => c !== color.value),
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div
                            className="w-6 h-6 rounded border-2 border-white/20 shrink-0"
                            style={{ background: color.swatch }}
                          />
                          <span className="text-sm text-white">{color.name} - {color.code}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {editingProduct?.colorPalette && Array.isArray(editingProduct.colorPalette) && editingProduct.colorPalette.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Colores seleccionados ({editingProduct.colorPalette.length}):
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {editingProduct.colorPalette.map((colorValue: string, index: number) => {
                        const colorInfo = AVAILABLE_COLORS.find(c => c.value === colorValue);
                        return (
                          <div
                            key={index}
                            className="w-10 h-10 rounded border-2 border-white/30"
                            style={{ background: colorInfo?.swatch ?? colorValue }}
                            title={colorInfo ? `${colorInfo.name} - ${colorInfo.code}` : colorValue}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {renderSizesPicker(
                Array.isArray(editingProduct?.sizes) ? editingProduct.sizes : [],
                toggleEditSize,
                isEditSizesDropdownOpen,
                setIsEditSizesDropdownOpen,
              )}

              <div>
                <Label htmlFor="edit-image">URL de la Imagen</Label>
                <Input
                  id="edit-image"
                  value={editingProduct?.image || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                  className="bg-secondary border-border text-white"
                  placeholder="https://example.com/image.jpg"
                />
                
                <div className="mt-4">
                  <Label htmlFor="edit-imageUpload">O Subir Imagen</Label>
                  <div className="mt-2">
                    <label 
                      htmlFor="edit-imageUpload" 
                      className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-border rounded-lg cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          Haz clic para subir o arrastra y suelta
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, GIF hasta 5MB
                        </p>
                      </div>
                      <input
                        id="edit-imageUpload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>

                  {imagePreview && isEditModalOpen && (
                    <div className="mt-4 relative">
                      <div className="relative w-full h-48 bg-secondary rounded-lg overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={clearImagePreview}
                          className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black rounded-full transition-colors"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Imagen subida exitosamente
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-allowCustom"
                  checked={editingProduct?.allowCustom || false}
                  onChange={(e) => setEditingProduct({ ...editingProduct, allowCustom: e.target.checked })}
                  className="w-4 h-4 bg-secondary border-border rounded"
                />
                <Label htmlFor="edit-allowCustom" className="cursor-pointer">
                  Permitir diseños personalizados
                </Label>
              </div>

              {editingProduct?.allowCustom && (
                <div className="border border-border rounded-lg p-4 bg-secondary/50">
                  <h3 className="text-lg font-semibold mb-4 text-white">Precios de Personalización por Estampado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configura los precios para personalizar este producto según el tamaño
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-customPricing-small">Pequeño - $</Label>
                      <Input
                        id="edit-customPricing-small"
                        type="number"
                        step="0.01"
                        value={editingProduct?.customPricing?.small || ''}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          customPricing: {
                            ...editingProduct?.customPricing,
                            small: parseFloat(e.target.value) || 0,
                            medium: editingProduct?.customPricing?.medium || 0,
                            large: editingProduct?.customPricing?.large || 0,
                          }
                        })}
                        className="bg-secondary border-border text-white"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-customPricing-medium">Mediano - $</Label>
                      <Input
                        id="edit-customPricing-medium"
                        type="number"
                        step="0.01"
                        value={editingProduct?.customPricing?.medium || ''}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          customPricing: {
                            small: editingProduct?.customPricing?.small || 0,
                            medium: parseFloat(e.target.value) || 0,
                            large: editingProduct?.customPricing?.large || 0,
                          }
                        })}
                        className="bg-secondary border-border text-white"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-customPricing-large">Grande - $</Label>
                      <Input
                        id="edit-customPricing-large"
                        type="number"
                        step="0.01"
                        value={editingProduct?.customPricing?.large || ''}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          customPricing: {
                            small: editingProduct?.customPricing?.small || 0,
                            medium: editingProduct?.customPricing?.medium || 0,
                            large: parseFloat(e.target.value) || 0,
                          }
                        })}
                        className="bg-secondary border-border text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Sección de Imágenes de Personalización */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="text-md font-semibold mb-3 text-white">Imágenes de Personalización</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Sube las imágenes que se mostrarán cuando el cliente personalice este producto (opcional)
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Vista Frontal */}
                      <div>
                        <Label className="text-white">Vista Frontal</Label>
                        <label
                          htmlFor="edit-custom-front"
                          className="flex flex-col items-center justify-center w-full h-32 mt-2 border-2 border-dashed border-border rounded-lg cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          {customImagePreviews.front ? (
                            <div className="relative w-full h-full p-1">
                              <img src={customImagePreviews.front} alt="Vista frontal" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                              <p className="mt-1 text-xs text-muted-foreground">Subir imagen</p>
                            </div>
                          )}
                          <input
                            id="edit-custom-front"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleCustomizationImageUpload('front', e)}
                          />
                        </label>
                      </div>

                      {/* Vista Trasera */}
                      <div>
                        <Label className="text-white">Vista Trasera</Label>
                        <label
                          htmlFor="edit-custom-back"
                          className="flex flex-col items-center justify-center w-full h-32 mt-2 border-2 border-dashed border-border rounded-lg cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          {customImagePreviews.back ? (
                            <div className="relative w-full h-full p-1">
                              <img src={customImagePreviews.back} alt="Vista trasera" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                              <p className="mt-1 text-xs text-muted-foreground">Subir imagen</p>
                            </div>
                          )}
                          <input
                            id="edit-custom-back"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleCustomizationImageUpload('back', e)}
                          />
                        </label>
                      </div>

                      {/* Vista Lateral */}
                      <div>
                        <Label className="text-white">Vista Lateral</Label>
                        <label
                          htmlFor="edit-custom-sleeves"
                          className="flex flex-col items-center justify-center w-full h-32 mt-2 border-2 border-dashed border-border rounded-lg cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          {customImagePreviews.sleeves ? (
                            <div className="relative w-full h-full p-1">
                              <img src={customImagePreviews.sleeves} alt="Vista lateral" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                              <p className="mt-1 text-xs text-muted-foreground">Subir imagen</p>
                            </div>
                          )}
                          <input
                            id="edit-custom-sleeves"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleCustomizationImageUpload('sleeves', e)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingProduct(null);
                  setImagePreview('');
                }}
                className="border-border"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEditProduct}
                className="bg-white text-black hover:bg-gray-200"
              >
                Actualizar Producto
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Manage Subcategories Dialog */}
        <Dialog open={isManageSubcategoriesOpen} onOpenChange={setIsManageSubcategoriesOpen}>
          <DialogContent className="bg-card border-border text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Gestionar Subcategorías</DialogTitle>
              <DialogDescription>
                Agrega o elimina subcategorías personalizadas. Las predeterminadas no se pueden eliminar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <Label htmlFor="new-subcategory" className="mb-1 block">Nueva subcategoría</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-subcategory"
                    value={newSubcategoryLabel}
                    onChange={(e) => setNewSubcategoryLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomSubcategory(); }}
                    placeholder="Ej: Shorts, Chaquetas, Conjuntos..."
                    className="bg-secondary border-border text-white"
                  />
                  <Button
                    type="button"
                    onClick={handleAddCustomSubcategory}
                    className="bg-white text-black hover:bg-gray-200"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Catálogo actual ({availableSubcategories.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableSubcategories.map((s) => {
                    const isDefault = isDefaultSubcategory(s.value);
                    return (
                      <span
                        key={s.value}
                        className={`group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm border ${
                          isDefault ? 'bg-secondary border-border' : 'bg-white/10 border-white/30'
                        }`}
                      >
                        {s.label}
                        {isDefault ? (
                          <span className="text-[10px] text-white/40 uppercase tracking-wider">default</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomSubcategory(s.value)}
                            className="text-red-400 hover:text-red-300"
                            title="Eliminar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
