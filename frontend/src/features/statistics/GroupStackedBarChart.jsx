import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CATEGORY_SHORT_LABELS } from './statisticsLabels';
import { formatBalls, formatPercent, toNumber } from './statisticsFormatters';

const COLORS = {
  social: 'var(--chart-social)',
  sports: 'var(--chart-sports)',
  creativity: 'var(--chart-creativity)',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const social = toNumber(payload.find((item) => item.dataKey === 'social')?.value, 0);
  const sports = toNumber(payload.find((item) => item.dataKey === 'sports')?.value, 0);
  const creativity = toNumber(payload.find((item) => item.dataKey === 'creativity')?.value, 0);
  const total = social + sports + creativity;

  return (
    <div className="statistics-chart-tooltip statistics-chart-tooltip-dark">
      <strong>{label}</strong>
      <span>Социално: {social}</span>
      <span>Спорт: {sports}</span>
      <span>Креативност: {creativity}</span>
      <span>Общо: {total}</span>
    </div>
  );
}

export default function GroupStackedBarChart({ groups = [] }) {
  const data = groups.map((group) => ({
    id: group.id,
    name: group.name,
    social: toNumber(group.categories?.social?.balls, 0),
    sports: toNumber(group.categories?.sports?.balls, 0),
    creativity: toNumber(group.categories?.creativity?.balls, 0),
    total: toNumber(group.totalBalls, 0),
    maxBalls: toNumber(group.maxBalls, 0),
    percentage: toNumber(group.percentage, 0),
  }));

  const hasData = data.some((item) => item.total > 0);

  return (
    <section aria-label="Разпределение по групи" className="statistics-chart-section">
      <h3 className="statistics-section-title">Разпределение по групи</h3>
      <div className="statistics-chart-box statistics-chart-box-dark">
        {hasData ? (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 16 }} barCategoryGap="16%">
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(184, 199, 189, 0.24)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: 'var(--showcase-muted)' }}
                interval={0}
                angle={-16}
                textAnchor="end"
                tickMargin={10}
              />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--showcase-muted)' }} width={36} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: 'var(--showcase-muted)', paddingTop: 8 }} />
              <Bar dataKey="social" stackId="balls" name={CATEGORY_SHORT_LABELS.social} fill={COLORS.social} radius={[4, 4, 0, 0]} barSize={32} />
              <Bar dataKey="sports" stackId="balls" name={CATEGORY_SHORT_LABELS.sports} fill={COLORS.sports} radius={[4, 4, 0, 0]} barSize={32} />
              <Bar
                dataKey="creativity"
                stackId="balls"
                name={CATEGORY_SHORT_LABELS.creativity}
                fill={COLORS.creativity}
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="statistics-empty-chart" role="status">
            <div className="statistics-empty-chart-bars" aria-hidden="true">
              <span style={{ height: '30%' }} />
              <span style={{ height: '54%' }} />
              <span style={{ height: '38%' }} />
              <span style={{ height: '66%' }} />
            </div>
            <p>Очакваме първите резултати за периода.</p>
          </div>
        )}
      </div>

      <div className="statistics-values-list">
        {data.map((item) => (
          <article key={item.id} className="statistics-value-item">
            <strong>{item.name}</strong>
            <span>{formatBalls(item.total, item.maxBalls)}</span>
            <span>{formatPercent(item.percentage)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
