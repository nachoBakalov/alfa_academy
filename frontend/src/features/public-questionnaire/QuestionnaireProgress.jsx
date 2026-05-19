export default function QuestionnaireProgress({ answeredRequired, totalRequired, percentage }) {
  return (
    <section className="pq-progress" aria-label="Напредък">
      <div className="pq-progress-head">
        <strong>
          Попълнени {answeredRequired} от {totalRequired} задължителни въпроса
        </strong>
        <span>{percentage}%</span>
      </div>
      <div className="pq-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <div className="pq-progress-fill" style={{ width: `${percentage}%` }} />
      </div>
    </section>
  );
}
