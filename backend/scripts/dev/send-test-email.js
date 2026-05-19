const { env } = require('../../src/config/env');
const emailService = require('../../src/services/email.service');

async function main() {
  if (!env.EMAIL_TEST_RECIPIENT) {
    console.error('Липсва EMAIL_TEST_RECIPIENT за тестовия имейл.');
    process.exit(1);
  }

  const result = await emailService.sendMail({
    to: env.EMAIL_TEST_RECIPIENT,
    subject: 'Тест имейл - Лятна академия',
    text: 'Това е тестово писмо от приложението.',
    html: '<p>Това е тестово писмо от приложението.</p>',
  });

  console.log('Test email sent successfully.');
  console.log(`messageId: ${result.messageId || 'n/a'}`);
}

main().catch((error) => {
  console.error('Failed to send test email.');
  console.error(error.message);
  process.exit(1);
});
