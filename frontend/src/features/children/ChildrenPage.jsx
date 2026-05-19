import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import StatusPill from '../../components/ui/StatusPill';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import CopyButton from '../../components/ui/CopyButton';
import ChildFormModal from './ChildFormModal';
import childService from './childService';
import groupService from '../groups/groupService';
import academyService from '../academies/academyService';
import { useAuth } from '../auth/AuthProvider';
import { getApiErrorMessage } from '../../utils/errorMessage';
import {
  formatDate,
  formatFullName,
  formatQuestionnaireStatus,
  getQuestionnaireTone,
} from '../../utils/formatters';

const LIMIT = 50;

const STATUS_FILTER_OPTIONS = [
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

function getFriendlyChildError(error) {
  const status = error?.response?.status;

  if (status === 403) {
    return 'Нямате достъп до това дете.';
  }

  if (status === 404) {
    return 'Детето не е намерено.';
  }

  if (status === 409) {
    return getApiErrorMessage(error);
  }

  return getApiErrorMessage(error, 'Възникна грешка. Опитайте отново.');
}

function getFriendlySendEmailError(error) {
  const status = error?.response?.status;

  if (status === 400) {
    return 'Няма въведен имейл на родител.';
  }

  if (status === 409) {
    return 'Въпросникът вече е попълнен.';
  }

  if (status === 503) {
    return 'Изпращането на имейли не е активирано.';
  }

  return 'Възникна грешка при изпращане на имейла.';
}

function buildGroupOptionLabel(group) {
  return [group.academy?.name, group.name].filter(Boolean).join(' · ');
}

export default function ChildrenPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const canManageChildren = ['super_admin', 'admin', 'coach'].includes(user?.role);
  const canSendQuestionnaireEmail = ['super_admin', 'admin', 'manager', 'coach'].includes(user?.role);
  const canForceRegenerate = ['super_admin', 'admin'].includes(user?.role);

  const [children, setChildren] = useState([]);
  const [academies, setAcademies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [pagination, setPagination] = useState({ limit: LIMIT, offset: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [search, setSearch] = useState('');
  const queryAcademyId = searchParams.get('academyId') || '';
  const queryGroupId = searchParams.get('groupId') || '';

  const [academyFilter, setAcademyFilter] = useState(queryAcademyId);
  const [groupFilter, setGroupFilter] = useState(queryGroupId);
  const [statusFilter, setStatusFilter] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formState, setFormState] = useState({
    isOpen: false,
    mode: 'create',
    childId: null,
    initialValues: null,
  });

  const [statusDialog, setStatusDialog] = useState({ isOpen: false, child: null });

  const academyFilterOptions = useMemo(
    () => academies.map((academy) => ({ value: String(academy.id), label: academy.name })),
    [academies]
  );

  const groupFilterOptions = useMemo(
    () => groups.map((group) => ({ value: String(group.id), label: buildGroupOptionLabel(group) })),
    [groups]
  );

  const activeGroupOptions = useMemo(
    () =>
      groups
        .filter((group) => group.isActive)
        .map((group) => ({ value: String(group.id), label: buildGroupOptionLabel(group) })),
    [groups]
  );

  const loadAcademies = useCallback(async () => {
    try {
      const response = await academyService.listAcademies({
        limit: 100,
        offset: 0,
        isActive: true,
      });
      setAcademies(response.academies || []);
    } catch (_error) {
      setAcademies([]);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const response = await groupService.listGroups({
        limit: 100,
        offset: 0,
        academyId: academyFilter || undefined,
      });
      setGroups(response.groups || []);
    } catch (_error) {
      setGroups([]);
    }
  }, [academyFilter]);

  const loadChildren = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await childService.listChildren({
        limit: LIMIT,
        offset: pagination.offset,
        search: search.trim() || undefined,
        academyId: academyFilter || undefined,
        groupId: groupFilter || undefined,
        isActive: mapStatusToFilter(statusFilter),
      });

      setChildren(response.children);
      setPagination(response.pagination);
    } catch (error) {
      setErrorMessage(getFriendlyChildError(error));
    } finally {
      setIsLoading(false);
    }
  }, [academyFilter, groupFilter, pagination.offset, search, statusFilter]);

  useEffect(() => {
    loadAcademies();
  }, [loadAcademies]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    setAcademyFilter((prev) => (prev === queryAcademyId ? prev : queryAcademyId));
    setPagination((prev) => ({ ...prev, offset: 0 }));
  }, [queryAcademyId]);

  useEffect(() => {
    setGroupFilter((prev) => (prev === queryGroupId ? prev : queryGroupId));
    setPagination((prev) => ({ ...prev, offset: 0 }));
  }, [queryGroupId]);

  useEffect(() => {
    if (!groupFilter || !groups.length) {
      return;
    }

    const isValidGroup = groups.some((group) => String(group.id) === String(groupFilter));

    if (isValidGroup) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('groupId');
    setSearchParams(nextSearchParams, { replace: true });
    setGroupFilter('');
    setPagination((prev) => ({ ...prev, offset: 0 }));
  }, [groupFilter, groups, searchParams, setSearchParams]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  function updateGroupFilterWithUrl(value) {
    const nextValue = String(value || '');
    const nextSearchParams = new URLSearchParams(searchParams);

    if (academyFilter) {
      nextSearchParams.set('academyId', academyFilter);
    } else {
      nextSearchParams.delete('academyId');
    }

    if (nextValue) {
      nextSearchParams.set('groupId', nextValue);
    } else {
      nextSearchParams.delete('groupId');
    }

    setSearchParams(nextSearchParams, { replace: true });
    setGroupFilter(nextValue);
    setPagination((prev) => ({ ...prev, offset: 0 }));
  }

  function updateAcademyFilterWithUrl(value) {
    const nextValue = String(value || '');
    const nextSearchParams = new URLSearchParams(searchParams);

    if (nextValue) {
      nextSearchParams.set('academyId', nextValue);
    } else {
      nextSearchParams.delete('academyId');
    }

    nextSearchParams.delete('groupId');

    setSearchParams(nextSearchParams, { replace: true });
    setAcademyFilter(nextValue);
    setGroupFilter('');
    setPagination((prev) => ({ ...prev, offset: 0 }));
  }

  function resetMessages() {
    setErrorMessage('');
    setSuccessMessage('');
  }

  async function openEditModal(child) {
    try {
      resetMessages();
      setIsSaving(true);
      const details = await childService.getChild(child.id);
      setFormState({
        isOpen: true,
        mode: 'edit',
        childId: child.id,
        initialValues: {
          firstName: details.firstName,
          lastName: details.lastName,
          birthDate: details.birthDate || '',
          gender: details.gender || '',
          parentName: details.parentName || '',
          parentEmail: details.parentEmail || '',
          parentPhone: details.parentPhone || '',
          medicalNotes: details.medicalNotes || '',
          generalNotes: details.generalNotes || '',
        },
      });
    } catch (error) {
      setErrorMessage(getFriendlyChildError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateOrEdit(payload) {
    try {
      setIsSaving(true);
      resetMessages();

      if (formState.mode === 'create') {
        const created = await childService.createChild(payload);
        const hasQuestionnaireLink = Boolean(created.questionnaire?.link);

        setSuccessMessage(
          hasQuestionnaireLink
            ? 'Детето е създадено. Линкът към въпросника е готов.'
            : 'Детето е създадено успешно.'
        );
        setPagination((prev) => ({ ...prev, offset: 0 }));
      } else {
        await childService.updateChild(formState.childId, payload);
        setSuccessMessage('Профилът на детето е обновен успешно.');
      }

      setFormState({ isOpen: false, mode: 'create', childId: null, initialValues: null });
      await loadChildren();
    } catch (error) {
      setErrorMessage(getFriendlyChildError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateStatus() {
    if (!statusDialog.child) {
      return;
    }

    try {
      setIsSaving(true);
      resetMessages();
      await childService.updateChildStatus(statusDialog.child.id, !statusDialog.child.isActive);
      setSuccessMessage(
        statusDialog.child.isActive ? 'Детето е деактивирано успешно.' : 'Детето е активирано успешно.'
      );
      setStatusDialog({ isOpen: false, child: null });
      await loadChildren();
    } catch (error) {
      setErrorMessage(getFriendlyChildError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateQuestionnaire(child, forceRegenerate) {
    try {
      setIsSaving(true);
      resetMessages();
      await childService.generateQuestionnaireToken(child.id, { forceRegenerate });
      setSuccessMessage('Линкът към въпросника е готов за споделяне.');
      await loadChildren();
    } catch (error) {
      setErrorMessage(getFriendlyChildError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendQuestionnaireEmail(child) {
    try {
      setIsSaving(true);
      resetMessages();
      await childService.sendQuestionnaireEmail(child.id, { forceRegenerate: false });
      setSuccessMessage('Въпросникът е изпратен успешно.');
      await loadChildren();
    } catch (error) {
      setErrorMessage(getFriendlySendEmailError(error));
    } finally {
      setIsSaving(false);
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'child',
        header: 'Дете',
        render: (row) => (
          <div className="cell-stack">
            <strong>{formatFullName(row)}</strong>
            <span className="muted-text">Роден/а: {formatDate(row.birthDate)}</span>
          </div>
        ),
      },
      {
        key: 'group',
        header: 'Група',
        render: (row) => row.currentGroup?.name || '-',
      },
      {
        key: 'parent',
        header: 'Родител',
        render: (row) => (
          <div className="cell-stack">
            <strong>{row.parentName || '-'}</strong>
            <span className="muted-text">{row.parentEmail || row.parentPhone || '-'}</span>
          </div>
        ),
      },
      {
        key: 'questionnaire',
        header: 'Въпросник',
        render: (row) => (
          <div className="questionnaire-cell">
            <StatusPill
              label={formatQuestionnaireStatus(row.questionnaire?.status)}
              tone={getQuestionnaireTone(row.questionnaire?.status)}
            />
            {row.questionnaire?.link ? (
              <CopyButton
                text={row.questionnaire.link}
                size="sm"
                variant="ghost"
                onCopied={() => setSuccessMessage('Линкът е копиран.')}
                onUnavailable={() =>
                  setSuccessMessage('Копирането не е налично. Използвайте профила на детето за ръчно копиране.')
                }
              />
            ) : null}
            {canManageChildren ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleGenerateQuestionnaire(row, false)}
                disabled={isSaving}
              >
                Генерирай линк
              </Button>
            ) : null}
            {canSendQuestionnaireEmail && row.parentEmail && row.questionnaire?.status !== 'submitted' ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSendQuestionnaireEmail(row)}
                disabled={isSaving}
              >
                Изпрати по имейл
              </Button>
            ) : null}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Статус',
        render: (row) => (
          <StatusPill label={row.isActive ? 'Активно дете' : 'Неактивно дете'} tone={row.isActive ? 'success' : 'neutral'} />
        ),
      },
      {
        key: 'actions',
        header: 'Действия',
        render: (row) => (
          <div className="table-actions">
            <Button size="sm" variant="secondary" onClick={() => navigate(`/children/${row.id}/profile`)}>
              Профил
            </Button>

            {canManageChildren ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => openEditModal(row)} disabled={isSaving}>
                  Редактирай
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStatusDialog({ isOpen: true, child: row })}
                  disabled={isSaving}
                >
                  {row.isActive ? 'Деактивирай' : 'Активирай'}
                </Button>
                {canForceRegenerate ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleGenerateQuestionnaire(row, true)}
                    disabled={isSaving}
                  >
                    Регенерирай линк
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [canForceRegenerate, canManageChildren, canSendQuestionnaireEmail, isSaving, navigate]
  );

  const canGoPrev = pagination.offset > 0;
  const canGoNext = pagination.offset + pagination.limit < pagination.total;

  return (
    <div className="page-stack">
      <PageHeader
        title="Деца"
        description="Управление на профили, групи и родителски въпросници."
        actions={
          canManageChildren ? (
            <Button
              onClick={() =>
                setFormState({
                  isOpen: true,
                  mode: 'create',
                  childId: null,
                  initialValues: null,
                })
              }
            >
              Ново дете
            </Button>
          ) : null
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
            placeholder="Име на дете или родител"
          />

          <Select
            label="Академия"
            value={academyFilter}
            onChange={(event) => updateAcademyFilterWithUrl(event.target.value)}
            options={academyFilterOptions}
            placeholder="Всички академии"
          />

          <Select
            label="Група"
            value={groupFilter}
            onChange={(event) => updateGroupFilterWithUrl(event.target.value)}
            options={groupFilterOptions}
            placeholder="Всички групи"
          />

          <Select
            label="Статус"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPagination((prev) => ({ ...prev, offset: 0 }));
            }}
            options={STATUS_FILTER_OPTIONS}
            placeholder="Всички"
          />
        </div>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={children}
          isLoading={isLoading}
          emptyTitle="Все още няма добавени деца"
          emptyDescription="Добавете първи профил или променете филтрите."
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

      <ChildFormModal
        mode={formState.mode}
        isOpen={formState.isOpen}
        onClose={() => setFormState({ isOpen: false, mode: 'create', childId: null, initialValues: null })}
        onSubmit={handleCreateOrEdit}
        isSaving={isSaving}
        groupOptions={activeGroupOptions}
        initialValues={formState.initialValues}
      />

      <ConfirmDialog
        title={statusDialog.child?.isActive ? 'Деактивиране на дете' : 'Активиране на дете'}
        message={
          statusDialog.child?.isActive
            ? 'Сигурни ли сте, че искате да деактивирате профила на детето?'
            : 'Сигурни ли сте, че искате да активирате профила на детето?'
        }
        confirmLabel={statusDialog.child?.isActive ? 'Деактивирай' : 'Активирай'}
        isOpen={statusDialog.isOpen}
        onConfirm={handleUpdateStatus}
        onClose={() => setStatusDialog({ isOpen: false, child: null })}
        isLoading={isSaving}
      />
    </div>
  );
}
