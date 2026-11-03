import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  icon: LucideIcon;
  tone?: 'default' | 'accent';
  className?: string;
  style?: CSSProperties;
}

export function StatCard({ label, value, unit, hint, icon: Icon, tone = 'default', className, style }: StatCardProps) {
  const accent = tone === 'accent';

  return (
    <div
      style={style}
      className={cn(
        'group relative overflow-hidden rounded-card border p-5 transition-all duration-300 hover:-translate-y-0.5',
        accent
          ? 'border-seal/30 bg-seal text-white shadow-[0_18px_40px_-24px_rgb(var(--seal)/0.9)]'
          : 'border-line bg-card shadow-card hover:border-ink/15 hover:shadow-lift',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'font-mono text-[10px] font-medium uppercase tracking-[0.2em]',
            accent ? 'text-white/70' : 'text-muted',
          )}
        >
          {label}
        </span>
        <Icon
          className={cn(
            'h-4 w-4 transition-transform duration-300 group-hover:scale-110',
            accent ? 'text-white/70' : 'text-muted/80',
          )}
          strokeWidth={1.75}
        />
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span
          className={cn(
            'font-serif text-[2.15rem] font-semibold leading-none tracking-tight tabular-nums',
            accent ? 'text-white' : 'text-ink',
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className={cn('text-[11px]', accent ? 'text-white/70' : 'text-muted')}>{unit}</span>
        ) : null}
      </div>

      {hint ? (
        <p className={cn('mt-3.5 text-[11px] leading-relaxed', accent ? 'text-white/75' : 'text-muted')}>{hint}</p>
      ) : null}

      {accent ? (
        <div className="pointer-events-none absolute -bottom-6 -right-4 font-serif text-[5.5rem] leading-none text-white/[0.08]">
          鸽
        </div>
      ) : null}
    </div>
  );
}
