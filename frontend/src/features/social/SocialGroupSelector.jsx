import Select from '../../components/ui/Select';

function formatGroupOption(group) {
  return [group.academy?.name, group.name].filter(Boolean).join(' · ');
}

export default function SocialGroupSelector({ groups, value, onChange, disabled = false }) {
  const options = (groups || []).map((group) => ({
    value: String(group.id),
    label: formatGroupOption(group),
  }));

  return (
    <Select
      label="Група"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options}
      placeholder="Изберете група"
      disabled={disabled}
    />
  );
}
