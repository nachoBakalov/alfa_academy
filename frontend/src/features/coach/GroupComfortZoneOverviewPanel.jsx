import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';
import coachWorkspaceService from './coachWorkspaceService';
import { getApiErrorMessage } from '../../utils/errorMessage';

const CATEGORY_OPTIONS = [
  { key: 'creativity', label: 'Креативност' },
  { key: 'life_and_technique', label: 'Бит и техника' },
  { key: 'sport', label: 'Спорт' },
  { key: 'social_contact', label: 'Социален контакт' },
  { key: 'reading', label: 'Четене' },
];

function getZoneTone(zone) {
  if (zone === 'green') {
    return 'success';
  }

  if (zone === 'yellow') {
    return 'warning';
  }

  if (zone === 'red') {
    return 'danger';
  }

  if (zone === 'behavior_indicator') {
    return 'info';
  }

  return 'neutral';
}

function getProfileLabel(hasProfile) {
  return hasProfile ? 'Попълнен профил' : 'Няма профил';
}

function getProfileTone(hasProfile) {
  return hasProfile ? 'success' : 'warning';
}

function renderComfortValue(value, type, hasProfile) {
  if (!hasProfile) {
    return <span className="muted-text">-</span>;
  }

  if (type === 'text') {
    return value?.textValue ? <span>{value.textValue}</span> : <span className="muted-text">-</span>;
  }

  if (value?.scoreValue === null || value?.scoreValue === undefined) {
    return <span className="muted-text">-</span>;
  }

  return (
    <div className="comfort-overview-cell">
      <div className="comfort-overview-score-row">
        <strong>{value.scoreValue}</strong>
        <StatusPill
          label={value.interpretation || 'Поведенчески индикатор'}
          tone={getZoneTone(value.zone)}
        />
      </div>
      {value.note ? (
        <p className="comfort-overview-note">
          <span>Бележка от родител:</span> {value.note}
        </p>
      ) : null}
    </div>
  );
}

export default function GroupComfortZoneOverviewPanel({
  groupId,
  selectedCategory,
  onCategoryChange,
}) {
  const navigate = useNavigate();
  const [overview, setOverview] = useState({
    group: null,
    category: {
      key: 'creativity',
      label: 'Креативност',
      columns: [],
    },
    children: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadOverview = useCallback(async () => {
    if (!groupId) {
      setOverview({
        group: null,
        category: {
          key: selectedCategory || 'creativity',
          label: 'Креативност',
          columns: [],
        },
        children: [],
      });
      setErrorMessage('');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await coachWorkspaceService.getGroupComfortZoneOverview(groupId, {
        category: selectedCategory || 'creativity',
      });

      setOverview(response);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setOverview({
        group: null,
        category: {
          key: selectedCategory || 'creativity',
          label: 'Креативност',
          columns: [],
        },
        children: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [groupId, selectedCategory]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const columns = useMemo(() => {
    const dynamicColumns = (overview.category?.columns || []).map((column) => ({
      key: column.actionCode,
      header: column.label,
      render: (row) =>
        renderComfortValue(row.values?.[column.actionCode], column.type, row.comfortProfile?.hasProfile),
    }));

    return [
      {
        key: 'child',
        header: 'Дете',
        render: (row) => `${row.firstName} ${row.lastName}`,
      },
      ...dynamicColumns,
      {
        key: 'profile',
        header: 'Профил',
        render: (row) => (
          <StatusPill
            label={getProfileLabel(row.comfortProfile?.hasProfile)}
            tone={getProfileTone(row.comfortProfile?.hasProfile)}
          />
        ),
      },
      {
        key: 'actions',
        header: 'Действия',
        render: (row) => (
          <Button size="sm" variant="ghost" onClick={() => navigate(`/children/${row.id}/profile`)}>
            Профил
          </Button>
        ),
      },
    ];
  }, [navigate, overview.category]);

  const hasChildren = (overview.children || []).length > 0;
  const allWithoutProfile =
    hasChildren && (overview.children || []).every((child) => !child.comfortProfile?.hasProfile);

  return (
    <Card title="Комфортни зони на децата в групата">
      <p className="muted-text">
        Бърз преглед на попълнените родителски въпросници по избрана зона.
      </p>

      {groupId ? (
        <p className="coach-group-context">
          <strong>Група:</strong> {overview.group?.name || '-'}
          {overview.group?.academy?.name ? <span> · {overview.group.academy.name}</span> : null}
        </p>
      ) : null}

      <div className="coach-comfort-filter-buttons no-print">
        {CATEGORY_OPTIONS.map((item) => (
          <Button
            key={item.key}
            type="button"
            size="sm"
            variant={selectedCategory === item.key ? 'primary' : 'secondary'}
            onClick={() => onCategoryChange(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      {!groupId ? (
        <EmptyState
          title="Изберете група"
          description="След избор ще видите обобщените комфортни зони за децата в групата."
        />
      ) : (
        <>
          {allWithoutProfile ? (
            <div className="coach-comfort-info-message">
              Все още няма попълнени профили Комфортна зона.
            </div>
          ) : null}

          <DataTable
            columns={columns}
            rows={overview.children || []}
            isLoading={isLoading}
            emptyTitle="В тази група все още няма деца."
            emptyDescription="Когато добавите деца в групата, тук ще се появят техните обобщени данни."
          />
        </>
      )}
    </Card>
  );
}
