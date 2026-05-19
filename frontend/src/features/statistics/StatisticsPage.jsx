import { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LoadingScreen from '../../components/ui/LoadingScreen';
import PageHeader from '../../components/ui/PageHeader';
import { getApiErrorMessage } from '../../utils/errorMessage';
import groupService from '../groups/groupService';
import CategoryPieChart from './CategoryPieChart';
import GroupStackedBarChart from './GroupStackedBarChart';
import GroupStatisticsCard from './GroupStatisticsCard';
import StatisticsFilters from './StatisticsFilters';
import statisticsService from './statisticsService';
import WeeklyTrendChart from './WeeklyTrendChart';
import { formatBalls, formatDate, formatPercent } from './statisticsFormatters';
import { getPresetLabel } from './statisticsLabels';

function getCurrentWeekRange() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = today.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(today.getTime());
  start.setUTCDate(start.getUTCDate() + diffToMonday);

  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 6);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function normalizeAcademiesFromGroups(groups) {
  const byId = new Map();

  for (const group of groups) {
    if (!group.academy?.id) {
      continue;
    }

    byId.set(group.academy.id, {
      id: group.academy.id,
      name: group.academy.name,
    });
  }

  return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name, 'bg'));
}

function mapFriendlyError(error) {
  if (error?.response?.status === 403) {
    return 'Нямате достъп до тази статистика.';
  }

  if (error?.response?.status === 400) {
    return 'Провери избрания период и опитай отново.';
  }

  return getApiErrorMessage(error, 'Възникна грешка при зареждането на статистиката.');
}

async function loadAllActiveGroups() {
  const limit = 100;
  let offset = 0;
  let allGroups = [];
  let total = null;

  do {
    const response = await groupService.listGroups({
      isActive: true,
      limit,
      offset,
    });

    const batch = response.groups || [];
    allGroups = allGroups.concat(batch);
    total = response.pagination?.total ?? allGroups.length;
    offset += limit;

    if (batch.length === 0) {
      break;
    }
  } while (allGroups.length < total);

  return allGroups;
}

