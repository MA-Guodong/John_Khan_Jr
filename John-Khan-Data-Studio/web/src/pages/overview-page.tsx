import { ArrowRight, CalendarClock, Images, PenLine, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Overview } from '@/api/types';
import { useOverview } from '@/api/hooks';
import { ActivityCard, DurationCard, HeatmapCard, QuickFactsCard, WeekdayCard } from '@/components/features/overview/overview-cards';
import { SignatureRow } from '@/components/features/signature-row';
import { VideoCard } from '@/components/features/video-card';
import { PageHeader, SectionHeading } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import { SmartImage } from '@/components/ui/smart-image';
import { StatCard } from '@/components/ui/stat-card';
import { formatDotDate, formatDuration, formatNumber, spanLabel } from '@/lib/format';
import { usePageTitle } from '@/lib/hooks';

export function OverviewPage() {
  usePageTitle();
  const { data, isLoading, isError, refetch } = useOverview();

  if (isLoading) return <OverviewSkeleton />;

  if (isError || !data) {
    return (
      <>
        <PageHeader eyebrow="Overview · 总览" title="小约翰可汗" description="用数据重新认识这位 UP 主的更新轨迹。" />
        <ErrorState message="总览数据加载失败" onRetry={() => refetch()} />
      </>
    );
  }

  return <OverviewContent overview={data} />;
}

function OverviewContent({ overview }: { overview: Overview }) {
  const { totals, range, cadence, durations, latest } = overview;
  const avatar = latest.avatar;
  const startYear = range.firstVideoAt?.slice(0, 4) ?? '2020';
  const endYear = range.lastActivityAt?.slice(0, 4) ?? '2024';

  return (
    <div className="space-y-5">
      <section className="grain relative overflow-hidden rounded-[1.4rem] border border-line bg-card shadow-card animate-fade-up">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 140% at 88% -10%, rgb(var(--accent) / 0.12), transparent 58%), radial-gradient(90% 120% at 0% 110%, rgb(var(--gold) / 0.12), transparent 55%)',
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-16 select-none font-serif text-[16rem] leading-none text-ink/[0.035]"
        >
          汗
        </span>

        <div className="relative grid gap-9 px-6 py-8 sm:px-9 sm:py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="eyebrow">Bilibili · UP 主数据档案 {startYear} — {endYear}</p>
            <h1 className="mt-3 font-serif text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-[3.35rem]">
              小约翰可汗
            </h1>
            <p className="mt-4 max-w-xl text-[13.5px] leading-[1.85] text-ink-soft">
              通辽宇宙的签名、头像与视频，被整理成这座小小的档案馆。
              从 {startYear} 年的第一支视频开始，到 {endYear} 年，用图表重看一位 UP 主的更新轨迹。
            </p>

            <dl className="mt-7 flex flex-wrap gap-x-9 gap-y-4">
              <div>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">首次记录</dt>
                <dd className="mt-1 font-mono text-[12.5px] tabular-nums text-ink">
                  {formatDotDate(range.firstActivityAt)}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">收录跨度</dt>
                <dd className="mt-1 font-mono text-[12.5px] tabular-nums text-ink">{spanLabel(range.spanDays)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">数据截至</dt>
                <dd className="mt-1 flex items-center gap-1.5 font-mono text-[12.5px] tabular-nums text-ink">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/50" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  {formatDotDate(range.lastActivityAt)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col items-center gap-3.5 justify-self-center lg:justify-self-end">
            <div className="relative">
              <div className="absolute inset-0 -m-2 rounded-t-[999px] rounded-b-2xl border border-line/70" />
              <div className="relative h-[186px] w-[148px] overflow-hidden rounded-t-[999px] rounded-b-2xl border border-line bg-card-muted p-1.5 shadow-lift sm:h-[214px] sm:w-[170px]">
                <SmartImage
                  src={avatar?.imageUrl}
                  alt="最近一次头像"
                  variant="avatar"
                  className="h-full w-full"
                  rounded="rounded-t-[999px] rounded-b-xl"
                  imageClassName="object-cover"
                />
              </div>
            </div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">
              最近头像 · {formatDotDate(avatar?.postedAt)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label="Videos"
          value={formatNumber(totals.videos)}
          unit="支"
          hint={`平均每月 ${cadence.videosPerMonth} 支 · 共 ${Math.floor(durations.totalSeconds / 3600)} 小时`}
          icon={Video}
          style={{ animationDelay: '60ms' }}
          className="animate-fade-up"
        />
        <StatCard
          label="Signatures"
          value={formatNumber(totals.signs)}
          unit="条"
          hint={`包含 ${formatNumber(totals.emptySigns)} 条空签名`}
          icon={PenLine}
          style={{ animationDelay: '110ms' }}
          className="animate-fade-up"
        />
        <StatCard
          label="Avatars"
          value={formatNumber(totals.avatars)}
          unit="张"
          hint={`覆盖 ${spanLabel(range.spanDays)}的更新`}
          icon={Images}
          style={{ animationDelay: '160ms' }}
          className="animate-fade-up"
        />
        <StatCard
          label="Slacking"
          value={formatNumber(cadence.daysSinceLastVideo)}
          unit="天"
          hint={`上次更新于 ${formatDotDate(range.lastVideoAt)}`}
          icon={CalendarClock}
          tone="accent"
          style={{ animationDelay: '210ms' }}
          className="animate-fade-up"
        />
      </section>

      <section className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
        <ActivityCard monthly={overview.monthly} years={overview.years} />
        <QuickFactsCard overview={overview} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <WeekdayCard weekday={overview.weekday} />
        <DurationCard buckets={durations.buckets} />
      </section>

      <HeatmapCard heatmap={overview.heatmap} totalSigns={totals.signs} />

      <section className="pt-4">
        <SectionHeading
          eyebrow="Latest Videos"
          title="最近发布的视频"
          description={`总计 ${formatNumber(totals.videos)} 支，平均时长 ${formatDuration(durations.averageSeconds)}。`}
          action={
            <Link
              to="/videos"
              className="group inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-soft transition hover:text-accent"
            >
              全部视频
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {latest.videos.slice(0, 3).map((video, index) => (
            <VideoCard key={video.id} video={video} index={index + 1} />
          ))}
        </div>
      </section>

      <section className="pt-4">
        <SectionHeading
          eyebrow="Recent Notes"
          title="最近的签名"
          description="像日记一样，记录着每个阶段的心情与动态。"
          action={
            <Link
              to="/signatures"
              className="group inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-soft transition hover:text-accent"
            >
              全部签名
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />
        <Card className="px-5 sm:px-6">
          <ul className="divide-y divide-line/70">
            {latest.signs.map((sign) => (
              <SignatureRow key={sign.id} sign={sign} />
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-[320px] rounded-[1.4rem]" />
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[136px] rounded-card" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
        <Skeleton className="h-[470px] rounded-card" />
        <Skeleton className="h-[470px] rounded-card" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[350px] rounded-card" />
        <Skeleton className="h-[350px] rounded-card" />
      </div>
      <Skeleton className="h-[360px] rounded-card" />
    </div>
  );
}
