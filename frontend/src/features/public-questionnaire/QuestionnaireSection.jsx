import Card from '../../components/ui/Card';
import QuestionnaireScoreInput from './QuestionnaireScoreInput';
import QuestionnaireTextInput from './QuestionnaireTextInput';

export default function QuestionnaireSection({
  section,
  answersByCode,
  errorsByCode,
  onScoreChange,
  onNoteChange,
  onTextChange,
}) {
  return (
    <Card className="pq-section-card">
      <h2 className="pq-section-title">{section.name}</h2>

      {(section.subsections || []).map((subsection) => (
        <section className="pq-subsection" key={`${section.code}-${subsection.code}`}>
          <h3 className="pq-subsection-title">{subsection.name}</h3>

          <div className="pq-question-list">
            {(subsection.questions || []).map((question) => {
              const answer = answersByCode?.[question.code] || {};
              const error = errorsByCode?.[question.code] || '';

              return (
                <article className="pq-question-card" key={question.code}>
                  {question.inputType === 'score' ? (
                    <QuestionnaireScoreInput
                      question={question}
                      answer={answer}
                      onChange={(value) => onScoreChange(question.code, value)}
                      onNoteChange={(value) => onNoteChange(question.code, value)}
                      error={error}
                    />
                  ) : (
                    <QuestionnaireTextInput
                      question={question}
                      answer={answer}
                      onChange={(value) => onTextChange(question.code, value)}
                      error={error}
                    />
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </Card>
  );
}
