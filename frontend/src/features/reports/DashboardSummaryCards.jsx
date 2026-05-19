import Card from '../../components/ui/Card';
import { formatNumber } from './reportFormatters';

function SummaryMetric({ label, value, tone = 'neutral' }) {
  return (
    <article className={`report-metric-card report-metric-card-${tone}`}>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </article>
  );
}

export default function DashboardSummaryCards({ counts }) {
  return (
    <Card title="Основни показатели">
      <div className="report-metrics-grid">
        <SummaryMetric label="Активни академии" value={counts?.activeAcademies} />
        <SummaryMetric label="Активни групи" value={counts?.activeGroups} tone="success" />
        <SummaryMetric label="Активни деца" value={counts?.activeChildren} tone="warning" />
        <SummaryMetric label="Активни треньори" value={counts?.activeCoaches} />
      </div>
    </Card>
  );
}
