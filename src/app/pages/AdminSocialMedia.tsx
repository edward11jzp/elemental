import { useState } from 'react';
import { Link } from 'react-router';
import { Facebook, Instagram, Twitter, Youtube, Linkedin, MessageCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { SocialMediaPlatform } from '../types';
import { toast } from 'sonner';

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

const PLATFORM_COLORS = {
  facebook: 'from-blue-600 to-blue-700',
  instagram: 'from-pink-600 via-purple-600 to-orange-600',
  twitter: 'from-blue-400 to-blue-500',
  tiktok: 'from-black to-gray-800',
  youtube: 'from-red-600 to-red-700',
  whatsapp: 'from-green-500 to-green-600',
  linkedin: 'from-blue-700 to-blue-800',
  pinterest: 'from-red-700 to-red-800',
};

const PLATFORM_NAMES = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter / X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  pinterest: 'Pinterest',
};

export default function AdminSocialMedia() {
  const { socialMedia, addSocialMedia, updateSocialMedia, deleteSocialMedia } = useApp();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSocial, setEditingSocial] = useState<any>(null);

  const [formData, setFormData] = useState({
    platform: 'instagram' as SocialMediaPlatform,
    username: '',
    url: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      platform: 'instagram',
      username: '',
      url: '',
    });
    setEditingSocial(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.url) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (editingSocial) {
      updateSocialMedia(editingSocial.id, formData);
      toast.success('Red social actualizada exitosamente');
      setEditingSocial(null);
    } else {
      addSocialMedia({ ...formData, active: true });
      toast.success('Red social agregada exitosamente');
      setIsAddDialogOpen(false);
    }

    resetForm();
  };

  const handleEdit = (social: any) => {
    setEditingSocial(social);
    setFormData({
      platform: social.platform,
      username: social.username,
      url: social.url,
    });
  };

  const handleDelete = (id: string, platform: string) => {
    if (window.confirm(`¿Estás seguro de eliminar ${PLATFORM_NAMES[platform as SocialMediaPlatform]}?`)) {
      deleteSocialMedia(id);
      toast.success('Red social eliminada');
    }
  };

  const handleToggleActive = (id: string, active: boolean) => {
    updateSocialMedia(id, { active: !active });
    toast.success(active ? 'Red social desactivada' : 'Red social activada');
  };

  const SocialForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="platform" className="text-white">
          Plataforma *
        </Label>
        <select
          id="platform"
          name="platform"
          value={formData.platform}
          onChange={(e) => setFormData({ ...formData, platform: e.target.value as SocialMediaPlatform })}
          className="w-full bg-black border border-border rounded-md px-3 py-2 text-white"
          required
        >
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="twitter">Twitter / X</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="linkedin">LinkedIn</option>
          <option value="pinterest">Pinterest</option>
        </select>
      </div>

      <div>
        <Label htmlFor="username" className="text-white">
          Usuario / Nombre *
        </Label>
        <Input
          id="username"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          placeholder="Ej: @elemental_store"
          className="bg-black border-border text-white"
          required
        />
      </div>

      <div>
        <Label htmlFor="url" className="text-white">
          URL Completa *
        </Label>
        <Input
          id="url"
          name="url"
          value={formData.url}
          onChange={handleInputChange}
          placeholder="https://instagram.com/elemental_store"
          className="bg-black border-border text-white"
          required
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1 bg-white text-black hover:bg-gray-200">
          {editingSocial ? 'Actualizar' : 'Agregar'}
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
              <h1 className="text-3xl font-bold">Gestión de Redes Sociales</h1>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-black hover:bg-gray-200">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Red Social
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-secondary border-border max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">Nueva Red Social</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Agrega un nuevo enlace a tus redes sociales.
                  </DialogDescription>
                </DialogHeader>
                <SocialForm />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Social Media List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {socialMedia.map((social) => {
            const Icon = PLATFORM_ICONS[social.platform];
            const gradient = PLATFORM_COLORS[social.platform];

            return (
              <div
                key={social.id}
                className="bg-secondary border border-border rounded-lg overflow-hidden"
              >
                <div className={`bg-gradient-to-r ${gradient} p-4 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-white" />
                    <h3 className="text-lg font-semibold text-white">
                      {PLATFORM_NAMES[social.platform]}
                    </h3>
                  </div>
                  <button
                    onClick={() => handleToggleActive(social.id, social.active)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      social.active
                        ? 'bg-white/20 text-white'
                        : 'bg-black/30 text-white/60'
                    }`}
                  >
                    {social.active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                <div className="p-6">
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Usuario</p>
                    <p className="text-white">{social.username}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-1">URL</p>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 break-all"
                    >
                      {social.url}
                    </a>
                  </div>

                  <div className="flex gap-2">
                    <Dialog
                      open={editingSocial?.id === social.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingSocial(null);
                          resetForm();
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => handleEdit(social)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-border"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-secondary border-border max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-white">Editar Red Social</DialogTitle>
                          <DialogDescription className="text-muted-foreground">
                            Actualiza la información de esta red social.
                          </DialogDescription>
                        </DialogHeader>
                        <SocialForm />
                      </DialogContent>
                    </Dialog>
                    <Button
                      onClick={() => handleDelete(social.id, social.platform)}
                      variant="outline"
                      size="sm"
                      className="border-border hover:bg-red-900/20 hover:border-red-500/30 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {socialMedia.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-4">
              No hay redes sociales registradas
            </p>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-white text-black hover:bg-gray-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primera Red Social
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
