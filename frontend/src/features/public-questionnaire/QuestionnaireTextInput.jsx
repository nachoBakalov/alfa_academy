import Textarea from '../../components/ui/Textarea';

export default function QuestionnaireTextInput({ question, answer, onChange, error }) {
  return (
    <div className="pq-question-body" id={`question-${question.code}`}>
      <Textarea
        label={`${question.label}${question.isRequired ? ' *' : ''}`}
        value={answer?.textValue || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Вашият отговор"
        rows={3}
        error={error}
      />
    </div>
  );
}
