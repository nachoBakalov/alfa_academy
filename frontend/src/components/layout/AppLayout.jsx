import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../features/auth/AuthProvider';
import Sidebar, { getNavigationItemsByRole } from './Sidebar';
import Topbar from './Topbar';
import MobileNav from './MobileNav';

function resolveBackFallback(pathname) {
  if (/^\/children\/[^/]+\/profile$/.test(pathname)) {
    return '/children';
  }

  if (/^\/groups\/[^/]+\/manage$/.test(pathname)) {
    return '/groups';
  }

  if (/^\/sports\/challenges\/[^/]+$/.test(pathname)) {
    return '/sports';
  }

  if (/^\/reports\/groups\/[^/]+$/.test(pathname)) {
    return '/reports';
  }

  const fallbackMap = {
    '/coach/my-groups': '/dashboard',
    '/children': '/dashboard',
    '/groups': '/dashboard',
    '/academies': '/dashboard',
    '/users': '/dashboard',
    '/social/daily': '/dashboard',
    '/social/weekly': '/dashboard',
    '/sports': '/dashboard',
    '/reports': '/dashboard',
  };

  return fallbackMap[pathname] || '/dashboard';
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = getNavigationItemsByRole(user?.role);
  const canShowBackButton = location.pathname !== '/dashboard';

  function handleBack() {
    const historyIndex =
      typeof window.history?.state?.idx === 'number' ? window.history.state.idx : -1;

    if (historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate(resolveBackFallback(location.pathname), { replace: true });
  }

  return (
    <div className="app-shell">
      <div className="desktop-sidebar">
        <Sidebar items={navigationItems} />
      </div>

      <div className="app-main">
        <Topbar
          user={user}
          onMenuClick={() => setIsMobileNavOpen(true)}
          onLogout={logout}
          showBackButton={canShowBackButton}
          onBack={handleBack}
        />

        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <MobileNav
        isOpen={isMobileNavOpen}
        items={navigationItems}
        onClose={() => setIsMobileNavOpen(false)}
      />
    </div>
  );
}
