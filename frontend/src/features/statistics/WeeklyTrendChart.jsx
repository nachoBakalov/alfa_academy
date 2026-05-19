import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDate, toNumber } from './statisticsFormatters';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const social = toNumber(payload.find((item) => item.dataKey === 'socialBalls')?.value, 0);
  const sports = toNumber(payload.find((item) => item.dataKey === 'sportsBalls')?.value, 0);
  const creativity = toNumber(payload.find((item) => item.dataKey === 'creativityBalls')?.value, 0);
  const total = toNumber(payload.find((item) => item.dataKey === 'totalBalls')?.value, 0);

  return (
    <div className="statistics-chart-tooltip statistics-chart-tooltip-dark">
      <strong>Седмица: {label}</strong>
      <span>Социално: {social}</span>
      <span>Спорт: {sports}</span>
      <span>Креативност: {creativity}</span>
      <span>Общо: {total}</span>
    </div>
  );
}

export default function WeeklyTrendChart({ group }) {
  const data = (group?.weeklyBreakdown || []).map((week) => ({
    label: `${formatDate(week.weekStartDate)} - ${formatDate(week.weekEndDate)}`,
    socialBalls: toNumber(week.socialBalls, 0),
    sportsBalls: toNumber(week.sportsBalls, 0),
    creativityBalls: toNumber(week.creativityBalls, 0),
    totalBalls: toNumber(week.totalBalls, 0),
  }));

  return (
    <section aria-label="Седмичен тренд" className="statistics-chart-section">
      <h3 className="statistics-section-title">
        Седмичен тренд{group?.name ? `: ${group.name}` : ''}
      </h3>
      <div className="statistics-chart-box statistics-chart-box-dark">
        {group && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 14 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(184, 199, 189, 0.24)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: 'var(--showcase-muted)' }}
                interval={0}
                angle={-16}
                textAnchor="end"
                tickMargin={10}
              />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--showcase-muted)' }} width={36} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: 'var(--showcase-muted)', paddingTop: 8 }} />
              <Line type="monotone" dataKey="socialBalls" stroke="var(--chart-social)" name="Социално" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sportsBalls" stroke="var(--chart-sports)" name="Спорт" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="creativityBalls" stroke="var(--chart-creativity)" name="Креативност" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="totalBalls" stroke="var(--chart-total)" name="Общо" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="statistics-empty-chart" role="status">
            <div className="statistics-empty-chart-bars" aria-hidden="true">
              <span style={{ height: '28%' }} />
              <span style={{ height: '48%' }} />
              <span style={{ height: '40%' }} />
              <span style={{ height: '58%' }} />
            </div>
            <p>Очакваме първите седмични резултати за избраната група.</p>
          </div>
        )}
      </div>
    </section>
  );
}
