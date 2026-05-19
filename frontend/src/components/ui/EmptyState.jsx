export default function EmptyState({ title, description, action }) {
  return (
    <section className="empty-state" role="status">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </section>
  );
}
