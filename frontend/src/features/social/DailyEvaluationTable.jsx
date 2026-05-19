import Badge from '../../components/ui/Badge';
import Textarea from '../../components/ui/Textarea';
import SocialColorButtons from './SocialColorButtons';
import { formatDailyStatus, getDailyStatusTone, getSocialColorMeta } from './socialLabels';

function ChildNameCell({ child }) {
  return (
    <div className="cell-stack">
      <strong>
        {child.firstName} {child.lastName}
      </strong>
      <span className="muted-text">ID: {child.id}</span>
    </div>
  );
}

function ReadOnlyColor({ color }) {
  const meta = getSocialColorMeta(color);

  if (!meta) {
    return <span className="muted-text">Няма избор</span>;
  }

  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

function ResultCell({ evaluation }) {
  if (!evaluation) {
    return <span className="muted-text">Няма изчисление</span>;
  }

  return (
    <div className="social-result-cell">
      <Badge tone={getDailyStatusTone(evaluation.dailyStatus)}>
        {formatDailyStatus(evaluation.dailyStatus)}
      </Badge>
      <span className="muted-text">Вътрешен: {evaluation.internalScore ?? '-'}</span>
      <span className="muted-text">Външен: {evaluation.externalPoints ?? '-'}</span>
    </div>
  );
}

export default function DailyEvaluationTable({
  children = [],
  rowValues,
  rowErrors,
  canEdit,
  onColorChange,
  onCommentChange,
}) {
  if (!children.length) {
    return <p className="muted-text">Няма деца в групата за избраната дата.</p>;
  }

  return (
    <div className="social-daily-table-stack">
      <div className="table-wrapper">
        <table className="data-table social-daily-table">
          <thead>
            <tr>
              <th>Дете</th>
              <th>Отношение към треньор</th>
              <th>Отношение към децата</th>
              <th>Спазване на правила</th>
              <th>Коментар</th>
              <th>Резултат</th>
            </tr>
          </thead>
          <tbody>
            {children.map((child) => {
              const row = rowValues[child.id] || {};
              const rowError = rowErrors[child.id] || '';

              return (
                <tr key={child.id}>
                  <td>
                    <ChildNameCell child={child} />
                    {rowError ? <p className="field-error social-row-error">{rowError}</p> : null}
                  </td>
                  <td>
                    {canEdit ? (
                      <SocialColorButtons
                        compact
                        value={row.coachRelationColor}
                        onChange={(value) => onColorChange(child.id, 'coachRelationColor', value)}
                      />
                    ) : (
                      <ReadOnlyColor color={row.coachRelationColor} />
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      <SocialColorButtons
                        compact
                        value={row.childrenRelationColor}
                        onChange={(value) => onColorChange(child.id, 'childrenRelationColor', value)}
                      />
                    ) : (
                      <ReadOnlyColor color={row.childrenRelationColor} />
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      <SocialColorButtons
                        compact
                        value={row.rulesColor}
                        onChange={(value) => onColorChange(child.id, 'rulesColor', value)}
                      />
                    ) : (
                      <ReadOnlyColor color={row.rulesColor} />
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      <Textarea
                        value={row.optionalComment || ''}
                        onChange={(event) => onCommentChange(child.id, event.target.value)}
                        placeholder="Кратка бележка (по избор)"
                        rows={2}
                      />
                    ) : (
                      <span className="muted-text">{row.optionalComment || '-'}</span>
                    )}
                  </td>
                  <td>
                    <ResultCell evaluation={child.evaluation} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mobile-table-cards social-mobile-cards">
        {children.map((child) => {
          const row = rowValues[child.id] || {};
          const rowError = rowErrors[child.id] || '';

          return (
            <article className="mobile-table-card" key={child.id}>
              <div className="mobile-table-row">
                <span className="mobile-table-label">Дете</span>
                <div className="mobile-table-value">
                  <ChildNameCell child={child} />
                </div>
              </div>

              <div className="mobile-table-row">
                <span className="mobile-table-label">Отношение към треньор</span>
                <div className="mobile-table-value">
                  {canEdit ? (
                    <SocialColorButtons
                      compact
                      value={row.coachRelationColor}
                      onChange={(value) => onColorChange(child.id, 'coachRelationColor', value)}
                    />
                  ) : (
                    <ReadOnlyColor color={row.coachRelationColor} />
                  )}
                </div>
              </div>

              <div className="mobile-table-row">
                <span className="mobile-table-label">Отношение към децата</span>
                <div className="mobile-table-value">
                  {canEdit ? (
                    <SocialColorButtons
                      compact
                      value={row.childrenRelationColor}
                      onChange={(value) => onColorChange(child.id, 'childrenRelationColor', value)}
                    />
                  ) : (
                    <ReadOnlyColor color={row.childrenRelationColor} />
                  )}
                </div>
              </div>

              <div className="mobile-table-row">
                <span className="mobile-table-label">Спазване на правила</span>
                <div className="mobile-table-value">
                  {canEdit ? (
                    <SocialColorButtons
                      compact
                      value={row.rulesColor}
                      onChange={(value) => onColorChange(child.id, 'rulesColor', value)}
                    />
                  ) : (
                    <ReadOnlyColor color={row.rulesColor} />
                  )}
                </div>
              </div>

              <div className="mobile-table-row">
                <span className="mobile-table-label">Коментар</span>
                <div className="mobile-table-value">
                  {canEdit ? (
                    <Textarea
                      value={row.optionalComment || ''}
                      onChange={(event) => onCommentChange(child.id, event.target.value)}
                      placeholder="Кратка бележка (по избор)"
                      rows={2}
                    />
                  ) : (
                    <span className="muted-text">{row.optionalComment || '-'}</span>
                  )}
                </div>
              </div>

              <div className="mobile-table-row">
                <span className="mobile-table-label">Резултат</span>
                <div className="mobile-table-value">
                  <ResultCell evaluation={child.evaluation} />
                </div>
              </div>

              {rowError ? <p className="field-error social-row-error">{rowError}</p> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
