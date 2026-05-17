import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password, 'admin')) {
      toast.success('¡Administrador conectado exitosamente!');
      navigate('/admin/dashboard');
    } else {
      toast.error('Error al iniciar sesión');
    }
  };

  return (
    <div className="bg-black min-h-screen flex items-center justify-center py-12">
      <div className="max-w-md w-full px-4">
        <div className="bg-card p-8 rounded-lg">
          <h1 className="text-3xl mb-2">Portal de Administrador</h1>
          <p className="text-muted-foreground mb-6">Inicia sesión para acceder al panel de administración</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary border-border text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary border-border text-white"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-gray-200"
            >
              Iniciar Sesión en Portal de Administrador
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-4 text-center">
            Demo: Usa cualquier correo/contraseña para iniciar sesión
          </p>
        </div>
      </div>
    </div>
  );
}