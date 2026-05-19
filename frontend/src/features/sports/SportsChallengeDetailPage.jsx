import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LoadingScreen from '../../components/ui/LoadingScreen';
import PageHeader from '../../components/ui/PageHeader';
import StatusPill from '../../components/ui/StatusPill';
import { useAuth } from '../auth/AuthProvider';
import { getApiErrorMessage } from '../../utils/errorMessage';
import SportsChallengeFormModal from './SportsChallengeFormModal';
import SportsChallengeStatusModal from './SportsChallengeStatusModal';
import SportsChallengeSummaryCards from './SportsChallengeSummaryCards';
import SportsResultsTable from './SportsResultsTable';
import {
  formatChallengeStatus,
  getChallengeStatusTone,
  formatFinalStatus,
  getFinalStatusTone,
} from './sportsLabels';
import { formatDate, formatPercent } from './sportsFormatters';
import sportsService from './sportsService';

function mapFriendlyError(error) {
  if (error?.response?.status === 403) {
    return 'Нямате достъп до това спортно предизвикателство.';
  }

  if (error?.response?.status === 404) {
    return 'Предизвикателството не е намерено.';
  }

  if (error?.response?.status === 409) {
    const backendMessage = String(error?.response?.data?.message || '').toLowerCase();

    if (backendMessage.includes('archived')) {
      return 'Архивирано предизвикателство не може да бъде редактирано.';
    }
  }

  return getApiErrorMessage(error, 'Възникна грешка. Опитайте отново.');
}

function mapResultState(results = []) {
  const next = {};

  for (const row of results) {
    const childId = row.child?.id;

    if (!childId) {
      continue;
    }

    next[childId] = {
      baselineValue: row.baselineValue !== null && row.baselineValue !== undefined ? String(row.baselineValue) : '',
      finalValue: row.finalValue !== null && row.finalValue !== undefined ? String(row.finalValue) : '',
      notes: row.notes || '',
    };
  }

  return next;
}

function toNullableNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return null;
  }

  return numeric;
}

function normalizeNote(value) {
  return String(value || '').trim();
}

