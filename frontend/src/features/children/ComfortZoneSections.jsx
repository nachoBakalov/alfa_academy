import Card from '../../components/ui/Card';
import StatusPill from '../../components/ui/StatusPill';
import { formatZoneLabel, getZoneTone } from '../../utils/formatters';

export default function ComfortZoneSections({ comfortZone }) {
  if (!comfortZone?.hasProfile) {
    return null;
  }

  const attachedAnswerCodes = new Set();

  for (const section of comfortZone.sections || []) {
    for (const subsection of section.subsections || []) {
      for (const answer of subsection.textAnswers || []) {
        if (answer.questionCode) {
          attachedAnswerCodes.add(answer.questionCode);
        }
      }
    }
  }

  const additionalTextAnswers = (comfortZone.textAnswers || []).filter(
    (answer) => !answer.questionCode || !attachedAnswerCodes.has(answer.questionCode)
  );

  return (
    <div className="comfort-sections-stack">
      <Card title="Комфортна зона - секции">
        {(comfortZone.sections || []).length === 0 ? (
          <p className="muted-text">Няма детайлни резултати за показване.</p>
        ) : (
          <div className="comfort-section-list">
            {(comfortZone.sections || []).map((section) => (
              <article className="comfort-section" key={section.code}>
                <header>
                  <h4>{section.name}</h4>
                </header>

                {(section.subsections || []).map((subsection) => (
                  <section className="comfort-subsection" key={`${section.code}-${subsection.code}`}>
                    <h5>{subsection.name}</h5>

                    <div className="comfort-score-list">
                      {(subsection.scores || []).map((score) => (
                        <div className="comfort-score-item" key={`${subsection.code}-${score.actionCode}`}>
                          <div className="comfort-score-main">
                            <strong>{score.label}</strong>
                            <span className="muted-text">Оценка: {score.scoreValue ?? '-'}</span>
                          </div>
                          <div className="comfort-score-side">
                            <StatusPill
                              label={formatZoneLabel(score.zone)}
                              tone={getZoneTone(score.zone)}
                            />
                            {score.interpretation ? (
                              <span className="muted-text">{score.interpretation}</span>
                            ) : null}
                          </div>
                          {score.note ? (
                            <div className="comfort-note-box">
                              <span className="comfort-note-label">Бележка от родител</span>
                              <p>{score.note}</p>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    {(subsection.textAnswers || []).length ? (
                      <div className="comfort-text-answer-list">
                        {(subsection.textAnswers || []).map((answer) => (
                          <div
                            className="comfort-text-answer-box"
                            key={`${subsection.code}-${answer.questionCode || answer.label}`}
                          >
                            <span className="comfort-note-label">Текстов отговор</span>
                            <strong>{answer.label}</strong>
                            <p>{answer.textValue || '-'}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ))}
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card title="Допълнителни текстови отговори">
        {additionalTextAnswers.length === 0 ? (
          <p className="muted-text">Няма отделни текстови отговори.</p>
        ) : (
          <div className="text-answers-list">
            {additionalTextAnswers.map((answer) => (
              <article className="text-answer-item" key={answer.questionCode || answer.label}>
                <h4>{answer.label || answer.questionCode}</h4>
                <p>{answer.textValue || '-'}</p>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
