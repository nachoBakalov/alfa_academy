import Input from '../../components/ui/Input';

export default function SocialDateSelector({
  label,
  value,
  onChange,
  helperText,
  error,
  disabled = false,
}) {
  return (
    <div className="social-date-selector">
      <Input
        label={label}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        disabled={disabled}
      />
      {helperText ? <p className="social-helper-text">{helperText}</p> : null}
    </div>
  );
}
