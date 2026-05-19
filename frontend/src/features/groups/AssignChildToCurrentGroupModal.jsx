import { useCallback, useEffect, useState } from 'react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import FormModal from '../../components/ui/FormModal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import childService from '../children/childService';
import coachWorkspaceService from '../coach/coachWorkspaceService';
import { getApiErrorMessage } from '../../utils/errorMessage';

function todayAsDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatChildOption(child = {}) {
  const fullName = `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Без име';
  const groupLabel = child.currentGroup?.name ? `Текуща група: ${child.currentGroup.name}` : 'Без активна група';

  return {
    value: String(child.id),
    label: `${fullName} (${groupLabel})`,
  };
}

export default function AssignChildToCurrentGroupModal({
  isOpen,
  onClose,
  onSubmit,
  currentGroup,
  userRole,
  isSaving,
}) {
  const [search, setSearch] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [startsOn, setStartsOn] = useState(todayAsDate());
  const [childOptions, setChildOptions] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const loadChildOptions = useCallback(async () => {
    if (!isOpen || !currentGroup?.id) {
      return;
    }

    try {
      setIsLoadingOptions(true);
      setErrorMessage('');

      let children = [];
      const searchValue = search.trim() || undefined;

      if (userRole === 'coach') {
        const response = await coachWorkspaceService.getAcademyChildren({
          academyId: currentGroup.academy?.id || undefined,
          seasonId: currentGroup.season?.id || undefined,
          search: searchValue,
          limit: 100,
          offset: 0,
        });

        children = response.children || [];
      } else {
        const response = await childService.listChildren({
          seasonId: currentGroup.season?.id || undefined,
          search: searchValue,
          limit: 100,
          offset: 0,
          isActive: true,
        });

        children = response.children || [];
      }

      const options = children
        .filter((child) => String(child.currentGroup?.id || '') !== String(currentGroup.id))
        .map(formatChildOption);

      setChildOptions(options);

      if (!options.some((option) => option.value === selectedChildId)) {
        setSelectedChildId('');
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setChildOptions([]);
    } finally {
      setIsLoadingOptions(false);
    }
  }, [currentGroup?.academy?.id, currentGroup?.id, isOpen, search, selectedChildId, userRole]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSearch('');
    setSelectedChildId('');
    setStartsOn(todayAsDate());
    setErrorMessage('');
    setValidationErrors({});
  }, [isOpen, currentGroup?.id]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = setTimeout(() => {
      loadChildOptions();
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [isOpen, loadChildOptions, search]);

  function validate() {
    const nextValidationErrors = {};

    if (!selectedChildId) {
      nextValidationErrors.childId = 'Изберете дете.';
    }

    if (!startsOn) {
      nextValidationErrors.startsOn = 'Началната дата е задължителна.';
    }

    setValidationErrors(nextValidationErrors);
    return Object.keys(nextValidationErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit({
      childId: Number(selectedChildId),
      startsOn,
    });
  }

  return (
    <FormModal
      title="Добави дете към групата"
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Отказ
          </Button>
          <Button type="submit" form="assign-child-current-group-form" loading={isSaving} disabled={isSaving}>
            Добави към групата
          </Button>
        </>
      }
    >
      <form id="assign-child-current-group-form" className="modal-form" onSubmit={handleSubmit}>
        <Alert type="info">
          Преместването започва от избраната дата. Старите оценки и спортни резултати остават към старата група. Новите резултати ще се въвеждат към новата група.
        </Alert>

        {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}

        <Input
          label="Търсене на дете"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Име на дете"
          disabled={isLoadingOptions || isSaving}
        />

        <Select
          label="Дете"
          value={selectedChildId}
          onChange={(event) => setSelectedChildId(event.target.value)}
          options={childOptions}
          placeholder={isLoadingOptions ? 'Зареждане...' : 'Изберете дете'}
          error={validationErrors.childId}
          disabled={isLoadingOptions || isSaving}
        />

        {!isLoadingOptions && !childOptions.length ? (
          <p className="muted-text">
            Няма налични деца за добавяне. Опитайте с различно търсене.
          </p>
        ) : null}

        <Input
          label="Начална дата"
          type="date"
          value={startsOn}
          onChange={(event) => setStartsOn(event.target.value)}
          error={validationErrors.startsOn}
          disabled={isSaving}
        />
      </form>
    </FormModal>
  );
}
