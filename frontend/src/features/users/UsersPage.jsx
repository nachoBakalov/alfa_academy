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
import userService from './userService';
import { useAuth } from '../auth/AuthProvider';
import { getApiErrorMessage } from '../../utils/errorMessage';

const ROLE_LABELS = {
  super_admin: 'Супер администратор',
  admin: 'Администратор',
  manager: 'Мениджър',
  coach: 'Треньор',
};

const LIMIT = 50;

const statusFilterOptions = [
  { value: 'active', label: 'Активни' },
  { value: 'inactive', label: 'Неактивни' },
];

const roleFilterOptions = [
  { value: 'admin', label: ROLE_LABELS.admin },
  { value: 'manager', label: ROLE_LABELS.manager },
  { value: 'coach', label: ROLE_LABELS.coach },
];

function normalizePhone(phone) {
  return (phone || '').trim();
}

function getManageableRoleOptions(actorRole) {
  if (actorRole === 'super_admin') {
    return [
      { value: 'admin', label: ROLE_LABELS.admin },
      { value: 'manager', label: ROLE_LABELS.manager },
      { value: 'coach', label: ROLE_LABELS.coach },
    ];
  }

  if (actorRole === 'admin') {
    return [{ value: 'coach', label: ROLE_LABELS.coach }];
  }

  return [];
}

function mapStatusToFilter(statusValue) {
  if (statusValue === 'active') {
    return true;
  }

  if (statusValue === 'inactive') {
    return false;
  }

  return undefined;
}

function buildCreateInitial(roleOptions) {
  return {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: roleOptions[0]?.value || '',
  };
}

