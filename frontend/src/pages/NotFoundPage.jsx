import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="center-page">
      <h1>Страницата не е намерена.</h1>
      <p>Проверете адреса или се върнете към основното табло.</p>
      <Link className="text-link" to="/dashboard">
        Към таблото
      </Link>
    </div>
  );
}
