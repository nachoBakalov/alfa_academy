import StatusPill from '../../components/ui/StatusPill';
import { CATEGORY_SHORT_LABELS } from './statisticsLabels';
import { formatBalls, formatPercent, toNumber } from './statisticsFormatters';

function resolveTone(percentage) {
  const value = toNumber(percentage, 0);

  if (value >= 85) {
    return 'success';
  }

  if (value >= 60) {
    return 'info';
  }

  return 'neutral';
}

function getGameMessage(percentage) {
  const score = toNumber(percentage, 0);

  if (score >= 85) {
    return 'Страхотен напредък!';
  }

  if (score >= 60) {
    return 'Много добър ритъм!';
  }

  return 'Продължаваме напред!';
}

export default function LeaderboardProgressList({ groups = [] }) {
  return (
    <section aria-label="Класация по групи" className="leaderboard-list">
      {groups.map((group) => (
        <article
          key={group.id}
          className={`leaderboard-game-card${group.rank <= 3 ? ` rank-${group.rank}` : ''}`}
        >
          <div className="leaderboard-item-head">
            <div className="leaderboard-rank-wrap">
              <span className="leaderboard-rank leaderboard-game-rank">#{group.rank}</span>
              <div>
                <h3>{group.name}</h3>
                <p>{group.academy?.name || 'Академия'}</p>
              </div>
            </div>
            <StatusPill tone={resolveTone(group.percentage)} label={formatPercent(group.percentage)} />
          </div>

          <div className="leaderboard-game-values">
            <p className="leaderboard-main-value">{formatBalls(group.totalBalls, group.maxBalls)} Алфа топки</p>
            <strong>{formatPercent(group.percentage)}</strong>
          </div>

          <div className="leaderboard-game-progress" role="img" aria-label={`${group.name}: ${formatPercent(group.percentage)}`}>
            <div
              className="leaderboard-game-progress-fill"
              style={{ width: `${Math.max(0, Math.min(100, group.percentage))}%` }}
            />
          </div>

          <p className="leaderboard-note">{getGameMessage(group.percentage)}</p>

          <div className="leaderboard-category-chips" aria-label="Категории">
            <span>{CATEGORY_SHORT_LABELS.social}: {toNumber(group.categories?.social, 0)}</span>
            <span>{CATEGORY_SHORT_LABELS.sports}: {toNumber(group.categories?.sports, 0)}</span>
            <span>{CATEGORY_SHORT_LABELS.creativity}: {toNumber(group.categories?.creativity, 0)}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
