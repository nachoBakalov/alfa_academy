import { useEffect, useMemo, useState } from 'react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import FormModal from '../../components/ui/FormModal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import academyService from '../academies/academyService';
import groupService from './groupService';

function todayAsDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function ImportChildrenToGroupModal({
  isOpen,
  onClose,
  onSubmit,
  currentGroup,
  isSaving,
}) {
  const [academyOptions, setAcademyOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [sourceAcademyId, setSourceAcademyId] = useState('');
  const [sourceGroupId, setSourceGroupId] = useState('');
  const [children, setChildren] = useState([]);
  const [selectedChildIds, setSelectedChildIds] = useState([]);
  const [startsOn, setStartsOn] = useState(todayAsDate());
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [errors, setErrors] = useState({});

  const availableGroupOptions = useMemo(
    () =>
      groupOptions
        .filter((group) => {
          if (Number(group.id) === Number(currentGroup?.id)) {
            return false;
          }

          if (!sourceAcademyId) {
            return true;
          }

          return String(group.academy?.id || '') === String(sourceAcademyId);
        })
        .map((group) => ({
          value: String(group.id),
          label: group.name,
        })),
    [currentGroup?.id, groupOptions, sourceAcademyId]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSourceAcademyId('');
    setSourceGroupId('');
    setChildren([]);
    setSelectedChildIds([]);
    setStartsOn(todayAsDate());
    setErrors({});
  }, [isOpen, currentGroup?.id]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    async function loadMeta() {
      try {
        const [academyResponse, groupResponse] = await Promise.all([
          academyService.listAcademies({ limit: 100, offset: 0, isActive: true }),
          groupService.listGroups({ limit: 500, offset: 0, isActive: true }),
        ]);

        if (isCancelled) {
          return;
        }

        setAcademyOptions(
          (academyResponse.academies || []).map((academy) => ({
            value: String(academy.id),
            label: academy.name,
          }))
        );
        setGroupOptions(groupResponse.groups || []);
      } catch (_error) {
        if (isCancelled) {
          return;
        }

        setAcademyOptions([]);
        setGroupOptions([]);
      }
    }

    loadMeta();

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !sourceAcademyId) {
      setChildren([]);
      setSelectedChildIds([]);
      return;
    }

    let isCancelled = false;

    async function loadChildren() {
      try {
        setIsLoadingChildren(true);
        const response = await academyService.listAcademyChildren(sourceAcademyId, {
          isActive: true,
          groupId: sourceGroupId || undefined,
          limit: 300,
          offset: 0,
        });

        if (isCancelled) {
          return;
        }

        setChildren(response.children || []);
        setSelectedChildIds([]);
      } catch (_error) {
        if (isCancelled) {
          return;
        }

        setChildren([]);
        setSelectedChildIds([]);
      } finally {
        if (!isCancelled) {
          setIsLoadingChildren(false);
        }
      }
    }

    loadChildren();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, sourceAcademyId, sourceGroupId]);

  function validate() {
    const nextErrors = {};

    if (!sourceAcademyId) {
      nextErrors.sourceAcademyId = 'Изберете академия източник.';
    }

    if (!selectedChildIds.length) {
      nextErrors.childIds = 'Изберете поне едно дете за добавяне.';
    }

    if (!startsOn) {
      nextErrors.startsOn = 'Началната дата е задължителна.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit({
      sourceAcademyId: Number(sourceAcademyId),
      sourceGroupId: sourceGroupId ? Number(sourceGroupId) : undefined,
      childIds: selectedChildIds.map(Number),
      startsOn,
    });
  }

  function handleChildToggle(childId) {
    const normalizedId = Number(childId);

    setSelectedChildIds((prev) =>
      prev.includes(normalizedId)
        ? prev.filter((id) => id !== normalizedId)
        : [...prev, normalizedId]
    );
  }

  function toggleSelectAll() {
    if (selectedChildIds.length === children.length) {
      setSelectedChildIds([]);
      return;
    }

    setSelectedChildIds(children.map((child) => Number(child.id)));
  }

  return (
    <FormModal
      title="Добави деца от друга академия или група"
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Отказ
          </Button>
          <Button type="submit" form="import-children-season-form" loading={isSaving} disabled={isSaving}>
            Добави деца
          </Button>
        </>
      }
    >
      <form id="import-children-season-form" className="modal-form" onSubmit={handleSubmit}>
        <Alert type="info">
          Историята се запазва автоматично. Децата, които вече имат активна група в същата
          академия, се преместват безопасно към текущата група.
        </Alert>

        <p className="muted-text">
          Целева група: <strong>{currentGroup?.name || '-'}</strong>
        </p>

        <Select
          label="Академия източник"
          value={sourceAcademyId}
          onChange={(event) => {
            setSourceAcademyId(event.target.value);
            setSourceGroupId('');
          }}
          options={academyOptions}
          placeholder="Изберете академия"
          error={errors.sourceAcademyId}
        />

        <Select
          label="Група източник (по желание)"
          value={sourceGroupId}
          onChange={(event) => setSourceGroupId(event.target.value)}
          options={availableGroupOptions}
          placeholder="Всички групи в академията"
          disabled={!sourceAcademyId}
        />

        <div className="modal-form-field">
          <div className="label-row">
            <label className="form-label">Деца за добавяне</label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={toggleSelectAll}
              disabled={!children.length || isLoadingChildren}
            >
              {selectedChildIds.length === children.length ? 'Изчисти избора' : 'Избери всички'}
            </Button>
          </div>
          {isLoadingChildren ? <p className="muted-text">Зареждане на деца...</p> : null}
          {!isLoadingChildren && !children.length ? (
            <p className="muted-text">Няма активни деца за избраните филтри.</p>
          ) : null}
          {children.length ? (
            <div className="import-children-list" role="list">
              {children.map((child) => {
                const fullName = `${child.firstName} ${child.lastName}`;
                const isSelected = selectedChildIds.includes(Number(child.id));

                return (
                  <label key={child.id} className="checkbox-row" role="listitem">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleChildToggle(child.id)}
                    />
                    <span>
                      {fullName}
                      {child.group?.name ? ` (${child.group.name})` : ''}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : null}
          {errors.childIds ? <p className="form-error">{errors.childIds}</p> : null}
        </div>

        <Input
          label="Начална дата"
          type="date"
          value={startsOn}
          onChange={(event) => setStartsOn(event.target.value)}
          error={errors.startsOn}
        />
      </form>
    </FormModal>
  );
}
