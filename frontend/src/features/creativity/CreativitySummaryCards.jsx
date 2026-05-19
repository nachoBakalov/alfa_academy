import Card from '../../components/ui/Card';

function toTwoDecimals(value) {
  const numeric = Number(value || 0);

  if (!Number.isFinite(numeric)) {
    return '0.00';
  }

  return numeric.toFixed(2);
}

export default function CreativitySummaryCards({ summary }) {
  if (!summary) {
    return null;
  }

  return (
    <div className="creativity-stats-grid">
      <Card className="creativity-stat-card">
        <span>Групи в академията</span>
        <strong>{summary.groupsCount}</strong>
      </Card>
      <Card className="creativity-stat-card creativity-stat-card-info">
        <span>Попълнени групи</span>
        <strong>{summary.completedGroupsCount}</strong>
      </Card>
      <Card className="creativity-stat-card creativity-stat-card-success">
        <span>Постигнали цел</span>
        <strong>{summary.targetReachedGroupsCount}</strong>
      </Card>
      <Card className="creativity-stat-card creativity-stat-card-warning">
        <span>Средни Алфа топки</span>
        <strong>{toTwoDecimals(summary.averageAlphaBalls)}</strong>
      </Card>
    </div>
  );
}
