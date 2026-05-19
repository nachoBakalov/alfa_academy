import Badge from './Badge';

export default function StatusPill({ label, tone = 'neutral' }) {
  return <Badge tone={tone}>{label}</Badge>;
}
