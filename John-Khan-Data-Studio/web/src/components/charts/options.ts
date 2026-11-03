import type { EChartsOption } from 'echarts';
import type { DurationBucket, HeatmapCell, MonthPoint, WeekdayPoint, YearPoint } from '@/api/types';
import { monthLabel } from '@/lib/format';
import { withAlpha, type ChartPalette } from './palette';

export type ActivityMode = 'month' | 'year' | 'cumulative';

const MONTH_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

interface TooltipRow {
  label: string;
  value: string | number;
  color: string;
}

function tooltipHtml(
  palette: ChartPalette,
  title: string,
  rows: TooltipRow[],
  total?: number,
): string {
  const rowsHtml = rows
    .map(
      (row) => `<div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
        <span style="display:inline-block;width:7px;height:7px;border-radius:999px;background:${row.color};flex:none"></span>
        <span style="color:${palette.muted};font-size:11px">${row.label}</span>
        <span style="margin-left:auto;padding-left:18px;font-variant-numeric:tabular-nums;font-weight:600;color:${palette.ink};font-size:12px">${row.value}</span>
      </div>`,
    )
    .join('');

  const totalHtml =
    typeof total === 'number'
      ? `<div style="margin-top:8px;border-top:1px solid ${palette.line};padding-top:7px;display:flex;justify-content:space-between;gap:18px;font-size:11px;color:${palette.muted}">
          <span>合计</span>
          <span style="color:${palette.ink};font-weight:600;font-variant-numeric:tabular-nums">${total}</span>
        </div>`
      : '';

  return `<div style="padding:10px 12px;min-width:158px;font-family:inherit;">
      <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${palette.muted}">${title}</div>
      ${rowsHtml}
      ${totalHtml}
    </div>`;
}

function baseTooltip(palette: ChartPalette) {
  return {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderWidth: 1,
    padding: 0,
    extraCssText: 'border-radius:12px;box-shadow:0 20px 44px -22px rgba(18,16,12,.5);overflow:hidden;',
    textStyle: { color: palette.ink, fontSize: 12 },
  };
}

const axisLabelStyle = (palette: ChartPalette) => ({
  color: palette.muted,
  fontSize: 10,
  fontFamily: 'JetBrains Mono, Cascadia Code, Consolas, monospace',
});

const splitLineStyle = (palette: ChartPalette) => ({
  lineStyle: { color: palette.line, width: 1, type: 'dashed' as const },
});

/** 让纵轴落在 1/2/3/5/10 这类「整」刻度上，避免出现 24、48 这种读数。 */
function niceScale(rawMax: number, ticks = 5): { max: number; interval: number } {
  if (!Number.isFinite(rawMax) || rawMax <= 0) return { max: ticks, interval: 1 };
  const rough = rawMax / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 3 ? 3 : normalized <= 5 ? 5 : 10;
  const interval = factor * magnitude;
  return { max: Math.ceil(rawMax / interval) * interval, interval };
}

interface ActivityInput {
  monthly: MonthPoint[];
  years: YearPoint[];
  palette: ChartPalette;
  mode: ActivityMode;
}

