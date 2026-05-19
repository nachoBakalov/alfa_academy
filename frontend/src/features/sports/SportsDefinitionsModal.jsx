import { useMemo, useState } from 'react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import FormModal from '../../components/ui/FormModal';
import { getApiErrorMessage } from '../../utils/errorMessage';
import {
  formatDefinitionStatus,
  formatResultDirection,
  looksCorruptedText,
} from './sportsLabels';
import sportsService from './sportsService';
import SportsDefinitionFormModal from './SportsDefinitionFormModal';

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

export default function SportsDefinitionsModal({
  isOpen,
  definitions = [],
  userRole,
  isLoading,
  onClose,
  onChanged,
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editingDefinition, setEditingDefinition] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const canManageDefinitions = ['super_admin', 'admin', 'manager', 'coach'].includes(userRole);
  const canManageDefinitionStatus = ['super_admin', 'admin', 'manager'].includes(userRole);

  const sortedDefinitions = useMemo(
    () => [...definitions].sort((a, b) => a.name.localeCompare(b.name, 'bg')),
    [definitions]
  );

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Име',
        render: (row) => (
          <div className="sports-definition-name-cell">
            <span>{row.name}</span>
            {looksCorruptedText(row.name) ? (
              <Badge tone="warning">Името изглежда повредено. Редактирайте типа.</Badge>
            ) : null}
          </div>
        ),
      },
      {
        key: 'code',
        header: 'Код',
        render: (row) => row.code,
      },
      {
        key: 'unit',
        header: 'Единица',
        render: (row) => row.unit,
      },
      {
        key: 'direction',
        header: 'Посока',
        render: (row) => formatResultDirection(row.resultDirection),
      },
      {
        key: 'target',
        header: 'Таргет %',
        render: (row) => formatPercent(row.defaultTargetReductionPercent),
      },
      {
        key: 'failSafe',
        header: 'Защитен праг %',
        render: (row) => formatPercent(row.defaultFailSafeThresholdPercent),
      },
      {
        key: 'status',
        header: 'Статус',
        render: (row) => (
          <Badge tone={row.isActive ? 'success' : 'neutral'}>{formatDefinitionStatus(row.isActive)}</Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Действия',
        render: (row) => (
          <div className="sports-definition-row-actions">
            {canManageDefinitions ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFormMode('edit');
                  setEditingDefinition(row);
                  setIsFormOpen(true);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                disabled={isSaving}
              >
                Редакция
              </Button>
            ) : null}

            {canManageDefinitionStatus ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusToggle(row)}
                disabled={isSaving}
              >
                {row.isActive ? 'Деактивирай' : 'Активирай'}
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canManageDefinitions, canManageDefinitionStatus, isSaving]
  );

  async function handleFormSubmit(payload) {
    if (!canManageDefinitions) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      if (formMode === 'create') {
        await sportsService.createDefinition(payload);
        setSuccessMessage('Типът предизвикателство е създаден успешно.');
      } else if (editingDefinition?.id) {
        await sportsService.updateDefinition(editingDefinition.id, payload);
        setSuccessMessage('Типът предизвикателство е обновен успешно.');
      }

      setIsFormOpen(false);
      setEditingDefinition(null);

      if (onChanged) {
        await onChanged();
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Неуспешно записване на типа предизвикателство.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusToggle(definition) {
    if (!canManageDefinitionStatus) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await sportsService.updateDefinitionStatus(definition.id, !definition.isActive);

      setSuccessMessage(
        !definition.isActive ? 'Типът е активиран успешно.' : 'Типът е деактивиран успешно.'
      );

      if (onChanged) {
        await onChanged();
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Неуспешна промяна на статуса.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <FormModal
        title="Типове предизвикателства"
        isOpen={isOpen}
        onClose={onClose}
        size="wide"
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Затвори
            </Button>
          </>
        }
      >
        <div className="sports-definitions-stack">
          {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
          {successMessage ? <Alert type="success">{successMessage}</Alert> : null}

          {!canManageDefinitionStatus && canManageDefinitions ? (
            <Alert type="info">Треньорите могат да създават и редактират типове, без да ги деактивират.</Alert>
          ) : null}

          <div className="sports-definitions-header-actions">
            <div>
              <h3>Списък с типове</h3>
              <p className="sports-helper-note">
                Изберете подходяща посока и единица, за да създавате точни предизвикателства.
              </p>
            </div>

            {canManageDefinitions ? (
              <Button
                onClick={() => {
                  setFormMode('create');
                  setEditingDefinition(null);
                  setIsFormOpen(true);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                disabled={isSaving}
              >
                Нов тип
              </Button>
            ) : null}
          </div>

          <div className="sports-definitions-table">
            <DataTable
              columns={columns}
              rows={sortedDefinitions}
              isLoading={isLoading}
              emptyTitle="Все още няма добавени типове предизвикателства."
              emptyDescription="Добавете първия тип, за да го използвате в ново спортно предизвикателство."
            />
          </div>
        </div>
      </FormModal>

      <SportsDefinitionFormModal
        mode={formMode}
        isOpen={isFormOpen}
        definition={editingDefinition}
        isSaving={isSaving}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDefinition(null);
        }}
        onSubmit={handleFormSubmit}
      />
    </>
  );
}
