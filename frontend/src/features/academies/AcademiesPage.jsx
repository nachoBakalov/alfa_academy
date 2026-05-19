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
import Textarea from '../../components/ui/Textarea';
import AcademyCoachesModal from './AcademyCoachesModal';
import academyService from './academyService';
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

function toDate(value) {
  return value ? String(value).slice(0, 10) : '-';
}

export default function AcademiesPage() {
  const { user } = useAuth();
  const canManage = ['super_admin', 'admin'].includes(user?.role);
  const canManageCoachAssignments = ['super_admin', 'admin', 'manager'].includes(user?.role);

  const [academies, setAcademies] = useState([]);
  const [pagination, setPagination] = useState({ limit: LIMIT, offset: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', description: '' });
  const [formErrors, setFormErrors] = useState({});

  const [confirmState, setConfirmState] = useState({ isOpen: false, academy: null });
  const [coachesModalState, setCoachesModalState] = useState({ isOpen: false, academy: null });
  const [isSaving, setIsSaving] = useState(false);

  const loadAcademies = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await academyService.listAcademies({
        limit: LIMIT,
        offset: pagination.offset,
        search: search.trim() || undefined,
        isActive: mapStatusToFilter(statusFilter),
      });

      setAcademies(response.academies);
      setPagination(response.pagination);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [pagination.offset, search, statusFilter]);

  useEffect(() => {
    loadAcademies();
  }, [loadAcademies]);

  function resetMessages() {
    setErrorMessage('');
    setSuccessMessage('');
  }

  function validateForm() {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Името е задължително.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function openCreateModal() {
    resetMessages();
    setFormErrors({});
    setIsEditMode(false);
    setFormData({ id: null, name: '', description: '' });
    setIsFormOpen(true);
  }

  function openEditModal(academy) {
    resetMessages();
    setFormErrors({});
    setIsEditMode(true);
    setFormData({
      id: academy.id,
      name: academy.name,
      description: academy.description || '',
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
        await academyService.updateAcademy(formData.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
        setSuccessMessage('Академията е обновена успешно.');
      } else {
        await academyService.createAcademy({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
        setSuccessMessage('Академията е създадена успешно.');
        setPagination((prev) => ({ ...prev, offset: 0 }));
      }

      setIsFormOpen(false);
      await loadAcademies();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange() {
    if (!confirmState.academy) {
      return;
    }

    try {
      setIsSaving(true);
      resetMessages();
      await academyService.updateAcademyStatus(confirmState.academy.id, !confirmState.academy.isActive);
      setConfirmState({ isOpen: false, academy: null });
      setSuccessMessage(
        confirmState.academy.isActive
          ? 'Академията е деактивирана успешно.'
          : 'Академията е активирана успешно.'
      );
      await loadAcademies();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const columns = useMemo(() => {
    const base = [
      {
        key: 'name',
        header: 'Име',
      },
      {
        key: 'description',
        header: 'Описание',
        render: (row) => row.description || '-',
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
      {
        key: 'createdAt',
        header: 'Създадена',
        render: (row) => toDate(row.createdAt),
      },
    ];

    if (!canManage && !canManageCoachAssignments) {
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
              <Button size="sm" variant="ghost" onClick={() => openEditModal(row)}>
                Редактирай
              </Button>
            ) : null}
            {canManage ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmState({ isOpen: true, academy: row })}
              >
                {row.isActive ? 'Деактивирай' : 'Активирай'}
              </Button>
            ) : null}
            {canManageCoachAssignments ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCoachesModalState({ isOpen: true, academy: row })}
              >
                Треньори
              </Button>
            ) : null}
          </div>
        ),
      },
    ];
  }, [canManage, canManageCoachAssignments]);

  const canGoPrev = pagination.offset > 0;
  const canGoNext = pagination.offset + pagination.limit < pagination.total;

  return (
    <div className="page-stack">
      <PageHeader
        title="Академии"
        description="Преглед и управление на академии."
        actions={
          canManage ? (
            <Button onClick={openCreateModal}>Нова академия</Button>
          ) : (
            <Badge tone="info">Преглед</Badge>
          )
        }
      />

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert type="success">{successMessage}</Alert> : null}

      <Card>
        <div className="filters-grid filters-grid-compact">
          <Input
            label="Търсене"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPagination((prev) => ({ ...prev, offset: 0 }));
            }}
            placeholder="Търсене по име или описание"
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
          rows={academies}
          isLoading={isLoading}
          emptyTitle="Няма данни за показване"
          emptyDescription="Добавете първа академия или променете филтрите."
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
        title={isEditMode ? 'Редакция на академия' : 'Нова академия'}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
              Отказ
            </Button>
            <Button type="submit" form="academy-form" loading={isSaving} disabled={isSaving}>
              Запази
            </Button>
          </>
        }
      >
        <form id="academy-form" className="modal-form" onSubmit={handleSave}>
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
        </form>
      </FormModal>

      <ConfirmDialog
        title={confirmState.academy?.isActive ? 'Деактивиране на академия' : 'Активиране на академия'}
        message={
          confirmState.academy?.isActive
            ? 'Сигурни ли сте, че искате да деактивирате академията?'
            : 'Сигурни ли сте, че искате да активирате академията?'
        }
        confirmLabel={confirmState.academy?.isActive ? 'Деактивирай' : 'Активирай'}
        isOpen={confirmState.isOpen}
        onConfirm={handleStatusChange}
        onClose={() => setConfirmState({ isOpen: false, academy: null })}
        isLoading={isSaving}
      />

      <AcademyCoachesModal
        isOpen={coachesModalState.isOpen}
        academy={coachesModalState.academy}
        onClose={() => setCoachesModalState({ isOpen: false, academy: null })}
        onSaved={loadAcademies}
      />
    </div>
  );
}
