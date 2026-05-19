const PRESET_MODAL_SIZES = new Set(['default', 'wide', 'xl']);

function resolveModalSize(size) {
  if (typeof size === 'string' && PRESET_MODAL_SIZES.has(size)) {
    return {
      sizeClass: `modal-card-${size}`,
      style: undefined,
    };
  }

  const numericSize = Number(size);

  if (Number.isFinite(numericSize) && numericSize > 0) {
    return {
      sizeClass: 'modal-card-default',
      style: {
        width: `min(96vw, ${numericSize}px)`,
      },
    };
  }

  if (typeof size === 'string' && /^\d+(\.\d+)?(px|rem|em|vw|vh|%)$/.test(size.trim())) {
    return {
      sizeClass: 'modal-card-default',
      style: {
        width: `min(96vw, ${size.trim()})`,
      },
    };
  }

  return {
    sizeClass: 'modal-card-default',
    style: undefined,
  };
}

export default function FormModal({ title, isOpen, onClose, children, footer, size = 'default' }) {
  if (!isOpen) {
    return null;
  }

  const resolvedSize = resolveModalSize(size);

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className={`modal-card ${resolvedSize.sizeClass}`}
        style={resolvedSize.style}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" type="button" onClick={onClose}>
            Затвори
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
