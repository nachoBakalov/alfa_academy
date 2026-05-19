import { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LoadingScreen from '../../components/ui/LoadingScreen';
import PageHeader from '../../components/ui/PageHeader';
import { getApiErrorMessage } from '../../utils/errorMessage';
import groupService from '../groups/groupService';
import LeaderboardProgressList from './LeaderboardProgressList';
import StatisticsFilters from './StatisticsFilters';
import statisticsService from './statisticsService';
import { formatDate } from './statisticsFormatters';
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
    return 'Нямате достъп до класацията за тази академия.';
  }

  if (error?.response?.status === 400) {
    return 'Провери периода и опитай отново.';
  }

  return getApiErrorMessage(error, 'Възникна грешка при зареждането на класацията.');
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

export default function GroupLeaderboardPage() {
  const currentWeek = useMemo(() => getCurrentWeekRange(), []);

  const [academies, setAcademies] = useState([]);
  const [selectedAcademyId, setSelectedAcademyId] = useState('');
  const [preset, setPreset] = useState('current_week');
  const [startDate, setStartDate] = useState(currentWeek.startDate);
  const [endDate, setEndDate] = useState(currentWeek.endDate);

  const [leaderboard, setLeaderboard] = useState(null);
  const [isMetaLoading, setIsMetaLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadMeta = useCallback(async () => {
    try {
      setIsMetaLoading(true);
      setErrorMessage('');
      const groups = await loadAllActiveGroups();
      setAcademies(normalizeAcademiesFromGroups(groups));
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsMetaLoading(false);
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    if (preset === 'custom' && (!startDate || !endDate)) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await statisticsService.getGroupLeaderboard({
        academyId: selectedAcademyId || undefined,
        preset,
        startDate: preset === 'custom' ? startDate : undefined,
        endDate: preset === 'custom' ? endDate : undefined,
      });

      setLeaderboard(response);
    } catch (error) {
      setLeaderboard(null);
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademyId, preset, startDate, endDate]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (isMetaLoading) {
      return;
    }

    loadLeaderboard();
  }, [isMetaLoading, loadLeaderboard]);

  useEffect(() => {
    if (import.meta.env.DEV && leaderboard) {
      console.debug('[statistics:leaderboard]', leaderboard);
    }
  }, [leaderboard]);

  function handleClearFilters() {
    const current = getCurrentWeekRange();
    setSelectedAcademyId('');
    setPreset('current_week');
    setStartDate(current.startDate);
    setEndDate(current.endDate);
  }

  const periodLabel = leaderboard
    ? `${getPresetLabel(leaderboard.period.preset)} · ${formatDate(leaderboard.period.startDate)} - ${formatDate(leaderboard.period.endDate)}`
    : '';

  const hasAnyBalls = (leaderboard?.groups || []).some((group) => Number(group.totalBalls || 0) > 0);

  return (
    <div className="group-leaderboard-showcase-page page-stack">
      <section className="leaderboard-hero" aria-label="Герой секция на класацията">
        <PageHeader
          title="Класация групи"
          description="Събрани Алфа топки по групи за избрания период."
        />

        <div className="leaderboard-hero-badges">
          <span className="leaderboard-hero-badge">{leaderboard ? getPresetLabel(leaderboard.period.preset) : 'Текуща седмица'}</span>
          <span className="leaderboard-hero-badge leaderboard-hero-badge-gold">
            Максимум: {leaderboard?.maxBalls ?? 30} Алфа топки
          </span>
        </div>
      </section>

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}

      <Card title="Филтри" className="statistics-glass-card">
        <StatisticsFilters
          academies={academies}
          groups={[]}
          selectedAcademyId={selectedAcademyId}
          selectedGroupId=""
          preset={preset}
          startDate={startDate}
          endDate={endDate}
          onAcademyChange={setSelectedAcademyId}
          onGroupChange={() => {}}
          onPresetChange={setPreset}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onClear={handleClearFilters}
          showGroup={false}
          isLoading={isMetaLoading || isLoading}
          variant="showcase"
        />
      </Card>

      {isMetaLoading || isLoading ? <LoadingScreen fullPage={false} /> : null}

      {!isMetaLoading && !isLoading && leaderboard ? (
        <>
          <section className="leaderboard-scoreboard" aria-label="Обобщение за класацията">
            <article className="statistics-metric-card">
              <p className="statistics-metric-label">🏁 Период</p>
              <strong>{getPresetLabel(leaderboard.period.preset)}</strong>
              <span>{periodLabel}</span>
            </article>
            <article className="statistics-metric-card">
              <p className="statistics-metric-label">🏆 Максимум</p>
              <strong>{leaderboard.maxBalls}</strong>
              <span>{leaderboard.period.weeksCount} седмици</span>
            </article>
            <article className="statistics-metric-card">
              <p className="statistics-metric-label">👥 Групи</p>
              <strong>{leaderboard.groups.length}</strong>
              <span>Събрани Алфа топки по категории</span>
            </article>
          </section>

          {leaderboard.groups.length > 0 ? (
            <>
              {!hasAnyBalls ? (
                <div className="leaderboard-zero-note" role="status">
                  Очакваме първите Алфа топки за тази седмица.
                </div>
              ) : null}
              <LeaderboardProgressList groups={leaderboard.groups} />
            </>
          ) : (
            <EmptyState
              title="Все още няма въведени резултати за избрания период."
              description="Очакваме първите Алфа топки. Може да избереш и друг период за допълнителен преглед."
            />
          )}
        </>
      ) : null}
    </div>
  );
}
