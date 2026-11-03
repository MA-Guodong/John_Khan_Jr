import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

function buildPages(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages: (number | 'gap')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push('gap');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < total - 1) pages.push('gap');
  pages.push(total);

  return pages;
}

export function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPages(page, totalPages);

  return (
    <nav className={cn('flex items-center justify-center gap-1.5', className)} aria-label="分页">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="上一页"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink-soft transition hover:border-ink/25 hover:text-ink disabled:pointer-events-none disabled:opacity-35"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-xs text-muted">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              'h-9 min-w-9 rounded-full px-2.5 font-mono text-xs tabular-nums transition',
              item === page
                ? 'bg-ink font-medium text-paper'
                : 'border border-transparent text-ink-soft hover:border-line hover:bg-card',
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="下一页"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink-soft transition hover:border-ink/25 hover:text-ink disabled:pointer-events-none disabled:opacity-35"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
