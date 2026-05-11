interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h3 className="text-[16px] font-medium text-[var(--color-text-secondary)]">{title}</h3>
      {description && (
        <p className="mt-2 text-[14px] text-[var(--color-tertiary)]">{description}</p>
      )}
      {action && (
        <a
          href={action.href}
          className="mt-6 rounded-full bg-[var(--color-primary)] px-4 py-2 text-[14px] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
