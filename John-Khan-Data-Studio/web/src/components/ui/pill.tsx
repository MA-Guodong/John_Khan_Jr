import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}

export function FilterPill({ active, onClick, children, count }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all duration-200',
        active
          ? 'border-ink bg-ink text-paper shadow-sm'
          : 'border-line bg-card text-ink-soft hover:border-ink/25 hover:text-ink',
      )}
    >
      {children}
      {typeof count === 'number' ? (
        <span className={cn('font-mono text-[10px]', active ? 'text-paper/70' : 'text-muted')}>{count}</span>
      ) : null}
    </button>
  );
}

export function FilterPillGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      {children}
    </div>
  );
}
