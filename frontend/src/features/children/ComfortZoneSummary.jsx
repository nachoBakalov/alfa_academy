import Card from '../../components/ui/Card';
import StatusPill from '../../components/ui/StatusPill';
import { formatDate } from '../../utils/formatters';

function getCompletedByLabel(type) {
  if (type === 'parent') {
    return 'Родител';
  }

  if (type === 'guardian') {
    return 'Настойник';
  }

  return 'Попълнил';
}

export default function ComfortZoneSummary({ comfortZone }) {
  if (!comfortZone?.hasProfile) {
    return null;
  }

  return (
    <Card title="Комфортна зона - обобщение">
      <div className="comfort-summary-header">
        <StatusPill label="Профилът е готов" tone="success" />
        <span className="muted-text">Попълнен на: {formatDate(comfortZone.completedAt)}</span>
      </div>

      <div className="comfort-completed-by">
        <span className="meta-label">{getCompletedByLabel(comfortZone.completedByType)}</span>
        <strong>{comfortZone.completedByName || '-'}</strong>
      </div>

      <div className="comfort-summary-grid">
        <div className="comfort-stat comfort-stat-green">
          <span>Комфортна зона</span>
          <strong>{comfortZone.summary.greenCount}</strong>
        </div>
        <div className="comfort-stat comfort-stat-yellow">
          <span>Зона на развитие</span>
          <strong>{comfortZone.summary.yellowCount}</strong>
        </div>
        <div className="comfort-stat comfort-stat-red">
          <span>Нужда от подкрепа</span>
          <strong>{comfortZone.summary.redCount}</strong>
        </div>
        <div className="comfort-stat comfort-stat-info">
          <span>Поведенчески индикатор</span>
          <strong>{comfortZone.summary.behaviorIndicatorCount}</strong>
        </div>
        <div className="comfort-stat comfort-stat-neutral">
          <span>Информация</span>
          <strong>{comfortZone.summary.neutralCount}</strong>
        </div>
      </div>
    </Card>
  );
}
