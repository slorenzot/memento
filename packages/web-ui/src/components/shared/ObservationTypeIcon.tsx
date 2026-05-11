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

interface TypeMeta {
  icon: LucideIcon;
  label: string;
  color: string;
  bg: string;
}

const TYPE_META: Record<ObservationType, TypeMeta> = {
  decision: {
    icon: Scale,
    label: 'Decision',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  bug: {
    icon: Bug,
    label: 'Bug',
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  discovery: {
    icon: Lightbulb,
    label: 'Discovery',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  note: {
    icon: FileText,
    label: 'Note',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
  },
  summary: {
    icon: ClipboardList,
    label: 'Summary',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
  },
  learning: {
    icon: GraduationCap,
    label: 'Learning',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  pattern: {
    icon: Repeat,
    label: 'Pattern',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  architecture: {
    icon: Building2,
    label: 'Architecture',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  config: {
    icon: Settings,
    label: 'Config',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
  },
  preference: {
    icon: Palette,
    label: 'Preference',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
  },
};

export function getTypeMeta(type: string): TypeMeta {
  return (TYPE_META as Record<string, TypeMeta>)[type] ?? {
    icon: FileText,
    label: type,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
  };
}

interface ObservationTypeIconProps extends LucideProps {
  type: string;
}

export function ObservationTypeIcon({ type, ...props }: ObservationTypeIconProps) {
  const { icon: Icon } = getTypeMeta(type);
  return <Icon {...props} />;
}
