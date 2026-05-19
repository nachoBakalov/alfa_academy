import Card from '../../components/ui/Card';
import StatusPill from '../../components/ui/StatusPill';
import { formatBalls, formatDate, formatPercent, toNumber } from './statisticsFormatters';

function resolveTone(percentage) {
  const value = toNumber(percentage, 0);

  if (value >= 80) {
    return 'success';
  }

  if (value >= 55) {
    return 'info';
  }

  return 'neutral';
}

function CategoryRow({ label, category }) {
  return (
    <span className="group-stat-chip">
      {label}: {formatBalls(category.balls, category.maxBalls)} ({formatPercent(category.percentage)})
    </span>
  );
}

export default function GroupStatisticsCard({ group }) {
  const progress = Math.max(0, Math.min(100, toNumber(group.percentage, 0)));

  return (
    <Card
      title={group.name}
      className="group-statistics-card statistics-glass-card"
    >
      <div className="group-statistics-card-header">
        <div>
          <strong className="group-statistics-main-value">{formatBalls(group.totalBalls, group.maxBalls)}</strong>
          <p className="muted-text">Събрани Алфа топки за периода</p>
        </div>
        <StatusPill tone={resolveTone(group.percentage)} label={formatPercent(group.percentage)} />
      </div>

      <div className="group-stat-progress" role="img" aria-label={`${group.name}: ${formatPercent(progress)}`}>
        <div className="group-stat-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="group-stat-category-list" aria-label="Разбивка по категории">
        <CategoryRow label="Социално поведение" category={group.categories.social} />
        <CategoryRow label="Спорт" category={group.categories.sports} />
        <CategoryRow label="Креативност" category={group.categories.creativity} />
      </div>

      <div className="group-stat-weekly-grid" aria-label="Седмична разбивка">
        {group.weeklyBreakdown.map((week) => {
          const weekProgress = week.maxBalls > 0 ? (toNumber(week.totalBalls, 0) / toNumber(week.maxBalls, 0)) * 100 : 0;

          return (
            <article key={week.weekStartDate} className="group-stat-week-item">
              <strong>
                {formatDate(week.weekStartDate)} - {formatDate(week.weekEndDate)}
              </strong>
              <span>Общо: {formatBalls(week.totalBalls, week.maxBalls)}</span>
              <div className="group-stat-week-metrics">
                <span>Социално: {week.socialBalls}</span>
                <span>Спорт: {week.sportsBalls}</span>
                <span>Креативност: {week.creativityBalls}</span>
              </div>
              <div className="group-stat-week-progress">
                <div style={{ width: `${Math.max(0, Math.min(100, weekProgress))}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </Card>
  );
}
