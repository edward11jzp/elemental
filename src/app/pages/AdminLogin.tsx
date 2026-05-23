import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSetup = async () => {
    if (!email || !password) {
      toast.error('Ingresa correo y contraseña');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const { signUpFirstAdmin, signInAndMaybeClaimAdmin } = await import('../lib/auth');
      await signUpFirstAdmin(email, password);
      const user = await signInAndMaybeClaimAdmin(email, password);
      if (user.role !== 'admin') {
        toast.error('Ya existe un administrador. Inicia sesión normalmente.');
        return;
      }
      toast.success('¡Cuenta admin creada e iniciada!');
      navigate('/admin/dashboard');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (intendedRole: 'admin' | 'employee') => {
    if (!email || !password) {
      toast.error('Ingresa correo y contraseña');
      return;
    }
    setLoading(true);
    try {
      const ok = await login(email, password, intendedRole);
      if (!ok) {
        toast.error('Correo o contraseña incorrectos');
        return;
      }
      // Resolve role from the Supabase session (login() already set currentUser)
      const { getCurrentUser } = await import('../lib/auth');
      const u = await getCurrentUser();
      const isEmployee = u?.role === 'employee';
      const isAdmin = u?.role === 'admin';
      if (!isEmployee && !isAdmin) {
        toast.error('Tu cuenta no tiene permisos de administración');
        const { signOut } = await import('../lib/auth');
        await signOut();
        return;
      }
      toast.success(
        isEmployee ? '¡Personal Administrativo conectado!' : '¡Administrador conectado!',
      );
      navigate(isEmployee ? '/admin/orders' : '/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'setup') handleSetup();
    else handleLogin('admin');
  };

  return (
    <div className="bg-black min-h-screen flex items-center justify-center py-12">
      <div className="max-w-md w-full px-4">
        <div className="bg-card p-8 rounded-lg">
          <h1 className="text-3xl mb-2">{mode === 'setup' ? 'Crear Cuenta de Administrador' : 'Portal de Administrador'}</h1>
          <p className="text-muted-foreground mb-6">
            {mode === 'setup'
              ? 'Elige tu correo y contraseña — esta cuenta será la admin principal.'
              : 'Inicia sesión para acceder al panel de administración'}
          </p>
          
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
              disabled={loading}
              className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-60"
            >
              {loading
                ? (mode === 'setup' ? 'Creando…' : 'Iniciando…')
                : (mode === 'setup' ? 'Crear Cuenta Admin' : 'Iniciar Sesión en Portal de Administrador')}
            </Button>

            {mode === 'login' && (
              <>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">o</span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => handleLogin('employee')}
                  disabled={loading}
                  className="w-full bg-secondary text-white border border-border hover:bg-secondary/80 disabled:opacity-60"
                >
                  {loading ? 'Iniciando…' : 'Entrar al Portal de Control'}
                </Button>
              </>
            )}
          </form>

          {mode === 'login' ? (
            <div className="mt-6 border border-dashed border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">¿Es la primera vez que usas este portal?</p>
              <button
                type="button"
                onClick={() => setMode('setup')}
                className="text-sm text-white underline hover:text-gray-300 font-medium"
              >
                → Crear cuenta de administrador
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              <button type="button" onClick={() => setMode('login')} className="underline hover:text-white">
                ← Volver al inicio de sesión
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
