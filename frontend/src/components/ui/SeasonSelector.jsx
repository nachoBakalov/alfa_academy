import Select from './Select';

function formatSeasonOptionLabel(season) {
  const parts = [season.name || 'Сезон'];

  if (season.academy?.name) {
    parts.push(season.academy.name);
  }

  if (season.startsOn && season.endsOn) {
    parts.push(`${season.startsOn} - ${season.endsOn}`);
  }

  return parts.join(' · ');
}

export default function SeasonSelector({
  label = 'Сезон',
  value,
  onChange,
  seasons = [],
  placeholder = 'Всички сезони',
  disabled = false,
}) {
  const options = seasons.map((season) => ({
    value: String(season.id),
    label: formatSeasonOptionLabel(season),
    disabled: season.isActive === false,
  }));

  return (
    <Select
      label={label}
      value={value ?? ''}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
