import Button from '../../components/ui/Button';
import { SOCIAL_COLOR_OPTIONS } from './socialLabels';

export default function SocialColorButtons({ value, onChange, disabled = false, compact = false }) {
  return (
    <div className={`social-color-buttons ${compact ? 'social-color-buttons-compact' : ''}`.trim()}>
      {SOCIAL_COLOR_OPTIONS.map((option) => {
        const isSelected = value === option.value;

        return (
          <Button
            key={option.value}
            type="button"
            size={compact ? 'sm' : 'md'}
            variant="secondary"
            className={`social-color-btn social-color-btn-${option.value} ${
              isSelected ? 'social-color-btn-selected' : ''
            }`.trim()}
            onClick={() => onChange(option.value)}
            disabled={disabled}
          >
            <span>{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
