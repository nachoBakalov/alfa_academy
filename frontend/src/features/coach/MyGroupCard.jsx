import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

function formatShortDate(value) {
  return value ? String(value).slice(0, 10) : '-';
}

function formatLatestSocial(latestSocial) {
  if (!latestSocial) {
    return 'Няма въведени дневни резултати';
  }

  return `${formatShortDate(latestSocial.date)}: ${latestSocial.dailySocialResult}/${latestSocial.externalDailyMaximum}`;
}

function formatWeekly(weeklySocial) {
  if (!weeklySocial) {
    return 'Няма седмично обобщение';
  }

  const statusLabel =
    weeklySocial.weeklyStatus === 'target_reached'
      ? 'Таргет постигнат'
      : weeklySocial.weeklyStatus === 'target_not_reached'
      ? 'Нужда от насърчаване'
      : '-';

  return `${formatShortDate(weeklySocial.weekStartDate)}: ${weeklySocial.weeklyAlphaBalls} алфа · ${statusLabel}`;
}

export default function MyGroupCard({
  group,
  academyName,
  canOpenManage,
  isSelected = false,
  onSelect,
}) {
  const navigate = useNavigate();

  return (
    <Card className={`my-group-card ${isSelected ? 'my-group-card-selected' : ''}`}>
      <div className="my-group-card-header">
        <div>
          <h3>{group.name}</h3>
          <p>{academyName}</p>
        </div>
        <div className="my-group-card-badges">
          {isSelected ? <Badge tone="info">Избрана</Badge> : null}
          {group.isPrimary ? <Badge tone="success">Основна група</Badge> : null}
          <Badge tone={group.isActive ? 'success' : 'neutral'}>
            {group.isActive ? 'Активна група' : 'Неактивна група'}
          </Badge>
        </div>
      </div>

      <div className="my-group-metrics">
        <div className="my-group-metric">
          <span>Деца</span>
          <strong>{group.childrenCount}</strong>
        </div>
        <div className="my-group-metric">
          <span>Очаква въпросник</span>
          <strong>{group.pendingQuestionnairesCount}</strong>
        </div>
        <div className="my-group-metric">
          <span>Активни спортни предизвикателства</span>
          <strong>{group.activeSportsChallengesCount}</strong>
        </div>
      </div>

      <div className="my-group-insights">
        <p>
          <strong>Последен дневен резултат:</strong> {formatLatestSocial(group.latestSocial)}
        </p>
        <p>
          <strong>Седмични алфа топки:</strong> {formatWeekly(group.weeklySocial)}
        </p>
      </div>

      <div className="my-group-actions no-print">
        {onSelect ? (
          <Button variant={isSelected ? 'primary' : 'secondary'} onClick={() => onSelect(group.id)}>
            {isSelected ? 'Избрана група' : 'Избери група'}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => navigate(`/children?groupId=${group.id}`)}>
          Деца
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/social/daily?groupId=${group.id}`)}>
          Дневна оценка
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/social/weekly?groupId=${group.id}`)}>
          Седмичен резултат
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/creativity?groupId=${group.id}`)}>
          Креативност
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/sports?groupId=${group.id}`)}>
          Спорт
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/reports?groupId=${group.id}`)}>
          Справки
        </Button>
        {canOpenManage ? (
          <Button variant="ghost" onClick={() => navigate(`/groups/${group.id}/manage`)}>
            Управление на група
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
