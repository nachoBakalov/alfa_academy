import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LoadingScreen from '../../components/ui/LoadingScreen';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../auth/AuthProvider';
import academyService from '../academies/academyService';
import { getApiErrorMessage } from '../../utils/errorMessage';
import ChildrenOverviewTable from './ChildrenOverviewTable';
import ComfortZoneStatsCard from './ComfortZoneStatsCard';
import DashboardSummaryCards from './DashboardSummaryCards';
import GroupDashboardCards from './GroupDashboardCards';
import QuestionnaireStatsCard from './QuestionnaireStatsCard';
import ReportFilters from './ReportFilters';
import SocialStatsCard from './SocialStatsCard';
import SportsStatsCard from './SportsStatsCard';
import { getCurrentMondayDateString, isMonday } from './reportFormatters';
import reportService from './reportService';

const CHILDREN_LIMIT = 20;

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function roundToTwo(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.round(numeric * 100) / 100;
}

function average(values) {
  const valid = values.filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)));

  if (!valid.length) {
    return null;
  }

  const sum = valid.reduce((total, current) => total + Number(current), 0);
  return roundToTwo(sum / valid.length);
}

function parseWeekStart(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getWeekStartDatesForPeriod(period, anchorWeekStartDate) {
  const anchor = parseWeekStart(anchorWeekStartDate);

  if (!anchor) {
    return [];
  }

  if (period === 'last_4_weeks') {
    return [0, 1, 2, 3].map((offset) => toDateString(addDays(anchor, -offset * 7)));
  }

  return [toDateString(anchor)];
}

function aggregateDashboardSeries(series = []) {
  if (!series.length) {
    return null;
  }

  const base = series[0];
  const earliest = series[series.length - 1];

  return {
    ...base,
    scope: {
      ...base.scope,
      weekStartDate: earliest?.scope?.weekStartDate || base.scope?.weekStartDate || null,
      weekEndDate: base.scope?.weekEndDate || null,
    },
    social: {
      ...base.social,
      weekStartDate: earliest?.social?.weekStartDate || base.social?.weekStartDate || null,
      groupsWithWeeklySummary: series.reduce(
        (total, item) => total + Number(item.social?.groupsWithWeeklySummary || 0),
        0
      ),
      targetReachedGroups: series.reduce(
        (total, item) => total + Number(item.social?.targetReachedGroups || 0),
        0
      ),
      targetNotReachedGroups: series.reduce(
        (total, item) => total + Number(item.social?.targetNotReachedGroups || 0),
        0
      ),
      averageAlphaBalls: average(series.map((item) => item.social?.averageAlphaBalls)) || 0,
    },
  };
}

function buildDashboardTimeline(series = []) {
  return series.map((item) => ({
    weekStartDate: item.scope?.weekStartDate || item.social?.weekStartDate || '-',
    averageAlphaBalls: Number(item.social?.averageAlphaBalls || 0),
    groupsWithWeeklySummary: Number(item.social?.groupsWithWeeklySummary || 0),
    targetReachedGroups: Number(item.social?.targetReachedGroups || 0),
    targetNotReachedGroups: Number(item.social?.targetNotReachedGroups || 0),
  }));
}

function aggregateGroupDashboardSeries(series = []) {
  if (!series.length) {
    return null;
  }

  const base = series[0];
  const socialSeries = series.map((item) => item.social || {});

  const hasReached = socialSeries.some((item) => item.weeklyStatus === 'target_reached');
  const hasNotReached = socialSeries.some((item) => item.weeklyStatus === 'target_not_reached');

  return {
    ...base,
    social: {
      ...base.social,
      weekStartDate: socialSeries[socialSeries.length - 1]?.weekStartDate || base.social?.weekStartDate,
      weekEndDate: socialSeries[0]?.weekEndDate || base.social?.weekEndDate,
      hasWeeklySummary: socialSeries.some((item) => Boolean(item.hasWeeklySummary)),
      weeklyAlphaBalls: average(socialSeries.map((item) => item.weeklyAlphaBalls)),
      weeklyPercentage: average(socialSeries.map((item) => item.weeklyPercentage)),
      weeklySocialResult: average(socialSeries.map((item) => item.weeklySocialResult)),
      weeklyMaximum: average(socialSeries.map((item) => item.weeklyMaximum)),
      weeklyStatus: hasNotReached ? 'target_not_reached' : hasReached ? 'target_reached' : null,
    },
  };
}

function buildGroupDashboardTimeline(series = []) {
  return series.map((item) => ({
    weekStartDate: item.social?.weekStartDate || '-',
    weekEndDate: item.social?.weekEndDate || '-',
    hasWeeklySummary: Boolean(item.social?.hasWeeklySummary),
    weeklyAlphaBalls: item.social?.weeklyAlphaBalls,
    weeklyPercentage: item.social?.weeklyPercentage,
    weeklyStatus: item.social?.weeklyStatus || null,
  }));
}

function getWeekStartByPreset(period) {
  const currentMonday = getCurrentMondayDateString();
  const currentDate = new Date(`${currentMonday}T00:00:00.000Z`);

  if (period === 'previous_week') {
    return toDateString(addDays(currentDate, -7));
  }

  if (period === 'next_week') {
    return toDateString(addDays(currentDate, 7));
  }

  return currentMonday;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function downloadCsv(fileName, rows) {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function mapFriendlyError(error) {
  if (error?.response?.status === 403) {
    return 'Нямате достъп до тази справка.';
  }

  if (error?.response?.status === 404) {
    return 'Справката не е намерена.';
  }

  if (error?.response?.status === 400) {
    const backendMessage = String(error?.response?.data?.message || '').toLowerCase();

    if (backendMessage.includes('monday')) {
      return 'Началната дата на седмицата трябва да е понеделник.';
    }
  }

  return getApiErrorMessage(error, 'Възникна грешка. Опитайте отново.');
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const queryGroupId = searchParams.get('groupId') || '';

  const [academies, setAcademies] = useState([]);
  const [groups, setGroups] = useState([]);

  const [selectedAcademyId, setSelectedAcademyId] = useState('');
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(queryGroupId);
  const [selectedPeriod, setSelectedPeriod] = useState('current_week');
  const [weekStartDate, setWeekStartDate] = useState(getCurrentMondayDateString());

  const [dashboard, setDashboard] = useState(null);
  const [dashboardTimeline, setDashboardTimeline] = useState([]);
  const [groupDashboard, setGroupDashboard] = useState(null);
  const [groupDashboardTimeline, setGroupDashboardTimeline] = useState([]);
  const [children, setChildren] = useState([]);
  const [childrenPagination, setChildrenPagination] = useState({
    limit: CHILDREN_LIMIT,
    offset: 0,
    total: 0,
  });

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [isGroupLoading, setIsGroupLoading] = useState(false);
  const [isChildrenLoading, setIsChildrenLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [weekValidationMessage, setWeekValidationMessage] = useState('');

  const isCoach = user?.role === 'coach';

  const hasWeekValidationError = useMemo(() => {
    if (!weekStartDate) {
      return true;
    }

    return !isMonday(weekStartDate);
  }, [weekStartDate]);

  const isMultiWeekMode = selectedPeriod === 'last_4_weeks';

  const multiWeekRangeLabel = useMemo(() => {
    if (!isMultiWeekMode) {
      return '';
    }

    const weekDates = getWeekStartDatesForPeriod('last_4_weeks', weekStartDate);

    if (!weekDates.length) {
      return '';
    }

    return `${weekDates[weekDates.length - 1]} - ${weekDates[0]}`;
  }, [isMultiWeekMode, weekStartDate]);

  const availableCoaches = useMemo(() => {
    const byId = new Map();

    for (const group of groups) {
      for (const coach of group.coaches || []) {
        if (!coach.id) {
          continue;
        }

        if (!byId.has(coach.id)) {
          byId.set(coach.id, coach);
        }
      }
    }

    return Array.from(byId.values()).sort((left, right) => {
      const leftName = `${left.firstName || ''} ${left.lastName || ''}`.trim();
      const rightName = `${right.firstName || ''} ${right.lastName || ''}`.trim();
      return leftName.localeCompare(rightName, 'bg');
    });
  }, [groups]);

  const filteredGroups = useMemo(() => {
    if (!selectedCoachId) {
      return groups;
    }

    return groups.filter((group) =>
      (group.coaches || []).some((coach) => String(coach.id) === String(selectedCoachId))
    );
  }, [groups, selectedCoachId]);

  const selectedGroupFromList = useMemo(
    () => filteredGroups.find((group) => String(group.id) === String(selectedGroupId)) || null,
    [filteredGroups, selectedGroupId]
  );

  const selectedCoachFromList = useMemo(
    () => availableCoaches.find((coach) => String(coach.id) === String(selectedCoachId)) || null,
    [availableCoaches, selectedCoachId]
  );

  const loadGroups = useCallback(async (academyId) => {
    const groupsResponse = await reportService.listGroups({
      isActive: true,
      limit: 100,
      offset: 0,
      academyId: academyId || undefined,
    });

    setGroups(groupsResponse.groups);
  }, []);

  const loadMeta = useCallback(async () => {
    const academyResponse = await academyService.listAcademies({
      isActive: true,
      limit: 100,
      offset: 0,
    });

    setAcademies(academyResponse.academies || []);
  }, []);

  const loadDashboard = useCallback(async () => {
    if (hasWeekValidationError) {
      setWeekValidationMessage('Началната дата на седмицата трябва да е понеделник.');
      return;
    }

    try {
      setWeekValidationMessage('');
      setIsDashboardLoading(true);
      setErrorMessage('');

      const weekStarts = getWeekStartDatesForPeriod(selectedPeriod, weekStartDate);

      if (!weekStarts.length) {
        setWeekValidationMessage('Началната дата на седмицата трябва да е понеделник.');
        setDashboard(null);
        setDashboardTimeline([]);
        return;
      }

      const responses = await Promise.all(
        weekStarts.map((weekStart) =>
          reportService.getDashboard({
            weekStartDate: weekStart,
            academyId: selectedAcademyId || undefined,
            groupId: selectedGroupFromList ? selectedGroupId : undefined,
          })
        )
      );

      const dashboards = responses.map((response) => response.dashboard);

      if (selectedPeriod === 'last_4_weeks') {
        setDashboard(aggregateDashboardSeries(dashboards));
        setDashboardTimeline(buildDashboardTimeline(dashboards));
      } else {
        setDashboard(dashboards[0] || null);
        setDashboardTimeline([]);
      }
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsDashboardLoading(false);
    }
  }, [
    hasWeekValidationError,
    selectedAcademyId,
    selectedPeriod,
    selectedGroupFromList,
    selectedGroupId,
    weekStartDate,
  ]);

  const loadSelectedGroupDashboard = useCallback(async () => {
    if (!selectedGroupId || !selectedGroupFromList) {
      setGroupDashboard(null);
      setGroupDashboardTimeline([]);
      return;
    }

    if (hasWeekValidationError) {
      setWeekValidationMessage('Началната дата на седмицата трябва да е понеделник.');
      return;
    }

    try {
      setWeekValidationMessage('');
      setIsGroupLoading(true);
      setErrorMessage('');

      const weekStarts = getWeekStartDatesForPeriod(selectedPeriod, weekStartDate);

      if (!weekStarts.length) {
        setWeekValidationMessage('Началната дата на седмицата трябва да е понеделник.');
        setGroupDashboard(null);
        setGroupDashboardTimeline([]);
        return;
      }

      const responses = await Promise.all(
        weekStarts.map((weekStart) =>
          reportService.getGroupDashboard(selectedGroupId, {
            weekStartDate: weekStart,
          })
        )
      );

      const dashboards = responses.map((response) => response.groupDashboard);

      if (selectedPeriod === 'last_4_weeks') {
        setGroupDashboard(aggregateGroupDashboardSeries(dashboards));
        setGroupDashboardTimeline(buildGroupDashboardTimeline(dashboards));
      } else {
        setGroupDashboard(dashboards[0] || null);
        setGroupDashboardTimeline([]);
      }
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
      setGroupDashboard(null);
      setGroupDashboardTimeline([]);
    } finally {
      setIsGroupLoading(false);
    }
  }, [
    hasWeekValidationError,
    selectedGroupFromList,
    selectedGroupId,
    selectedPeriod,
    weekStartDate,
  ]);

  const loadChildrenOverview = useCallback(async () => {
    if (!selectedGroupId || !selectedGroupFromList) {
      setChildren([]);
      setChildrenPagination((prev) => ({ ...prev, total: 0, offset: 0 }));
      return;
    }

    try {
      setIsChildrenLoading(true);
      setErrorMessage('');

      const response = await reportService.getGroupChildrenOverview(selectedGroupId, {
        limit: childrenPagination.limit,
        offset: childrenPagination.offset,
      });

      setChildren(response.children);
      setChildrenPagination(response.pagination);
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
      setChildren([]);
    } finally {
      setIsChildrenLoading(false);
    }
  }, [childrenPagination.limit, childrenPagination.offset, selectedGroupFromList, selectedGroupId]);

  function handlePeriodChange(period) {
    setSelectedPeriod(period);

    if (period === 'custom') {
      return;
    }

    setWeekStartDate(getWeekStartByPreset(period));
  }

  function handleWeekStartDateChange(value) {
    setWeekStartDate(value);
    setSelectedPeriod('custom');
  }

  function handlePrint() {
    window.print();
  }

  const syncGroupIdToUrl = useCallback(
    (groupId) => {
      const nextGroupId = String(groupId || '');
      const currentGroupId = searchParams.get('groupId') || '';

      if (nextGroupId === currentGroupId) {
        return;
      }

      const nextSearchParams = new URLSearchParams(searchParams);

      if (nextGroupId) {
        nextSearchParams.set('groupId', nextGroupId);
      } else {
        nextSearchParams.delete('groupId');
      }

      setSearchParams(nextSearchParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  function handleExportCsv() {
    const rows = [
      ['Секция', 'Показател', 'Стойност'],
      ['Показатели', 'Активни академии', dashboard?.counts?.activeAcademies ?? 0],
      ['Показатели', 'Активни периоди', dashboard?.counts?.activeSeasons ?? 0],
      ['Показатели', 'Активни групи', dashboard?.counts?.activeGroups ?? 0],
      ['Показатели', 'Активни деца', dashboard?.counts?.activeChildren ?? 0],
      ['Показатели', 'Активни треньори', dashboard?.counts?.activeCoaches ?? 0],
      ['Въпросници', 'Очаква попълване', dashboard?.questionnaires?.pending ?? 0],
      ['Въпросници', 'Попълнени', dashboard?.questionnaires?.submitted ?? 0],
      ['Въпросници', 'Изтичат скоро', dashboard?.questionnaires?.expiringSoon ?? 0],
      ['Комфортна зона', 'Деца с профил', dashboard?.comfortZone?.childrenWithProfile ?? 0],
      ['Комфортна зона', 'Деца без профил', dashboard?.comfortZone?.childrenWithoutProfile ?? 0],
      ['Социално', 'Средни алфа топки', dashboard?.social?.averageAlphaBalls ?? 0],
      ['Спорт', 'Активни предизвикателства', dashboard?.sports?.activeChallenges ?? 0],
    ];

    if (dashboardTimeline.length > 0) {
      rows.push([]);
      rows.push(['Период', 'Седмица', 'Алфа топки', 'Таргет постигнат', 'Нужда от насърчаване']);

      for (const week of dashboardTimeline) {
        rows.push([
          'Социална динамика',
          week.weekStartDate,
          week.averageAlphaBalls,
          week.targetReachedGroups,
          week.targetNotReachedGroups,
        ]);
      }
    }

    if (selectedGroupFromList) {
      rows.push([]);
      rows.push(['Група', selectedGroupFromList.name, '']);
      rows.push(['Дете', 'Статус', 'Въпросник', 'Комфортна зона', 'Социално', 'Спорт']);

      for (const child of children) {
        rows.push([
          `${child.firstName} ${child.lastName}`,
          child.isActive ? 'Активно дете' : 'Неактивно дете',
          child.questionnaire?.status || 'missing',
          child.comfortZone?.hasProfile ? 'has_profile' : 'missing_profile',
          child.social?.latestDailyStatus || 'missing',
          `${child.sports?.activeChallengesCount || 0}/${child.sports?.completedResultsCount || 0}`,
        ]);
      }

      if (groupDashboardTimeline.length > 0) {
        rows.push([]);
        rows.push(['Групов период', 'Седмица', 'Има обобщение', 'Алфа топки', 'Статус']);

        for (const week of groupDashboardTimeline) {
          rows.push([
            selectedGroupFromList.name,
            week.weekStartDate,
            week.hasWeeklySummary ? 'Да' : 'Не',
            week.weeklyAlphaBalls ?? '-',
            week.weeklyStatus || '-',
          ]);
        }
      }
    }

    downloadCsv('spravki-tablo.csv', rows);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        setIsInitialLoading(true);
        setErrorMessage('');

        await Promise.all([loadMeta(), loadGroups('')]);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(mapFriendlyError(error));
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [loadGroups, loadMeta]);

  useEffect(() => {
    if (isInitialLoading) {
      return;
    }

    loadGroups(selectedAcademyId).catch((error) => {
      setErrorMessage(mapFriendlyError(error));
    });
  }, [isInitialLoading, loadGroups, selectedAcademyId]);

  useEffect(() => {
    if (!availableCoaches.some((coach) => String(coach.id) === String(selectedCoachId))) {
      setSelectedCoachId('');
    }
  }, [availableCoaches, selectedCoachId]);

  useEffect(() => {
    if (!queryGroupId || !filteredGroups.length) {
      return;
    }

    const hasQueryGroup = filteredGroups.some((group) => String(group.id) === String(queryGroupId));

    if (hasQueryGroup && String(selectedGroupId) !== String(queryGroupId)) {
      setSelectedGroupId(String(queryGroupId));
      setChildrenPagination((prev) => ({ ...prev, offset: 0 }));
    }
  }, [filteredGroups, queryGroupId, selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId || !filteredGroups.length) {
      return;
    }

    if (!filteredGroups.some((group) => String(group.id) === String(selectedGroupId))) {
      setSelectedGroupId('');
      setChildrenPagination((prev) => ({ ...prev, offset: 0 }));
    }
  }, [filteredGroups, selectedGroupId]);

  useEffect(() => {
    syncGroupIdToUrl(selectedGroupId);
  }, [selectedGroupId, syncGroupIdToUrl]);

  useEffect(() => {
    if (!selectedCoachId || selectedGroupId || !filteredGroups.length) {
      return;
    }

    setSelectedGroupId(String(filteredGroups[0].id));
  }, [filteredGroups, selectedCoachId, selectedGroupId]);

  useEffect(() => {
    if (isInitialLoading) {
      return;
    }

    loadDashboard();
  }, [isInitialLoading, loadDashboard]);

  useEffect(() => {
    if (isInitialLoading) {
      return;
    }

    loadSelectedGroupDashboard();
  }, [isInitialLoading, loadSelectedGroupDashboard]);

  useEffect(() => {
    if (isInitialLoading) {
      return;
    }

    loadChildrenOverview();
  }, [isInitialLoading, loadChildrenOverview]);

  if (isInitialLoading) {
    return <LoadingScreen fullPage={false} />;
  }

  if (isCoach && groups.length === 0) {
    return (
      <div className="page-stack">
        <PageHeader
          title="Справки и табло"
          description="Обобщена картина за групи, деца, въпросници, социално поведение и спорт."
        />

        {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}

        <Card>
          <EmptyState
            title="Все още няма назначени групи."
            description="Когато получите група, тук ще виждате всички свързани справки."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Справки и табло"
        description="Обобщена картина за групи, деца, въпросници, социално поведение и спорт."
        actions={
          <div className="report-page-actions no-print">
            <Button variant="secondary" onClick={handleExportCsv} disabled={!dashboard || isDashboardLoading}>
              Експорт CSV
            </Button>
            <Button variant="ghost" onClick={handlePrint}>
              Печат
            </Button>
          </div>
        }
      />

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
      {weekValidationMessage ? <Alert type="error">{weekValidationMessage}</Alert> : null}

      {isMultiWeekMode && multiWeekRangeLabel ? (
        <Alert type="info">Многоседмичен агрегат за диапазон: {multiWeekRangeLabel} (4 седмици).</Alert>
      ) : null}

      <Card>
        <ReportFilters
          academies={academies}
          coaches={availableCoaches}
          groups={filteredGroups}
          selectedAcademyId={selectedAcademyId}
          selectedCoachId={selectedCoachId}
          selectedGroupId={selectedGroupId}
          selectedPeriod={selectedPeriod}
          onAcademyChange={(value) => {
            setSelectedAcademyId(value);
            setSelectedCoachId('');
            setSelectedGroupId('');
            setChildrenPagination((prev) => ({ ...prev, offset: 0 }));
          }}
          onCoachChange={(value) => {
            setSelectedCoachId(value);
            setSelectedGroupId('');
            setChildrenPagination((prev) => ({ ...prev, offset: 0 }));
          }}
          onGroupChange={(value) => {
            setSelectedGroupId(value);
            setChildrenPagination((prev) => ({ ...prev, offset: 0 }));
          }}
          onPeriodChange={handlePeriodChange}
          weekStartDate={weekStartDate}
          onWeekStartDateChange={handleWeekStartDateChange}
          onClear={() => {
            setSelectedAcademyId('');
            setSelectedCoachId('');
            setSelectedGroupId('');
            setSelectedPeriod('current_week');
            setWeekStartDate(getCurrentMondayDateString());
            setChildrenPagination((prev) => ({ ...prev, offset: 0 }));
          }}
          isLoading={isDashboardLoading || isGroupLoading || isChildrenLoading}
        />
      </Card>

      {selectedCoachFromList && !selectedGroupId ? (
        <Alert type="info">
          Детайлен преглед по треньор: избран е {selectedCoachFromList.firstName}{' '}
          {selectedCoachFromList.lastName}.
          Изберете група за детайлен преглед.
        </Alert>
      ) : null}

      {selectedCoachFromList && filteredGroups.length === 0 ? (
        <Alert type="info">За този треньор няма групи при текущите филтри.</Alert>
      ) : null}

      {dashboard ? (
        <>
          <DashboardSummaryCards counts={dashboard.counts} />

          <div className="report-cards-grid">
            <QuestionnaireStatsCard stats={dashboard.questionnaires} />
            <ComfortZoneStatsCard stats={dashboard.comfortZone} />
            <SocialStatsCard social={dashboard.social} />
            <SportsStatsCard sports={dashboard.sports} />
          </div>

          {isMultiWeekMode && dashboardTimeline.length ? (
            <Card title="Детайлен преглед по седмици (общ)">
              <div className="report-week-grid">
                {dashboardTimeline.map((week) => (
                  <article className="report-week-item" key={week.weekStartDate}>
                    <strong>{week.weekStartDate}</strong>
                    <span>Алфа топки: {week.averageAlphaBalls}</span>
                    <span>Таргет постигнат: {week.targetReachedGroups}</span>
                    <span>Нужда от насърчаване: {week.targetNotReachedGroups}</span>
                  </article>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      ) : null}

      {selectedGroupId ? (
        <>
          <Card
            title="Преглед на избраната група"
            className={isGroupLoading ? 'report-card-loading' : ''}
          >
            {isGroupLoading ? (
              <LoadingScreen fullPage={false} />
            ) : (
              <>
                <GroupDashboardCards groupDashboard={groupDashboard} />

                {isMultiWeekMode && groupDashboardTimeline.length ? (
                  <Card title="Детайлен преглед по седмици (група)">
                    <div className="report-week-grid">
                      {groupDashboardTimeline.map((week) => (
                        <article className="report-week-item" key={week.weekStartDate}>
                          <strong>
                            {week.weekStartDate} - {week.weekEndDate}
                          </strong>
                          <span>Има обобщение: {week.hasWeeklySummary ? 'Да' : 'Не'}</span>
                          <span>Алфа топки: {week.weeklyAlphaBalls ?? '-'}</span>
                          <span>Статус: {week.weeklyStatus || '-'}</span>
                        </article>
                      ))}
                    </div>
                  </Card>
                ) : null}

                <div className="report-page-actions">
                  <Button onClick={() => navigate(`/reports/groups/${selectedGroupId}`)}>
                    Отвори детайлно групово табло
                  </Button>
                </div>
              </>
            )}
          </Card>

          <Card title="Обобщение по деца">
            <ChildrenOverviewTable
              children={children}
              pagination={childrenPagination}
              isLoading={isChildrenLoading}
              onPrev={() =>
                setChildrenPagination((prev) => ({
                  ...prev,
                  offset: Math.max(0, prev.offset - prev.limit),
                }))
              }
              onNext={() =>
                setChildrenPagination((prev) => ({
                  ...prev,
                  offset: prev.offset + prev.limit,
                }))
              }
              onOpenProfile={(child) => navigate(`/children/${child.id}/profile`)}
            />
          </Card>
        </>
      ) : null}
    </div>
  );
}
