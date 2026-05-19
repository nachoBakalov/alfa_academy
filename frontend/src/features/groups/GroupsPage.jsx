import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import FormModal from '../../components/ui/FormModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import groupService from './groupService';
import academyService from '../academies/academyService';
import { useAuth } from '../auth/AuthProvider';
import { getApiErrorMessage } from '../../utils/errorMessage';

const LIMIT = 50;
const META_LIMIT = 100;

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

function toNullableNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function GroupsPage() {
  const { user } = useAuth();
  const canEditGroups = ['super_admin', 'admin'].includes(user?.role);
  const canManageCoaches = ['super_admin', 'admin', 'manager'].includes(user?.role);

  const [groups, setGroups] = useState([]);
  const [pagination, setPagination] = useState({ limit: LIMIT, offset: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [academies, setAcademies] = useState([]);
  const [coachOptions, setCoachOptions] = useState([]);

  const [search, setSearch] = useState('');
  const [academyFilter, setAcademyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    academyId: '',
    name: '',
    description: '',
    ageMin: '',
    ageMax: '',
    capacity: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const [confirmState, setConfirmState] = useState({ isOpen: false, group: null });

  const [coachModalState, setCoachModalState] = useState({
    isOpen: false,
    group: null,
    coaches: [],
    isLoading: false,
    selectedCoachId: '',
    isPrimary: false,
  });
  const [removeCoachState, setRemoveCoachState] = useState({ isOpen: false, coach: null });

  const academyOptions = useMemo(
    () => academies.map((academy) => ({ value: String(academy.id), label: academy.name })),
    [academies]
  );

  const availableCoachOptions = useMemo(() => {
    const assignedIds = new Set((coachModalState.coaches || []).map((coach) => Number(coach.id)));

    return coachOptions
      .filter((coach) => !assignedIds.has(Number(coach.id)))
      .map((coach) => ({
        value: String(coach.id),
        label: `${coach.firstName} ${coach.lastName} (${coach.email})`,
      }));
  }, [coachModalState.coaches, coachOptions]);

  const loadMeta = useCallback(async () => {
    try {
      const academyResponse = await academyService.listAcademies({
        limit: META_LIMIT,
        offset: 0,
      });

      setAcademies(academyResponse.academies);
    } catch (error) {
      setAcademies([]);
      setErrorMessage(getApiErrorMessage(error, 'Неуспешно зареждане на академии.'));
    }

    if (canManageCoaches) {
      try {
        const coachResponse = await groupService.listCoachDirectory({
          limit: 100,
          offset: 0,
        });
        setCoachOptions(coachResponse.coaches || []);
      } catch (_error) {
        setCoachOptions([]);
      }
    }
  }, [canManageCoaches]);

  const loadGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await groupService.listGroups({
        limit: LIMIT,
        offset: pagination.offset,
        search: search.trim() || undefined,
        academyId: academyFilter || undefined,
        isActive: mapStatusToFilter(statusFilter),
      });

      setGroups(response.groups);
      setPagination(response.pagination);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [academyFilter, pagination.offset, search, statusFilter]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

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

    const ageMinValue = toNullableNumber(formData.ageMin);
    const ageMaxValue = toNullableNumber(formData.ageMax);
    const capacityValue = toNullableNumber(formData.capacity);

    if (ageMinValue !== undefined && ageMinValue < 0) {
      nextErrors.ageMin = 'Минималната възраст трябва да е >= 0.';
    }

    if (ageMaxValue !== undefined && ageMaxValue < 0) {
      nextErrors.ageMax = 'Максималната възраст трябва да е >= 0.';
    }

    if (
      ageMinValue !== undefined &&
      ageMaxValue !== undefined &&
      ageMaxValue < ageMinValue
    ) {
      nextErrors.ageMax = 'Максималната възраст трябва да е >= минималната.';
    }

    if (capacityValue !== undefined && capacityValue <= 0) {
      nextErrors.capacity = 'Капацитетът трябва да е положително число.';
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
      description: '',
      ageMin: '',
      ageMax: '',
      capacity: '',
    });
    setIsFormOpen(true);
  }

  function openEditModal(group) {
    resetMessages();
    setFormErrors({});
    setIsEditMode(true);
    setFormData({
      id: group.id,
      academyId: String(group.academy?.id || ''),
      name: group.name,
      description: group.description || '',
      ageMin: group.ageMin ?? '',
      ageMax: group.ageMax ?? '',
      capacity: group.capacity ?? '',
    });
    setIsFormOpen(true);
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      academyId: Number(formData.academyId),
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      ageMin: toNullableNumber(formData.ageMin),
      ageMax: toNullableNumber(formData.ageMax),
      capacity: toNullableNumber(formData.capacity),
    };

    try {
      setIsSaving(true);
      resetMessages();

      if (isEditMode) {
        const updatePayload = {
          name: payload.name,
          description: payload.description,
          ageMin: payload.ageMin,
          ageMax: payload.ageMax,
          capacity: payload.capacity,
        };
        await groupService.updateGroup(formData.id, updatePayload);
        setSuccessMessage('Групата е обновена успешно.');
      } else {
        await groupService.createGroup(payload);
        setSuccessMessage('Групата е създадена успешно.');
        setPagination((prev) => ({ ...prev, offset: 0 }));
      }

      setIsFormOpen(false);
      await loadGroups();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange() {
    if (!confirmState.group) {
      return;
    }

    try {
      setIsSaving(true);
      resetMessages();
      await groupService.updateGroupStatus(confirmState.group.id, !confirmState.group.isActive);
      setConfirmState({ isOpen: false, group: null });
      setSuccessMessage(
        confirmState.group.isActive
          ? 'Групата е деактивирана успешно.'
          : 'Групата е активирана успешно.'
      );
      await loadGroups();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function openCoachModal(group) {
    setCoachModalState({
      isOpen: true,
      group,
      coaches: [],
      isLoading: true,
      selectedCoachId: '',
      isPrimary: false,
    });

    try {
      const coaches = await groupService.listGroupCoaches(group.id);
      setCoachModalState((prev) => ({
        ...prev,
        coaches,
        isLoading: false,
      }));
    } catch (error) {
      setCoachModalState((prev) => ({ ...prev, isLoading: false }));
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  async function refreshCoachList() {
    if (!coachModalState.group) {
      return;
    }

    try {
      const coaches = await groupService.listGroupCoaches(coachModalState.group.id);
      setCoachModalState((prev) => ({
        ...prev,
        coaches,
      }));
      await loadGroups();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  async function handleAssignCoach(event) {
    event.preventDefault();

    if (!coachModalState.group || !coachModalState.selectedCoachId) {
      return;
    }

    try {
      setIsSaving(true);
      resetMessages();
      await groupService.assignCoach(coachModalState.group.id, {
        coachId: Number(coachModalState.selectedCoachId),
        isPrimary: coachModalState.isPrimary,
      });
      setSuccessMessage('Треньорът е добавен успешно.');
      setCoachModalState((prev) => ({
        ...prev,
        selectedCoachId: '',
        isPrimary: false,
      }));
      await refreshCoachList();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetPrimary(coach) {
    if (!coachModalState.group) {
      return;
    }

    try {
      setIsSaving(true);
      resetMessages();
      await groupService.updateCoachAssignment(coachModalState.group.id, coach.id, {
        isPrimary: true,
      });
      setSuccessMessage('Основният треньор е обновен успешно.');
      await refreshCoachList();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveCoach() {
    if (!coachModalState.group || !removeCoachState.coach) {
      return;
    }

    try {
      setIsSaving(true);
      resetMessages();
      await groupService.unassignCoach(coachModalState.group.id, removeCoachState.coach.id);
      setRemoveCoachState({ isOpen: false, coach: null });
      setSuccessMessage('Треньорът е премахнат успешно.');
      await refreshCoachList();
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
      {
        key: 'capacity',
        header: 'Капацитет',
        render: (row) => row.capacity ?? '-',
      },
      {
        key: 'age',
        header: 'Възраст',
        render: (row) => {
          if (row.ageMin === null || row.ageMin === undefined) {
            return '-';
          }

          if (row.ageMax === null || row.ageMax === undefined) {
            return `${row.ageMin}+`;
          }

          return `${row.ageMin}-${row.ageMax}`;
        },
      },
      {
        key: 'coaches',
        header: 'Треньори',
        render: (row) => (
          <button className="text-button" type="button" onClick={() => openCoachModal(row)}>
            {row.coaches?.length ? `Преглед (${row.coaches.length})` : 'Преглед (0)'}
          </button>
        ),
      },
      {
        key: 'status',
        header: 'Статус',
        render: (row) => (
          <Badge tone={row.isActive ? 'success' : 'neutral'}>
            {row.isActive ? 'Активна' : 'Неактивна'}
          </Badge>
        ),
      },
    ];

    return [
      ...base,
      {
        key: 'actions',
        header: 'Действия',
        render: (row) => (
          <div className="table-actions">
            <Link className="btn btn-secondary btn-sm" to={`/groups/${row.id}/manage`}>
              Управление
            </Link>
            {canEditGroups ? (
              <Button size="sm" variant="ghost" onClick={() => openEditModal(row)}>
                Редактирай
              </Button>
            ) : null}
            {canEditGroups ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmState({ isOpen: true, group: row })}
              >
                {row.isActive ? 'Деактивирай' : 'Активирай'}
              </Button>
            ) : null}
          </div>
        ),
      },
    ];
  }, [canEditGroups]);

  const canGoPrev = pagination.offset > 0;
  const canGoNext = pagination.offset + pagination.limit < pagination.total;

  return (
    <div className="page-stack">
      <PageHeader
        title="Групи"
        description="Управление на групи и треньорски назначения."
        actions={
          canEditGroups ? (
            <Button onClick={openCreateModal}>Нова група</Button>
          ) : (
            <Badge tone="info">Преглед</Badge>
          )
        }
      />

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert type="success">{successMessage}</Alert> : null}

      <Card>
        <div className="filters-grid filters-grid-wide">
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
          rows={groups}
          isLoading={isLoading}
          emptyTitle="Няма данни за показване"
          emptyDescription="Добавете първа група или променете филтрите."
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
        title={isEditMode ? 'Редакция на група' : 'Нова група'}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
              Отказ
            </Button>
            <Button type="submit" form="group-form" loading={isSaving} disabled={isSaving}>
              Запази
            </Button>
          </>
        }
      >
        <form id="group-form" className="modal-form" onSubmit={handleSave}>
          <Select
            label="Академия"
            value={formData.academyId}
            onChange={(event) => setFormData((prev) => ({ ...prev, academyId: event.target.value }))}
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
          <Textarea
            label="Описание"
            value={formData.description}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="Кратко описание"
          />
          <Input
            label="Минимална възраст"
            type="number"
            value={formData.ageMin}
            onChange={(event) => setFormData((prev) => ({ ...prev, ageMin: event.target.value }))}
            min={0}
            error={formErrors.ageMin}
          />
          <Input
            label="Максимална възраст"
            type="number"
            value={formData.ageMax}
            onChange={(event) => setFormData((prev) => ({ ...prev, ageMax: event.target.value }))}
            min={0}
            error={formErrors.ageMax}
          />
          <Input
            label="Капацитет"
            type="number"
            value={formData.capacity}
            onChange={(event) => setFormData((prev) => ({ ...prev, capacity: event.target.value }))}
            min={1}
            error={formErrors.capacity}
          />
        </form>
      </FormModal>

      <FormModal
        title={coachModalState.group ? `Треньори към ${coachModalState.group.name}` : 'Треньори към група'}
        isOpen={coachModalState.isOpen}
        onClose={() =>
          setCoachModalState({
            isOpen: false,
            group: null,
            coaches: [],
            isLoading: false,
            selectedCoachId: '',
            isPrimary: false,
          })
        }
      >
        {coachModalState.isLoading ? (
          <p className="muted-text">Зареждане на треньори...</p>
        ) : (
          <div className="coach-modal-stack">
            <div className="coach-list">
              {coachModalState.coaches.length === 0 ? (
                <p className="muted-text">Няма назначени треньори.</p>
              ) : (
                coachModalState.coaches.map((coach) => (
                  <div className="coach-item" key={coach.id}>
                    <div>
                      <strong>
                        {coach.firstName} {coach.lastName}
                      </strong>
                      <p>{coach.email}</p>
                    </div>
                    <div className="coach-item-actions">
                      {coach.isPrimary ? <Badge tone="success">Основен</Badge> : null}
                      {canManageCoaches && !coach.isPrimary ? (
                        <Button size="sm" variant="secondary" onClick={() => handleSetPrimary(coach)}>
                          Направи основен
                        </Button>
                      ) : null}
                      {canManageCoaches ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRemoveCoachState({ isOpen: true, coach })}
                        >
                          Премахни
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            {canManageCoaches ? (
              <form className="coach-assign-form" onSubmit={handleAssignCoach}>
                <Select
                  label="Добави треньор"
                  value={coachModalState.selectedCoachId}
                  onChange={(event) =>
                    setCoachModalState((prev) => ({
                      ...prev,
                      selectedCoachId: event.target.value,
                    }))
                  }
                  options={availableCoachOptions}
                  placeholder="Изберете треньор"
                />
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={coachModalState.isPrimary}
                    onChange={(event) =>
                      setCoachModalState((prev) => ({
                        ...prev,
                        isPrimary: event.target.checked,
                      }))
                    }
                  />
                  Назначи като основен треньор
                </label>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!coachModalState.selectedCoachId || isSaving}
                  loading={isSaving}
                >
                  Добави
                </Button>
              </form>
            ) : null}
          </div>
        )}
      </FormModal>

      <ConfirmDialog
        title={confirmState.group?.isActive ? 'Деактивиране на група' : 'Активиране на група'}
        message={
          confirmState.group?.isActive
            ? 'Сигурни ли сте, че искате да деактивирате групата?'
            : 'Сигурни ли сте, че искате да активирате групата?'
        }
        confirmLabel={confirmState.group?.isActive ? 'Деактивирай' : 'Активирай'}
        isOpen={confirmState.isOpen}
        onConfirm={handleStatusChange}
        onClose={() => setConfirmState({ isOpen: false, group: null })}
        isLoading={isSaving}
      />

      <ConfirmDialog
        title="Премахване на треньор"
        message="Сигурни ли сте, че искате да премахнете треньора от групата?"
        confirmLabel="Премахни"
        isOpen={removeCoachState.isOpen}
        onConfirm={handleRemoveCoach}
        onClose={() => setRemoveCoachState({ isOpen: false, coach: null })}
        isLoading={isSaving}
      />
    </div>
  );
}
