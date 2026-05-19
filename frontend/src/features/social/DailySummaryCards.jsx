import Card from '../../components/ui/Card';

function StatCard({ label, value, tone = 'neutral' }) {
  return (
    <article className={`social-stat-card social-stat-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function DailySummaryCards({ summary }) {
  if (!summary) {
    return null;
  }

  return (
    <Card title="Дневно обобщение">
      <div className="social-stats-grid">
        <StatCard label="Брой деца" value={summary.numberOfChildren} />
        <StatCard label="Попълнени" value={summary.completedChildrenCount} tone="success" />
        <StatCard label="Непопълнени" value={summary.missingChildrenCount} tone="warning" />
        <StatCard
          label="Дневен резултат"
          value={`${summary.dailySocialResult} / ${summary.externalDailyMaximum}`}
          tone="info"
        />
        <StatCard label="Външен максимум" value={summary.externalDailyMaximum} />
        <StatCard label="Успешен ден" value={summary.greenChildrenCount} tone="success" />
        <StatCard
          label="Нужда от насочване"
          value={summary.orangeChildrenCount}
          tone="warning"
        />
        <StatCard label="Нужда от внимание" value={summary.redChildrenCount} tone="danger" />
      </div>

      {summary.missingChildrenCount > 0 ? (
        <p className="social-helper-text">Има деца без попълнена оценка за този ден.</p>
      ) : null}
    </Card>
  );
}
