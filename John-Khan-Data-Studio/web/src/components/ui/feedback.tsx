import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-card-muted', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/45 to-transparent dark:via-white/[0.04]" />
    </div>
  );
}

export function EmptyState({
  title = '这里还没有内容',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line bg-card/50 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card-muted text-muted">
        <Inbox className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="max-w-sm text-xs leading-relaxed text-muted">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({
  message = '数据加载失败',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line bg-card/50 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-ink">{message}</p>
      <p className="max-w-sm text-xs leading-relaxed text-muted">
        请确认后端服务已启动，或稍后重试。
      </p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCcw className="h-3.5 w-3.5" />
          重新加载
        </Button>
      ) : null}
    </div>
  );
}
