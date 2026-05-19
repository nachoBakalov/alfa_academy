export default function Select({
  label,
  value,
  onChange,
  options = [],
  error,
  placeholder = 'Изберете',
  disabled = false,
  name,
}) {
  return (
    <label className="form-field">
      {label ? <span className="form-label">{label}</span> : null}
      <select
        className={`input select ${error ? 'input-error' : ''}`}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        name={name}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
