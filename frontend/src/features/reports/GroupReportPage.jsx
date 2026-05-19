import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import LoadingScreen from '../../components/ui/LoadingScreen';
import PageHeader from '../../components/ui/PageHeader';
import ChildrenOverviewTable from './ChildrenOverviewTable';
import GroupDashboardCards from './GroupDashboardCards';
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
  const valid = values.filter(
    (value) => value !== null && value !== undefined && Number.isFinite(Number(value))
  );

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
    weeklyStatus: item.social?.weeklyStatus || null,
  }));
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
    return 'Групата не е намерена.';
  }

  if (error?.response?.status === 400) {
    const backendMessage = String(error?.response?.data?.message || '').toLowerCase();

    if (backendMessage.includes('monday')) {
      return 'Началната дата на седмицата трябва да е понеделник.';
    }
  }

  return 'Възникна грешка при зареждането на груповата справка.';
}

export default function GroupReportPage() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [selectedPeriod, setSelectedPeriod] = useState('current_week');
  const [weekStartDate, setWeekStartDate] = useState(getCurrentMondayDateString());

  const [groupDashboard, setGroupDashboard] = useState(null);
  const [groupDashboardTimeline, setGroupDashboardTimeline] = useState([]);
  const [children, setChildren] = useState([]);
  const [childrenPagination, setChildrenPagination] = useState({
    limit: CHILDREN_LIMIT,
    offset: 0,
    total: 0,
  });

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isGroupLoading, setIsGroupLoading] = useState(false);
  const [isChildrenLoading, setIsChildrenLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [weekValidationMessage, setWeekValidationMessage] = useState('');
  const [isForbidden, setIsForbidden] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  const hasWeekValidationError = useMemo(() => !isMonday(weekStartDate), [weekStartDate]);
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

  function handleExportCsv() {
    const rows = [
      ['Секция', 'Показател', 'Стойност'],
      ['Група', 'Име', groupDashboard?.group?.name || '-'],
      ['Група', 'Сезон', groupDashboard?.group?.season?.name || '-'],
      ['Група', 'Академия', groupDashboard?.group?.academy?.name || '-'],
      ['Деца', 'Активни', groupDashboard?.children?.activeChildren ?? 0],
      ['Деца', 'Неактивни', groupDashboard?.children?.inactiveChildren ?? 0],
      ['Въпросници', 'Очаква попълване', groupDashboard?.questionnaires?.pending ?? 0],
      ['Въпросници', 'Попълнени', groupDashboard?.questionnaires?.submitted ?? 0],
      ['Спорт', 'Активни предизвикателства', groupDashboard?.sports?.activeChallenges ?? 0],
      ['Спорт', 'Завършени предизвикателства', groupDashboard?.sports?.completedChallenges ?? 0],
      [],
      ['Дете', 'Статус', 'Въпросник', 'Комфортна зона', 'Социално', 'Спорт'],
    ];

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
      rows.push(['Период', 'Седмица', 'Има обобщение', 'Алфа топки', 'Статус']);

      for (const week of groupDashboardTimeline) {
        rows.push([
          groupDashboard?.group?.name || '-',
          week.weekStartDate,
          week.hasWeeklySummary ? 'Да' : 'Не',
          week.weeklyAlphaBalls ?? '-',
          week.weeklyStatus || '-',
        ]);
      }
    }

    downloadCsv(`group-report-${groupId}.csv`, rows);
  }

  const loadGroupDashboard = useCallback(async () => {
    if (hasWeekValidationError) {
      setWeekValidationMessage('Началната дата на седмицата трябва да е понеделник.');
      return;
    }

    try {
      setWeekValidationMessage('');
      setErrorMessage('');
      setIsGroupLoading(true);
      setIsForbidden(false);
      setIsNotFound(false);

      const weekStarts = getWeekStartDatesForPeriod(selectedPeriod, weekStartDate);

      if (!weekStarts.length) {
        setWeekValidationMessage('Началната дата на седмицата трябва да е понеделник.');
        setGroupDashboard(null);
        setGroupDashboardTimeline([]);
        return;
      }

      const responses = await Promise.all(
        weekStarts.map((weekStart) =>
          reportService.getGroupDashboard(groupId, {
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
      const status = error?.response?.status;

      setErrorMessage(mapFriendlyError(error));
      setGroupDashboard(null);
      setGroupDashboardTimeline([]);

      if (status === 403) {
        setIsForbidden(true);
      }

      if (status === 404) {
        setIsNotFound(true);
      }
    } finally {
      setIsGroupLoading(false);
    }
  }, [groupId, hasWeekValidationError, selectedPeriod, weekStartDate]);

  const loadChildrenOverview = useCallback(async () => {
    try {
      setErrorMessage('');
      setIsChildrenLoading(true);

      const response = await reportService.getGroupChildrenOverview(groupId, {
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
  }, [childrenPagination.limit, childrenPagination.offset, groupId]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        setIsInitialLoading(true);
        await Promise.all([loadGroupDashboard(), loadChildrenOverview()]);
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => {
    if (isInitialLoading) {
      return;
    }

    loadGroupDashboard();
  }, [isInitialLoading, loadGroupDashboard]);

  useEffect(() => {
    if (isInitialLoading) {
      return;
    }

    loadChildrenOverview();
  }, [isInitialLoading, loadChildrenOverview]);

  if (isInitialLoading) {
    return <LoadingScreen fullPage={false} />;
  }

  if (isForbidden || isNotFound) {
    return (
      <div className="page-stack">
        <PageHeader title="Групово табло" description="Детайлна справка за избрана група." />

        {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}

        <Card>
          <EmptyState
            title={isForbidden ? 'Нямате достъп до тази справка.' : 'Групата не е намерена.'}
            description="Върнете се към общите справки и изберете достъпна група."
          />
        </Card>

        <div className="report-page-actions">
          <Button onClick={() => navigate('/reports')}>Назад към справките</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={groupDashboard?.group?.name || 'Групово табло'}
        description={`${groupDashboard?.group?.season?.name || '-'} · ${groupDashboard?.group?.academy?.name || '-'}`}
        actions={
          <div className="report-page-actions no-print">
            <Button variant="ghost" onClick={() => navigate('/reports')}>
              Назад към справките
            </Button>
            <Button variant="secondary" onClick={() => navigate('/children')}>
              Отвори деца
            </Button>
            <Button variant="secondary" onClick={() => navigate('/social/weekly')}>
              Отвори социална седмица
            </Button>
            <Button variant="secondary" onClick={() => navigate('/sports')}>
              Отвори спорт
            </Button>
            <Button variant="secondary" onClick={handleExportCsv}>
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
        <div className="filters-grid filters-grid-wide">
          <Select
            label="Период"
            value={selectedPeriod}
            onChange={(event) => handlePeriodChange(event.target.value)}
            options={[
              { value: 'current_week', label: 'Текуща седмица' },
              { value: 'previous_week', label: 'Предходна седмица' },
              { value: 'next_week', label: 'Следваща седмица' },
              { value: 'last_4_weeks', label: 'Последни 4 седмици' },
              { value: 'custom', label: 'Персонална дата' },
            ]}
            placeholder="Изберете период"
            disabled={isGroupLoading || isChildrenLoading}
          />

          <Input
            label="Начало на седмица"
            type="date"
            value={weekStartDate}
            onChange={(event) => handleWeekStartDateChange(event.target.value)}
            disabled={isGroupLoading || isChildrenLoading}
          />
        </div>
      </Card>

      <Card>
        {isGroupLoading ? (
          <LoadingScreen fullPage={false} />
        ) : (
          <GroupDashboardCards groupDashboard={groupDashboard} />
        )}
      </Card>

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
    </div>
  );
}
