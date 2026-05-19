import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import StatusPill from '../../components/ui/StatusPill';
import { formatNumber } from './sportsFormatters';

function boolLabel(value, yesLabel, noLabel) {
  if (value === null || value === undefined) {
    return 'Няма данни';
  }

  return value ? yesLabel : noLabel;
}

function boolTone(value) {
  if (value === null || value === undefined) {
    return 'neutral';
  }

  return value ? 'success' : 'warning';
}

export default function SportsResultsTable({
  rows = [],
  valuesByChildId,
  errorsByChildId,
  canEdit,
  unit,
  onValueChange,
}) {
  if (!rows.length) {
    return <p className="muted-text">Няма участници в предизвикателството.</p>;
  }

  return (
    <div className="sports-results-stack">
      <div className="table-wrapper">
        <table className="data-table sports-results-table">
          <thead>
            <tr>
              <th>Дете</th>
              <th>Първи резултат</th>
              <th>Инд. таргет</th>
              <th>Финален резултат</th>
              <th>Разлика от първи</th>
              <th>Разлика от таргет</th>
              <th>Таргет</th>
              <th>Повторил/подобрил</th>
              <th>Бележки</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const childId = row.child?.id;
              const local = valuesByChildId[childId] || {};
              const rowError = errorsByChildId[childId] || '';

              return (
                <tr key={childId}>
                  <td>
                    <div className="cell-stack">
                      <strong>
                        {row.child?.firstName} {row.child?.lastName}
                      </strong>
                      {rowError ? <span className="field-error">{rowError}</span> : null}
                    </div>
                  </td>
                  <td>
                    {canEdit ? (
                      <Input
                        type="number"
                        value={local.baselineValue}
                        onChange={(event) => onValueChange(childId, 'baselineValue', event.target.value)}
                        min={0}
                        step={0.01}
                        placeholder="-"
                      />
                    ) : (
                      formatNumber(local.baselineValue, unit)
                    )}
                  </td>
                  <td>{formatNumber(row.individualTargetValue, unit)}</td>
                  <td>
                    {canEdit ? (
                      <Input
                        type="number"
                        value={local.finalValue}
                        onChange={(event) => onValueChange(childId, 'finalValue', event.target.value)}
                        min={0}
                        step={0.01}
                        placeholder="-"
                      />
                    ) : (
                      formatNumber(local.finalValue, unit)
                    )}
                  </td>
                  <td>{formatNumber(row.differenceFromBaseline, unit)}</td>
                  <td>{formatNumber(row.differenceFromTarget, unit)}</td>
                  <td>
                    <StatusPill
                      label={boolLabel(row.individualTargetReached, 'Постигнат', 'Още опити')}
                      tone={boolTone(row.individualTargetReached)}
                    />
                  </td>
                  <td>
                    <StatusPill
                      label={boolLabel(
                        row.repeatedOrImprovedBaseline,
                        'Повторил/подобрил',
                        'Нужно е насърчаване'
                      )}
                      tone={boolTone(row.repeatedOrImprovedBaseline)}
                    />
                  </td>
                  <td>
                    {canEdit ? (
                      <Textarea
                        value={local.notes}
                        onChange={(event) => onValueChange(childId, 'notes', event.target.value)}
                        rows={2}
                        placeholder="Кратка бележка"
                      />
                    ) : (
                      <span className="muted-text">{local.notes || '-'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mobile-table-cards">
        {rows.map((row) => {
          const childId = row.child?.id;
          const local = valuesByChildId[childId] || {};
          const rowError = errorsByChildId[childId] || '';

          return (
            <article className="mobile-table-card" key={childId}>
              <div className="mobile-table-row">
                <span className="mobile-table-label">Дете</span>
                <div className="mobile-table-value">
                  <strong>
                    {row.child?.firstName} {row.child?.lastName}
                  </strong>
                  {rowError ? <p className="field-error">{rowError}</p> : null}
                </div>
              </div>

              <div className="mobile-table-row">
                <span className="mobile-table-label">Първи резултат</span>
                <div className="mobile-table-value">
                  {canEdit ? (
                    <Input
                      type="number"
                      value={local.baselineValue}
                      onChange={(event) => onValueChange(childId, 'baselineValue', event.target.value)}
                      min={0}
                      step={0.01}
                      placeholder="-"
                    />
                  ) : (
                    formatNumber(local.baselineValue, unit)
                  )}
                </div>
              </div>

              <div className="mobile-table-row">
                <span className="mobile-table-label">Инд. таргет</span>
                <div className="mobile-table-value">{formatNumber(row.individualTargetValue, unit)}</div>
              </div>

              <div className="mobile-table-row">
                <span className="mobile-table-label">Финален резултат</span>
                <div className="mobile-table-value">
                  {canEdit ? (
                    <Input
                      type="number"
                      value={local.finalValue}
                      onChange={(event) => onValueChange(childId, 'finalValue', event.target.value)}
                      min={0}
                      step={0.01}
                      placeholder="-"
                    />
                  ) : (
                    formatNumber(local.finalValue, unit)
                  )}
                </div>
              </div>

              <div className="mobile-table-row">
                <span className="mobile-table-label">Разлика от първи</span>
                <div className="mobile-table-value">{formatNumber(row.differenceFromBaseline, unit)}</div>
              </div>

              <div className="mobile-table-row">
                <span className="mobile-table-label">Разлика от таргет</span>
                <div className="mobile-table-value">{formatNumber(row.differenceFromTarget, unit)}</div>
              </div>

              <div className="mobile-table-row">
                <span className="mobile-table-label">Таргет</span>
                <div className="mobile-table-value">
                  <StatusPill
                    label={boolLabel(row.individualTargetReached, 'Постигнат', 'Още опити')}
                    tone={boolTone(row.individualTargetReached)}
                  />
                </div>
              </div>

              <div className="mobile-table-row">
                <span className="mobile-table-label">Повторил/подобрил</span>
                <div className="mobile-table-value">
                  <StatusPill
                    label={boolLabel(
                      row.repeatedOrImprovedBaseline,
                      'Повторил/подобрил',
                      'Нужно е насърчаване'
                    )}
                    tone={boolTone(row.repeatedOrImprovedBaseline)}
                  />
                </div>
              </div>

              <div className="mobile-table-row">
                <span className="mobile-table-label">Бележки</span>
                <div className="mobile-table-value">
                  {canEdit ? (
                    <Textarea
                      value={local.notes}
                      onChange={(event) => onValueChange(childId, 'notes', event.target.value)}
                      rows={2}
                      placeholder="Кратка бележка"
                    />
                  ) : (
                    <span className="muted-text">{local.notes || '-'}</span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