export function buildActivityOption({ monthly, years, palette, mode }: ActivityInput): EChartsOption {
  const seriesColors = {
    signs: palette.gold,
    avatars: palette.pine,
    videos: palette.accent,
  };

  const isBars = mode !== 'cumulative';

  const categories = isBars
    ? mode === 'month'
      ? monthly.map((point) => monthLabel(point.month))
      : years.map((point) => String(point.year))
    : monthly.map((point) => monthLabel(point.month));

  const cumulative = (() => {
    let signs = 0;
    let avatars = 0;
    let videos = 0;
    return monthly.map((point) => {
      signs += point.signs;
      avatars += point.avatars;
      videos += point.videos;
      return { month: point.month, signs, avatars, videos };
    });
  })();

  const values = {
    signs: isBars ? (mode === 'month' ? monthly.map((p) => p.signs) : years.map((p) => p.signs)) : cumulative.map((p) => p.signs),
    avatars: isBars ? (mode === 'month' ? monthly.map((p) => p.avatars) : years.map((p) => p.avatars)) : cumulative.map((p) => p.avatars),
    videos: isBars ? (mode === 'month' ? monthly.map((p) => p.videos) : years.map((p) => p.videos)) : cumulative.map((p) => p.videos),
  };

  const scale = niceScale(
    isBars
      ? Math.max(
          ...categories.map(
            (_, index) =>
              (values.signs[index] ?? 0) + (values.avatars[index] ?? 0) + (values.videos[index] ?? 0),
          ),
          1,
        )
      : Math.max(...values.signs, ...values.avatars, ...values.videos, 1),
  );

  const barSeries = [
    {
      name: '视频',
      type: 'bar' as const,
      stack: 'total',
      barMaxWidth: 26,
      data: values.videos,
      itemStyle: { color: seriesColors.videos, borderRadius: [0, 0, 0, 0] },
      emphasis: { focus: 'series' as const },
    },
    {
      name: '头像',
      type: 'bar' as const,
      stack: 'total',
      barMaxWidth: 26,
      data: values.avatars,
      itemStyle: { color: seriesColors.avatars, borderRadius: 0 },
      emphasis: { focus: 'series' as const },
    },
    {
      name: '签名',
      type: 'bar' as const,
      stack: 'total',
      barMaxWidth: 26,
      data: values.signs,
      itemStyle: { color: seriesColors.signs, borderRadius: [4, 4, 0, 0] },
      emphasis: { focus: 'series' as const },
    },
  ];

  const lineSeries = [
    {
      name: '签名',
      type: 'line' as const,
      smooth: 0.35,
      showSymbol: false,
      symbolSize: 6,
      data: values.signs,
      lineStyle: { width: 2, color: seriesColors.signs },
      itemStyle: { color: seriesColors.signs },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: withAlpha(seriesColors.signs, 0.28) },
            { offset: 1, color: withAlpha(seriesColors.signs, 0.01) },
          ],
        },
      },
    },
    {
      name: '头像',
      type: 'line' as const,
      smooth: 0.35,
      showSymbol: false,
      symbolSize: 6,
      data: values.avatars,
      lineStyle: { width: 2, color: seriesColors.avatars },
      itemStyle: { color: seriesColors.avatars },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: withAlpha(seriesColors.avatars, 0.22) },
            { offset: 1, color: withAlpha(seriesColors.avatars, 0.01) },
          ],
        },
      },
    },
    {
      name: '视频',
      type: 'line' as const,
      smooth: 0.35,
      showSymbol: false,
      symbolSize: 6,
      data: values.videos,
      lineStyle: { width: 2, color: seriesColors.videos },
      itemStyle: { color: seriesColors.videos },
    },
  ];

  return {
    animationDuration: 650,
    animationEasing: 'cubicOut',
    grid: { left: 4, right: 12, top: 22, bottom: 4, containLabel: true },
    tooltip: {
      ...baseTooltip(palette),
      trigger: 'axis',
      axisPointer: {
        type: isBars ? 'shadow' : 'line',
        shadowStyle: { color: withAlpha(palette.ink, 0.045) },
        lineStyle: { color: withAlpha(palette.ink, 0.2), type: 'dashed' },
      },
      formatter: (params: unknown) => {
        const list = params as { dataIndex: number }[];
        const index = list[0]?.dataIndex ?? 0;
        const label = categories[index] ?? '';
        const rows: TooltipRow[] = [
          { label: '签名', value: values.signs[index] ?? 0, color: seriesColors.signs },
          { label: '头像', value: values.avatars[index] ?? 0, color: seriesColors.avatars },
          { label: '视频', value: values.videos[index] ?? 0, color: seriesColors.videos },
        ];
        const total = (values.signs[index] ?? 0) + (values.avatars[index] ?? 0) + (values.videos[index] ?? 0);
        return tooltipHtml(palette, mode === 'cumulative' ? `${label} 累计` : label, rows, total);
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: withAlpha(palette.ink, 0.12) } },
      axisLabel: {
        ...axisLabelStyle(palette),
        margin: 12,
        hideOverlap: true,
        formatter: (value: string) => (mode === 'year' ? value : value.replace('.', '/')),
      },
    },
    yAxis: {
      type: 'value',
      max: scale.max,
      interval: scale.interval,
      axisLabel: { ...axisLabelStyle(palette), margin: 10 },
      splitLine: splitLineStyle(palette),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: (isBars ? barSeries : lineSeries) as EChartsOption['series'],
  };
}

