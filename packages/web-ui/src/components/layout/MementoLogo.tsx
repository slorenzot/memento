'use client';

import clsx from 'clsx';
import Image from 'next/image';

interface MementoLogoProps {
  size?: number;
  collapsed?: boolean;
  showText?: boolean;
}

export function MementoLogo({ size = 20, collapsed = false, showText = true }: MementoLogoProps) {
  return (
    <div
      className={clsx('flex justify-start items-center', collapsed ? 'justify-center' : 'gap-2')}
    >
      <Image src="/icon.svg" alt="Memento" width="48" height="48" className="shrink-0" priority />
      {showText && !collapsed && (
        <span className="text-[24px] font-medium text-[var(--color-text-primary)]">Memento</span>
      )}
    </div>
  );
}
