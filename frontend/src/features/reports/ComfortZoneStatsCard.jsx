import Card from '../../components/ui/Card';
import { formatNumber, formatPercent } from './reportFormatters';

export default function ComfortZoneStatsCard({ stats, title = 'Профили Комфортна зона' }) {
  return (
    <Card title={title}>
      <div className="report-stat-list">
        <div className="report-stat-item">
          <span>Деца с профил</span>
          <strong>{formatNumber(stats?.childrenWithProfile)}</strong>
        </div>
        <div className="report-stat-item">
          <span>Деца без профил</span>
          <strong>{formatNumber(stats?.childrenWithoutProfile)}</strong>
        </div>
        <div className="report-stat-item report-stat-item-highlight">
          <span>Попълване</span>
          <strong>{formatPercent(stats?.profileCompletionPercentage)}</strong>
        </div>
      </div>
    </Card>
  );
}
