import { NavLink } from 'react-router-dom';

const BASE_ITEMS = [{ label: 'Табло', to: '/dashboard', enabled: true }];

const ROLE_ITEMS = {
  super_admin: [
    { label: 'Потребители', to: '/users', enabled: true },
    { label: 'Академии', to: '/academies', enabled: true },
    { label: 'Групи', to: '/groups', enabled: true },
    { label: 'Деца', to: '/children', enabled: true },
    { label: 'Дневна оценка', to: '/social/daily', enabled: true },
    { label: 'Седмичен резултат', to: '/social/weekly', enabled: true },
    { label: 'Креативност', to: '/creativity', enabled: true },
    { label: 'Спортни предизвикателства', to: '/sports', enabled: true },
    { label: 'Справки', to: '/reports', enabled: true },
    { label: 'Статистика', to: '/statistics', enabled: true },
    { label: 'Класация групи', to: '/group-leaderboard', enabled: true },
  ],
  admin: [
    { label: 'Потребители', to: '/users', enabled: true },
    { label: 'Академии', to: '/academies', enabled: true },
    { label: 'Групи', to: '/groups', enabled: true },
    { label: 'Деца', to: '/children', enabled: true },
    { label: 'Дневна оценка', to: '/social/daily', enabled: true },
    { label: 'Седмичен резултат', to: '/social/weekly', enabled: true },
    { label: 'Креативност', to: '/creativity', enabled: true },
    { label: 'Спортни предизвикателства', to: '/sports', enabled: true },
    { label: 'Справки', to: '/reports', enabled: true },
    { label: 'Статистика', to: '/statistics', enabled: true },
    { label: 'Класация групи', to: '/group-leaderboard', enabled: true },
  ],
  manager: [
    { label: 'Треньорски панел', to: '/coach/my-groups', enabled: true },
    { label: 'Групи', to: '/groups', enabled: true },
    { label: 'Академии', to: '/academies', enabled: true },
    { label: 'Деца', to: '/children', enabled: true },
    { label: 'Дневна оценка', to: '/social/daily', enabled: true },
    { label: 'Седмичен резултат', to: '/social/weekly', enabled: true },
    { label: 'Креативност', to: '/creativity', enabled: true },
    { label: 'Спортни предизвикателства', to: '/sports', enabled: true },
    { label: 'Справки', to: '/reports', enabled: true },
    { label: 'Статистика', to: '/statistics', enabled: true },
    { label: 'Класация групи', to: '/group-leaderboard', enabled: true },
  ],
  coach: [
    { label: 'Моите групи', to: '/coach/my-groups', enabled: true },
    { label: 'Деца', to: '/children', enabled: true },
    { label: 'Дневна оценка', to: '/social/daily', enabled: true },
    { label: 'Седмичен резултат', to: '/social/weekly', enabled: true },
    { label: 'Креативност', to: '/creativity', enabled: true },
    { label: 'Спортни предизвикателства', to: '/sports', enabled: true },
    { label: 'Справки', to: '/reports', enabled: true },
    { label: 'Статистика', to: '/statistics', enabled: true },
    { label: 'Класация групи', to: '/group-leaderboard', enabled: true },
  ],
};

export function getNavigationItemsByRole(role) {
  return [...BASE_ITEMS, ...(ROLE_ITEMS[role] || [])];
}

export default function Sidebar({ items, onNavigate }) {
  return (
    <aside className="sidebar" aria-label="Основна навигация">
      <div className="sidebar-brand">Лятна академия</div>

      <nav className="sidebar-nav">
        {items.map((item) => {
          if (!item.enabled) {
            return (
              <button key={item.label} className="nav-item nav-item-disabled" type="button" disabled>
                <span>{item.label}</span>
                <small>Предстои</small>
              </button>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item-active' : ''}`.trim()
              }
            >
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
