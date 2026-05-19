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

function getFinalTotalTone(summary) {
  if (!summary || !summary.finalResultsCount) {
    return 'neutral';
  }

  return summary.groupTargetReached ? 'success' : 'danger';
}

function getRepeatedOrImprovedTone(summary) {
  if (!summary || !summary.finalResultsCount) {
    return 'neutral';
  }

  return summary.failSafeReached ? 'success' : 'danger';
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
          tone={getFinalTotalTone(summary)}
        />
        <StatCard
          label="Повторили/подобрили"
          value={`${summary.repeatedOrImprovedCount} (${formatNumber(summary.repeatedOrImprovedPercentage)}%)`}
          tone={getRepeatedOrImprovedTone(summary)}
        />
      </div>

      <div className="sports-summary-statuses">
        <StatusPill
          label={formatGroupTargetReached(summary.groupTargetReached)}
          tone={summary.groupTargetReached ? 'success' : 'danger'}
        />
        <StatusPill
          label={formatFailSafeReached(summary.failSafeReached)}
          tone={summary.failSafeReached ? 'success' : 'danger'}
        />
        <StatusPill
          label={formatFinalStatus(summary.finalStatus)}
          tone={getFinalStatusTone(summary.finalStatus)}
        />
      </div>
    </Card>
  );
}
