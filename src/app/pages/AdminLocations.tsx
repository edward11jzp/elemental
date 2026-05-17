import { useState } from 'react';
import { Link } from 'react-router';
import { MapPin, Phone, Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { useApp } from '../context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';

export default function AdminLocations() {
  const { locations, addLocation, updateLocation, deleteLocation } = useApp();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    shoppingCenter: '',
    address: '',
    phone: '',
    hours: '',
    image: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      shoppingCenter: '',
      address: '',
      phone: '',
      hours: '',
      image: '',
    });
    setEditingLocation(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.shoppingCenter || !formData.phone) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    if (editingLocation) {
      updateLocation(editingLocation.id, formData);
      toast.success('Ubicación actualizada exitosamente');
      setEditingLocation(null);
    } else {
      addLocation(formData);
      toast.success('Ubicación agregada exitosamente');
      setIsAddDialogOpen(false);
    }

    resetForm();
  };

  const handleEdit = (location: any) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      shoppingCenter: location.shoppingCenter,
      address: location.address || '',
      phone: location.phone,
      hours: location.hours || '',
      image: location.image || '',
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar la ubicación "${name}"?`)) {
      deleteLocation(id);
      toast.success('Ubicación eliminada');
    }
  };

  const LocationForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-white">
          Nombre de la Tienda *
        </Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Ej: ELEMENTAL - Zona Norte"
          className="bg-black border-border text-white"
          required
        />
      </div>

      <div>
        <Label htmlFor="shoppingCenter" className="text-white">
          Centro Comercial *
        </Label>
        <Input
          id="shoppingCenter"
          name="shoppingCenter"
          value={formData.shoppingCenter}
          onChange={handleInputChange}
          placeholder="Ej: CC Unicentro"
          className="bg-black border-border text-white"
          required
        />
      </div>

      <div>
        <Label htmlFor="address" className="text-white">
          Dirección Completa
        </Label>
        <Input
          id="address"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          placeholder="Ej: Local 205, Segundo Piso"
          className="bg-black border-border text-white"
        />
      </div>

      <div>
        <Label htmlFor="phone" className="text-white">
          Teléfono *
        </Label>
        <Input
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          placeholder="Ej: +57 300 123 4567"
          className="bg-black border-border text-white"
          required
        />
      </div>

      <div>
        <Label htmlFor="hours" className="text-white">
          Horario de Atención
        </Label>
        <Input
          id="hours"
          name="hours"
          value={formData.hours}
          onChange={handleInputChange}
          placeholder="Ej: Lun - Sab: 10am - 8pm, Dom: 11am - 7pm"
          className="bg-black border-border text-white"
        />
      </div>

      <div>
        <Label htmlFor="image" className="text-white">
          URL de la Imagen
        </Label>
        <Input
          id="image"
          name="image"
          value={formData.image}
          onChange={handleInputChange}
          placeholder="https://ejemplo.com/imagen-tienda.jpg"
          className="bg-black border-border text-white"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Recomendado: 800x600px o superior
        </p>
        {formData.image && (
          <div className="mt-2">
            <img
              src={formData.image}
              alt="Vista previa"
              className="w-full h-32 object-cover rounded-md"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Imagen+no+disponible';
              }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1 bg-white text-black hover:bg-gray-200">
          {editingLocation ? 'Actualizar' : 'Agregar'} Ubicación
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(false);
          }}
          className="border-border text-white hover:bg-secondary"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                to="/admin/dashboard"
                className="text-muted-foreground hover:text-white text-sm mb-2 inline-block"
              >
                ← Volver al Dashboard
              </Link>
              <h1 className="text-3xl font-bold">Gestión de Ubicaciones</h1>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-black hover:bg-gray-200">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Ubicación
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-secondary border-border max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">Nueva Ubicación</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Ingresa los datos de la nueva ubicación de tienda.
                  </DialogDescription>
                </DialogHeader>
                <LocationForm />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Locations List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <div
              key={location.id}
              className="bg-secondary border border-border rounded-lg overflow-hidden"
            >
              {/* Store Image */}
              {location.image && (
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={location.image}
                    alt={location.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Imagen+no+disponible';
                    }}
                  />
                </div>
              )}

              <div className="p-6">
                {/* Store Name */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold">{location.name}</h3>
                <div className="flex gap-2">
                  <Dialog
                    open={editingLocation?.id === location.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setEditingLocation(null);
                        resetForm();
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <button
                        onClick={() => handleEdit(location)}
                        className="text-muted-foreground hover:text-white transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-secondary border-border max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-white">Editar Ubicación</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Actualiza la información de esta ubicación.
                        </DialogDescription>
                      </DialogHeader>
                      <LocationForm />
                    </DialogContent>
                  </Dialog>
                  <button
                    onClick={() => handleDelete(location.id, location.name)}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                </div>

                {/* Shopping Center */}
                <div className="flex items-start gap-2 mb-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Centro Comercial</p>
                  <p className="text-white">{location.shoppingCenter}</p>
                  {location.address && (
                    <p className="text-sm text-muted-foreground mt-1">{location.address}</p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-2 mb-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="text-white">{location.phone}</p>
                </div>
              </div>

                {/* Hours */}
                {location.hours && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Horario</p>
                      <p className="text-white text-sm">{location.hours}</p>
                    </div>
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
            <p className="text-muted-foreground text-lg mb-4">
              No hay ubicaciones registradas
            </p>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-white text-black hover:bg-gray-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primera Ubicación
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
