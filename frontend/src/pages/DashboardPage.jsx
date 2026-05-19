import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingScreen from '../components/ui/LoadingScreen';
import ComfortZoneStatsCard from '../features/reports/ComfortZoneStatsCard';
import DashboardSummaryCards from '../features/reports/DashboardSummaryCards';
import QuestionnaireStatsCard from '../features/reports/QuestionnaireStatsCard';
import SocialStatsCard from '../features/reports/SocialStatsCard';
import SportsStatsCard from '../features/reports/SportsStatsCard';
import { useAuth } from '../features/auth/AuthProvider';
import { getApiErrorMessage } from '../utils/errorMessage';
import reportService from '../features/reports/reportService';

const ROLE_LABELS = {
  super_admin: 'Супер администратор',
  admin: 'Администратор',
  manager: 'Мениджър',
  coach: 'Треньор',
};

function formatShortDate(value) {
  return value ? String(value).slice(0, 10) : '-';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await reportService.getDashboard();
      setDashboard(response.dashboard);
    } catch (error) {
      setDashboard(null);
      setErrorMessage(getApiErrorMessage(error, 'Данните за таблото в момента не са налични.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="page-stack">
      <section className="dashboard-hero">
        <h1>Здравей, {user?.firstName || 'Колега'}</h1>
        <p>Роля: {ROLE_LABELS[user?.role] || 'Потребител'}</p>
        {dashboard?.scope?.weekStartDate ? (
          <p className="dashboard-helper-text">
            Седмичният срез е с начало: {formatShortDate(dashboard.scope.weekStartDate)}
          </p>
        ) : null}
      </section>

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}

      {isLoading ? (
        <>
          <LoadingScreen fullPage={false} />
          <section className="report-cards-grid">
            <Card title="Основни показатели">
              <p className="muted-text">Зареждане на обобщението...</p>
            </Card>
            <Card title="Въпросници">
              <p className="muted-text">Подготвяме данните за въпросниците...</p>
            </Card>
            <Card title="Комфортна зона">
              <p className="muted-text">Подготвяме картината за профилите...</p>
            </Card>
            <Card title="Социално поведение">
              <p className="muted-text">Подготвяме социалното обобщение...</p>
            </Card>
            <Card title="Спортни предизвикателства">
              <p className="muted-text">Подготвяме спортните резултати...</p>
            </Card>
          </section>
        </>
      ) : dashboard ? (
        <>
          <DashboardSummaryCards counts={dashboard.counts} />

          <section className="report-cards-grid">
            <QuestionnaireStatsCard stats={dashboard.questionnaires} />
            <ComfortZoneStatsCard stats={dashboard.comfortZone} />
            <SocialStatsCard social={dashboard.social} />
            <SportsStatsCard sports={dashboard.sports} />
          </section>
        </>
      ) : (
        <Card>
          <p className="muted-text">
            Засега няма налични агрегирани данни. Продължете с ежедневната работа и тук ще се появи
            обобщение.
          </p>
        </Card>
      )}

      <Card title="Бързи действия">
        <div className="report-page-actions">
          <Button variant="secondary" onClick={() => navigate('/children')}>
            Деца
          </Button>
          <Button variant="secondary" onClick={() => navigate('/social/weekly')}>
            Социална седмица
          </Button>
          <Button variant="secondary" onClick={() => navigate('/creativity')}>
            Креативност
          </Button>
          <Button variant="secondary" onClick={() => navigate('/sports')}>
            Спорт
          </Button>
          <Button onClick={() => navigate('/reports')}>Справки</Button>
          <Button variant="secondary" onClick={() => navigate('/statistics')}>
            Статистика
          </Button>
          <Button variant="secondary" onClick={() => navigate('/group-leaderboard')}>
            Класация групи
          </Button>
        </div>
      </Card>
    </div>
  );
}
