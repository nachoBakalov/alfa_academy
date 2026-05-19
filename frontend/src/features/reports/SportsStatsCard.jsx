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

export default function SportsStatsCard({ sports }) {
  return (
    <Card title="Спортни предизвикателства">
      <div className="report-stat-list">
        <Item label="Активни предизвикателства" value={sports?.activeChallenges} />
        <Item label="Завършени" value={sports?.completedChallenges} />
        <Item label="Целта е постигната" value={sports?.passedChallenges} />
        <Item label="Нужни още опити" value={sports?.notPassedChallenges} />
      </div>
    </Card>
  );
}
