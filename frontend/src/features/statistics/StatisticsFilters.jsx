import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { PERIOD_OPTIONS } from './statisticsLabels';

export default function StatisticsFilters({
  academies = [],
  groups = [],
  selectedAcademyId,
  selectedGroupId,
  preset,
  startDate,
  endDate,
  onAcademyChange,
  onGroupChange,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
  onClear,
  showGroup = true,
  isLoading = false,
  variant = 'default',
}) {
  const academyOptions = academies.map((academy) => ({
    value: String(academy.id),
    label: academy.name,
  }));

  const groupOptions = groups.map((group) => ({
    value: String(group.id),
    label: [group.academy?.name, group.name].filter(Boolean).join(' · '),
  }));

  const showCustomDates = preset === 'custom';
  const isShowcase = variant === 'showcase';
  const rootClassName = `filters-grid filters-grid-wide statistics-filters-grid${isShowcase ? ' statistics-filters-showcase' : ''}`;

  return (
    <div className={rootClassName}>
      <Select
        label="Академия"
        value={selectedAcademyId}
        onChange={(event) => onAcademyChange(event.target.value)}
        options={academyOptions}
        placeholder="Всички академии"
        disabled={isLoading}
      />

      {showGroup ? (
        <Select
          label="Група"
          value={selectedGroupId}
          onChange={(event) => onGroupChange(event.target.value)}
          options={groupOptions}
          placeholder="Всички групи"
          disabled={isLoading}
        />
      ) : null}

      <Select
        label="Период"
        value={preset}
        onChange={(event) => onPresetChange(event.target.value)}
        options={PERIOD_OPTIONS}
        placeholder="Избери период"
        disabled={isLoading}
      />

      {showCustomDates ? (
        <Input
          label="Начална дата"
          type="date"
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          disabled={isLoading}
        />
      ) : null}

      {showCustomDates ? (
        <Input
          label="Крайна дата"
          type="date"
          value={endDate}
          onChange={(event) => onEndDateChange(event.target.value)}
          disabled={isLoading}
        />
      ) : null}

      <div className="statistics-filter-action">
        <Button variant="ghost" onClick={onClear} disabled={isLoading}>
          Изчисти филтрите
        </Button>
      </div>
    </div>
  );
}
