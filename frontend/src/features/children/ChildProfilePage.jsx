import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import LoadingScreen from '../../components/ui/LoadingScreen';
import EmptyState from '../../components/ui/EmptyState';
import QuestionnaireLinkPanel from './QuestionnaireLinkPanel';
import ComfortZoneSummary from './ComfortZoneSummary';
import ComfortZoneSections from './ComfortZoneSections';
import ChildProfileHeader from './ChildProfileHeader';
import childService from './childService';
import { useAuth } from '../auth/AuthProvider';
import { getApiErrorMessage } from '../../utils/errorMessage';
import { formatDate, formatGender } from '../../utils/formatters';

function getFriendlyChildError(error) {
  const status = error?.response?.status;

  if (status === 403) {
    return 'Нямате достъп до това дете.';
  }

  if (status === 404) {
    return 'Детето не е намерено.';
  }

  if (status === 409) {
    return getApiErrorMessage(error);
  }

  return getApiErrorMessage(error, 'Възникна грешка. Опитайте отново.');
}

function getFriendlySendEmailError(error) {
  const status = error?.response?.status;

  if (status === 400) {
    return 'Няма въведен имейл на родител.';
  }

  if (status === 409) {
    return 'Въпросникът вече е попълнен.';
  }

  if (status === 503) {
    return 'Изпращането на имейли не е активирано.';
  }

  return 'Възникна грешка при изпращане на имейла.';
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="meta-label">{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

export default function ChildProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canManageChildren = ['super_admin', 'admin', 'coach'].includes(user?.role);
  const canSendQuestionnaireEmail = ['super_admin', 'admin', 'manager', 'coach'].includes(user?.role);
  const canForceRegenerate = ['super_admin', 'admin'].includes(user?.role);

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const result = await childService.getChildProfile(id);
      setProfile(result);
    } catch (error) {
      setErrorMessage(getFriendlyChildError(error));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleGenerateQuestionnaire(forceRegenerate) {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      const questionnaire = await childService.generateQuestionnaireToken(id, { forceRegenerate });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              questionnaire,
            }
          : prev
      );
      setSuccessMessage('Линкът към въпросника е готов за споделяне.');
    } catch (error) {
      setErrorMessage(getFriendlyChildError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendQuestionnaireEmail() {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await childService.sendQuestionnaireEmail(id, { forceRegenerate: false });
      await loadProfile();
      setSuccessMessage('Въпросникът е изпратен успешно.');
    } catch (error) {
      setErrorMessage(getFriendlySendEmailError(error));
    } finally {
      setIsSaving(false);
    }
  }

  const child = profile?.child;
  const currentGroup = profile?.currentGroup;

  const notes = useMemo(
    () => ({
      general: child?.generalNotes || '',
      medical: child?.medicalNotes || '',
    }),
    [child?.generalNotes, child?.medicalNotes]
  );

  if (isLoading) {
    return <LoadingScreen fullPage={false} />;
  }

  if (!profile || !child) {
    return (
      <div className="page-stack">
        {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
        <Card>
          <EmptyState
            title="Профилът не е достъпен"
            description="Върнете се към списъка с деца и опитайте отново."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Card>
        <ChildProfileHeader child={child} currentGroup={currentGroup} onBack={() => navigate('/children')} />
      </Card>

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert type="success">{successMessage}</Alert> : null}

      <Card title="Контакт и основна информация">
        <div className="info-grid-2">
          <InfoRow label="Родител/настойник" value={child.parentName} />
          <InfoRow label="Имейл" value={child.parentEmail} />
          <InfoRow label="Телефон" value={child.parentPhone} />
          <InfoRow label="Дата на раждане" value={formatDate(child.birthDate)} />
          <InfoRow label="Пол" value={formatGender(child.gender)} />
          <InfoRow label="Група" value={currentGroup?.name || '-'} />
          <InfoRow label="Сезон" value={currentGroup?.season?.name || '-'} />
          <InfoRow label="Академия" value={currentGroup?.academy?.name || '-'} />
        </div>

        <div className="notes-grid">
          <article className="note-box">
            <h4>Общи бележки</h4>
            <p>{notes.general || 'Няма добавени бележки.'}</p>
          </article>
          <article className="note-box">
            <h4>Медицински бележки</h4>
            <p>{notes.medical || 'Няма добавени медицински бележки.'}</p>
          </article>
        </div>
      </Card>

      <Card>
        <QuestionnaireLinkPanel
          questionnaire={profile.questionnaire}
          canManage={canManageChildren}
          canForceRegenerate={canForceRegenerate}
          canSendEmail={canSendQuestionnaireEmail}
          parentEmail={child.parentEmail}
          onGenerate={() => handleGenerateQuestionnaire(false)}
          onForceRegenerate={() => handleGenerateQuestionnaire(true)}
          onSendEmail={handleSendQuestionnaireEmail}
          isSaving={isSaving}
        />
      </Card>

      {profile.comfortZone?.hasProfile ? (
        <>
          <ComfortZoneSummary comfortZone={profile.comfortZone} />
          <ComfortZoneSections comfortZone={profile.comfortZone} />
        </>
      ) : (
        <Card>
          <EmptyState
            title="Все още няма попълнен профил Комфортна зона."
            description="Изпратете родителския въпросник или изчакайте попълването му."
          />
        </Card>
      )}
    </div>
  );
}
