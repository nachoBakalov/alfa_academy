import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import LoadingScreen from '../../components/ui/LoadingScreen';
import Select from '../../components/ui/Select';
import coachWorkspaceService from './coachWorkspaceService';
import groupService from '../groups/groupService';
import GroupComfortZoneOverviewPanel from './GroupComfortZoneOverviewPanel';
import MyGroupCard from './MyGroupCard';
import { useAuth } from '../auth/AuthProvider';
import { getApiErrorMessage } from '../../utils/errorMessage';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Активни групи' },
  { value: 'inactive', label: 'Неактивни групи' },
];

function mapStatusFilter(value) {
  if (value === 'active') {
    return true;
  }

  if (value === 'inactive') {
    return false;
  }

  return undefined;
}

function resolveSelectedGroupId(groups, { requestedGroupId, currentSelectedGroupId } = {}) {
  const normalizedGroups = Array.isArray(groups) ? groups : [];

  const findById = (id) =>
    normalizedGroups.find((group) => Number(group.id) === Number(id)) || null;

  if (requestedGroupId && findById(requestedGroupId)) {
    return String(requestedGroupId);
  }

  if (currentSelectedGroupId && findById(currentSelectedGroupId)) {
    return String(currentSelectedGroupId);
  }

  const activeGroups = normalizedGroups.filter((group) => group.isActive);

  if (activeGroups.length === 1) {
    return String(activeGroups[0].id);
  }

  if (activeGroups.length > 1) {
    const primaryGroup = activeGroups.find((group) => group.isPrimary);
    return String((primaryGroup || activeGroups[0]).id);
  }

  return normalizedGroups[0] ? String(normalizedGroups[0].id) : '';
}

