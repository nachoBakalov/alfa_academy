export default function Textarea({
  label,
  error,
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled = false,
  name,
}) {
  return (
    <label className="form-field">
      {label ? <span className="form-label">{label}</span> : null}
      <textarea
        className={`input textarea ${error ? 'input-error' : ''}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        name={name}
      />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
