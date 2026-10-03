import { Outlet, useLocation, useNavigate } from 'react-router';
import { Suspense, useEffect } from 'react';
import { useApp } from '../context';
import { AdminOrderNotifier } from '../components/AdminOrderNotifier';
import AdminShell from '../components/AdminShell';
import { PermsProvider, isStaffRole, moduleOfPath, usePerms } from '../lib/perms';

// Cada ruta pertenece a un módulo; quien no tenga permiso para ese módulo
// va a la primera sección que sí puede ver (matriz en Usuarios y permisos).
function Guard() {
  const { currentUser } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { can, ready, firstAllowedPath } = usePerms();
  const isPublic = pathname === '/admin' || pathname === '/admin/login';

  useEffect(() => {
    if (isPublic) return;
    if (!currentUser || !isStaffRole(currentUser.role)) {
      navigate('/admin/login');
      return;
    }
    if (!ready) return;
    const mod = moduleOfPath(pathname);
    if (mod && !can(mod)) navigate(firstAllowedPath());
  }, [currentUser, pathname, navigate, ready, can, firstAllowedPath, isPublic]);

  const content = (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );

  return (
    <>
      {/* Sonido + notificación del navegador cuando entra una orden nueva */}
      <AdminOrderNotifier />
      {isPublic || !currentUser ? content : <AdminShell>{content}</AdminShell>}
    </>
  );
}

export default function AdminRoot() {
  return (
    <PermsProvider>
      <Guard />
    </PermsProvider>
  );
}
