import type { Sign } from '@/api/types';
import { cn } from '@/lib/cn';
import { parseDate } from '@/lib/format';

function splitTimestamp(value: string): { date: string; time: string; weekday: string } {
  const parsed = parseDate(value);
  if (!parsed) return { date: '—', time: '', weekday: '' };
  const pad = (input: number) => String(input).padStart(2, '0');
  return {
    date: `${parsed.getFullYear()}.${pad(parsed.getMonth() + 1)}.${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
    weekday: `周${'日一二三四五六'[parsed.getDay()]}`,
  };
}

/** 概览页使用的紧凑行：左侧时间轴，右侧正文。 */
export function SignatureRow({ sign }: { sign: Sign }) {
  const { date, time, weekday } = splitTimestamp(sign.postedAt);

  return (
    <li className="group flex gap-4 py-3.5 sm:gap-6">
      <div className="relative flex w-[88px] shrink-0 flex-col items-end pr-5 text-right sm:w-[108px] sm:pr-6">
        <time className="font-mono text-[11px] tabular-nums leading-none text-ink-soft">{date}</time>
        <span className="mt-1.5 font-mono text-[10px] tabular-nums leading-none text-muted/70">{time}</span>
        <span
          aria-hidden
          className="absolute bottom-0 right-0 top-0 w-px bg-line/70 transition-colors group-hover:bg-accent/30"
        />
        <span
          aria-hidden
          className="absolute right-0 top-[3px] h-1.5 w-1.5 translate-x-1/2 rounded-full bg-line ring-4 ring-card transition-colors group-hover:bg-accent"
        />
      </div>

      <p
        className={cn(
          'min-w-0 flex-1 self-center text-[13.5px] leading-[1.8]',
          sign.content ? 'text-ink-soft transition-colors group-hover:text-ink' : 'italic text-muted/55',
        )}
      >
        {sign.content ?? '（这一天没有留下签名）'}
      </p>

      <span className="hidden w-10 shrink-0 self-center text-right font-mono text-[10px] text-muted/60 sm:block">
        {weekday}
      </span>
    </li>
  );
}

/** 签名页使用的卡片：铺成「留言墙」，在宽屏下阅读密度更好。 */
export function SignatureCard({ sign }: { sign: Sign }) {
  const { date, time, weekday } = splitTimestamp(sign.postedAt);
  const hasContent = Boolean(sign.content);

  return (
    <li className="group relative flex flex-col justify-between gap-5 overflow-hidden rounded-xl border border-line/80 bg-card p-4 shadow-[0_1px_2px_rgb(28_25_20/0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-card">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-3 -top-5 font-serif text-[4.5rem] leading-none text-ink/[0.035] transition-colors group-hover:text-accent/10"
      >
        “
      </span>

      <p
        className={cn(
          'relative text-[13.5px] leading-[1.8]',
          hasContent ? 'text-ink-soft transition-colors group-hover:text-ink' : 'italic text-muted/55',
        )}
      >
        {sign.content ?? '（这一天没有留下签名）'}
      </p>

      <div className="flex items-center justify-between gap-3 border-t border-line/60 pt-2.5 font-mono text-[10px] tabular-nums text-muted">
        <span>
          {date} <span className="text-muted/60">{time}</span>
        </span>
        <span className="text-muted/60">{weekday}</span>
      </div>
    </li>
  );
}
