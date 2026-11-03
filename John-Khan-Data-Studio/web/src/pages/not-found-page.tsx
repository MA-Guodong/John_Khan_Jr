import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonStyles } from '@/components/ui/button';
import { usePageTitle } from '@/lib/hooks';

export function NotFoundPage() {
  usePageTitle('页面不存在');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">404 · Not Found</p>
      <p className="mt-6 font-serif text-[6rem] font-semibold leading-none text-ink/15">404</p>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-ink">这页档案不存在</h1>
      <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
        可能是链接写错了，或者这一页已经被收进别的抽屉。
      </p>
      <Link to="/" className={buttonStyles({ className: 'mt-7' })}>
        <ArrowLeft className="h-3.5 w-3.5" />
        回到总览
      </Link>
    </div>
  );
}
