import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="center-page">
      <h1>Нямате достъп до тази страница.</h1>
      <p>Свържете се с администратор, ако смятате, че това е грешка.</p>
      <Link className="text-link" to="/dashboard">
        Към таблото
      </Link>
    </div>
  );
}
