import Sidebar from './Sidebar';

export default function MobileNav({ isOpen, items, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="mobile-nav-overlay" role="dialog" aria-modal="true" aria-label="Мобилно меню">
      <div className="mobile-nav-panel">
        <button className="mobile-nav-close" type="button" onClick={onClose} aria-label="Затвори менюто">
          Затвори
        </button>
        <Sidebar items={items} onNavigate={onClose} />
      </div>
      <button className="mobile-nav-backdrop" type="button" onClick={onClose} aria-label="Затвори менюто" />
    </div>
  );
}
