import Card from '../../components/ui/Card';
import StatusPill from '../../components/ui/StatusPill';
import ComfortZoneStatsCard from './ComfortZoneStatsCard';
import QuestionnaireStatsCard from './QuestionnaireStatsCard';
import {
  formatSportsChallengeStatus,
  formatSportsFinalStatus,
  formatWeeklyStatus,
  formatZoneSummaryLabel,
  getSportsChallengeStatusTone,
  getSportsFinalStatusTone,
  getWeeklyStatusTone,
  getZoneSummaryTone,
} from './reportLabels';
import { formatAlphaBalls, formatNumber, formatPercent } from './reportFormatters';

function ChildrenCard({ children }) {
  return (
    <Card title="Деца в групата">
      <div className="report-stat-list">
        <div className="report-stat-item">
          <span>Активни деца</span>
          <strong>{formatNumber(children?.activeChildren)}</strong>
        </div>
        <div className="report-stat-item">
          <span>Неактивни деца</span>
          <strong>{formatNumber(children?.inactiveChildren)}</strong>
        </div>
      </div>
    </Card>
  );
}

function ZoneSummaryCard({ comfortZone }) {
  const zoneSummary = comfortZone?.zoneSummary || {};
  const zoneItems = [
    { key: 'green', value: zoneSummary.green },
    { key: 'yellow', value: zoneSummary.yellow },
    { key: 'red', value: zoneSummary.red },
    { key: 'behaviorIndicator', value: zoneSummary.behaviorIndicator },
  ];

  return (
    <Card title="Зонално обобщение">
      <div className="report-status-stack">
        {zoneItems.map((item) => (
          <StatusPill
            key={item.key}
            label={`${formatZoneSummaryLabel(item.key)}: ${formatNumber(item.value)}`}
            tone={getZoneSummaryTone(item.key)}
          />
        ))}
      </div>
    </Card>
  );
}

function SocialWeeklyCard({ social }) {
  return (
    <Card title="Седмичен социален резултат">
      {social?.hasWeeklySummary ? (
        <div className="report-stat-list">
          <div className="report-stat-item">
            <span>Алфа топки</span>
            <strong>{formatAlphaBalls(social?.weeklyAlphaBalls)}</strong>
          </div>
          <div className="report-stat-item">
            <span>Седмичен процент</span>
            <strong>{formatPercent(social?.weeklyPercentage)}</strong>
          </div>
          <div className="report-stat-item">
            <span>Максимум</span>
            <strong>{formatNumber(social?.weeklyMaximum)}</strong>
          </div>
          <div className="report-status-row">
            <StatusPill
              label={formatWeeklyStatus(social?.weeklyStatus)}
              tone={getWeeklyStatusTone(social?.weeklyStatus)}
            />
          </div>
        </div>
      ) : (
        <p className="muted-text">Все още няма седмично обобщение.</p>
      )}
    </Card>
  );
}

function SportsLatestCard({ sports }) {
  return (
    <Card title="Спорт и последни предизвикателства">
      <div className="report-stat-list">
        <div className="report-stat-item">
          <span>Активни предизвикателства</span>
          <strong>{formatNumber(sports?.activeChallenges)}</strong>
        </div>
        <div className="report-stat-item">
          <span>Завършени предизвикателства</span>
          <strong>{formatNumber(sports?.completedChallenges)}</strong>
        </div>
      </div>

      {(sports?.latestChallenges || []).length ? (
        <div className="report-challenge-list">
          {(sports?.latestChallenges || []).map((challenge) => (
            <article key={challenge.id} className="report-challenge-item">
              <div className="cell-stack">
                <strong>{challenge.title || 'Спортно предизвикателство'}</strong>
                <span className="muted-text">
                  Участници: {formatNumber(challenge.participantsCount)} · Финални резултати:{' '}
                  {formatNumber(challenge.finalResultsCount)}
                </span>
              </div>

              <div className="report-status-row">
                <StatusPill
                  label={formatSportsChallengeStatus(challenge.status)}
                  tone={getSportsChallengeStatusTone(challenge.status)}
                />
                <StatusPill
                  label={formatSportsFinalStatus(challenge.finalStatus)}
                  tone={getSportsFinalStatusTone(challenge.finalStatus)}
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-text">Все още няма спортни предизвикателства за показване.</p>
      )}
    </Card>
  );
}

export default function GroupDashboardCards({ groupDashboard }) {
  if (!groupDashboard) {
    return null;
  }

  return (
    <div className="report-cards-grid">
      <ChildrenCard children={groupDashboard.children} />
      <QuestionnaireStatsCard stats={groupDashboard.questionnaires} title="Въпросници по група" />
      <ComfortZoneStatsCard stats={groupDashboard.comfortZone} title="Комфортна зона по група" />
      <ZoneSummaryCard comfortZone={groupDashboard.comfortZone} />
      <SocialWeeklyCard social={groupDashboard.social} />
      <SportsLatestCard sports={groupDashboard.sports} />
    </div>
  );
}
