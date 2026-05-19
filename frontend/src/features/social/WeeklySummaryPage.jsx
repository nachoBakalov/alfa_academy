import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LoadingScreen from '../../components/ui/LoadingScreen';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../auth/AuthProvider';
import { getApiErrorMessage } from '../../utils/errorMessage';
import SocialDateSelector from './SocialDateSelector';
import SocialGroupSelector from './SocialGroupSelector';
import WeeklyBreakdownTable from './WeeklyBreakdownTable';
import WeeklySummaryCards from './WeeklySummaryCards';
import socialService from './socialService';
import { getCurrentMondayDateString, isMonday } from './socialDateUtils';

function mapFriendlyError(error) {
  if (error?.response?.status === 403) {
    return 'Нямате достъп до тази група.';
  }

  if (error?.response?.status === 400) {
    const backendMessage = String(error?.response?.data?.message || '').toLowerCase();

    if (backendMessage.includes('monday')) {
      return 'Началната дата на седмицата трябва да е понеделник.';
    }
  }

  return getApiErrorMessage(error, 'Възникна грешка. Опитайте отново.');
}

export default function WeeklySummaryPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canRecalculate = ['super_admin', 'admin', 'coach'].includes(user?.role);
  const isManager = user?.role === 'manager';

  const [groups, setGroups] = useState([]);
  const [isGroupsLoading, setIsGroupsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const queryGroupId = searchParams.get('groupId') || '';
  const [weekStartDate, setWeekStartDate] = useState(getCurrentMondayDateString());

  const [weeklyData, setWeeklyData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [weekValidationMessage, setWeekValidationMessage] = useState('');

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

  const loadWeeklySummary = useCallback(async () => {
    if (!selectedGroupId || !weekStartDate) {
      return;
    }

    if (!isMonday(weekStartDate)) {
      setWeekValidationMessage('Началната дата на седмицата трябва да е понеделник.');
      return;
    }

    setWeekValidationMessage('');

    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await socialService.getWeeklySummary(selectedGroupId, weekStartDate);
      setWeeklyData(response);
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  }, [selectedGroupId, weekStartDate]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    loadWeeklySummary();
  }, [loadWeeklySummary]);

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

  async function handleRecalculate() {
    if (!canRecalculate || !selectedGroupId) {
      return;
    }

    if (!isMonday(weekStartDate)) {
      setWeekValidationMessage('Началната дата на седмицата трябва да е понеделник.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      const response = await socialService.recalculateWeeklySummary(selectedGroupId, weekStartDate);
      setWeeklyData((prev) => ({
        ...prev,
        ...response,
      }));
      setSuccessMessage('Седмицата е преизчислена успешно.');
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
          title="Седмичен резултат"
          description="Обобщение на дневните резултати и Алфа топки."
        />
        <Card>
          <EmptyState
            title="Няма налични групи"
            description="Добавете или активирайте група, за да видите седмично обобщение."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Седмичен резултат"
        description="Обобщение на дневните резултати и Алфа топки."
        actions={
          canRecalculate ? (
            <Button onClick={handleRecalculate} loading={isSaving} disabled={isSaving || isLoading}>
              Преизчисли седмицата
            </Button>
          ) : null
        }
      />

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert type="success">{successMessage}</Alert> : null}
      {weekValidationMessage ? <Alert type="error">{weekValidationMessage}</Alert> : null}
      {isManager ? (
        <Alert type="info">Режим преглед: преизчисляване е достъпно за супер админ, админ и треньор.</Alert>
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
            label="Начало на седмица"
            value={weekStartDate}
            onChange={(value) => {
              setWeekStartDate(value);
              setSuccessMessage('');
            }}
            helperText="Началната дата трябва да е понеделник."
            error={weekValidationMessage}
            disabled={isLoading || isSaving}
          />

          <div className="social-week-info">
            <span className="form-label">Период</span>
            <p className="social-helper-text">
              {weeklyData?.week?.weekStartDate || weekStartDate} - {weeklyData?.week?.weekEndDate || '-'}
            </p>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <LoadingScreen fullPage={false} />
      ) : (
        <>
          <WeeklySummaryCards summary={weeklyData?.summary} />
          <WeeklyBreakdownTable days={weeklyData?.days || []} />
        </>
      )}

      {canRecalculate ? (
        <div className="social-page-actions">
          <Button onClick={handleRecalculate} loading={isSaving} disabled={isSaving || isLoading}>
            Преизчисли седмицата
          </Button>
        </div>
      ) : null}
    </div>
  );
}
