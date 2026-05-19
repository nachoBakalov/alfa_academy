function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTimeBg(value) {
  if (!value) {
    return 'няма';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'няма';
  }

  return new Intl.DateTimeFormat('bg-BG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Sofia',
  }).format(date);
}

function buildQuestionnaireEmail({ child, questionnaireLink, expiresAt }) {
  const safeFirstName = child?.firstName || '';
  const safeLastName = child?.lastName || '';
  const safeChildName = `${safeFirstName} ${safeLastName}`.trim() || 'детето';
  const expiresAtLabel = formatDateTimeBg(expiresAt);
  const subject = `Въпросник за комфортна зона - ${safeChildName}`;

  const text = [
    'Здравейте,',
    '',
    `Моля, попълнете краткия въпросник за комфортна зона на детето ${safeChildName}.`,
    '',
    'Линк към въпросника:',
    questionnaireLink,
    '',
    'Формата не изисква потребителско име или парола.',
    'Целта е да помогне на екипа да подкрепи детето по най-подходящ начин.',
    '',
    `Линкът е валиден до: ${expiresAtLabel}`,
    '',
    'Благодарим!',
    'Екипът на Лятната академия',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <p>Здравейте,</p>
      <p>Моля, попълнете краткия въпросник за комфортна зона на детето <strong>${escapeHtml(
        safeChildName
      )}</strong>.</p>
      <p>
        <a
          href="${escapeHtml(questionnaireLink)}"
          style="display: inline-block; padding: 10px 14px; border-radius: 8px; background: #0f766e; color: #ffffff; text-decoration: none; font-weight: 700;"
        >
          Попълнете въпросника
        </a>
      </p>
      <p><strong>Линк към въпросника:</strong><br />${escapeHtml(questionnaireLink)}</p>
      <p>Формата не изисква потребителско име или парола.</p>
      <p>Целта е да помогне на екипа да подкрепи детето по най-подходящ начин.</p>
      <p>Линкът е валиден до: <strong>${escapeHtml(expiresAtLabel)}</strong>.</p>
      <p>Благодарим!<br />Екипът на Лятната академия</p>
    </div>
  `;

  return {
    subject,
    text,
    html,
  };
}

module.exports = {
  buildQuestionnaireEmail,
};