export default function StatisticsPage() {
  const currentWeek = useMemo(() => getCurrentWeekRange(), []);

  const [allGroups, setAllGroups] = useState([]);
  const [academies, setAcademies] = useState([]);

  const [selectedAcademyId, setSelectedAcademyId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [preset, setPreset] = useState('current_week');
  const [startDate, setStartDate] = useState(currentWeek.startDate);
  const [endDate, setEndDate] = useState(currentWeek.endDate);

  const [overview, setOverview] = useState(null);
  const [isMetaLoading, setIsMetaLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const filteredGroups = useMemo(() => {
    if (!selectedAcademyId) {
      return allGroups;
    }

    return allGroups.filter((group) => String(group.academy?.id) === String(selectedAcademyId));
  }, [allGroups, selectedAcademyId]);

  const selectedGroup = useMemo(
    () => overview?.groups?.find((group) => String(group.id) === String(selectedGroupId)) || null,
    [overview, selectedGroupId]
  );

  const trendGroup = useMemo(() => {
    if (selectedGroup?.weeklyBreakdown?.length) {
      return selectedGroup;
    }

    return overview?.groups?.find((group) => (group.weeklyBreakdown || []).length > 0) || null;
  }, [overview, selectedGroup]);

  useEffect(() => {
    if (!selectedGroupId) {
      return;
    }

    const stillExists = filteredGroups.some((group) => String(group.id) === String(selectedGroupId));

    if (!stillExists) {
      setSelectedGroupId('');
    }
  }, [filteredGroups, selectedGroupId]);

  const loadMeta = useCallback(async () => {
    try {
      setIsMetaLoading(true);
      setErrorMessage('');
      const groups = await loadAllActiveGroups();

      setAllGroups(groups);
      setAcademies(normalizeAcademiesFromGroups(groups));
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsMetaLoading(false);
    }
  }, []);

  const loadOverview = useCallback(async () => {
    if (preset === 'custom' && (!startDate || !endDate)) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await statisticsService.getGroupOverview({
        academyId: selectedAcademyId || undefined,
        groupId: selectedGroupId || undefined,
        preset,
        startDate: preset === 'custom' ? startDate : undefined,
        endDate: preset === 'custom' ? endDate : undefined,
      });

      setOverview(response);
    } catch (error) {
      setOverview(null);
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  }, [preset, selectedAcademyId, selectedGroupId, startDate, endDate]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (isMetaLoading) {
      return;
    }

    loadOverview();
  }, [isMetaLoading, loadOverview]);

  useEffect(() => {
    if (import.meta.env.DEV && overview) {
      console.debug('[statistics:overview]', overview);
    }
  }, [overview]);

  function handleClearFilters() {
    const current = getCurrentWeekRange();
    setSelectedAcademyId('');
    setSelectedGroupId('');
    setPreset('current_week');
    setStartDate(current.startDate);
    setEndDate(current.endDate);
  }

  const periodLabel = overview
    ? `${getPresetLabel(overview.period.preset)} · ${formatDate(overview.period.startDate)} - ${formatDate(overview.period.endDate)}`
    : '';

  const heroTotalBalls = Number(overview?.totals?.totalBalls || 0);
  const heroMaxBalls = Number(overview?.totals?.maxBalls || 0);
  const heroPercentage = Math.max(0, Math.min(100, Number(overview?.totals?.percentage || 0)));
  const hasZeroTotals = heroTotalBalls === 0;

  return (
    <div className="statistics-showcase-page page-stack">
      <section className="statistics-showcase-hero" aria-label="Обобщение за статистиката">
        <div>
          <PageHeader
            title="Статистика"
            description="Групов напредък по социално поведение, спорт и креативност."
          />
          <p className="statistics-hero-period">{periodLabel || 'Текуща седмица'}</p>
        </div>

        <div className="statistics-hero-score">
          <div
            className="statistics-hero-ring"
            style={{ '--hero-progress': `${heroPercentage}%` }}
            aria-label={`Изпълнение ${formatPercent(heroPercentage)}`}
          >
            <strong>{formatPercent(heroPercentage)}</strong>
            <span>Изпълнение</span>
          </div>

          <div className="statistics-hero-score-copy">
            <strong className="statistics-hero-main-value">{formatBalls(heroTotalBalls, heroMaxBalls)}</strong>
            <span>Събрани Алфа топки</span>
            {hasZeroTotals ? (
              <p>Все още няма въведени резултати за избрания период.</p>
            ) : null}
          </div>
        </div>
      </section>

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}

      <Card title="Филтри" className="statistics-glass-card">
        <StatisticsFilters
          academies={academies}
          groups={filteredGroups}
          selectedAcademyId={selectedAcademyId}
          selectedGroupId={selectedGroupId}
          preset={preset}
          startDate={startDate}
          endDate={endDate}
          onAcademyChange={setSelectedAcademyId}
          onGroupChange={setSelectedGroupId}
          onPresetChange={setPreset}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onClear={handleClearFilters}
          showGroup
          isLoading={isMetaLoading || isLoading}
          variant="showcase"
        />
      </Card>

      {isMetaLoading || isLoading ? (
        <LoadingScreen fullPage={false} />
      ) : null}

      {!isMetaLoading && !isLoading && overview ? (
        <>
          <section className="statistics-summary-grid" aria-label="Обобщение за периода">
            <article className="statistics-metric-card">
              <p className="statistics-metric-label">⭐ Алфа топки</p>
              <strong>{overview.totals.totalBalls}</strong>
              <span>{periodLabel}</span>
            </article>
            <article className="statistics-metric-card">
              <p className="statistics-metric-label">📈 Напредък</p>
              <strong>{formatPercent(overview.totals.percentage)}</strong>
              <span>{formatBalls(overview.totals.totalBalls, overview.totals.maxBalls)}</span>
            </article>
            <article className="statistics-metric-card">
              <p className="statistics-metric-label">👥 Групи</p>
              <strong>{overview.totals.groupsCount}</strong>
              <span>{overview.academy?.name || 'Всички налични академии'}</span>
            </article>
            <article className="statistics-metric-card">
              <p className="statistics-metric-label">📅 Период</p>
              <strong>{getPresetLabel(overview.period.preset)}</strong>
              <span>{formatDate(overview.period.startDate)} - {formatDate(overview.period.endDate)}</span>
            </article>
          </section>

          <section className="statistics-chart-grid">
            <Card className="statistics-glass-card statistics-chart-card">
              <CategoryPieChart categoryTotals={overview.categoryTotals} />
            </Card>
            <Card className="statistics-glass-card statistics-chart-card">
              <GroupStackedBarChart groups={overview.groups} />
            </Card>
          </section>

          <Card className="statistics-glass-card statistics-chart-card">
            <WeeklyTrendChart group={trendGroup} />
          </Card>

          {overview.groups.length > 0 ? (
            <section className="group-statistics-list" aria-label="Карти по групи">
              {overview.groups.map((group) => (
                <GroupStatisticsCard key={group.id} group={group} />
              ))}
            </section>
          ) : (
            <EmptyState
              title="Все още няма въведени резултати за избрания период."
              description="Очакваме първите резултати за периода. Може да избереш и друг период за преглед."
            />
          )}
        </>
      ) : null}
    </div>
  );
}