export function buildWeekdayOption(weekday: WeekdayPoint[], palette: ChartPalette): EChartsOption {
  const max = Math.max(...weekday.map((point) => point.videos), 1);
  const scale = niceScale(max, 4);

  const data = weekday.map((point) => ({
    value: point.videos,
    itemStyle: {
      color: point.videos === max ? palette.accent : withAlpha(palette.gold, 0.5),
      borderRadius: [5, 5, 0, 0] as [number, number, number, number],
    },
  }));

  return {
    animationDuration: 650,
    grid: { left: 4, right: 8, top: 26, bottom: 4, containLabel: true },
    tooltip: {
      ...baseTooltip(palette),
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: withAlpha(palette.ink, 0.04) } },
      formatter: (params: unknown) => {
        const list = params as { dataIndex: number }[];
        const index = list[0]?.dataIndex ?? 0;
        const point = weekday[index];
        if (!point) return '';
        return tooltipHtml(palette, point.label, [
          { label: '视频发布', value: `${point.videos} 支`, color: palette.accent },
          { label: '同期签名', value: `${point.signs} 条`, color: palette.gold },
        ]);
      },
    },
    xAxis: {
      type: 'category',
      data: weekday.map((point) => point.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: withAlpha(palette.ink, 0.12) } },
      axisLabel: { color: palette.muted, fontSize: 11, margin: 12 },
    },
    yAxis: {
      type: 'value',
      max: scale.max,
      interval: scale.interval,
      axisLabel: { ...axisLabelStyle(palette), margin: 10 },
      splitLine: splitLineStyle(palette),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data,
        barWidth: '46%',
        label: {
          show: true,
          position: 'top',
          color: palette.muted,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, Consolas, monospace',
          formatter: '{c}',
        },
      },
    ],
  };
}

export function buildDurationOption(buckets: DurationBucket[], palette: ChartPalette): EChartsOption {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0) || 1;
  const max = Math.max(...buckets.map((bucket) => bucket.count), 1);

  const data = buckets.map((bucket) => ({
    value: bucket.count,
    itemStyle: {
      color: bucket.count === max ? palette.accent : withAlpha(palette.pine, 0.45),
      borderRadius: [0, 6, 6, 0] as [number, number, number, number],
    },
  }));

  return {
    animationDuration: 650,
    grid: { left: 4, right: 56, top: 6, bottom: 6, containLabel: true },
    tooltip: {
      ...baseTooltip(palette),
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: withAlpha(palette.ink, 0.04) } },
      formatter: (params: unknown) => {
        const list = params as { dataIndex: number }[];
        const index = list[0]?.dataIndex ?? 0;
        const bucket = buckets[index];
        if (!bucket) return '';
        return tooltipHtml(palette, bucket.label, [
          { label: '视频数量', value: `${bucket.count} 支`, color: palette.pine },
          { label: '占比', value: `${Math.round((bucket.count / total) * 100)}%`, color: palette.muted },
        ]);
      },
    },
    xAxis: {
      type: 'value',
      show: false,
      max: max * 1.18,
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: buckets.map((bucket) => bucket.label),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: palette.soft, fontSize: 11, margin: 12 },
    },
    series: [
      {
        type: 'bar',
        data,
        barWidth: 16,
        showBackground: true,
        backgroundStyle: { color: withAlpha(palette.ink, 0.045), borderRadius: 6 },
        label: {
          show: true,
          position: 'right',
          distance: 10,
          color: palette.muted,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, Consolas, monospace',
          formatter: (params: unknown) => {
            const item = params as { dataIndex: number };
            const bucket = buckets[item.dataIndex];
            return bucket ? `${bucket.count} 支` : '';
          },
        },
      },
    ],
  };
}

export function buildHeatmapOption(cells: HeatmapCell[], palette: ChartPalette): EChartsOption {
  const max = Math.max(...cells.map((cell) => cell.count), 1);

  const data = cells.map((cell) => {
    const intensity = cell.count === 0 ? 0 : 0.14 + 0.86 * Math.pow(cell.count / max, 0.72);
    return {
      value: [cell.hour, cell.weekday - 1, cell.count],
      itemStyle: {
        color: cell.count === 0 ? withAlpha(palette.ink, 0.04) : withAlpha(palette.accent, intensity),
        borderColor: palette.card,
        borderWidth: 2,
        borderRadius: 3,
      },
    };
  });

  return {
    animationDuration: 500,
    grid: { left: 4, right: 4, top: 4, bottom: 20, containLabel: true },
    tooltip: {
      ...baseTooltip(palette),
      trigger: 'item',
      formatter: (params: unknown) => {
        const item = params as { value: [number, number, number] };
        const [hour = 0, weekdayIndex = 0, count = 0] = item.value ?? [];
        const title = `${MONTH_NAMES[weekdayIndex] ?? ''} ${String(hour).padStart(2, '0')}:00 – ${String(hour + 1).padStart(2, '0')}:00`;
        return tooltipHtml(palette, title, [
          { label: '签名更新', value: `${count} 条`, color: palette.accent },
        ]);
      },
    },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0')),
      splitArea: { show: false },
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        ...axisLabelStyle(palette),
        interval: 2,
        margin: 8,
      },
    },
    yAxis: {
      type: 'category',
      data: MONTH_NAMES,
      inverse: true,
      splitArea: { show: false },
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: palette.soft, fontSize: 11, margin: 10 },
    },
    series: [
      {
        type: 'heatmap',
        data,
        emphasis: {
          itemStyle: { borderColor: palette.ink, borderWidth: 1 },
        },
      },
    ],
  };
}
