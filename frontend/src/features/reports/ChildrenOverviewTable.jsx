import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import StatusPill from '../../components/ui/StatusPill';
import {
  formatComfortZoneProfileStatus,
  formatQuestionnaireOverviewStatus,
  formatSocialDailyStatus,
  getComfortZoneProfileTone,
  getQuestionnaireTone,
  getSocialDailyTone,
} from './reportLabels';
import { formatDate } from './reportFormatters';

export default function ChildrenOverviewTable({
  children = [],
  pagination,
  onPrev,
  onNext,
  isLoading,
  onOpenProfile,
}) {
  const columns = [
    {
      key: 'child',
      header: 'Дете',
      render: (row) => (
        <strong>
          {row.firstName} {row.lastName}
        </strong>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      render: (row) => (
        <StatusPill
          label={row.isActive ? 'Активно дете' : 'Неактивно дете'}
          tone={row.isActive ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'questionnaire',
      header: 'Въпросник',
      render: (row) => (
        <StatusPill
          label={formatQuestionnaireOverviewStatus(row.questionnaire?.status)}
          tone={getQuestionnaireTone(row.questionnaire?.status)}
        />
      ),
    },
    {
      key: 'comfortZone',
      header: 'Комфортна зона',
      render: (row) => (
        <StatusPill
          label={formatComfortZoneProfileStatus(row.comfortZone?.hasProfile)}
          tone={getComfortZoneProfileTone(row.comfortZone?.hasProfile)}
        />
      ),
    },
    {
      key: 'social',
      header: 'Последна социална оценка',
      render: (row) => (
        <div className="cell-stack">
          <StatusPill
            label={formatSocialDailyStatus(row.social?.latestDailyStatus)}
            tone={getSocialDailyTone(row.social?.latestDailyStatus)}
          />
          <span className="muted-text">Дата: {formatDate(row.social?.latestEvaluationDate)}</span>
        </div>
      ),
    },
    {
      key: 'sports',
      header: 'Спорт',
      render: (row) => (
        <div className="cell-stack">
          <span>Активни: {row.sports?.activeChallengesCount ?? 0}</span>
          <span className="muted-text">Завършени резултати: {row.sports?.completedResultsCount ?? 0}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (row) => (
        <div className="table-actions">
          <Button size="sm" variant="secondary" onClick={() => onOpenProfile?.(row)}>
            Профил
          </Button>
        </div>
      ),
    },
  ];

  const safePagination = pagination || { limit: 50, offset: 0, total: 0 };
  const canGoPrev = safePagination.offset > 0;
  const canGoNext = safePagination.offset + safePagination.limit < safePagination.total;

  return (
    <div className="page-stack">
      <DataTable
        columns={columns}
        rows={children}
        isLoading={isLoading}
        emptyTitle="Няма налични деца"
        emptyDescription="Добавете деца към групата, за да видите обобщение тук."
      />

      <div className="pagination-row">
        <span>
          Показани: {Math.min(safePagination.offset + 1, safePagination.total || 0)}-
          {Math.min(safePagination.offset + safePagination.limit, safePagination.total)} от {safePagination.total}
        </span>

        <div className="pagination-actions">
          <Button variant="secondary" size="sm" disabled={!canGoPrev || isLoading} onClick={onPrev}>
            Назад
          </Button>
          <Button variant="secondary" size="sm" disabled={!canGoNext || isLoading} onClick={onNext}>
            Напред
          </Button>
        </div>
      </div>
    </div>
  );
}