export default function SportsChallengeDetailPage() {
  const navigate = useNavigate();
  const { challengeId } = useParams();
  const { user } = useAuth();

  const canManageSports = ['super_admin', 'admin', 'coach'].includes(user?.role);
  const isManager = user?.role === 'manager';

  const [challenge, setChallenge] = useState(null);
  const [rowValues, setRowValues] = useState({});
  const [initialRowValues, setInitialRowValues] = useState({});
  const [rowErrors, setRowErrors] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingResults, setIsSavingResults] = useState(false);
  const [isSavingChallenge, setIsSavingChallenge] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isArchived = challenge?.status === 'archived';

  const canSaveResults = useMemo(() => canManageSports && !isArchived, [canManageSports, isArchived]);

  const loadChallenge = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const details = await sportsService.getChallenge(challengeId);
      const resultState = mapResultState(details.results);

      setChallenge(details);
      setRowValues(resultState);
      setInitialRowValues(resultState);
      setRowErrors({});
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  function handleRowValueChange(childId, field, value) {
    setRowValues((prev) => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        [field]: value,
      },
    }));

    setRowErrors((prev) => ({
      ...prev,
      [childId]: '',
    }));
  }

  function buildResultsPayload() {
    const results = [];
    const nextErrors = {};

    for (const row of challenge?.results || []) {
      const childId = row.child?.id;
      const state = rowValues[childId] || {};
      const initialState = initialRowValues[childId] || {};

      const baselineValue = toNullableNumber(state.baselineValue);
      const finalValue = toNullableNumber(state.finalValue);
      const notes = normalizeNote(state.notes);

      const initialBaselineValue = toNullableNumber(initialState.baselineValue);
      const initialFinalValue = toNullableNumber(initialState.finalValue);
      const initialNotes = normalizeNote(initialState.notes);

      const hasChanged =
        baselineValue !== initialBaselineValue ||
        finalValue !== initialFinalValue ||
        notes !== initialNotes;

      if (!hasChanged) {
        continue;
      }

      if (baselineValue !== null && baselineValue < 0) {
        nextErrors[childId] = 'Първият резултат не може да е отрицателен.';
        continue;
      }

      if (finalValue !== null && finalValue < 0) {
        nextErrors[childId] = 'Финалният резултат не може да е отрицателен.';
        continue;
      }

      if (baselineValue === null && finalValue === null) {
        nextErrors[childId] = 'Нужен е поне първи или финален резултат при промяна на реда.';
        continue;
      }

      const nextResult = {
        childId,
      };

      if (baselineValue !== null) {
        nextResult.baselineValue = baselineValue;
      }

      if (finalValue !== null) {
        nextResult.finalValue = finalValue;
      }

      if (notes) {
        nextResult.notes = notes;
      }

      results.push(nextResult);
    }

    return {
      results,
      nextErrors,
    };
  }

  async function handleSaveResults() {
    if (!challenge || !canSaveResults) {
      return;
    }

    const { results, nextErrors } = buildResultsPayload();

    setRowErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setErrorMessage('Има редове с невалидни стойности. Проверете таблицата и опитайте отново.');
      return;
    }

    if (!results.length) {
      setErrorMessage('Няма променени редове за запазване.');
      return;
    }

    try {
      setIsSavingResults(true);
      setErrorMessage('');
      setSuccessMessage('');

      await sportsService.saveChallengeResults(challenge.id, { results });
      setSuccessMessage('Резултатите са запазени успешно.');
      await loadChallenge();
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsSavingResults(false);
    }
  }

  async function handleEditChallenge(payload) {
    if (!challenge || !canManageSports) {
      return;
    }

    try {
      setIsSavingChallenge(true);
      setErrorMessage('');
      setSuccessMessage('');

      await sportsService.updateChallenge(challenge.id, payload);
      setIsEditModalOpen(false);
      setSuccessMessage('Предизвикателството е обновено успешно.');
      await loadChallenge();
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsSavingChallenge(false);
    }
  }

  async function handleUpdateStatus(status) {
    if (!challenge || !canManageSports) {
      return;
    }

    try {
      setIsSavingChallenge(true);
      setErrorMessage('');
      setSuccessMessage('');

      await sportsService.updateChallengeStatus(challenge.id, status);
      setIsStatusModalOpen(false);
      setSuccessMessage('Статусът е обновен успешно.');
      await loadChallenge();
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsSavingChallenge(false);
    }
  }

  async function handleRecalculate() {
    if (!challenge || !canManageSports) {
      return;
    }

    try {
      setIsRecalculating(true);
      setErrorMessage('');
      setSuccessMessage('');

      await sportsService.recalculateChallenge(challenge.id);
      setSuccessMessage('Обобщението е преизчислено успешно.');
      await loadChallenge();
    } catch (error) {
      setErrorMessage(mapFriendlyError(error));
    } finally {
      setIsRecalculating(false);
    }
  }

  if (isLoading) {
    return <LoadingScreen fullPage={false} />;
  }

  if (!challenge) {
    return (
      <div className="page-stack">
        <PageHeader title="Детайли за предизвикателство" />
        <Card>
          <EmptyState title="Няма данни" description="Предизвикателството не е намерено." />
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={challenge.title}
        description={`${challenge.group?.name || '-'} · ${challenge.definition?.name || '-'}`}
        actions={
          <div className="sports-page-actions">
            <Button variant="ghost" onClick={() => navigate('/sports')}>
              Назад към списъка
            </Button>
            {canManageSports ? (
              <Button
                variant="secondary"
                onClick={handleRecalculate}
                loading={isRecalculating}
                disabled={isRecalculating || isSavingResults || isSavingChallenge}
              >
                Преизчисли обобщението
              </Button>
            ) : null}
            {canManageSports ? (
              <Button
                variant="ghost"
                onClick={() => setIsStatusModalOpen(true)}
                disabled={isSavingResults || isSavingChallenge || isRecalculating}
              >
                Промени статус
              </Button>
            ) : null}
            {canManageSports ? (
              <Button
                onClick={() => setIsEditModalOpen(true)}
                disabled={isSavingResults || isSavingChallenge || isRecalculating}
              >
                Редактирай
              </Button>
            ) : null}
          </div>
        }
      />

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert type="success">{successMessage}</Alert> : null}
      {isManager ? (
        <Alert type="info">Режим преглед: резултатите са само за четене за мениджър.</Alert>
      ) : null}
      {isArchived ? (
        <Alert type="info">
          Предизвикателството е архивирано. Резултатите са само за четене, но може да преглеждате
          обобщението.
        </Alert>
      ) : null}

      <Card>
        <div className="sports-meta-grid">
          <article>
            <span className="muted-text">Статус</span>
            <StatusPill
              label={formatChallengeStatus(challenge.status)}
              tone={getChallengeStatusTone(challenge.status)}
            />
          </article>
          <article>
            <span className="muted-text">Финален статус</span>
            <StatusPill
              label={formatFinalStatus(challenge.summary?.finalStatus)}
              tone={getFinalStatusTone(challenge.summary?.finalStatus)}
            />
          </article>
          <article>
            <span className="muted-text">Период</span>
            <strong>
              {formatDate(challenge.startsOn)} - {formatDate(challenge.endsOn)}
            </strong>
          </article>
          <article>
            <span className="muted-text">Мерна единица</span>
            <strong>{challenge.unit || '-'}</strong>
          </article>
          <article>
            <span className="muted-text">Таргет редукция</span>
            <strong>{formatPercent(challenge.targetReductionPercent)}</strong>
          </article>
          <article>
            <span className="muted-text">Fail-safe праг</span>
            <strong>{formatPercent(challenge.failSafeThresholdPercent)}</strong>
          </article>
        </div>

        {challenge.description ? <p className="sports-description">{challenge.description}</p> : null}
      </Card>

      <SportsChallengeSummaryCards summary={challenge.summary} unit={challenge.unit} />

      <Card title="Резултати по деца">
        <SportsResultsTable
          rows={challenge.results || []}
          valuesByChildId={rowValues}
          errorsByChildId={rowErrors}
          canEdit={canSaveResults}
          unit={challenge.unit}
          onValueChange={handleRowValueChange}
        />

        {canSaveResults ? (
          <div className="sports-page-actions">
            <Button
              onClick={handleSaveResults}
              loading={isSavingResults}
              disabled={isSavingResults || isSavingChallenge || isRecalculating}
            >
              Запази резултатите
            </Button>
          </div>
        ) : null}
      </Card>

      {canManageSports ? (
        <SportsChallengeFormModal
          mode="edit"
          isOpen={isEditModalOpen}
          initialValues={{
            title: challenge.title,
            description: challenge.description,
            startsOn: challenge.startsOn,
            endsOn: challenge.endsOn,
            targetReductionPercent: challenge.targetReductionPercent,
            failSafeThresholdPercent: challenge.failSafeThresholdPercent,
          }}
          isSaving={isSavingChallenge}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEditChallenge}
        />
      ) : null}

      {canManageSports ? (
        <SportsChallengeStatusModal
          isOpen={isStatusModalOpen}
          currentStatus={challenge.status}
          isSaving={isSavingChallenge}
          onClose={() => setIsStatusModalOpen(false)}
          onSubmit={handleUpdateStatus}
        />
      ) : null}
    </div>
  );
}
