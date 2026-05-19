export default function Alert({ type = 'info', children, className = '' }) {
  return <div className={`alert alert-${type} ${className}`.trim()}>{children}</div>;
}
