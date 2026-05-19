import Card from '../../components/ui/Card';
import StatusPill from '../../components/ui/StatusPill';
import {
  formatFailSafeReached,
  formatFinalStatus,
  formatGroupTargetReached,
  getFinalStatusTone,
} from './sportsLabels';
import { formatNumber } from './sportsFormatters';

function StatCard({ label, value, tone = 'neutral' }) {
  return (
    <article className={`sports-stat-card sports-stat-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function SportsChallengeSummaryCards({ summary, unit }) {
  if (!summary) {
    return null;
  }

  return (
    <Card title="Обобщение на резултатите">
      <div className="sports-stats-grid">
        <StatCard label="Участници" value={summary.participantsCount} />
        <StatCard label="Финални резултати" value={summary.finalResultsCount} tone="info" />
        <StatCard label="Първоначален сбор" value={formatNumber(summary.baselineTotal, unit)} />
        <StatCard label="Групов таргет" value={formatNumber(summary.groupTargetTotal, unit)} />
        <StatCard
          label="Финален сбор"
          value={formatNumber(summary.finalTotal, unit)}
          tone="success"
        />
        <StatCard
          label="Повторили/подобрили"
          value={`${summary.repeatedOrImprovedCount} (${formatNumber(summary.repeatedOrImprovedPercentage)}%)`}
          tone="warning"
        />
      </div>

      <div className="sports-summary-statuses">
        <StatusPill
          label={formatGroupTargetReached(summary.groupTargetReached)}
          tone={summary.groupTargetReached ? 'success' : 'warning'}
        />
        <StatusPill
          label={formatFailSafeReached(summary.failSafeReached)}
          tone={summary.failSafeReached ? 'success' : 'warning'}
        />
        <StatusPill
          label={formatFinalStatus(summary.finalStatus)}
          tone={getFinalStatusTone(summary.finalStatus)}
        />
      </div>
    </Card>
  );
}
