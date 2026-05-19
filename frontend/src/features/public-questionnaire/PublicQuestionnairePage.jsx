import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import LoadingScreen from '../../components/ui/LoadingScreen';
import publicQuestionnaireService from './publicQuestionnaireService';
import QuestionnaireIntro from './QuestionnaireIntro';
import QuestionnaireSection from './QuestionnaireSection';
import QuestionnaireProgress from './QuestionnaireProgress';
import QuestionnaireSuccess from './QuestionnaireSuccess';
import QuestionnaireUnavailable from './QuestionnaireUnavailable';
import {
  RELATION_OPTIONS,
  flattenQuestions,
  buildInitialAnswers,
  calculateProgress,
  validateQuestionnaireForm,
  buildSubmitPayload,
  mapUnavailableFromError,
} from './questionnaireUtils';

export default function PublicQuestionnairePage() {
  const { token } = useParams();

  const [screenState, setScreenState] = useState('loading');
  const [unavailableState, setUnavailableState] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answersByCode, setAnswersByCode] = useState({});

  const [submittedByName, setSubmittedByName] = useState('');
  const [submittedByRelation, setSubmittedByRelation] = useState('parent');

  const [errors, setErrors] = useState({
    submittedByName: '',
    submittedByRelation: '',
    questions: {},
  });

  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = useMemo(
    () => calculateProgress(questions, answersByCode),
    [answersByCode, questions]
  );

  const loadQuestionnaire = useCallback(async () => {
    try {
      setScreenState('loading');
      setSubmitError('');

      const result = await publicQuestionnaireService.getQuestionnaireByToken(token);
      const flatQuestions = flattenQuestions(result.form);

      setQuestionnaire(result);
      setQuestions(flatQuestions);
      setAnswersByCode(buildInitialAnswers(flatQuestions));
      setSubmittedByName('');
      setSubmittedByRelation('parent');
      setErrors({
        submittedByName: '',
        submittedByRelation: '',
        questions: {},
      });
      setScreenState('ready');
    } catch (error) {
      setUnavailableState(mapUnavailableFromError(error));
      setScreenState('unavailable');
    }
  }, [token]);

  useEffect(() => {
    loadQuestionnaire();
  }, [loadQuestionnaire]);

  function focusInvalidField(firstInvalidCode) {
    if (!firstInvalidCode) {
      return;
    }

    if (firstInvalidCode === 'submittedByName') {
      document.querySelector('input[name="submittedByName"]')?.focus();
      return;
    }

    if (firstInvalidCode === 'submittedByRelation') {
      document.getElementById('pq-relation-parent')?.focus();
      return;
    }

    const questionContainer = document.getElementById(`question-${firstInvalidCode}`);

    if (questionContainer) {
      questionContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable = questionContainer.querySelector('input, textarea');
      focusable?.focus();
    }
  }

  function updateAnswer(questionCode, nextValue) {
    setAnswersByCode((prev) => ({
      ...prev,
      [questionCode]: {
        ...prev[questionCode],
        ...nextValue,
      },
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validation = validateQuestionnaireForm({
      questions,
      answersByCode,
      submittedByName,
      submittedByRelation,
    });

    setErrors(validation.errors);

    if (!validation.isValid) {
      focusInvalidField(validation.firstInvalidCode);
      return;
    }

    const payload = buildSubmitPayload({
      questions,
      answersByCode,
      submittedByName,
      submittedByRelation,
    });

    try {
      setIsSubmitting(true);
      setSubmitError('');
      await publicQuestionnaireService.submitQuestionnaire(token, payload);
      setScreenState('success');
    } catch (error) {
      const status = error?.response?.status;

      if (status === 404 || status === 409 || status === 410) {
        setUnavailableState(mapUnavailableFromError(error));
        setScreenState('unavailable');
      } else {
        setSubmitError('Възникна грешка. Опитайте отново след малко.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (screenState === 'loading') {
    return (
      <main className="pq-state-page">
        <Card className="pq-state-card">
          <LoadingScreen fullPage={false} />
        </Card>
      </main>
    );
  }

  if (screenState === 'success') {
    return <QuestionnaireSuccess />;
  }

  if (screenState === 'unavailable') {
    return (
      <QuestionnaireUnavailable
        title={unavailableState?.title || 'Възникна грешка'}
        message={unavailableState?.message || 'Опитайте отново след малко.'}
        onRetry={loadQuestionnaire}
      />
    );
  }

  return (
    <main className="pq-page">
      <div className="pq-container">
        <QuestionnaireIntro
          child={questionnaire?.child}
          formTitle={questionnaire?.form?.title}
          expiresAt={questionnaire?.expiresAt}
        />

        <Card className="pq-submitter-card">
          <div className="form-grid-2">
            <Input
              label="Вашето име"
              name="submittedByName"
              value={submittedByName}
              onChange={(event) => setSubmittedByName(event.target.value)}
              placeholder="Например: Мария Петрова"
              error={errors.submittedByName}
            />
          </div>

          <fieldset className="pq-relation-group">
            <legend>
              Попълнено от <span className="pq-required">*</span>
            </legend>
            <div className="pq-relation-options">
              {RELATION_OPTIONS.map((option) => (
                <label className="pq-radio-option" key={option.value} htmlFor={`pq-relation-${option.value}`}>
                  <input
                    id={`pq-relation-${option.value}`}
                    type="radio"
                    name="submittedByRelation"
                    value={option.value}
                    checked={submittedByRelation === option.value}
                    onChange={(event) => setSubmittedByRelation(event.target.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {errors.submittedByRelation ? (
              <p className="field-error pq-error-text">{errors.submittedByRelation}</p>
            ) : null}
          </fieldset>
        </Card>

        <QuestionnaireProgress
          answeredRequired={progress.answeredRequired}
          totalRequired={progress.totalRequired}
          percentage={progress.percentage}
        />

        {submitError ? <Alert type="error">{submitError}</Alert> : null}

        <form className="pq-form" onSubmit={handleSubmit} noValidate>
          {(questionnaire?.form?.sections || []).map((section) => (
            <QuestionnaireSection
              key={section.code}
              section={section}
              answersByCode={answersByCode}
              errorsByCode={errors.questions}
              onScoreChange={(questionCode, scoreValue) => updateAnswer(questionCode, { scoreValue })}
              onNoteChange={(questionCode, note) => updateAnswer(questionCode, { note })}
              onTextChange={(questionCode, textValue) => updateAnswer(questionCode, { textValue })}
            />
          ))}

          <div className="pq-submit-bar">
            <p className="muted-text">Информацията помага на екипа да подкрепи детето по най-подходящ начин.</p>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="pq-submit-button"
            >
              Изпрати въпросника
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
