import clsx from 'clsx';
import { getTypeMeta } from './ObservationTypeIcon';

interface BadgeProps {
  type: string;
  active?: boolean;
  onClick?: () => void;
}

export function Badge({ type, active, onClick }: BadgeProps) {
  const { icon: Icon, label } = getTypeMeta(type);
  const Component = onClick ? 'button' : 'span';
  return (
    <Component
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors',
        active
          ? 'bg-[var(--color-primary)] text-white'
          : 'bg-[var(--color-surface-hover)] text-[var(--color-secondary)]',
        onClick && 'cursor-pointer hover:opacity-80',
      )}
    >
      <Icon size={12} strokeWidth={2.5} />
      {label}
    </Component>
  );
}
