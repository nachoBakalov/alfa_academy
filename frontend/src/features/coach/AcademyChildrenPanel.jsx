import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import StatusPill from '../../components/ui/StatusPill';
import coachWorkspaceService from './coachWorkspaceService';
import { getApiErrorMessage } from '../../utils/errorMessage';

const LIMIT = 20;

function getQuestionnaireTone(status) {
  if (status === 'submitted') {
    return 'success';
  }

  if (status === 'pending') {
    return 'warning';
  }

  if (status === 'expired') {
    return 'neutral';
  }

  return 'neutral';
}

function getQuestionnaireLabel(status) {
  if (status === 'submitted') {
    return 'Попълнен';
  }

  if (status === 'pending') {
    return 'Очаква попълване';
  }

  if (status === 'expired') {
    return 'Изтекъл';
  }

  return 'Няма данни';
}

export default function AcademyChildrenPanel({ academyId, coachId }) {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [pagination, setPagination] = useState({ limit: LIMIT, offset: 0, total: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadChildren = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await coachWorkspaceService.getAcademyChildren({
        academyId: academyId || undefined,
        coachId: coachId || undefined,
        search: search.trim() || undefined,
        limit: LIMIT,
        offset: pagination.offset,
      });

      setChildren(response.children);
      setPagination(response.pagination);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setChildren([]);
    } finally {
      setIsLoading(false);
    }
  }, [academyId, coachId, pagination.offset, search]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const columns = useMemo(
    () => [
      {
        key: 'child',
        header: 'Дете',
        render: (row) => `${row.firstName} ${row.lastName}`,
      },
      {
        key: 'academy',
        header: 'Академия',
        render: (row) => row.academy?.name || '-',
      },
      {
        key: 'group',
        header: 'Текуща група',
        render: (row) => row.currentGroup?.name || '-',
      },
      {
        key: 'questionnaire',
        header: 'Въпросник',
        render: (row) => (
          <StatusPill
            label={getQuestionnaireLabel(row.questionnaire?.status)}
            tone={getQuestionnaireTone(row.questionnaire?.status)}
          />
        ),
      },
      {
        key: 'status',
        header: 'Статус',
        render: (row) => (
          <StatusPill label={row.isActive ? 'Активно дете' : 'Неактивно дете'} tone={row.isActive ? 'success' : 'neutral'} />
        ),
      },
      {
        key: 'actions',
        header: 'Действия',
        render: (row) => (
          <Button size="sm" variant="ghost" onClick={() => navigate(`/children/${row.id}/profile`)}>
            Профил
          </Button>
        ),
      },
    ],
    [navigate]
  );

  const canGoPrev = pagination.offset > 0;
  const canGoNext = pagination.offset + pagination.limit < pagination.total;

  return (
    <Card title="Деца в академичния обхват">
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className="coach-panel-filters">
        <Input
          label="Търсене"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPagination((prev) => ({ ...prev, offset: 0 }));
          }}
          placeholder="Име на дете"
        />
      </div>

      <DataTable
        columns={columns}
        rows={children}
        isLoading={isLoading}
        emptyTitle="Няма деца в този обхват"
        emptyDescription="Когато има деца в назначените академии, ще ги видите тук."
      />

      <div className="pagination-row">
        <span>
          Показани: {Math.min(pagination.offset + 1, pagination.total || 0)}-
          {Math.min(pagination.offset + pagination.limit, pagination.total)} от {pagination.total}
        </span>
        <div className="pagination-actions">
          <Button
            variant="secondary"
            size="sm"
            disabled={!canGoPrev || isLoading}
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                offset: Math.max(0, prev.offset - prev.limit),
              }))
            }
          >
            Назад
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!canGoNext || isLoading}
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                offset: prev.offset + prev.limit,
              }))
            }
          >
            Напред
          </Button>
        </div>
      </div>
    </Card>
  );
}
