import { useMemo, useState } from 'react';
import type { DurationBucket, HeatmapCell, MonthPoint, Overview, WeekdayPoint, YearPoint } from '@/api/types';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { EChart } from '@/components/charts/echart';
import { useChartPalette, withAlpha } from '@/components/charts/palette';
import {
  buildActivityOption,
  buildDurationOption,
  buildHeatmapOption,
  buildWeekdayOption,
  type ActivityMode,
} from '@/components/charts/options';
import { formatDuration, formatNumber, weekdayLabel } from '@/lib/format';

function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-[11px] text-muted">
          <span className="h-2 w-2 rounded-[2px]" style={{ background: item.color }} />
          {item.label}
          {item.value ? (
            <span className="font-mono text-[10.5px] tabular-nums text-ink-soft">{item.value}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ActivityCard({ monthly, years }: { monthly: MonthPoint[]; years: YearPoint[] }) {
  const [mode, setMode] = useState<ActivityMode>('month');
  const palette = useChartPalette();

  const option = useMemo(
    () => buildActivityOption({ monthly, years, palette, mode }),
    [monthly, years, palette, mode],
  );

  const totals = useMemo(
    () =>
      monthly.reduce(
        (acc, point) => ({
          signs: acc.signs + point.signs,
          avatars: acc.avatars + point.avatars,
          videos: acc.videos + point.videos,
        }),
        { signs: 0, avatars: 0, videos: 0 },
      ),
    [monthly],
  );

  return (
    <Card className="flex flex-col">
      <CardHeader
        eyebrow="Rhythm"
        title="更新节奏"
        description="按月统计签名、头像与视频的更新量，观察这些年的起伏。"
        action={
          <Tabs<ActivityMode>
            value={mode}
            onChange={setMode}
            ariaLabel="更新节奏视图"
            items={[
              { value: 'month', label: '月度' },
              { value: 'year', label: '年度' },
              { value: 'cumulative', label: '累计' },
            ]}
          />
        }
      />
      <CardBody className="flex flex-1 flex-col pt-5">
        <Legend
          items={[
            { label: '签名', color: palette.gold, value: formatNumber(totals.signs) },
            { label: '头像', color: palette.pine, value: formatNumber(totals.avatars) },
            { label: '视频', color: palette.accent, value: formatNumber(totals.videos) },
          ]}
        />
        <div className="mt-2 flex-1">
          <EChart
            option={option}
            height={330}
            ariaLabel="签名、头像与视频的更新量图表"
          />
        </div>
      </CardBody>
    </Card>
  );
}

export function QuickFactsCard({ overview }: { overview: Overview }) {
  const { cadence, durations } = overview;
  const totalHours = Math.floor(durations.totalSeconds / 3600);
  const totalMinutes = Math.round((durations.totalSeconds % 3600) / 60);

  const rows = [
    { label: '平均更新间隔', value: `${cadence.averageGapDays} 天`, hint: '相邻两支视频的间隔' },
    { label: '间隔中位数', value: `${cadence.medianGapDays} 天`, hint: '一半视频比这更频繁' },
    {
      label: '最长断更',
      value: cadence.longestGap ? `${Math.round(cadence.longestGap.days)} 天` : '—',
      hint: cadence.longestGap
        ? `${cadence.longestGap.from.slice(0, 10)} → ${cadence.longestGap.to.slice(0, 10)}`
        : '暂无数据',
    },
    { label: '平均时长', value: formatDuration(durations.averageSeconds), hint: '单支视频的平均长度' },
    { label: '累计时长', value: `${totalHours} 小时 ${totalMinutes} 分`, hint: '全部视频时长之和' },
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader eyebrow="Profile" title="档案速览" description="几个能快速理解更新习惯的数字。" />
      <CardBody className="flex flex-1 flex-col pt-4">
        <div className="rounded-xl bg-card-muted/70 p-4">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-muted">Monthly Output</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-[2.6rem] font-semibold leading-none tracking-tight text-ink tabular-nums">
              {cadence.videosPerMonth}
            </span>
            <span className="text-xs text-muted">支 / 月</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">收录期间的平均视频产量</p>
        </div>

        <dl className="mt-2 flex-1 divide-y divide-line/70">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 py-3">
              <div>
                <dt className="text-[12px] text-ink-soft">{row.label}</dt>
                <p className="mt-0.5 text-[10px] text-muted/80">{row.hint}</p>
              </div>
              <dd className="shrink-0 font-mono text-[12.5px] tabular-nums text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}

export function WeekdayCard({ weekday }: { weekday: WeekdayPoint[] }) {
  const palette = useChartPalette();
  const option = useMemo(() => buildWeekdayOption(weekday, palette), [weekday, palette]);

  const peak = useMemo(
    () => weekday.reduce((best, point) => (point.videos > best.videos ? point : best), weekday[0]),
    [weekday],
  );

  return (
    <Card>
      <CardHeader
        eyebrow="Cadence"
        title="发布星期"
        description="哪一天最容易看到新视频？"
        action={
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10.5px] font-medium text-accent">
            {peak?.label ?? '—'}最多
          </span>
        }
      />
      <CardBody className="pt-3">
        <EChart option={option} height={250} ariaLabel="视频发布星期分布柱状图" />
      </CardBody>
    </Card>
  );
}

export function DurationCard({ buckets }: { buckets: DurationBucket[] }) {
  const palette = useChartPalette();
  const option = useMemo(() => buildDurationOption(buckets, palette), [buckets, palette]);
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const top = buckets.reduce((best, bucket) => (bucket.count > best.count ? bucket : best), buckets[0]);

  return (
    <Card>
      <CardHeader
        eyebrow="Format"
        title="视频时长分布"
        description="一期节目通常有多长？"
        action={
          <span className="rounded-full bg-card-muted px-2.5 py-1 text-[10.5px] text-muted">
            {top ? `${top.label} · ${Math.round((top.count / (total || 1)) * 100)}%` : '—'}
          </span>
        }
      />
      <CardBody className="pt-4">
        <EChart option={option} height={250} ariaLabel="视频时长分布条形图" />
      </CardBody>
    </Card>
  );
}

export function HeatmapCard({ heatmap, totalSigns }: { heatmap: HeatmapCell[]; totalSigns: number }) {
  const palette = useChartPalette();
  const option = useMemo(() => buildHeatmapOption(heatmap, palette), [heatmap, palette]);

  const peak = useMemo(
    () => heatmap.reduce((best, cell) => (cell.count > best.count ? cell : best), heatmap[0]),
    [heatmap],
  );

  return (
    <Card>
      <CardHeader
        eyebrow="Clock"
        title="签名活跃时段"
        description={`把 ${formatNumber(totalSigns)} 条签名铺在「星期 × 小时」的网格上，看看他的作息。`}
        action={
          peak ? (
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10.5px] font-medium text-accent">
              {weekdayLabel(peak.weekday)} {String(peak.hour).padStart(2, '0')}:00 最活跃
            </span>
          ) : null
        }
      />
      <CardBody className="pt-4">
        <EChart option={option} height={252} ariaLabel="签名发布时段热力图" />
        <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-muted">
          <span>少</span>
          <span
            className="h-1.5 w-24 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${withAlpha(palette.accent, 0.12)}, ${withAlpha(palette.accent, 0.95)})`,
            }}
          />
          <span>多</span>
        </div>
      </CardBody>
    </Card>
  );
}
