export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...restProps
}) {
  const buttonClassName = `btn btn-${variant} btn-${size} ${className}`.trim();

  return (
    <button
      className={buttonClassName}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      {...restProps}
    >
      {loading ? 'Зареждане...' : children}
    </button>
  );
}
