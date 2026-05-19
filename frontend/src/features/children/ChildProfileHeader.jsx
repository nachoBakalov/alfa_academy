import Button from '../../components/ui/Button';
import StatusPill from '../../components/ui/StatusPill';

export default function ChildProfileHeader({ child, currentGroup, onBack }) {
  return (
    <div className="child-profile-header">
      <div>
        <h1>
          {child.firstName} {child.lastName}
        </h1>
        <p className="muted-text">Профил и развитие на детето.</p>

        <div className="child-profile-tags">
          <StatusPill label={child.isActive ? 'Активно дете' : 'Неактивно дете'} tone={child.isActive ? 'success' : 'neutral'} />
          <StatusPill label={currentGroup?.name ? `Група: ${currentGroup.name}` : 'Без група'} tone="info" />
          {currentGroup?.academy?.name ? (
            <StatusPill label={`Академия: ${currentGroup.academy.name}`} tone="neutral" />
          ) : null}
        </div>
      </div>

      <Button variant="secondary" onClick={onBack}>
        Назад към деца
      </Button>
    </div>
  );
}
