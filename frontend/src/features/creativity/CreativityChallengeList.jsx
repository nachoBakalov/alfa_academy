import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import StatusPill from '../../components/ui/StatusPill';
import {
  formatAlphaBalls,
  formatCreativityChallengeStatus,
  formatCreativityTargetStatus,
  getCreativityChallengeStatusTone,
  getCreativityTargetStatusTone,
} from './creativityLabels';
import { formatDateRange } from './creativityDateUtils';

function formatSummary(summary) {
  if (!summary) {
    return '-';
  }

  return `${summary.completedGroupsCount}/${summary.groupsCount} попълнени · средно ${Number(
    summary.averageAlphaBalls || 0
  ).toFixed(2)}`;
}

export default function CreativityChallengeList({
  challenges = [],
  isLoading,
  canEdit,
  canUpdateStatus,
  onEdit,
  onOpenResult,
  onStatus,
}) {
  const columns = [
    {
      key: 'title',
      header: 'Заглавие',
      render: (row) => (
        <div className="cell-stack">
          <strong>{row.title}</strong>
          <span className="muted-text">{row.description || 'Без описание'}</span>
        </div>
      ),
    },
    {
      key: 'activityType',
      header: 'Вид активност',
      render: (row) => row.activityType || '-',
    },
    {
      key: 'period',
      header: 'Период',
      render: (row) => formatDateRange(row.startsOn, row.endsOn),
    },
    {
      key: 'alphaBalls',
      header: 'Алфа топки',
      render: (row) => formatAlphaBalls(row.groupResult?.alphaBalls),
    },
    {
      key: 'groupResult',
      header: 'Групов резултат',
      render: (row) => (
        <StatusPill
          label={formatCreativityTargetStatus(row.groupResult?.targetStatus)}
          tone={getCreativityTargetStatusTone(row.groupResult?.targetStatus)}
        />
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      render: (row) => (
        <StatusPill
          label={formatCreativityChallengeStatus(row.status)}
          tone={getCreativityChallengeStatusTone(row.status)}
        />
      ),
    },
    {
      key: 'summary',
      header: 'Обобщение',
      render: (row) => formatSummary(row.resultsSummary),
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (row) => (
        <div className="table-actions">
          <Button size="sm" variant="secondary" onClick={() => onOpenResult(row)}>
            Алфа топки
          </Button>
          {canEdit ? (
            <Button size="sm" variant="ghost" onClick={() => onEdit(row)}>
              Редакция
            </Button>
          ) : null}
          {canUpdateStatus ? (
            <Button size="sm" variant="ghost" onClick={() => onStatus(row)}>
              Статус
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={challenges}
      isLoading={isLoading}
      emptyTitle="Няма креативни предизвикателства"
      emptyDescription="Създайте първото седмично креативно предизвикателство за академията."
    />
  );
}
