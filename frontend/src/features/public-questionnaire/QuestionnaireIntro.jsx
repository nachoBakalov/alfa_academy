import Card from '../../components/ui/Card';

export default function QuestionnaireIntro({ child, formTitle, expiresAt }) {
  const childName = [child?.firstName, child?.lastName].filter(Boolean).join(' ').trim() || 'Детето';

  return (
    <Card className="pq-intro-card">
      <p className="pq-brand">Fit Kids | Лятна академия</p>
      <h1 className="pq-title">{formTitle}</h1>
      <p className="pq-subtitle">За: {childName}</p>

      <div className="pq-intro-text">
        <p>
          Целта на въпросника е да помогне на екипа да разбере в кои дейности детето се чувства
          уверено и къде има нужда от подкрепа.
        </p>
        <p>
          Това не е диагностика и не е сравнение между деца. Оценката е за конкретно действие, а
          не за цяла сфера.
        </p>
      </div>

      <p className="pq-expiry">Линкът е валиден до: {expiresAt ? String(expiresAt).slice(0, 10) : '-'}</p>
    </Card>
  );
}
