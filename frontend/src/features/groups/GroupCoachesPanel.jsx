import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import groupService from './groupService';
import { useAuth } from '../auth/AuthProvider';
import { getApiErrorMessage } from '../../utils/errorMessage';

function toCoachOption(coach) {
  return {
    value: String(coach.id),
    label: `${coach.firstName} ${coach.lastName} (${coach.email})`,
  };
}

export default function GroupCoachesPanel({ group }) {
  const { user } = useAuth();
  const canManage = ['super_admin', 'admin', 'manager'].includes(user?.role);

  const [coaches, setCoaches] = useState([]);
  const [availableCoaches, setAvailableCoaches] = useState([]);
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const refreshCoaches = useCallback(async () => {
    const list = await groupService.listGroupCoaches(group.id);
    setCoaches(list);
  }, [group.id]);

  const loadAssignableCoaches = useCallback(async () => {
    if (!canManage) {
      setAvailableCoaches([]);
      return;
    }

    try {
      const response = await groupService.listCoachDirectory({
        limit: 100,
        offset: 0,
      });
      setAvailableCoaches(response.coaches || []);
    } catch (_error) {
      setAvailableCoaches([]);
    }
  }, [canManage]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      await Promise.all([refreshCoaches(), loadAssignableCoaches()]);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [loadAssignableCoaches, refreshCoaches]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const options = useMemo(() => {
    const assigned = new Set(coaches.map((coach) => Number(coach.id)));
    return availableCoaches
      .filter((coach) => !assigned.has(Number(coach.id)))
      .map(toCoachOption);
  }, [availableCoaches, coaches]);

  async function handleAssignCoach(event) {
    event.preventDefault();

    if (!selectedCoachId) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await groupService.assignCoach(group.id, {
        coachId: Number(selectedCoachId),
        isPrimary,
      });

      setSelectedCoachId('');
      setIsPrimary(false);
      setSuccessMessage('Треньорът е назначен успешно.');
      await refreshCoaches();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetPrimary(coachId) {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await groupService.updateCoachAssignment(group.id, coachId, { isPrimary: true });
      setSuccessMessage('Основният треньор е обновен.');
      await refreshCoaches();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUnassign(coachId) {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await groupService.unassignCoach(group.id, coachId);
      setSuccessMessage('Треньорът е премахнат от групата.');
      await refreshCoaches();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card title="Треньори на групата">
      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert type="success">{successMessage}</Alert> : null}

      {isLoading ? (
        <p className="muted-text">Зареждане...</p>
      ) : (
        <div className="coach-modal-stack">
          <div className="coach-list">
            {coaches.length === 0 ? (
              <p className="muted-text">Няма назначени треньори.</p>
            ) : (
              coaches.map((coach) => (
                <div className="coach-item" key={coach.id}>
                  <div>
                    <strong>
                      {coach.firstName} {coach.lastName}
                    </strong>
                    <p>{coach.email}</p>
                  </div>
                  <div className="coach-item-actions">
                    {coach.isPrimary ? <Badge tone="success">Основен</Badge> : null}
                    {canManage && !coach.isPrimary ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSetPrimary(coach.id)}
                        disabled={isSaving}
                      >
                        Направи основен
                      </Button>
                    ) : null}
                    {canManage ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnassign(coach.id)}
                        disabled={isSaving}
                      >
                        Премахни
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          {canManage ? (
            <form className="coach-assign-form" onSubmit={handleAssignCoach}>
              <Select
                label="Добави треньор"
                value={selectedCoachId}
                onChange={(event) => setSelectedCoachId(event.target.value)}
                options={options}
                placeholder={options.length ? 'Изберете треньор' : 'Няма налични треньори'}
              />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(event) => setIsPrimary(event.target.checked)}
                />
                Назначи като основен треньор
              </label>
              <Button type="submit" disabled={!selectedCoachId || isSaving} loading={isSaving}>
                Добави
              </Button>
            </form>
          ) : null}
        </div>
      )}
    </Card>
  );
}