export default function UsersPage() {
  const { user: actor } = useAuth();
  const roleOptions = useMemo(() => getManageableRoleOptions(actor?.role), [actor?.role]);

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ limit: LIMIT, offset: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [statusDialogState, setStatusDialogState] = useState({ isOpen: false, user: null });

  const [createForm, setCreateForm] = useState(() => buildCreateInitial(roleOptions));
  const [editForm, setEditForm] = useState({
    id: null,
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: '',
  });
  const [resetForm, setResetForm] = useState({ userId: null, newPassword: '' });

  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await userService.listUsers({
        limit: LIMIT,
        offset: pagination.offset,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        isActive: mapStatusToFilter(statusFilter),
      });

      setUsers(response.users);
      setPagination(response.pagination);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [pagination.offset, roleFilter, search, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setCreateForm((prev) => ({
      ...prev,
      role: prev.role || roleOptions[0]?.value || '',
    }));
  }, [roleOptions]);

  function resetMessages() {
    setErrorMessage('');
    setSuccessMessage('');
  }

  function validateCreateForm() {
    const nextErrors = {};

    if (!createForm.email.trim()) {
      nextErrors.email = 'Имейлът е задължителен.';
    }

    if (!createForm.password || createForm.password.length < 8) {
      nextErrors.password = 'Паролата трябва да е поне 8 символа.';
    }

    if (!createForm.firstName.trim()) {
      nextErrors.firstName = 'Името е задължително.';
    }

    if (!createForm.lastName.trim()) {
      nextErrors.lastName = 'Фамилията е задължителна.';
    }

    if (!createForm.role) {
      nextErrors.role = 'Изберете роля.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateEditForm() {
    const nextErrors = {};

    if (!editForm.email.trim()) {
      nextErrors.email = 'Имейлът е задължителен.';
    }

    if (!editForm.firstName.trim()) {
      nextErrors.firstName = 'Името е задължително.';
    }

    if (!editForm.lastName.trim()) {
      nextErrors.lastName = 'Фамилията е задължителна.';
    }

    if (!editForm.role) {
      nextErrors.role = 'Изберете роля.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateResetForm() {
    const nextErrors = {};

    if (!resetForm.newPassword || resetForm.newPassword.length < 8) {
      nextErrors.newPassword = 'Паролата трябва да е поне 8 символа.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();

    if (!validateCreateForm()) {
      return;
    }

    try {
      resetMessages();
      setIsSaving(true);

      await userService.createUser({
        email: createForm.email.trim(),
        password: createForm.password,
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        phone: normalizePhone(createForm.phone) || undefined,
        role: createForm.role,
      });

      setIsCreateOpen(false);
      setCreateForm(buildCreateInitial(roleOptions));
      setFormErrors({});
      setSuccessMessage('Потребителят е създаден успешно.');
      setPagination((prev) => ({ ...prev, offset: 0 }));
      await loadUsers();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  function openEditModal(targetUser) {
    resetMessages();
    setFormErrors({});

    const fallbackRole = roleOptions[0]?.value || '';
    const role = roleOptions.some((option) => option.value === targetUser.role)
      ? targetUser.role
      : fallbackRole;

    setEditForm({
      id: targetUser.id,
      email: targetUser.email,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      phone: targetUser.phone || '',
      role,
    });
    setIsEditOpen(true);
  }

  async function handleEditSubmit(event) {
    event.preventDefault();

    if (!validateEditForm()) {
      return;
    }

    try {
      resetMessages();
      setIsSaving(true);

      await userService.updateUser(editForm.id, {
        email: editForm.email.trim(),
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: normalizePhone(editForm.phone) || undefined,
        role: editForm.role,
      });

      setIsEditOpen(false);
      setFormErrors({});
      setSuccessMessage('Потребителят е обновен успешно.');
      await loadUsers();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  function openResetPasswordModal(targetUser) {
    resetMessages();
    setFormErrors({});
    setResetForm({ userId: targetUser.id, newPassword: '' });
    setIsResetPasswordOpen(true);
  }

  async function handleResetPasswordSubmit(event) {
    event.preventDefault();

    if (!validateResetForm()) {
      return;
    }

    try {
      resetMessages();
      setIsSaving(true);
      await userService.resetUserPassword(resetForm.userId, resetForm.newPassword);
      setIsResetPasswordOpen(false);
      setResetForm({ userId: null, newPassword: '' });
      setFormErrors({});
      setSuccessMessage('Паролата е обновена успешно.');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  function openStatusDialog(targetUser) {
    resetMessages();
    setStatusDialogState({ isOpen: true, user: targetUser });
  }

  async function handleStatusUpdate() {
    if (!statusDialogState.user) {
      return;
    }

    const target = statusDialogState.user;

    try {
      resetMessages();
      setIsSaving(true);
      await userService.updateUserStatus(target.id, !target.isActive);
      setStatusDialogState({ isOpen: false, user: null });
      setSuccessMessage(
        !target.isActive
          ? 'Потребителят е активиран успешно.'
          : 'Потребителят е деактивиран успешно.'
      );
      await loadUsers();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Име',
        render: (row) => `${row.firstName} ${row.lastName}`,
      },
      {
        key: 'email',
        header: 'Имейл',
      },
      {
        key: 'role',
        header: 'Роля',
        render: (row) => ROLE_LABELS[row.role] || row.role,
      },
      {
        key: 'phone',
        header: 'Телефон',
        render: (row) => row.phone || '-',
      },
      {
        key: 'status',
        header: 'Статус',
        render: (row) => (
          <Badge tone={row.isActive ? 'success' : 'neutral'}>
            {row.isActive ? 'Активен' : 'Неактивен'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Действия',
        render: (row) => (
          <div className="table-actions">
            <Button variant="ghost" size="sm" onClick={() => openEditModal(row)}>
              Редактирай
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openResetPasswordModal(row)}>
              Нова парола
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openStatusDialog(row)}>
              {row.isActive ? 'Деактивирай' : 'Активирай'}
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const canGoPrev = pagination.offset > 0;
  const canGoNext = pagination.offset + pagination.limit < pagination.total;

  return (
    <div className="page-stack">
      <PageHeader
        title="Потребители"
        description="Управление на профили, роли и достъп до системата."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              resetMessages();
              setFormErrors({});
              setCreateForm(buildCreateInitial(roleOptions));
              setIsCreateOpen(true);
            }}
          >
            Нов потребител
          </Button>
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
            placeholder="Име, фамилия или имейл"
          />

          <Select
            label="Роля"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPagination((prev) => ({ ...prev, offset: 0 }));
            }}
            options={roleFilterOptions}
            placeholder="Всички"
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
          rows={users}
          isLoading={isLoading}
          emptyTitle="Няма данни за показване"
          emptyDescription="Добавете първи потребител или променете филтрите."
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
        title="Нов потребител"
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>
              Отказ
            </Button>
            <Button type="submit" form="create-user-form" loading={isSaving} disabled={isSaving}>
              Запази
            </Button>
          </>
        }
      >
        <form id="create-user-form" className="modal-form" onSubmit={handleCreateSubmit}>
          <Input
            label="Имейл"
            type="email"
            value={createForm.email}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
            error={formErrors.email}
          />
          <Input
            label="Парола"
            type="password"
            value={createForm.password}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
            error={formErrors.password}
          />
          <Input
            label="Име"
            value={createForm.firstName}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, firstName: event.target.value }))
            }
            error={formErrors.firstName}
          />
          <Input
            label="Фамилия"
            value={createForm.lastName}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, lastName: event.target.value }))}
            error={formErrors.lastName}
          />
          <Input
            label="Телефон"
            value={createForm.phone}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <Select
            label="Роля"
            value={createForm.role}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value }))}
            options={roleOptions}
            placeholder="Изберете роля"
            error={formErrors.role}
          />
        </form>
      </FormModal>

      <FormModal
        title="Редакция на потребител"
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              Отказ
            </Button>
            <Button type="submit" form="edit-user-form" loading={isSaving} disabled={isSaving}>
              Запази
            </Button>
          </>
        }
      >
        <form id="edit-user-form" className="modal-form" onSubmit={handleEditSubmit}>
          <Input
            label="Имейл"
            type="email"
            value={editForm.email}
            onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
            error={formErrors.email}
          />
          <Input
            label="Име"
            value={editForm.firstName}
            onChange={(event) => setEditForm((prev) => ({ ...prev, firstName: event.target.value }))}
            error={formErrors.firstName}
          />
          <Input
            label="Фамилия"
            value={editForm.lastName}
            onChange={(event) => setEditForm((prev) => ({ ...prev, lastName: event.target.value }))}
            error={formErrors.lastName}
          />
          <Input
            label="Телефон"
            value={editForm.phone}
            onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <Select
            label="Роля"
            value={editForm.role}
            onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value }))}
            options={roleOptions}
            placeholder="Изберете роля"
            error={formErrors.role}
          />
        </form>
      </FormModal>

      <FormModal
        title="Нова парола"
        isOpen={isResetPasswordOpen}
        onClose={() => setIsResetPasswordOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsResetPasswordOpen(false)}
              disabled={isSaving}
            >
              Отказ
            </Button>
            <Button
              type="submit"
              form="reset-password-form"
              loading={isSaving}
              disabled={isSaving}
            >
              Запази
            </Button>
          </>
        }
      >
        <form id="reset-password-form" className="modal-form" onSubmit={handleResetPasswordSubmit}>
          <Input
            label="Нова парола"
            type="password"
            value={resetForm.newPassword}
            onChange={(event) =>
              setResetForm((prev) => ({ ...prev, newPassword: event.target.value }))
            }
            error={formErrors.newPassword}
          />
        </form>
      </FormModal>

      <ConfirmDialog
        title={statusDialogState.user?.isActive ? 'Деактивиране на потребител' : 'Активиране на потребител'}
        message={
          statusDialogState.user?.isActive
            ? 'Сигурни ли сте, че искате да деактивирате този потребител?'
            : 'Сигурни ли сте, че искате да активирате този потребител?'
        }
        isOpen={statusDialogState.isOpen}
        onClose={() => setStatusDialogState({ isOpen: false, user: null })}
        onConfirm={handleStatusUpdate}
        isLoading={isSaving}
        confirmLabel={statusDialogState.user?.isActive ? 'Деактивирай' : 'Активирай'}
      />
    </div>
  );
}
