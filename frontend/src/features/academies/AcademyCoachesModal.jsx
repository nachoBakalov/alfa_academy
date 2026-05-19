import { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import FormModal from '../../components/ui/FormModal';
import Select from '../../components/ui/Select';
import groupService from '../groups/groupService';
import coachAcademyService from '../coach/coachAcademyService';
import { getApiErrorMessage } from '../../utils/errorMessage';

function formatCoachName(coach = {}) {
  const fullName = `${coach.firstName || ''} ${coach.lastName || ''}`.trim();
  return fullName || coach.email || `Треньор #${coach.id}`;
}

function formatAssignedAt(value) {
  if (!value) {
    return '-';
  }

  return String(value).slice(0, 10);
}

export default function AcademyCoachesModal({ isOpen, academy, onClose, onSaved }) {
  const [assignedCoaches, setAssignedCoaches] = useState([]);
  const [directoryCoaches, setDirectoryCoaches] = useState([]);
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmState, setConfirmState] = useState({ isOpen: false, coach: null });

  const loadData = useCallback(async () => {
    if (!isOpen || !academy?.id) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const [assignedResponse, directoryResponse] = await Promise.all([
        coachAcademyService.listAcademyCoaches(academy.id),
        groupService.listCoachDirectory({ limit: 100, offset: 0 }),
      ]);

      setAssignedCoaches(assignedResponse.coaches || []);
      setDirectoryCoaches(directoryResponse.coaches || []);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setAssignedCoaches([]);
      setDirectoryCoaches([]);
    } finally {
      setIsLoading(false);
    }
  }, [academy?.id, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedCoachId('');
    setSuccessMessage('');
    setErrorMessage('');
    setConfirmState({ isOpen: false, coach: null });
    loadData();
  }, [isOpen, loadData]);

  const assignableCoachOptions = useMemo(() => {
    const assignedIds = new Set((assignedCoaches || []).map((coach) => String(coach.id)));

    return (directoryCoaches || [])
      .filter((coach) => !assignedIds.has(String(coach.id)))
      .map((coach) => ({
        value: String(coach.id),
        label: `${formatCoachName(coach)} (${coach.email})`,
      }));
  }, [assignedCoaches, directoryCoaches]);

  async function handleAssignCoach() {
    if (!selectedCoachId || !academy?.id) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await coachAcademyService.assignCoachToAcademy({
        academyId: Number(academy.id),
        coachId: Number(selectedCoachId),
      });

      setSelectedCoachId('');
      setSuccessMessage('Треньорът е назначен към академията.');
      await loadData();
      if (onSaved) {
        await onSaved();
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUnassignCoach() {
    const coach = confirmState.coach;

    if (!coach || !academy?.id) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await coachAcademyService.unassignCoachFromAcademy(Number(academy.id), Number(coach.id));

      setConfirmState({ isOpen: false, coach: null });
      setSuccessMessage('Треньорът е премахнат от академията.');
      await loadData();
      if (onSaved) {
        await onSaved();
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <FormModal
        title={academy ? `Треньори към академия: ${academy.name}` : 'Треньори към академия'}
        isOpen={isOpen}
        onClose={onClose}
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Затвори
            </Button>
          </>
        }
      >
        <div className="academy-coaches-modal-stack">
          {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
          {successMessage ? <Alert type="success">{successMessage}</Alert> : null}

          <div className="academy-coaches-assign-row">
            <Select
              label="Добави треньор"
              value={selectedCoachId}
              onChange={(event) => setSelectedCoachId(event.target.value)}
              options={assignableCoachOptions}
              placeholder={isLoading ? 'Зареждане...' : 'Изберете треньор'}
              disabled={isLoading || isSaving || !assignableCoachOptions.length}
            />
            <Button
              onClick={handleAssignCoach}
              loading={isSaving}
              disabled={!selectedCoachId || isLoading || isSaving}
            >
              Назначи
            </Button>
          </div>

          {!isLoading && !assignableCoachOptions.length ? (
            <Alert type="info">Всички налични треньори вече са назначени към тази академия.</Alert>
          ) : null}

          <div className="academy-coaches-list">
            {(assignedCoaches || []).map((coach) => (
              <article key={coach.id} className="academy-coaches-item">
                <div>
                  <strong>{formatCoachName(coach)}</strong>
                  <p>{coach.email || '-'}</p>
                  <p>Назначен на: {formatAssignedAt(coach.assignedAt)}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmState({ isOpen: true, coach })}
                  disabled={isSaving}
                >
                  Премахни
                </Button>
              </article>
            ))}
          </div>

          {!isLoading && !(assignedCoaches || []).length ? (
            <Alert type="info">Все още няма назначени треньори към тази академия.</Alert>
          ) : null}
        </div>
      </FormModal>

      <ConfirmDialog
        title="Премахване на треньор от академия"
        message={
          confirmState.coach
            ? `Сигурни ли сте, че искате да премахнете ${formatCoachName(confirmState.coach)} от тази академия?`
            : 'Сигурни ли сте, че искате да премахнете треньора от тази академия?'
        }
        confirmLabel="Премахни"
        isOpen={confirmState.isOpen}
        onConfirm={handleUnassignCoach}
        onClose={() => setConfirmState({ isOpen: false, coach: null })}
        isLoading={isSaving}
      />
    </>
  );
}
