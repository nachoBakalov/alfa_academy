import Card from '../../components/ui/Card';
import StatusPill from '../../components/ui/StatusPill';
import { formatDate, formatAlphaBalls, formatNumber } from './reportFormatters';

export default function SocialStatsCard({ social }) {
  const reached = Number(social?.targetReachedGroups || 0);
  const needsEncouragement = Number(social?.targetNotReachedGroups || 0);

  return (
    <Card title="Социално поведение">
      <div className="report-stat-list">
        <div className="report-stat-item">
          <span>Начало на седмица</span>
          <strong>{formatDate(social?.weekStartDate)}</strong>
        </div>
        <div className="report-stat-item">
          <span>Алфа топки</span>
          <strong>{formatAlphaBalls(social?.averageAlphaBalls)}</strong>
        </div>
        <div className="report-stat-item">
          <span>Групи със седмично обобщение</span>
          <strong>{formatNumber(social?.groupsWithWeeklySummary)}</strong>
        </div>
      </div>

      <div className="report-status-row">
        <StatusPill label={`Таргет постигнат: ${reached}`} tone="success" />
        <StatusPill label={`Нужда от насърчаване: ${needsEncouragement}`} tone="warning" />
      </div>
    </Card>
  );
}
