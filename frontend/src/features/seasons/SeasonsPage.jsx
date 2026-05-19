import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import FormModal from '../../components/ui/FormModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import seasonService from './seasonService';
import SeasonCoachesModal from './SeasonCoachesModal';
import academyService from '../academies/academyService';
import { useAuth } from '../auth/AuthProvider';
import { getApiErrorMessage } from '../../utils/errorMessage';

const LIMIT = 50;

const statusFilterOptions = [
  { value: 'active', label: 'Активни' },
  { value: 'inactive', label: 'Неактивни' },
];

function mapStatusToFilter(statusValue) {
  if (statusValue === 'active') {
    return true;
  }

  if (statusValue === 'inactive') {
    return false;
  }

  return undefined;
}

export default function SeasonsPage() {
  const { user } = useAuth();
  const canManage = ['super_admin', 'admin'].includes(user?.role);
  const canManageSeasonCoaches = ['super_admin', 'admin', 'manager'].includes(user?.role);

  const [seasons, setSeasons] = useState([]);
  const [academies, setAcademies] = useState([]);
  const [pagination, setPagination] = useState({ limit: LIMIT, offset: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [academyFilter, setAcademyFilter] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    academyId: '',
    name: '',
    startsOn: '',
    endsOn: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const [confirmState, setConfirmState] = useState({ isOpen: false, season: null });
  const [coachModalState, setCoachModalState] = useState({ isOpen: false, season: null });

  const academyOptions = useMemo(
    () => academies.map((academy) => ({ value: String(academy.id), label: academy.name })),
    [academies]
  );

  const loadAcademies = useCallback(async () => {
    try {
      const response = await academyService.listAcademies({
        limit: 100,
        offset: 0,
        isActive: true,
      });
      setAcademies(response.academies);
    } catch (_error) {
      setAcademies([]);
    }
  }, []);

  const loadSeasons = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await seasonService.listSeasons({
        limit: LIMIT,
        offset: pagination.offset,
        search: search.trim() || undefined,
        academyId: academyFilter || undefined,
        isActive: mapStatusToFilter(statusFilter),
      });

      setSeasons(response.seasons);
      setPagination(response.pagination);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [academyFilter, pagination.offset, search, statusFilter]);

  useEffect(() => {
    loadAcademies();
  }, [loadAcademies]);

  useEffect(() => {
    loadSeasons();
  }, [loadSeasons]);

  function resetMessages() {
    setErrorMessage('');
    setSuccessMessage('');
  }

  function validateForm() {
    const nextErrors = {};

    if (!formData.academyId) {
      nextErrors.academyId = 'Академията е задължителна.';
    }

    if (!formData.name.trim()) {
      nextErrors.name = 'Името е задължително.';
    }

    if (!formData.startsOn) {
      nextErrors.startsOn = 'Началната дата е задължителна.';
    }

    if (!formData.endsOn) {
      nextErrors.endsOn = 'Крайната дата е задължителна.';
    }

    if (formData.startsOn && formData.endsOn && formData.endsOn < formData.startsOn) {
      nextErrors.endsOn = 'Крайната дата трябва да е след началната.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function openCreateModal() {
    resetMessages();
    setFormErrors({});
    setIsEditMode(false);
    setFormData({
      id: null,
      academyId: academyOptions[0]?.value || '',
      name: '',
      startsOn: '',
      endsOn: '',
    });
    setIsFormOpen(true);
  }

  function openEditModal(season) {
    resetMessages();
    setFormErrors({});
    setIsEditMode(true);
    setFormData({
      id: season.id,
      academyId: String(season.academyId),
      name: season.name,
      startsOn: season.startsOn,
      endsOn: season.endsOn,
    });
    setIsFormOpen(true);
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      resetMessages();

      if (isEditMode) {
        await seasonService.updateSeason(formData.id, {
          name: formData.name.trim(),
          startsOn: formData.startsOn,
          endsOn: formData.endsOn,
        });
        setSuccessMessage('Сезонът е обновен успешно.');
      } else {
        await seasonService.createSeason({
          academyId: Number(formData.academyId),
          name: formData.name.trim(),
          startsOn: formData.startsOn,
          endsOn: formData.endsOn,
        });
        setSuccessMessage('Сезонът е създаден успешно.');
        setPagination((prev) => ({ ...prev, offset: 0 }));
      }

      setIsFormOpen(false);
      await loadSeasons();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange() {
    if (!confirmState.season) {
      return;
    }

    try {
      setIsSaving(true);
      resetMessages();
      await seasonService.updateSeasonStatus(confirmState.season.id, !confirmState.season.isActive);
      setConfirmState({ isOpen: false, season: null });
      setSuccessMessage(
        confirmState.season.isActive
          ? 'Сезонът е деактивиран успешно.'
          : 'Сезонът е активиран успешно.'
      );
      await loadSeasons();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const columns = useMemo(() => {
    const base = [
      { key: 'name', header: 'Име' },
      {
        key: 'academy',
        header: 'Академия',
        render: (row) => row.academy?.name || '-',
      },
      { key: 'startsOn', header: 'Начало' },
      { key: 'endsOn', header: 'Край' },
      {
        key: 'status',
        header: 'Статус',
        render: (row) => (
          <Badge tone={row.isActive ? 'success' : 'neutral'}>
            {row.isActive ? 'Активен' : 'Неактивен'}
          </Badge>
        ),
      },
    ];

    if (!canManage && !canManageSeasonCoaches) {
      return base;
    }

    return [
      ...base,
      {
        key: 'actions',
        header: 'Действия',
        render: (row) => (
          <div className="table-actions">
            {canManage ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => openEditModal(row)}>
                  Редактирай
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmState({ isOpen: true, season: row })}
                >
                  {row.isActive ? 'Деактивирай' : 'Активирай'}
                </Button>
              </>
            ) : null}
            {canManageSeasonCoaches ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCoachModalState({ isOpen: true, season: row })}
              >
                Треньори
              </Button>
            ) : null}
          </div>
        ),
      },
    ];
  }, [canManage, canManageSeasonCoaches]);

  const canGoPrev = pagination.offset > 0;
  const canGoNext = pagination.offset + pagination.limit < pagination.total;

  return (
    <div className="page-stack">
      <PageHeader
        title="Сезони"
        description="Планиране и управление на сезоните в академиите."
        actions={
          canManage ? (
            <Button onClick={openCreateModal}>Нов сезон</Button>
          ) : (
            <Badge tone="info">Преглед</Badge>
          )
        }
      />

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert type="success">{successMessage}</Alert> : null}

      <Card>
        <div className="filters-grid">
          <Input
            label="Търсене"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPagination((prev) => ({ ...prev, offset: 0 }));
            }}
            placeholder="Търсене по име"
          />
          <Select
            label="Академия"
            value={academyFilter}
            onChange={(event) => {
              setAcademyFilter(event.target.value);
              setPagination((prev) => ({ ...prev, offset: 0 }));
            }}
            options={academyOptions}
            placeholder="Всички академии"
          />
          <Select
            label="Статус"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPagination((prev) => ({ ...prev, offset: 0 }));
            }}
            options={statusFilterOptions}
            placeholder="Всички"
          />
        </div>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={seasons}
          isLoading={isLoading}
          emptyTitle="Няма данни за показване"
          emptyDescription="Добавете първи сезон или променете филтрите."
        />

        <div className="pagination-row">
          <span>
            Показани: {Math.min(pagination.offset + 1, pagination.total || 0)}-
            {Math.min(pagination.offset + pagination.limit, pagination.total)} от {pagination.total}
          </span>
          <div className="pagination-actions">
            <Button
              variant="secondary"
              size="sm"
              disabled={!canGoPrev || isLoading}
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  offset: Math.max(0, prev.offset - prev.limit),
                }))
              }
            >
              Назад
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!canGoNext || isLoading}
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  offset: prev.offset + prev.limit,
                }))
              }
            >
              Напред
            </Button>
          </div>
        </div>
      </Card>

      <FormModal
        title={isEditMode ? 'Редакция на сезон' : 'Нов сезон'}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
              Отказ
            </Button>
            <Button type="submit" form="season-form" loading={isSaving} disabled={isSaving}>
              Запази
            </Button>
          </>
        }
      >
        <form id="season-form" className="modal-form" onSubmit={handleSave}>
          <Select
            label="Академия"
            value={formData.academyId}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, academyId: event.target.value }))
            }
            options={academyOptions}
            placeholder="Изберете академия"
            error={formErrors.academyId}
            disabled={isEditMode}
          />
          <Input
            label="Име"
            value={formData.name}
            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            error={formErrors.name}
          />
          <Input
            label="Начало"
            type="date"
            value={formData.startsOn}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, startsOn: event.target.value }))
            }
            error={formErrors.startsOn}
          />
          <Input
            label="Край"
            type="date"
            value={formData.endsOn}
            onChange={(event) => setFormData((prev) => ({ ...prev, endsOn: event.target.value }))}
            error={formErrors.endsOn}
          />
        </form>
      </FormModal>

      <ConfirmDialog
        title={confirmState.season?.isActive ? 'Деактивиране на сезон' : 'Активиране на сезон'}
        message={
          confirmState.season?.isActive
            ? 'Сигурни ли сте, че искате да деактивирате сезона?'
            : 'Сигурни ли сте, че искате да активирате сезона?'
        }
        confirmLabel={confirmState.season?.isActive ? 'Деактивирай' : 'Активирай'}
        isOpen={confirmState.isOpen}
        onConfirm={handleStatusChange}
        onClose={() => setConfirmState({ isOpen: false, season: null })}
        isLoading={isSaving}
      />

      <SeasonCoachesModal
        isOpen={coachModalState.isOpen}
        season={coachModalState.season}
        onClose={() => setCoachModalState({ isOpen: false, season: null })}
        onSaved={loadSeasons}
        canManage={canManageSeasonCoaches}
      />
    </div>
  );
}
