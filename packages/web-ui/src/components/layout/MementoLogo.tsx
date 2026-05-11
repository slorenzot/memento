'use client';

import Image from 'next/image';
import clsx from 'clsx';

interface MementoLogoProps {
  size?: number;
  collapsed?: boolean;
  showText?: boolean;
}

export function MementoLogo({ size = 20, collapsed = false, showText = true }: MementoLogoProps) {
  return (
    <div className={clsx('flex items-center', collapsed ? 'justify-center' : 'gap-2')}>
      <Image src="/icon.svg" alt="Memento" width="120" height="120" className="shrink-0" priority />
      {showText && !collapsed && (
        <span className="text-[14px] font-medium text-[var(--color-text-primary)]">Memento</span>
      )}
    </div>
  );
}
