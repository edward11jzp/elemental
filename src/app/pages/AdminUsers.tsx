import { useApp } from '../context';
import { useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import AdminNav from '../components/AdminNav';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';

export default function AdminUsers() {
  const { currentUser, users, createStaffUser, toggleUserActive, deleteUser } = useApp();
  const navigate = useNavigate();
  const [showAddUser, setShowAddUser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'employee' as 'employee' | 'admin',
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
    } else if (currentUser.role !== 'admin') {
      navigate('/admin/orders');
    }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'admin') return null;

  const handleToggleActive = async (userId: string, userName: string, isActive: boolean) => {
    try {
      await toggleUserActive(userId);
      toast.success(`${userName} ${isActive ? 'desactivado' : 'activado'} exitosamente`);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`¿Borrar a ${userName}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteUser(userId);
      toast.success(`${userName} eliminado`);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo borrar el usuario');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Completa nombre, correo y contraseña');
      return;
    }
    if (newUser.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSaving(true);
    try {
      await createStaffUser(newUser.email, newUser.password, newUser.name, newUser.role, newUser.phone || undefined);
      toast.success(`${newUser.role === 'admin' ? 'Administrador' : 'Personal Administrativo'} creado exitosamente`);
      setShowAddUser(false);
      setNewUser({ name: '', email: '', password: '', phone: '', role: 'employee' });
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo crear el usuario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-black min-h-screen">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl">Gestión de Usuarios</h1>
          <Button
            onClick={() => setShowAddUser(true)}
            className="bg-white text-black hover:bg-gray-200"
          >
            + Agregar Usuario
          </Button>
        </div>

        {/* Users Table */}
        <div className="bg-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-4">Nombre</th>
                  <th className="text-left p-4">Correo</th>
                  <th className="text-left p-4">Teléfono</th>
                  <th className="text-left p-4">Rol</th>
                  <th className="text-left p-4">Estado</th>
                  <th className="text-left p-4">Creado</th>
                  <th className="text-left p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No hay usuarios todavía. Click <strong>+ Agregar Usuario</strong> para crear el primero.
                    </td>
                  </tr>
                )}
                {users.map(user => (
                  <tr key={user.id} className="border-b border-border">
                    <td className="p-4">{user.name}</td>
                    <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                    <td className="p-4">
                      {user.phone ? (
                        <span className="text-sm">{user.phone}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-600 text-white' :
                        user.role === 'employee' ? 'bg-blue-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {user.role === 'admin' ? 'Admin' :
                         user.role === 'employee' ? 'Personal Administrativo' :
                         'Cliente'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.active ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-red-900/30 text-red-400 border border-red-500/30'
                      }`}>
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {user.id !== currentUser.id && (
                          <>
                            <Button
                              onClick={() => handleToggleActive(user.id, user.name, user.active)}
                              variant="outline"
                              size="sm"
                              className={`border-border ${
                                user.active
                                  ? 'hover:bg-red-900/20 hover:border-red-500/30 hover:text-red-400'
                                  : 'hover:bg-green-900/20 hover:border-green-500/30 hover:text-green-400'
                              }`}
                            >
                              {user.active ? 'Desactivar' : 'Activar'}
                            </Button>
                            <Button
                              onClick={() => handleDelete(user.id, user.name)}
                              variant="outline"
                              size="sm"
                              className="border-border hover:bg-red-900/40 hover:border-red-500/40 hover:text-red-400"
                            >
                              Borrar
                            </Button>
                          </>
                        )}
                        {user.id === currentUser.id && (
                          <span className="text-xs text-muted-foreground italic">Tú</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 mb-8">
          <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-blue-200/80">Personal Administrativo</h3>
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-3xl text-blue-400">{users.filter(u => u.role === 'employee').length}</p>
            <p className="text-xs text-blue-200/60 mt-1">
              {users.filter(u => u.role === 'employee' && u.active).length} activos
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/30 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-purple-200/80">Administradores</h3>
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-3xl text-purple-400">{users.filter(u => u.role === 'admin').length}</p>
            <p className="text-xs text-purple-200/60 mt-1">Acceso completo</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg">
          <h2 className="text-2xl mb-4">Roles de Usuario</h2>
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-600 text-white">Admin</span>
                <p className="font-medium">Administrador</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Acceso completo: inventario, pedidos, usuarios, ubicaciones, redes sociales, métodos de pago y configuración.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white">Personal Administrativo</span>
                <p className="font-medium">Personal Administrativo</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Puede ver y actualizar pedidos. Sin acceso a inventario ni configuración.
              </p>
            </div>
            <div className="border-t border-border pt-3 mt-3">
              <p className="text-xs text-muted-foreground">
                💡 Los clientes <strong>no</strong> tienen cuenta — compran como invitados y consultan su pedido con el número de tracking.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="bg-card border-border text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Crea una cuenta de Administrador o Personal Administrativo. El usuario podrá entrar en /admin/login.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre Completo *</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="bg-secondary border-border text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Correo Electrónico *</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="bg-secondary border-border text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña Temporal *</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="bg-secondary border-border text-white"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comparte esta contraseña con el usuario; puede cambiarla luego.
              </p>
            </div>

            <div>
              <Label htmlFor="role">Rol *</Label>
              <select
                id="role"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'employee' | 'admin' })}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-white"
                required
              >
                <option value="employee">Personal Administrativo</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                className="bg-secondary border-border text-white"
                placeholder="Ej: 0412-1234567"
              />
              <p className="text-xs text-muted-foreground mt-1">Opcional</p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddUser(false)}
                disabled={saving}
                className="flex-1 border-border"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 bg-white text-black hover:bg-gray-200 disabled:opacity-60"
              >
                {saving ? 'Creando…' : 'Crear Usuario'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