export default function MyGroupsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isCoachUser = user?.role === 'coach';

  const queryCoachId = searchParams.get('coachId') || '';
  const queryGroupId = searchParams.get('groupId') || '';

  const [workspace, setWorkspace] = useState({
    coach: null,
    selectedAcademy: null,
    availableAcademies: [],
    selectedSeason: null,
    availableSeasons: [],
    academies: [],
  });
  const [coachOptions, setCoachOptions] = useState([]);
  const [selectedCoachId, setSelectedCoachId] = useState(queryCoachId);
  const [selectedAcademyId, setSelectedAcademyId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(queryGroupId);
  const [selectedComfortCategory, setSelectedComfortCategory] = useState('creativity');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setSelectedCoachId(queryCoachId);
  }, [queryCoachId]);

  useEffect(() => {
    setSelectedGroupId(queryGroupId);
  }, [queryGroupId]);

  const loadCoachDirectory = useCallback(async () => {
    if (isCoachUser) {
      setCoachOptions([]);
      return;
    }

    try {
      const response = await groupService.listCoachDirectory({
        limit: 100,
        offset: 0,
      });

      setCoachOptions(
        (response.coaches || []).map((coach) => ({
          value: String(coach.id),
          label: `${coach.firstName} ${coach.lastName} (${coach.email})`,
        }))
      );
    } catch (_error) {
      setCoachOptions([]);
    }
  }, [isCoachUser]);

  useEffect(() => {
    loadCoachDirectory();
  }, [loadCoachDirectory]);

  const loadWorkspace = useCallback(async () => {
    if (!isCoachUser && !selectedCoachId) {
      setWorkspace({
        coach: null,
        selectedAcademy: null,
        availableAcademies: [],
        selectedSeason: null,
        availableSeasons: [],
        academies: [],
      });
      setErrorMessage('');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await coachWorkspaceService.getMyGroups({
        academyId: selectedAcademyId || undefined,
        isActive: mapStatusFilter(statusFilter),
        coachId: !isCoachUser && selectedCoachId ? Number(selectedCoachId) : undefined,
      });

      setWorkspace(response);

      if (!selectedAcademyId && response.selectedAcademy?.id) {
        setSelectedAcademyId(String(response.selectedAcademy.id));
      }
    } catch (error) {
      setWorkspace({
        coach: null,
        selectedAcademy: null,
        availableAcademies: [],
        selectedSeason: null,
        availableSeasons: [],
        academies: [],
      });
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [isCoachUser, selectedAcademyId, selectedCoachId, statusFilter]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  function handleCoachChange(event) {
    const value = event.target.value;
    setSelectedCoachId(value);
    setSelectedAcademyId('');
    setSelectedGroupId('');

    const nextSearchParams = new URLSearchParams(searchParams);

    if (value) {
      nextSearchParams.set('coachId', value);
    } else {
      nextSearchParams.delete('coachId');
    }

    nextSearchParams.delete('groupId');

    setSearchParams(nextSearchParams, { replace: true });
  }

  const academyOptions = useMemo(
    () =>
      (workspace.availableAcademies || []).map((academy) => ({
        value: String(academy.id),
        label: academy.name,
      })),
    [workspace.availableAcademies]
  );

  const totalGroups = useMemo(
    () => workspace.academies.reduce((sum, academy) => sum + academy.groups.length, 0),
    [workspace.academies]
  );

  const allGroups = useMemo(
    () =>
      workspace.academies.flatMap((academy) =>
        academy.groups.map((group) => ({
          ...group,
          academyName: academy.name,
        }))
      ),
    [workspace.academies]
  );

  const groupOptions = useMemo(
    () =>
      allGroups.map((group) => ({
        value: String(group.id),
        label: `${group.name}${group.isPrimary ? ' · Основна' : ''}`,
      })),
    [allGroups]
  );

  const shouldSelectCoach = !isCoachUser && !selectedCoachId;

  useEffect(() => {
    if (shouldSelectCoach) {
      if (selectedGroupId) {
        setSelectedGroupId('');
      }

      return;
    }

    const resolvedGroupId = resolveSelectedGroupId(allGroups, {
      requestedGroupId: queryGroupId,
      currentSelectedGroupId: selectedGroupId,
    });

    if (resolvedGroupId !== selectedGroupId) {
      setSelectedGroupId(resolvedGroupId);
    }
  }, [allGroups, queryGroupId, selectedGroupId, shouldSelectCoach]);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (!shouldSelectCoach && selectedGroupId) {
      nextSearchParams.set('groupId', selectedGroupId);
    } else {
      nextSearchParams.delete('groupId');
    }

    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [searchParams, selectedGroupId, setSearchParams, shouldSelectCoach]);

  if (isLoading) {
    return <LoadingScreen fullPage={false} />;
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Моите групи"
        description="Бърз достъп до групите, децата и дневните задачи."
      />

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}

      <Card>
        <div className="filters-grid filters-grid-wide">
          {!isCoachUser ? (
            <Select
              label="Треньор"
              value={selectedCoachId}
              onChange={handleCoachChange}
              options={coachOptions}
              placeholder="Изберете треньор"
            />
          ) : null}
          <Select
            label="Работна академия"
            value={selectedAcademyId}
            onChange={(event) => {
              setSelectedAcademyId(event.target.value);
              setSelectedGroupId('');
            }}
            options={academyOptions}
            placeholder="Всички академии"
            disabled={shouldSelectCoach}
          />
          <Select
            label="Статус"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={STATUS_OPTIONS}
            placeholder="Всички групи"
          />
          <Select
            label="Избрана група"
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
            options={groupOptions}
            placeholder={totalGroups ? 'Изберете група' : 'Няма групи'}
            disabled={shouldSelectCoach || !totalGroups}
          />
        </div>
      </Card>

      {shouldSelectCoach ? (
        <Card>
          <EmptyState
            title="Изберете треньор"
            description="След избор ще видите групите и децата в обхвата на треньора."
          />
        </Card>
      ) : null}

      {!shouldSelectCoach && !totalGroups ? (
        <Card>
          <EmptyState
            title="Все още нямате назначени групи."
            description="След назначение ще виждате тук всички ключови показатели и бързи действия."
          />
        </Card>
      ) : null}

      {!shouldSelectCoach
        ? workspace.academies.map((academy) => (
            <Card key={academy.id} title={academy.name}>
              <div className="my-groups-grid">
                {academy.groups.map((group) => (
                  <MyGroupCard
                    key={group.id}
                    group={group}
                    academyName={academy.name}
                    canOpenManage={Boolean(user)}
                    isSelected={String(group.id) === selectedGroupId}
                    onSelect={(groupId) => setSelectedGroupId(String(groupId))}
                  />
                ))}
              </div>
            </Card>
          ))
        : null}

      {!shouldSelectCoach ? (
        <GroupComfortZoneOverviewPanel
          groupId={selectedGroupId ? Number(selectedGroupId) : null}
          selectedCategory={selectedComfortCategory}
          onCategoryChange={setSelectedComfortCategory}
        />
      ) : null}
    </div>
  );
}
