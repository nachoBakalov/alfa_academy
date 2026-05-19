import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { formatDate } from './socialDateUtils';

const DAY_LABELS_BG = {
  Monday: 'Понеделник',
  Tuesday: 'Вторник',
  Wednesday: 'Сряда',
  Thursday: 'Четвъртък',
  Friday: 'Петък',
  Saturday: 'Събота',
  Sunday: 'Неделя',
};

function formatDayLabel(label) {
  return DAY_LABELS_BG[label] || label || '-';
}

function StatusCell({ day }) {
  if (!day.isActiveDay) {
    return <Badge tone="neutral">Неактивен</Badge>;
  }

  return (
    <div className="social-status-stack">
      <Badge tone="success">Успешен: {day.greenChildrenCount}</Badge>
      <Badge tone="warning">Насочване: {day.orangeChildrenCount}</Badge>
      <Badge tone="danger">Внимание: {day.redChildrenCount}</Badge>
    </div>
  );
}

export default function WeeklyBreakdownTable({ days = [] }) {
  return (
    <Card title="Дневна разбивка">
      <div className="table-wrapper">
        <table className="data-table social-breakdown-table">
          <thead>
            <tr>
              <th>Ден</th>
              <th>Дата</th>
              <th>Активен ден</th>
              <th>Деца</th>
              <th>Попълнени</th>
              <th>Непопълнени</th>
              <th>Дневен резултат</th>
              <th>Статуси</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date} className={day.isActiveDay ? '' : 'social-muted-row'}>
                <td>{formatDayLabel(day.label)}</td>
                <td>{formatDate(day.date)}</td>
                <td>{day.isActiveDay ? 'Да' : 'Не'}</td>
                <td>{day.numberOfChildren}</td>
                <td>{day.completedChildrenCount}</td>
                <td>{day.missingChildrenCount}</td>
                <td>
                  {day.isActiveDay
                    ? `${day.dailySocialResult} / ${day.externalDailyMaximum}`
                    : '0 / 0'}
                </td>
                <td>
                  <StatusCell day={day} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-table-cards">
        {days.map((day) => (
          <article className="mobile-table-card" key={day.date}>
            <div className="mobile-table-row">
              <span className="mobile-table-label">Ден</span>
              <div className="mobile-table-value">{formatDayLabel(day.label)}</div>
            </div>
            <div className="mobile-table-row">
              <span className="mobile-table-label">Дата</span>
              <div className="mobile-table-value">{formatDate(day.date)}</div>
            </div>
            <div className="mobile-table-row">
              <span className="mobile-table-label">Активен ден</span>
              <div className="mobile-table-value">{day.isActiveDay ? 'Да' : 'Не'}</div>
            </div>
            <div className="mobile-table-row">
              <span className="mobile-table-label">Деца</span>
              <div className="mobile-table-value">{day.numberOfChildren}</div>
            </div>
            <div className="mobile-table-row">
              <span className="mobile-table-label">Попълнени</span>
              <div className="mobile-table-value">{day.completedChildrenCount}</div>
            </div>
            <div className="mobile-table-row">
              <span className="mobile-table-label">Непопълнени</span>
              <div className="mobile-table-value">{day.missingChildrenCount}</div>
            </div>
            <div className="mobile-table-row">
              <span className="mobile-table-label">Дневен резултат</span>
              <div className="mobile-table-value">
                {day.isActiveDay ? `${day.dailySocialResult} / ${day.externalDailyMaximum}` : '0 / 0'}
              </div>
            </div>
            <div className="mobile-table-row">
              <span className="mobile-table-label">Статуси</span>
              <div className="mobile-table-value">
                <StatusCell day={day} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
