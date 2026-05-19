export default function Card({ title, children, className = '' }) {
  return (
    <article className={`card ${className}`.trim()}>
      {title ? <h3 className="card-title">{title}</h3> : null}
      <div className="card-content">{children}</div>
    </article>
  );
}
