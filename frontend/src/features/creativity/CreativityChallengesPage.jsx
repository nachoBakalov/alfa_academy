import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LoadingScreen from '../../components/ui/LoadingScreen';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../auth/AuthProvider';
import { getApiErrorMessage } from '../../utils/errorMessage';
import CreativityChallengeFormModal from './CreativityChallengeFormModal';
import CreativityChallengeList from './CreativityChallengeList';
import CreativityChallengeStatusModal from './CreativityChallengeStatusModal';
import CreativityGroupSelector from './CreativityGroupSelector';
import CreativityResultModal from './CreativityResultModal';
import CreativitySummaryCards from './CreativitySummaryCards';
import {
  CREATIVITY_STATUS_FILTER_OPTIONS,
  formatCreativityChallengeStatus,
} from './creativityLabels';
import creativityService from './creativityService';
import { getCurrentMondayDateString, isMonday } from './creativityDateUtils';

const CHALLENGES_LIMIT = 20;

function mapFriendlyError(error) {
  if (error?.response?.status === 403) {
    return 'Нямате достъп до избраната академия или група.';
  }

  if (error?.response?.status === 404) {
    return 'Някои от избраните данни не бяха намерени.';
  }

  if (error?.response?.status === 409) {
    return getApiErrorMessage(error, 'Операцията не може да бъде изпълнена в текущото състояние.');
  }

  return getApiErrorMessage(error, 'Възникна грешка. Опитайте отново.');
}

