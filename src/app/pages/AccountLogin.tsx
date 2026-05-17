import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useApp } from '../context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function AccountLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { login, addUser } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Get the redirect path from URL params (e.g., ?redirect=/checkout)
    const redirectTo = searchParams.get('redirect') || '/account';

    if (!isLogin) {
      // Registration
      if (password !== confirmPassword) {
        toast.error('Las contraseñas no coinciden');
        return;
      }
      if (password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (!name.trim()) {
        toast.error('Por favor ingresa tu nombre');
        return;
      }
      // Create new user
      const newUser = {
        id: `user-${Date.now()}`,
        email,
        name,
        phone: phone || undefined,
        role: 'customer' as const,
        active: true,
        createdAt: new Date().toISOString(),
      };
      addUser(newUser);
      toast.success('¡Cuenta creada exitosamente!');
      if (login(email, password, 'customer')) {
        navigate(redirectTo);
      }
    } else {
      // Login
      if (login(email, password, 'customer')) {
        toast.success('¡Sesión iniciada exitosamente!');
        navigate(redirectTo);
      } else {
        toast.error('Error al iniciar sesión');
      }
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 relative overflow-hidden bg-black">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.7s' }}></div>
      </div>

      <div className="max-w-md w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1C1C1C] p-8 rounded-2xl border-2 border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>

          <div className="relative z-10">
            <h1 className="text-3xl mb-2">
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {isLogin ? 'Ingresa a tu cuenta de cliente' : 'Regístrate como nuevo cliente'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-secondary border-border text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-secondary border-border text-white"
                      placeholder="Ej: 0412-1234567"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Opcional - Para facilitar la entrega de tu pedido
                    </p>
                  </div>
                </>
              )}

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
                  minLength={isLogin ? undefined : 6}
                />
                {!isLogin && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Mínimo 6 caracteres
                  </p>
                )}
              </div>

              {!isLogin && (
                <div>
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-secondary border-border text-white"
                    required
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-gray-200"
              >
                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-white hover:text-muted-foreground transition-colors"
              >
                {isLogin ? (
                  <>
                    ¿No tienes cuenta?{' '}
                    <span className="underline">Crear cuenta</span>
                  </>
                ) : (
                  <>
                    ¿Ya tienes cuenta?{' '}
                    <span className="underline">Iniciar sesión</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Demo: Usa cualquier correo/contraseña para {isLogin ? 'iniciar sesión' : 'crear tu cuenta'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}