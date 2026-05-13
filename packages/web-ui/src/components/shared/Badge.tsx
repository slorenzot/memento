'use client';

import clsx from 'clsx';
import { getTypeMeta } from './ObservationTypeIcon';
import { useT } from '@/i18n/translation-context';

interface BadgeProps {
  type: string;
  active?: boolean;
  onClick?: () => void;
}

export function Badge({ type, active, onClick }: BadgeProps) {
  const t = useT();
  const { icon: Icon, typeKey } = getTypeMeta(type);
  const label = (t.types as Record<string, string>)[typeKey] ?? type;
  const Component = onClick ? 'button' : 'span';
  return (
    <Component
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors',
        active
          ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
          : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]',
        onClick && 'cursor-pointer hover:opacity-80',
      )}
    >
      <Icon size={12} strokeWidth={2.5} />
      {label}
    </Component>
  );
}
