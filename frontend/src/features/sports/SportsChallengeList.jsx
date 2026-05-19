import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import StatusPill from '../../components/ui/StatusPill';
import {
  formatChallengeStatus,
  formatFinalStatus,
  getChallengeStatusTone,
  getFinalStatusTone,
} from './sportsLabels';
import { formatDateRange } from './sportsFormatters';

export default function SportsChallengeList({
  challenges = [],
  isLoading,
  canManage,
  onOpen,
  onEdit,
  onStatus,
}) {
  const columns = [
    {
      key: 'title',
      header: 'Заглавие',
      render: (row) => (
        <div className="cell-stack">
          <strong>{row.title}</strong>
          <span className="muted-text">{row.definition?.name || '-'}</span>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Период',
      render: (row) => formatDateRange(row.startsOn, row.endsOn),
    },
    {
      key: 'status',
      header: 'Статус',
      render: (row) => (
        <StatusPill
          label={formatChallengeStatus(row.status)}
          tone={getChallengeStatusTone(row.status)}
        />
      ),
    },
    {
      key: 'participants',
      header: 'Участници',
      render: (row) => row.summary?.participantsCount ?? 0,
    },
    {
      key: 'finalResults',
      header: 'Финални резултати',
      render: (row) => row.summary?.finalResultsCount ?? 0,
    },
    {
      key: 'groupStatus',
      header: 'Групов статус',
      render: (row) => (
        <StatusPill
          label={formatFinalStatus(row.summary?.finalStatus)}
          tone={getFinalStatusTone(row.summary?.finalStatus)}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (row) => (
        <div className="table-actions">
          <Button size="sm" variant="secondary" onClick={() => onOpen(row)}>
            Отвори
          </Button>
          {canManage ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => onEdit(row)}>
                Редактирай
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onStatus(row)}>
                Статус
              </Button>
            </>
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
      emptyTitle="Няма предизвикателства"
      emptyDescription="Създайте първо спортно предизвикателство за групата."
    />
  );
}
