import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

function formatGroupOption(group) {
  return [group.academy?.name, group.name].filter(Boolean).join(' · ');
}

export default function ReportFilters({
  academies = [],
  coaches = [],
  groups = [],
  selectedAcademyId,
  selectedCoachId,
  selectedGroupId,
  selectedPeriod,
  onAcademyChange,
  onCoachChange,
  onGroupChange,
  onPeriodChange,
  weekStartDate,
  onWeekStartDateChange,
  onClear,
  isLoading,
}) {
  const academyOptions = academies.map((academy) => ({
    value: String(academy.id),
    label: academy.name,
  }));

  const coachOptions = coaches.map((coach) => ({
    value: String(coach.id),
    label: `${coach.firstName} ${coach.lastName}`.trim() || coach.email,
  }));

  const groupOptions = groups.map((group) => ({
    value: String(group.id),
    label: formatGroupOption(group),
  }));

  const periodOptions = [
    { value: 'current_week', label: 'Текуща седмица' },
    { value: 'previous_week', label: 'Предходна седмица' },
    { value: 'next_week', label: 'Следваща седмица' },
    { value: 'last_4_weeks', label: 'Последни 4 седмици' },
    { value: 'custom', label: 'Персонална дата' },
  ];

  return (
    <div className="filters-grid filters-grid-wide report-filters-grid">
      <Select
        label="Академия"
        value={selectedAcademyId}
        onChange={(event) => onAcademyChange(event.target.value)}
        options={academyOptions}
        placeholder="Всички академии"
        disabled={isLoading}
      />

      <Select
        label="Треньор"
        value={selectedCoachId}
        onChange={(event) => onCoachChange(event.target.value)}
        options={coachOptions}
        placeholder="Всички треньори"
        disabled={isLoading}
      />

      <Select
        label="Група"
        value={selectedGroupId}
        onChange={(event) => onGroupChange(event.target.value)}
        options={groupOptions}
        placeholder="Всички групи"
        disabled={isLoading}
      />

      <Select
        label="Период"
        value={selectedPeriod}
        onChange={(event) => onPeriodChange(event.target.value)}
        options={periodOptions}
        placeholder="Изберете период"
        disabled={isLoading}
      />

      <Input
        label="Начало на седмица"
        type="date"
        value={weekStartDate}
        onChange={(event) => onWeekStartDateChange(event.target.value)}
        disabled={isLoading}
      />

      <div className="report-filter-action">
        <Button variant="ghost" disabled={isLoading} onClick={onClear}>
          Изчисти филтрите
        </Button>
      </div>
    </div>
  );
}
