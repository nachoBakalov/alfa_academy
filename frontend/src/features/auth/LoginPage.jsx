import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError('Моля, попълнете имейл и парола.');
      return;
    }

    const hasEmailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!hasEmailShape) {
      setError('Моля, въведете валиден имейл адрес.');
      return;
    }

    try {
      setIsSubmitting(true);
      await loginUser(normalizedEmail, password);
      navigate('/dashboard', { replace: true });
    } catch (_error) {
      setError('Невалиден имейл или парола');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <Card title="Лятна академия" className="auth-card">
        <p className="auth-subtitle">Вход в системата</p>

        {error ? <Alert type="error">{error}</Alert> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label="Имейл"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@mail.com"
            autoComplete="email"
          />

          <Input
            label="Парола"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Въведете парола"
            autoComplete="current-password"
          />

          <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
            Вход
          </Button>
        </form>
      </Card>
    </div>
  );
}
