import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function QuestionnaireUnavailable({ title, message, onRetry }) {
  return (
    <main className="pq-state-page">
      <Card className="pq-state-card">
        <h1>{title}</h1>
        <p>{message}</p>
        {onRetry ? (
          <div className="pq-state-actions">
            <Button variant="secondary" onClick={onRetry}>
              Опитай отново
            </Button>
          </div>
        ) : null}
      </Card>
    </main>
  );
}
