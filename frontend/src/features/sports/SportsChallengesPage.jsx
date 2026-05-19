import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LoadingScreen from '../../components/ui/LoadingScreen';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../auth/AuthProvider';
import { getApiErrorMessage } from '../../utils/errorMessage';
import SportsChallengeFormModal from './SportsChallengeFormModal';
import SportsChallengeList from './SportsChallengeList';
import SportsChallengeStatusModal from './SportsChallengeStatusModal';
import SportsDefinitionsModal from './SportsDefinitionsModal';
import SportsGroupSelector from './SportsGroupSelector';
import { CHALLENGE_STATUS_FILTER_OPTIONS } from './sportsLabels';
import sportsService from './sportsService';

const CHALLENGES_LIMIT = 20;

function mapFriendlyError(error) {
  if (error?.response?.status === 403) {
    return 'Нямате достъп до спортните предизвикателства за тази група.';
  }

  if (error?.response?.status === 404) {
    return 'Не открихме търсения ресурс. Проверете избраната група.';
  }

  if (error?.response?.status === 409) {
    return getApiErrorMessage(error, 'Операцията не може да бъде изпълнена в текущото състояние.');
  }

  return getApiErrorMessage(error, 'Възникна грешка. Опитайте отново.');
}

export default function SportsChallengesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const canManageSports = ['super_admin', 'admin', 'coach'].includes(user?.role);
  const canManageDefinitions = ['super_admin', 'admin', 'manager', 'coach'].includes(user?.role);
  const isManager = user?.role === 'manager';

  const [groups, setGroups] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const queryGroupId = searchParams.get('groupId') || '';
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
  const [isDefinitionsModalOpen, setIsDefinitionsModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [statusChallenge, setStatusChallenge] = useState(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const activeDefinitions = useMemo(
    () => (definitions || []).filter((definition) => definition.isActive),
    [definitions]
  );

  const loadDefinitions = useCallback(async () => {
    const definitionsResponse = await sportsService.listDefinitions();
    setDefinitions(definitionsResponse.definitions || []);
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setIsInitialLoading(true);
      setErrorMessage('');

      const [groupsResponse, definitionsResponse] = await Promise.all([
        sportsService.listGroups({ isActive: true, limit: 100, offset: 0 }),
        sportsService.listDefinitions(),
      ]);

      const nextGroups = groupsResponse.groups || [];
      setGroups(nextGroups);
      setDefinitions(definitionsResponse.definitions || []);

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

      if (!selectedGroupId && nextGroups.length > 0) {
        setSelectedGroupId(String(nextGroups[0].id));
      }
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsInitialLoading(false);
    }
  }, [queryGroupId, searchParams, selectedGroupId, setSearchParams]);

  const handleDefinitionsChanged = useCallback(async () => {
    try {
      setErrorMessage('');
      await loadDefinitions();
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    }
  }, [loadDefinitions]);

  useEffect(() => {
    if (!groups.length || !queryGroupId) {
      return;
    }

    const hasQueryGroup = groups.some((group) => String(group.id) === String(queryGroupId));

    if (hasQueryGroup && String(selectedGroupId) !== String(queryGroupId)) {
      setSelectedGroupId(String(queryGroupId));
    }
  }, [groups, queryGroupId, selectedGroupId]);

  const loadChallenges = useCallback(async () => {
    if (!selectedGroupId) {
      setChallenges([]);
      setPagination((prev) => ({
        ...prev,
        offset: 0,
        total: 0,
      }));
      return;
    }

    try {
      setIsLoadingChallenges(true);
      setErrorMessage('');

      const response = await sportsService.listGroupChallenges(selectedGroupId, {
        status: statusFilter || undefined,
        limit: pagination.limit,
        offset: pagination.offset,
      });

      setChallenges(response.challenges);
      setPagination((prev) => ({
        limit: response.pagination?.limit ?? prev.limit,
        offset: response.pagination?.offset ?? prev.offset,
        total: response.pagination?.total ?? 0,
      }));
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsLoadingChallenges(false);
    }
  }, [pagination.limit, pagination.offset, selectedGroupId, statusFilter]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

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

  const canGoPrev = pagination.offset > 0;
  const canGoNext = pagination.offset + pagination.limit < pagination.total;

  async function handleCreateChallenge(payload) {
    if (!canManageSports || !selectedGroupId) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await sportsService.createGroupChallenge(selectedGroupId, payload);

      setIsCreateModalOpen(false);
      setSuccessMessage('Предизвикателството е създадено успешно.');
      await loadChallenges();
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEditChallenge(payload) {
    if (!canManageSports || !editingChallenge) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await sportsService.updateChallenge(editingChallenge.id, payload);

      setEditingChallenge(null);
      setSuccessMessage('Предизвикателството е обновено успешно.');
      await loadChallenges();
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateStatus(status) {
    if (!canManageSports || !statusChallenge) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await sportsService.updateChallengeStatus(statusChallenge.id, status);

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
          title="Спортни предизвикателства"
          description="Планиране и проследяване на спортните резултати по групи."
          actions={
            canManageDefinitions ? (
              <div className="sports-page-actions">
                <Button variant="secondary" onClick={() => setIsDefinitionsModalOpen(true)}>
                  Типове предизвикателства
                </Button>
              </div>
            ) : null
          }
        />
        <Card>
          <EmptyState
            title="Няма налични групи"
            description="Добавете или активирайте група, за да стартирате спортно предизвикателство."
          />
        </Card>

        {canManageDefinitions ? (
          <SportsDefinitionsModal
            isOpen={isDefinitionsModalOpen}
            definitions={definitions}
            userRole={user?.role}
            isLoading={isInitialLoading}
            onClose={() => setIsDefinitionsModalOpen(false)}
            onChanged={handleDefinitionsChanged}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Спортни предизвикателства"
        description="Планиране и проследяване на спортните резултати по групи."
        actions={
          <div className="sports-page-actions">
            {canManageDefinitions ? (
              <Button variant="secondary" onClick={() => setIsDefinitionsModalOpen(true)}>
                Типове предизвикателства
              </Button>
            ) : null}
            {canManageSports ? (
              <Button onClick={() => setIsCreateModalOpen(true)}>Ново предизвикателство</Button>
            ) : null}
          </div>
        }
      />

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert type="success">{successMessage}</Alert> : null}
      {isManager ? (
        <Alert type="info">
          Режим преглед: само супер админ, админ и треньор могат да създават и редактират спортни
          предизвикателства.
        </Alert>
      ) : null}

      <Card>
        <div className="filters-grid filters-grid-wide">
          <SportsGroupSelector
            groups={groups}
            value={selectedGroupId}
            onChange={handleGroupChange}
            disabled={isLoadingChallenges || isSaving}
          />

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
              {CHALLENGE_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card title="Предизвикателства">
        <SportsChallengeList
          challenges={challenges}
          isLoading={isLoadingChallenges}
          canManage={canManageSports}
          onOpen={(challenge) => navigate(`/sports/challenges/${challenge.id}`)}
          onEdit={(challenge) => setEditingChallenge(challenge)}
          onStatus={(challenge) => setStatusChallenge(challenge)}
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

      {canManageSports ? (
        <SportsChallengeFormModal
          mode="create"
          isOpen={isCreateModalOpen}
          definitions={activeDefinitions}
          isSaving={isSaving}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateChallenge}
        />
      ) : null}

      {canManageSports ? (
        <SportsChallengeFormModal
          mode="edit"
          isOpen={Boolean(editingChallenge)}
          definitions={activeDefinitions}
          initialValues={
            editingChallenge
              ? {
                  title: editingChallenge.title,
                  description: editingChallenge.description,
                  startsOn: editingChallenge.startsOn,
                  endsOn: editingChallenge.endsOn,
                  targetReductionPercent: editingChallenge.targetReductionPercent,
                  failSafeThresholdPercent: editingChallenge.failSafeThresholdPercent,
                }
              : null
          }
          isSaving={isSaving}
          onClose={() => setEditingChallenge(null)}
          onSubmit={handleEditChallenge}
        />
      ) : null}

      {canManageSports ? (
        <SportsChallengeStatusModal
          isOpen={Boolean(statusChallenge)}
          currentStatus={statusChallenge?.status}
          isSaving={isSaving}
          onClose={() => setStatusChallenge(null)}
          onSubmit={handleUpdateStatus}
        />
      ) : null}

      {canManageDefinitions ? (
        <SportsDefinitionsModal
          isOpen={isDefinitionsModalOpen}
          definitions={definitions}
          userRole={user?.role}
          isLoading={isInitialLoading}
          onClose={() => setIsDefinitionsModalOpen(false)}
          onChanged={handleDefinitionsChanged}
        />
      ) : null}
    </div>
  );
}
