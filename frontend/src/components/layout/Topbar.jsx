import Button from '../ui/Button';

export default function Topbar({ user, onMenuClick, onLogout, showBackButton = false, onBack }) {
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const userName = displayName || user?.email || 'Потребител';

  return (
    <header className="topbar">
      <div className="topbar-mobile-actions">
        {showBackButton ? (
          <button
            className="mobile-back-button"
            type="button"
            onClick={onBack}
            aria-label="Назад"
          >
            Назад
          </button>
        ) : null}
        <button
          className="mobile-menu-button"
          type="button"
          onClick={onMenuClick}
          aria-label="Отвори менюто"
        >
          Меню
        </button>
      </div>

      <div className="topbar-user">
        <span className="topbar-user-name" title={userName}>
          {userName}
        </span>
        <Button variant="secondary" onClick={onLogout}>
          Изход
        </Button>
      </div>
    </header>
  );
}
