import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LoadingScreen from '../../components/ui/LoadingScreen';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../auth/AuthProvider';
import { getApiErrorMessage } from '../../utils/errorMessage';
import ActiveDaysPanel from './ActiveDaysPanel';
import DailyEvaluationTable from './DailyEvaluationTable';
import DailySummaryCards from './DailySummaryCards';
import SocialDateSelector from './SocialDateSelector';
import SocialGroupSelector from './SocialGroupSelector';
import socialService from './socialService';
import { formatDayOfWeek, getTodayDateString } from './socialDateUtils';

function mapFriendlyError(error) {
  if (error?.response?.status === 403) {
    return 'Нямате достъп до тази група.';
  }

  return getApiErrorMessage(error, 'Възникна грешка. Опитайте отново.');
}

function mapRowsFromChildren(children = []) {
  const state = {};

  for (const child of children) {
    state[child.id] = {
      coachRelationColor: child.evaluation?.coachRelationColor || null,
      childrenRelationColor: child.evaluation?.childrenRelationColor || null,
      rulesColor: child.evaluation?.rulesColor || null,
      optionalComment: child.evaluation?.optionalComment || '',
    };
  }

  return state;
}

export default function DailyEvaluationPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canEditDaily = ['super_admin', 'admin', 'coach'].includes(user?.role);
  const canEditActiveDays = ['super_admin', 'admin'].includes(user?.role);
  const isManager = user?.role === 'manager';

  const [groups, setGroups] = useState([]);
  const [isGroupsLoading, setIsGroupsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const queryGroupId = searchParams.get('groupId') || '';
  const [date, setDate] = useState(getTodayDateString());

  const [dailyData, setDailyData] = useState(null);
  const [dailySummaryData, setDailySummaryData] = useState(null);
  const [rowValues, setRowValues] = useState({});
  const [rowErrors, setRowErrors] = useState({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadGroups = useCallback(async () => {
    try {
      setIsGroupsLoading(true);
      setErrorMessage('');

      const response = await socialService.listGroups({ isActive: true, limit: 100, offset: 0 });
      const nextGroups = response.groups || [];
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

      if (!selectedGroupId && nextGroups.length > 0) {
        setSelectedGroupId(String(nextGroups[0].id));
      }
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsGroupsLoading(false);
    }
  }, [queryGroupId, searchParams, selectedGroupId, setSearchParams]);

  useEffect(() => {
    if (!groups.length || !queryGroupId) {
      return;
    }

    const hasQueryGroup = groups.some((group) => String(group.id) === String(queryGroupId));

    if (hasQueryGroup && String(selectedGroupId) !== String(queryGroupId)) {
      setSelectedGroupId(String(queryGroupId));
    }
  }, [groups, queryGroupId, selectedGroupId]);

  const loadDailyScreen = useCallback(async () => {
    if (!selectedGroupId || !date) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const [dailyResponse, summaryResponse] = await Promise.all([
        socialService.getDailyEvaluation(selectedGroupId, date),
        socialService.getDailySummary(selectedGroupId, date),
      ]);

      setDailyData(dailyResponse);
      setDailySummaryData(summaryResponse);
      setRowValues(mapRowsFromChildren(dailyResponse.children));
      setRowErrors({});
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  }, [date, selectedGroupId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    loadDailyScreen();
  }, [loadDailyScreen]);

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
    setSuccessMessage('');
    setErrorMessage('');
  }

  const summary = useMemo(
    () => dailySummaryData?.summary || dailyData?.summary || null,
    [dailyData?.summary, dailySummaryData?.summary]
  );

  function handleColorChange(childId, field, color) {
    setRowValues((prev) => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        [field]: prev[childId]?.[field] === color ? null : color,
      },
    }));

    setRowErrors((prev) => ({
      ...prev,
      [childId]: '',
    }));
  }

  function handleCommentChange(childId, value) {
    setRowValues((prev) => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        optionalComment: value,
      },
    }));
  }

  function buildSavePayload() {
    const nextRowErrors = {};
    const evaluations = [];

    for (const child of dailyData?.children || []) {
      const row = rowValues[child.id] || {};

      const selectedCount = [row.coachRelationColor, row.childrenRelationColor, row.rulesColor].filter(
        Boolean
      ).length;

      if (selectedCount === 0) {
        continue;
      }

      if (selectedCount < 3) {
        nextRowErrors[child.id] = 'Попълнете и трите критерия преди запазване.';
        continue;
      }

      const evaluation = {
        childId: child.id,
        coachRelationColor: row.coachRelationColor,
        childrenRelationColor: row.childrenRelationColor,
        rulesColor: row.rulesColor,
      };

      const comment = String(row.optionalComment || '').trim();

      if (comment) {
        evaluation.optionalComment = comment;
      }

      evaluations.push(evaluation);
    }

    return {
      evaluations,
      nextRowErrors,
    };
  }

  async function handleSave() {
    if (!canEditDaily || !selectedGroupId || !dailyData) {
      return;
    }

    const { evaluations, nextRowErrors } = buildSavePayload();

    setRowErrors(nextRowErrors);

    if (Object.values(nextRowErrors).some(Boolean)) {
      setErrorMessage('Има непълни редове. Допълнете оценките и опитайте отново.');
      return;
    }

    if (evaluations.length === 0) {
      setErrorMessage('Няма попълнени оценки за запазване.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await socialService.saveDailyEvaluations(selectedGroupId, {
        date,
        evaluations,
      });

      setSuccessMessage('Дневната оценка е записана успешно.');
      await loadDailyScreen();
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (isGroupsLoading) {
    return <LoadingScreen fullPage={false} />;
  }

  if (!groups.length) {
    return (
      <div className="page-stack">
        <PageHeader
          title="Дневна оценка"
          description="Попълване на социално поведение за избрана група и дата."
        />
        <Card>
          <EmptyState
            title="Няма налични групи"
            description="Добавете или активирайте група, за да започнете дневна оценка."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Дневна оценка"
        description="Попълване на социално поведение за избрана група и дата."
        actions={
          canEditDaily ? (
            <Button onClick={handleSave} loading={isSaving} disabled={isSaving || isLoading}>
              Запази дневната оценка
            </Button>
          ) : null
        }
      />

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert type="success">{successMessage}</Alert> : null}
      {isManager ? (
        <Alert type="info">Режим преглед: само супер админ, админ и треньор могат да записват оценки.</Alert>
      ) : null}

      <Card>
        <div className="filters-grid filters-grid-wide">
          <SocialGroupSelector
            groups={groups}
            value={selectedGroupId}
            onChange={handleGroupChange}
            disabled={isLoading || isSaving}
          />

          <SocialDateSelector
            label="Дата"
            value={date}
            onChange={(nextDate) => {
              setDate(nextDate);
              setSuccessMessage('');
            }}
            helperText="Изберете дата за дневната оценка."
            disabled={isLoading || isSaving}
          />

          <div className="social-active-badge-wrap">
            <span className="form-label">Статус на деня</span>
            <Badge tone={dailySummaryData?.isActiveDay || dailyData?.isActiveDay ? 'success' : 'neutral'}>
              {dailySummaryData?.isActiveDay || dailyData?.isActiveDay
                ? `Активен ден (${formatDayOfWeek(dailyData?.dayOfWeek)})`
                : `Неактивен ден (${formatDayOfWeek(dailyData?.dayOfWeek)})`}
            </Badge>
          </div>
        </div>
      </Card>

      <ActiveDaysPanel groupId={selectedGroupId} canEdit={canEditActiveDays} />

      <DailySummaryCards summary={summary} />

      <Card title="Оценки по деца">
        {isLoading ? (
          <LoadingScreen fullPage={false} />
        ) : (
          <DailyEvaluationTable
            children={dailyData?.children || []}
            rowValues={rowValues}
            rowErrors={rowErrors}
            canEdit={canEditDaily}
            onColorChange={handleColorChange}
            onCommentChange={handleCommentChange}
          />
        )}

        {canEditDaily ? (
          <div className="social-page-actions">
            <Button onClick={handleSave} loading={isSaving} disabled={isSaving || isLoading}>
              Запази дневната оценка
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
