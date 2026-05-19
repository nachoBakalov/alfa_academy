import EmptyState from './EmptyState';
import LoadingScreen from './LoadingScreen';

export default function DataTable({
  columns,
  rows,
  isLoading,
  emptyTitle,
  emptyDescription,
  getRowKey,
}) {
  if (isLoading) {
    return <LoadingScreen fullPage={false} />;
  }

  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="data-table-stack">
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rowKey = getRowKey ? getRowKey(row, index) : row.id || index;

              return (
                <tr key={rowKey}>
                  {columns.map((column) => (
                    <td key={column.key} data-label={column.header}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mobile-table-cards">
        {rows.map((row, index) => {
          const rowKey = getRowKey ? getRowKey(row, index) : row.id || index;

          return (
            <article className="mobile-table-card" key={rowKey}>
              {columns.map((column) => (
                <div className="mobile-table-row" key={column.key}>
                  <span className="mobile-table-label">{column.header}</span>
                  <div className="mobile-table-value">
                    {column.render ? column.render(row) : row[column.key]}
                  </div>
                </div>
              ))}
            </article>
          );
        })}
      </div>
    </div>
  );
}
