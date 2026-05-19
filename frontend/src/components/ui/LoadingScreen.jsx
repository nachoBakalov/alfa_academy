export default function LoadingScreen({ fullPage = true }) {
  const className = fullPage ? 'loading-screen' : 'loading-screen loading-screen-inline';

  return (
    <div className={className} role="status" aria-live="polite">
      <div className="loading-spinner" />
      <p>Зареждане...</p>
    </div>
  );
}
