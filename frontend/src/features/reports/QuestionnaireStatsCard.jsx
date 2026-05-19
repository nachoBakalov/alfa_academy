import Card from '../../components/ui/Card';
import { formatNumber } from './reportFormatters';

function Item({ label, value }) {
  return (
    <div className="report-stat-item">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}

export default function QuestionnaireStatsCard({ stats, title = 'Въпросници' }) {
  return (
    <Card title={title}>
      <div className="report-stat-list">
        <Item label="Очаква попълване" value={stats?.pending} />
        <Item label="Попълнени" value={stats?.submitted} />
        <Item label="Изтекли" value={stats?.expired} />
        <Item label="Отменени" value={stats?.revoked} />
        <Item label="Изтичат скоро" value={stats?.expiringSoon} />
      </div>
    </Card>
  );
}
