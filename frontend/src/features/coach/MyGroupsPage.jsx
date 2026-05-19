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
import AcademyChildrenPanel from './AcademyChildrenPanel';
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

export default function MyGroupsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isCoachUser = user?.role === 'coach';

  const queryCoachId = searchParams.get('coachId') || '';

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
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setSelectedCoachId(queryCoachId);
  }, [queryCoachId]);

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

    const nextSearchParams = new URLSearchParams(searchParams);

    if (value) {
      nextSearchParams.set('coachId', value);
    } else {
      nextSearchParams.delete('coachId');
    }

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

  const shouldSelectCoach = !isCoachUser && !selectedCoachId;

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
            onChange={(event) => setSelectedAcademyId(event.target.value)}
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
                  />
                ))}
              </div>
            </Card>
          ))
        : null}

      {!shouldSelectCoach ? (
        <AcademyChildrenPanel
          academyId={selectedAcademyId || undefined}
          coachId={!isCoachUser && selectedCoachId ? Number(selectedCoachId) : undefined}
        />
      ) : null}
    </div>
  );
}
