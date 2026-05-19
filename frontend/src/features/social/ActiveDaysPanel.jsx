import { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import socialService from './socialService';
import { DAY_OF_WEEK_LABELS_BG } from './socialLabels';
import { getApiErrorMessage } from '../../utils/errorMessage';

function buildDefaultDays() {
  return [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
    dayOfWeek,
    label: DAY_OF_WEEK_LABELS_BG[dayOfWeek],
    isActive: dayOfWeek <= 5,
  }));
}

function getFriendlyError(error) {
  if (error?.response?.status === 403) {
    return 'Нямате достъп до тази група.';
  }

  return getApiErrorMessage(error, 'Възникна грешка. Опитайте отново.');
}

export default function ActiveDaysPanel({ groupId, canEdit }) {
  const [isOpen, setIsOpen] = useState(false);
  const [days, setDays] = useState(() => buildDefaultDays());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const activeCount = useMemo(() => days.filter((day) => day.isActive).length, [days]);

  const loadDays = useCallback(async () => {
    if (!groupId) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await socialService.getGroupActiveDays(groupId);
      setDays(response.activeDays);
    } catch (error) {
      setErrorMessage(getFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (isOpen) {
      loadDays();
    }
  }, [isOpen, loadDays]);

  function handleToggle(dayOfWeek) {
    if (!canEdit) {
      return;
    }

    setDays((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, isActive: !day.isActive } : day
      )
    );
  }

  async function handleSave() {
    if (!groupId || !canEdit) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      const payload = days.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        isActive: day.isActive,
      }));

      const response = await socialService.updateGroupActiveDays(groupId, payload);
      setDays(response.activeDays);
      setSuccessMessage('Активните дни са обновени успешно.');
    } catch (error) {
      setErrorMessage(getFriendlyError(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card title="Активни дни в седмицата" className="social-active-days-card">
      <div className="social-active-days-header">
        <p className="social-helper-text">
          Активни дни: {activeCount} / 7 {canEdit ? '' : '(само преглед)'}
        </p>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen((prev) => !prev)}>
          {isOpen ? 'Скрий' : 'Покажи'}
        </Button>
      </div>

      {isOpen ? (
        <div className="social-active-days-body">
          {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
          {successMessage ? <Alert type="success">{successMessage}</Alert> : null}

          {isLoading ? (
            <p className="muted-text">Зареждане на активни дни...</p>
          ) : (
            <div className="social-day-toggle-grid">
              {days.map((day) => (
                <button
                  key={day.dayOfWeek}
                  type="button"
                  className={`social-day-toggle ${day.isActive ? 'social-day-toggle-active' : ''}`.trim()}
                  onClick={() => handleToggle(day.dayOfWeek)}
                  disabled={!canEdit}
                >
                  <span>{day.label}</span>
                  <small>{day.isActive ? 'Активен' : 'Неактивен'}</small>
                </button>
              ))}
            </div>
          )}

          {canEdit ? (
            <div className="social-active-days-actions">
              <Button onClick={handleSave} loading={isSaving} disabled={isSaving || isLoading}>
                Запази активни дни
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