export default function CreativityChallengesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [weekStartDate, setWeekStartDate] = useState(getCurrentMondayDateString());
  const [statusFilter, setStatusFilter] = useState('');

  const [challenges, setChallenges] = useState([]);
  const [pagination, setPagination] = useState({
    limit: CHALLENGES_LIMIT,
    offset: 0,
    total: 0,
  });

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [resultChallenge, setResultChallenge] = useState(null);
  const [statusChallenge, setStatusChallenge] = useState(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [weekValidationMessage, setWeekValidationMessage] = useState('');

  const queryGroupId = searchParams.get('groupId') || '';

  const selectedGroup = useMemo(
    () => groups.find((group) => String(group.id) === String(selectedGroupId)) || null,
    [groups, selectedGroupId]
  );

  const canManage = ['super_admin', 'admin', 'manager', 'coach'].includes(user?.role);

  const canGoPrev = pagination.offset > 0;
  const canGoNext = pagination.offset + pagination.limit < pagination.total;

  const loadInitialData = useCallback(async () => {
    try {
      setIsInitialLoading(true);
      setErrorMessage('');

      const groupsResponse = await creativityService.listGroups({ isActive: true, limit: 100, offset: 0 });
      const nextGroups = groupsResponse.groups || [];

      setGroups(nextGroups);

      const hasQueryGroup = queryGroupId
        ? nextGroups.some((group) => String(group.id) === String(queryGroupId))
        : false;

      if (hasQueryGroup) {
        setSelectedGroupId(String(queryGroupId));
        return;
      }

      if (queryGroupId) {
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('groupId');
        setSearchParams(nextSearchParams, { replace: true });
      }

      if (nextGroups.length > 0) {
        setSelectedGroupId(String(nextGroups[0].id));
      }
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsInitialLoading(false);
    }
  }, [queryGroupId, searchParams, setSearchParams]);

  const loadChallenges = useCallback(async () => {
    if (!selectedGroupId) {
      setChallenges([]);
      setPagination((prev) => ({ ...prev, offset: 0, total: 0 }));
      return;
    }

    if (!isMonday(weekStartDate)) {
      setWeekValidationMessage('Началната дата на седмицата трябва да е понеделник.');
      setChallenges([]);
      return;
    }

    setWeekValidationMessage('');

    try {
      setIsLoadingChallenges(true);
      setErrorMessage('');

      const response = await creativityService.listChallenges({
        groupId: selectedGroupId,
        weekStartDate,
        status: statusFilter || undefined,
        limit: pagination.limit,
        offset: pagination.offset,
      });

      setChallenges(response.challenges || []);
      setPagination((prev) => ({
        ...prev,
        limit: response.pagination?.limit ?? prev.limit,
        offset: response.pagination?.offset ?? prev.offset,
        total: response.pagination?.total ?? 0,
      }));
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsLoadingChallenges(false);
    }
  }, [pagination.limit, pagination.offset, selectedGroupId, statusFilter, weekStartDate]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  useEffect(() => {
    if (!groups.length || !queryGroupId) {
      return;
    }

    const hasQueryGroup = groups.some((group) => String(group.id) === String(queryGroupId));

    if (hasQueryGroup && String(selectedGroupId) !== String(queryGroupId)) {
      setSelectedGroupId(String(queryGroupId));
    }
  }, [groups, queryGroupId, selectedGroupId]);

  function handleGroupChange(value) {
    const nextValue = String(value || '');
    const nextSearchParams = new URLSearchParams(searchParams);

    if (nextValue) {
      nextSearchParams.set('groupId', nextValue);
    } else {
      nextSearchParams.delete('groupId');
    }

    setSearchParams(nextSearchParams, { replace: true });
    setSelectedGroupId(nextValue);
    setPagination((prev) => ({ ...prev, offset: 0 }));
    setSuccessMessage('');
  }

  async function handleCreateChallenge(payload) {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await creativityService.createChallenge(payload);

      setIsCreateModalOpen(false);
      setSuccessMessage('Креативното предизвикателство е създадено успешно.');
      await loadChallenges();
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEditChallenge(payload) {
    if (!editingChallenge) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await creativityService.updateChallenge(editingChallenge.id, payload);

      setEditingChallenge(null);
      setSuccessMessage('Предизвикателството е обновено успешно.');
      await loadChallenges();
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveResult(payload) {
    if (!resultChallenge || !selectedGroupId) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await creativityService.saveGroupResult(resultChallenge.id, selectedGroupId, payload);

      setResultChallenge(null);
      setSuccessMessage('Алфа топките са записани успешно.');
      await loadChallenges();
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateStatus(status) {
    if (!statusChallenge) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await creativityService.updateChallengeStatus(statusChallenge.id, status);

      setStatusChallenge(null);
      setSuccessMessage('Статусът е обновен успешно.');
      await loadChallenges();
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (isInitialLoading) {
    return <LoadingScreen fullPage={false} />;
  }

  if (!groups.length) {
    return (
      <div className="page-stack">
        <PageHeader
          title="Креативност"
          description="Седмични креативни предизвикателства и Алфа топки по групи."
        />

        <Card>
          <EmptyState
            title="Няма налични групи"
            description="Добавете или активирайте група, за да стартирате креативно предизвикателство."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Креативност"
        description="Седмични креативни предизвикателства и Алфа топки по групи."
        actions={
          canManage ? (
            <div className="creativity-page-actions">
              <Button onClick={() => setIsCreateModalOpen(true)}>Ново предизвикателство</Button>
            </div>
          ) : null
        }
      />

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert type="success">{successMessage}</Alert> : null}
      {weekValidationMessage ? <Alert type="error">{weekValidationMessage}</Alert> : null}

      <Card>
        <div className="filters-grid filters-grid-wide">
          <CreativityGroupSelector
            groups={groups}
            value={selectedGroupId}
            onChange={handleGroupChange}
            disabled={isLoadingChallenges || isSaving}
          />

          <label className="form-field">
            <span className="form-label">Начало на седмица</span>
            <input
              className={`input ${weekValidationMessage ? 'input-error' : ''}`}
              type="date"
              value={weekStartDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                setWeekStartDate(nextDate);
                setPagination((prev) => ({ ...prev, offset: 0 }));
                setSuccessMessage('');
              }}
              disabled={isLoadingChallenges || isSaving}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Статус</span>
            <select
              className="input select"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPagination((prev) => ({ ...prev, offset: 0 }));
                setSuccessMessage('');
              }}
              disabled={isLoadingChallenges || isSaving}
            >
              {CREATIVITY_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="creativity-helper-note">
          Предизвикателството е общо за академията на избраната група, а Алфа топките са по групи.
        </p>
      </Card>

      <Card title="Креативни предизвикателства">
        <CreativitySummaryCards summary={challenges[0]?.resultsSummary} />

        <CreativityChallengeList
          challenges={challenges}
          isLoading={isLoadingChallenges}
          canEdit={canManage}
          canUpdateStatus={canManage}
          onEdit={setEditingChallenge}
          onOpenResult={setResultChallenge}
          onStatus={setStatusChallenge}
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
              disabled={!canGoPrev || isLoadingChallenges || isSaving}
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
              disabled={!canGoNext || isLoadingChallenges || isSaving}
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

      <CreativityChallengeFormModal
        mode="create"
        isOpen={isCreateModalOpen}
        selectedGroup={selectedGroup}
        weekStartDate={weekStartDate}
        isSaving={isSaving}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateChallenge}
      />

      <CreativityChallengeFormModal
        mode="edit"
        isOpen={Boolean(editingChallenge)}
        selectedGroup={selectedGroup}
        weekStartDate={editingChallenge?.startsOn || weekStartDate}
        initialValues={editingChallenge}
        isSaving={isSaving}
        onClose={() => setEditingChallenge(null)}
        onSubmit={handleEditChallenge}
      />

      <CreativityResultModal
        isOpen={Boolean(resultChallenge)}
        selectedGroup={selectedGroup}
        initialValues={resultChallenge?.groupResult}
        isSaving={isSaving}
        onClose={() => setResultChallenge(null)}
        onSubmit={handleSaveResult}
      />

      <CreativityChallengeStatusModal
        isOpen={Boolean(statusChallenge)}
        currentStatus={statusChallenge?.status}
        isSaving={isSaving}
        onClose={() => setStatusChallenge(null)}
        onSubmit={handleUpdateStatus}
      />

      {statusChallenge ? (
        <Alert type="info">
          Променяте статуса на: {statusChallenge.title} ({formatCreativityChallengeStatus(statusChallenge.status)}).
        </Alert>
      ) : null}
    </div>
  );
}
