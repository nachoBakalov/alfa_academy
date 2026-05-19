import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import StatusPill from '../../components/ui/StatusPill';
import childService from '../children/childService';
import groupService from './groupService';
import AssignChildToGroupModal from './AssignChildToGroupModal';
import AssignChildToCurrentGroupModal from './AssignChildToCurrentGroupModal';
import ImportChildrenToGroupModal from './ImportChildrenFromSeasonModal';
import { getApiErrorMessage } from '../../utils/errorMessage';

const LIMIT = 20;

function formatGroupOptionLabel(group) {
  const details = [group.academy?.name, group.name].filter(Boolean).join(' · ');
  return {
    value: String(group.id),
    label: details,
  };
}

export default function GroupChildrenPanel({ group, canTransfer, userRole }) {
  const navigate = useNavigate();

  const [children, setChildren] = useState([]);
  const [targetGroups, setTargetGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ limit: LIMIT, offset: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [addState, setAddState] = useState({ isOpen: false });
  const [assignState, setAssignState] = useState({ isOpen: false, child: null });
  const [importState, setImportState] = useState({ isOpen: false });

  const loadChildren = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await childService.listChildren({
        groupId: group.id,
        search: search.trim() || undefined,
        limit: LIMIT,
        offset: pagination.offset,
      });

      setChildren(response.children);
      setPagination(response.pagination);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [group.id, pagination.offset, search]);

  const loadTargetGroups = useCallback(async () => {
    try {
      const response = await groupService.listGroups({
        isActive: true,
        limit: 100,
        offset: 0,
      });

      setTargetGroups(
        response.groups
          .filter((candidate) => Number(candidate.id) !== Number(group.id))
          .map(formatGroupOptionLabel)
      );
    } catch (_error) {
      setTargetGroups([]);
    }
  }, [group.id]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    loadTargetGroups();
  }, [loadTargetGroups]);

  async function handleAssignChild(payload) {
    if (!assignState.child) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await childService.assignChildToGroup(assignState.child.id, payload);
      setAssignState({ isOpen: false, child: null });
      setSuccessMessage('Детето е преместено успешно и историята е запазена.');
      await loadChildren();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddChild(payload) {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await childService.assignChildToGroup(payload.childId, {
        groupId: Number(group.id),
        startsOn: payload.startsOn,
      });

      setAddState({ isOpen: false });
      setSuccessMessage('Детето е добавено към групата. Историята е запазена.');
      await loadChildren();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleImportChildren(payload) {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      const result = await groupService.importChildren(group.id, payload);
      setImportState({ isOpen: false });
      setSuccessMessage(
        `Добавянето завърши: добавени ${result.importedCount}, пропуснати ${result.skippedCount}.`
      );
      await loadChildren();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'child',
        header: 'Дете',
        render: (row) => `${row.firstName} ${row.lastName}`,
      },
      {
        key: 'parent',
        header: 'Родител',
        render: (row) => row.parentName || '-',
      },
      {
        key: 'questionnaire',
        header: 'Въпросник',
        render: (row) => (
          <StatusPill
            label={
              row.questionnaire?.status === 'submitted'
                ? 'Попълнен'
                : row.questionnaire?.status === 'pending'
                ? 'Очаква попълване'
                : row.questionnaire?.status === 'expired'
                ? 'Изтекъл'
                : 'Няма данни'
            }
            tone={
              row.questionnaire?.status === 'submitted'
                ? 'success'
                : row.questionnaire?.status === 'pending'
                ? 'warning'
                : 'neutral'
            }
          />
        ),
      },
      {
        key: 'status',
        header: 'Статус',
        render: (row) => (
          <StatusPill label={row.isActive ? 'Активно' : 'Неактивно'} tone={row.isActive ? 'success' : 'neutral'} />
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
            {canTransfer ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAssignState({ isOpen: true, child: row })}
                disabled={!targetGroups.length}
              >
                Премести в друга група
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canTransfer, navigate, targetGroups.length]
  );

  const canGoPrev = pagination.offset > 0;
  const canGoNext = pagination.offset + pagination.limit < pagination.total;

  return (
    <Card title="Деца в групата">
      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert type="success">{successMessage}</Alert> : null}

      {canTransfer ? (
        <div className="group-children-actions">
          <Button onClick={() => setAddState({ isOpen: true })}>Добави дете към групата</Button>
          <Button
            variant="secondary"
            onClick={() => setImportState({ isOpen: true })}
          >
            Добави деца от академия или група
          </Button>
        </div>
      ) : null}

      <div className="coach-panel-filters">
        <Input
          label="Търсене"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPagination((prev) => ({ ...prev, offset: 0 }));
          }}
          placeholder="Име на дете"
        />
      </div>

      <DataTable
        columns={columns}
        rows={children}
        isLoading={isLoading}
        emptyTitle="Няма деца в тази група"
        emptyDescription="Добавете дете или променете филтрите."
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

      <AssignChildToGroupModal
        isOpen={assignState.isOpen}
        onClose={() => setAssignState({ isOpen: false, child: null })}
        onSubmit={handleAssignChild}
        groupOptions={targetGroups}
        child={assignState.child}
        isSaving={isSaving}
      />

      <AssignChildToCurrentGroupModal
        isOpen={addState.isOpen}
        onClose={() => setAddState({ isOpen: false })}
        onSubmit={handleAddChild}
        currentGroup={group}
        userRole={userRole}
        isSaving={isSaving}
      />

      <ImportChildrenToGroupModal
        isOpen={importState.isOpen}
        onClose={() => setImportState({ isOpen: false })}
        onSubmit={handleImportChildren}
        currentGroup={group}
        isSaving={isSaving}
      />
    </Card>
  );
}
