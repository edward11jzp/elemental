import { Outlet, useLocation, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { useApp } from '../context';

// Routes only admins can access. Employees can only see /admin/orders.
const ADMIN_ONLY_PATHS = [
  '/admin/dashboard',
  '/admin/inventory',
  '/admin/users',
  '/admin/locations',
  '/admin/social',
  '/admin/payment-info',
  '/admin/settings',
];

export default function AdminRoot() {
  const { currentUser } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Public admin routes (login + index landing)
    const isPublic = pathname === '/admin' || pathname === '/admin/login';
    if (isPublic) return;

    if (!currentUser) {
      navigate('/admin/login');
      return;
    }

    if (currentUser.role === 'employee' && ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
      navigate('/admin/orders');
    }
  }, [currentUser, pathname, navigate]);

  return <Outlet />;
}
