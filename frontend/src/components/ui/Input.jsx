export default function Input({
  label,
  error,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  name,
  disabled = false,
  required = false,
  min,
  max,
  step,
}) {
  return (
    <label className="form-field">
      {label ? <span className="form-label">{label}</span> : null}
      <input
        className={`input ${error ? 'input-error' : ''}`}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        name={name}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        step={step}
      />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
