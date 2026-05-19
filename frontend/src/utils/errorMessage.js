export function getApiErrorMessage(error, fallback = 'Възникна грешка. Опитайте отново.') {
  const status = error?.response?.status;
  const backendMessage = error?.response?.data?.message;

  if (status === 409 && typeof backendMessage === 'string') {
    const lower = backendMessage.toLowerCase();

    if (lower.includes('email')) {
      return 'Вече съществува потребител с този имейл.';
    }

    if (lower.includes('name')) {
      return 'Вече съществува запис със същото име.';
    }
  }

  if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
    return backendMessage;
  }

  return fallback;
}
