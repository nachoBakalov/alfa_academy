import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CATEGORY_LABELS } from './statisticsLabels';
import { formatBalls, formatPercent, toNumber } from './statisticsFormatters';

const CATEGORY_COLORS = {
  social: 'var(--chart-social)',
  sports: 'var(--chart-sports)',
  creativity: 'var(--chart-creativity)',
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const item = payload[0]?.payload;

  if (!item) {
    return null;
  }

  return (
    <div className="statistics-chart-tooltip statistics-chart-tooltip-dark">
      <strong>{item.label}</strong>
      <span>Събрани топки: {item.value}</span>
      <span>Максимум: {item.maxBalls}</span>
      <span>Изпълнение: {formatPercent(item.percentage)}</span>
    </div>
  );
}

export default function CategoryPieChart({ categoryTotals }) {
  const data = ['social', 'sports', 'creativity'].map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    value: toNumber(categoryTotals?.[key]?.balls, 0),
    maxBalls: toNumber(categoryTotals?.[key]?.maxBalls, 0),
    percentage: toNumber(categoryTotals?.[key]?.percentage, 0),
    color: CATEGORY_COLORS[key],
  }));

  const hasData = data.some((item) => item.value > 0);
  const totalBalls = data.reduce((sum, item) => sum + item.value, 0);
  const totalMaxBalls = data.reduce((sum, item) => sum + item.maxBalls, 0);
  const totalPercentage = totalMaxBalls > 0 ? (totalBalls / totalMaxBalls) * 100 : 0;

  return (
    <section aria-label="Разпределение по категории" className="statistics-chart-section">
      <h3 className="statistics-section-title">Разпределение по категории</h3>
      <div className="statistics-chart-box">
        {hasData ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={96}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth={1}
                paddingAngle={3}
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: 'var(--showcase-muted)' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="statistics-zero-state" role="status">
            <div className="statistics-zero-ring" aria-hidden="true">
              <strong>0%</strong>
              <span>Изпълнение</span>
            </div>
            <p>Все още няма натрупани Алфа топки за избрания период.</p>
          </div>
        )}
      </div>

      <div className="statistics-category-total">
        <strong>{formatBalls(totalBalls, totalMaxBalls)}</strong>
        <span>Общо изпълнение: {formatPercent(totalPercentage)}</span>
      </div>

      <div className="statistics-values-list">
        {data.map((item) => (
          <article key={item.key} className="statistics-value-item">
            <div className="statistics-value-title-wrap">
              <span
                className="statistics-color-dot"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <strong>{item.label}</strong>
            </div>
            <span>{formatBalls(item.value, item.maxBalls)}</span>
            <span>{formatPercent(item.percentage)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
