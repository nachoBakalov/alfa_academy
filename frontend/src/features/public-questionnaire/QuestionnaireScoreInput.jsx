import Textarea from '../../components/ui/Textarea';
import StatusPill from '../../components/ui/StatusPill';
import { getScaleHelper } from './questionnaireUtils';

export default function QuestionnaireScoreInput({
  question,
  answer,
  onChange,
  onNoteChange,
  error,
}) {
  const value = answer?.scoreValue;
  const note = answer?.note || '';
  const helperLines = getScaleHelper(question.scaleType);

  return (
    <div className="pq-question-body" id={`question-${question.code}`}>
      <div className="pq-question-head">
        <label htmlFor={`score-${question.code}`} className="pq-question-label">
          {question.label}
          {question.isRequired ? <span className="pq-required">*</span> : null}
        </label>
        <StatusPill label={value ? `Оценка: ${value}` : 'Изберете оценка от 1 до 10'} tone={value ? 'success' : 'warning'} />
      </div>

      <input
        id={`score-${question.code}`}
        className="pq-range"
        type="range"
        min={1}
        max={10}
        step={1}
        value={value ?? 5}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={question.label}
      />

      <div className="pq-range-labels" aria-hidden="true">
        <span>1</span>
        <span>10</span>
      </div>

      {helperLines.length > 0 ? (
        <ul className="pq-helper-list">
          {helperLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {question.hasNote ? (
        <Textarea
          label="Бележка"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Допълнителна информация (по избор)"
          rows={3}
        />
      ) : null}

      {error ? <p className="field-error pq-error-text">{error}</p> : null}
    </div>
  );
}
