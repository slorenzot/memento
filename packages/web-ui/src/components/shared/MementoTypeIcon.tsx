import {
  Scale,
  Bug,
  Lightbulb,
  FileText,
  ClipboardList,
  GraduationCap,
  Repeat,
  Building2,
  Settings,
  Palette,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

export const OBSERVATION_TYPES = [
  'decision', 'bug', 'discovery', 'note', 'summary',
  'learning', 'pattern', 'architecture', 'config', 'preference',
] as const;

export type ObservationType = (typeof OBSERVATION_TYPES)[number];

/**
 * Translation key for each observation type.
 * Used with `t.types[key]` to get the localized label.
 */
export const TYPE_KEYS: Record<ObservationType, string> = {
  decision: 'decision',
  bug: 'bug',
  discovery: 'discovery',
  note: 'note',
  summary: 'summary',
  learning: 'learning',
  pattern: 'pattern',
  architecture: 'architecture',
  config: 'config',
  preference: 'preference',
};

interface TypeMeta {
  icon: LucideIcon;
  color: string;
  bg: string;
}

const TYPE_META: Record<ObservationType, TypeMeta> = {
  decision: {
    icon: Scale,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  bug: {
    icon: Bug,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  discovery: {
    icon: Lightbulb,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  note: {
    icon: FileText,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
  },
  summary: {
    icon: ClipboardList,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
  },
  learning: {
    icon: GraduationCap,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  pattern: {
    icon: Repeat,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  architecture: {
    icon: Building2,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  config: {
    icon: Settings,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
  },
  preference: {
    icon: Palette,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
  },
};

export function getTypeMeta(type: string): TypeMeta & { typeKey: string } {
  const key = TYPE_KEYS[type as ObservationType];
  return {
    ...(TYPE_META as Record<string, TypeMeta>)[type] ?? {
      icon: FileText,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
    },
    typeKey: key ?? type,
  };
}

interface MementoTypeIconProps extends LucideProps {
  type: string;
}

export function ObservationTypeIcon({ type, ...props }: MementoTypeIconProps) {
  const { icon: Icon } = getTypeMeta(type);
  return <Icon {...props} />;
}
