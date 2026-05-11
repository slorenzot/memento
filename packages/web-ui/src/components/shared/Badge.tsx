import clsx from 'clsx';

const TYPE_LABELS: Record<string, string> = {
  decision: 'Decision',
  bug: 'Bug',
  discovery: 'Discovery',
  note: 'Note',
  summary: 'Summary',
  learning: 'Learning',
  pattern: 'Pattern',
  architecture: 'Architecture',
  config: 'Config',
  preference: 'Preference',
};

interface BadgeProps {
  type: string;
  active?: boolean;
  onClick?: () => void;
}

export function Badge({ type, active, onClick }: BadgeProps) {
  const Component = onClick ? 'button' : 'span';
  return (
    <Component
      onClick={onClick}
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors',
        active
          ? 'bg-[var(--color-primary)] text-white'
          : 'bg-[var(--color-surface-hover)] text-[var(--color-secondary)]',
        onClick && 'cursor-pointer hover:opacity-80',
      )}
    >
      {TYPE_LABELS[type] || type}
    </Component>
  );
}
