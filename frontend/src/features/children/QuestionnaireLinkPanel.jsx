import { useState } from 'react';
import Button from '../../components/ui/Button';
import CopyButton from '../../components/ui/CopyButton';
import StatusPill from '../../components/ui/StatusPill';
import { formatDate, formatQuestionnaireStatus, getQuestionnaireTone } from '../../utils/formatters';

export default function QuestionnaireLinkPanel({
  questionnaire,
  canManage,
  canForceRegenerate,
  canSendEmail,
  parentEmail,
  onGenerate,
  onForceRegenerate,
  onSendEmail,
  isSaving,
}) {
  const [showFallbackInput, setShowFallbackInput] = useState(false);

  const status = questionnaire?.status || null;
  const hasLink = Boolean(questionnaire?.link);
  const hasParentEmail = Boolean(parentEmail);
  const latestEmailDelivery = questionnaire?.latestEmailDelivery || null;
  const canShowSendEmailAction = canSendEmail && status !== 'submitted' && hasParentEmail;

  return (
    <section className="questionnaire-panel">
      <div className="questionnaire-panel-header">
        <h3>Родителски въпросник</h3>
        <StatusPill label={formatQuestionnaireStatus(status)} tone={getQuestionnaireTone(status)} />
      </div>

      <div className="questionnaire-meta-grid">
        <div>
          <span className="meta-label">Валиден до</span>
          <strong>{formatDate(questionnaire?.expiresAt)}</strong>
        </div>
        <div>
          <span className="meta-label">Попълнен на</span>
          <strong>{formatDate(questionnaire?.submittedAt)}</strong>
        </div>
        <div>
          <span className="meta-label">Последно изпращане</span>
          {latestEmailDelivery?.status === 'sent' ? (
            <strong>
              Последно изпратен: {formatDate(latestEmailDelivery?.sentAt)} до {latestEmailDelivery?.recipient || '-'}
            </strong>
          ) : latestEmailDelivery?.status === 'failed' ? (
            <strong>Последният опит за изпращане не беше успешен.</strong>
          ) : (
            <strong>-</strong>
          )}
        </div>
      </div>

      {status === 'submitted' ? (
        <p className="questionnaire-positive-note">Въпросникът вече е попълнен.</p>
      ) : null}

      {hasLink ? (
        <div className="questionnaire-link-row">
          <input
            className="input"
            readOnly
            value={questionnaire.link}
            aria-label="Линк към въпросник"
          />
          <CopyButton
            text={questionnaire.link}
            onUnavailable={() => setShowFallbackInput(true)}
            disabled={isSaving}
          />
        </div>
      ) : (
        <p className="muted-text">Няма активен линк в момента.</p>
      )}

      {showFallbackInput && hasLink ? (
        <p className="muted-text">Копирайте ръчно линка от полето.</p>
      ) : null}

      {canManage ? (
        <div className="questionnaire-actions">
          <Button variant="secondary" size="sm" onClick={onGenerate} loading={isSaving} disabled={isSaving}>
            Генерирай линк
          </Button>

          {canForceRegenerate ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onForceRegenerate}
              loading={isSaving}
              disabled={isSaving}
            >
              Регенерирай линк
            </Button>
          ) : null}
        </div>
      ) : null}

      {canShowSendEmailAction ? (
        <div className="questionnaire-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={onSendEmail}
            loading={isSaving}
            disabled={isSaving}
          >
            Изпрати по имейл
          </Button>
        </div>
      ) : null}

      {canSendEmail && !hasParentEmail ? (
        <p className="muted-text">Няма въведен имейл на родител.</p>
      ) : null}
    </section>
  );
}
