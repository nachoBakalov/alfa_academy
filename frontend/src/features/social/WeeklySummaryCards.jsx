import Card from '../../components/ui/Card';
import StatusPill from '../../components/ui/StatusPill';
import { formatWeeklyStatus, getWeeklyStatusTone } from './socialLabels';

function StatCard({ label, value, tone = 'neutral' }) {
  return (
    <article className={`social-stat-card social-stat-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function WeeklySummaryCards({ summary }) {
  if (!summary) {
    return null;
  }

  return (
    <Card title="Седмично обобщение">
      <div className="social-weekly-highlight">
        <div>
          <strong className="social-weekly-alpha">
            Алфа топки: {summary.weeklyAlphaBalls} / {summary.maxAlphaBalls}
          </strong>
          <p className="social-helper-text">Таргет: {summary.targetAlphaBalls} / {summary.maxAlphaBalls}</p>
        </div>
        <StatusPill
          label={formatWeeklyStatus(summary.weeklyStatus)}
          tone={getWeeklyStatusTone(summary.weeklyStatus)}
        />
      </div>

      <div className="social-stats-grid">
        <StatCard
          label="Седмичен резултат"
          value={`${summary.weeklySocialResult} / ${summary.weeklyMaximum}`}
          tone="info"
        />
        <StatCard label="Седмичен максимум" value={summary.weeklyMaximum} />
        <StatCard label="Процент" value={`${summary.weeklyPercentage}%`} tone="success" />
        <StatCard label="Активни дни" value={summary.activeDaysCount} />
      </div>
    </Card>
  );
}
