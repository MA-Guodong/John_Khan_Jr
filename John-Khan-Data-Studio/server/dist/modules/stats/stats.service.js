import { listLatestAvatars } from '../avatars/avatars.repository.js';
import { listLatestSigns } from '../signs/signs.repository.js';
import { listLatestVideos } from '../videos/videos.repository.js';
import { countEmptySigns, getDateRange, groupByHourWeekday, groupByMonth, groupByWeekday, groupByYear, listVideoTimeline, } from './stats.repository.js';
const MS_PER_DAY = 86_400_000;
const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const DURATION_BUCKETS = [
    { key: 'lt10', label: '10 分钟以内', min: 0, max: 600 },
    { key: '10to20', label: '10–20 分钟', min: 600, max: 1200 },
    { key: '20to30', label: '20–30 分钟', min: 1200, max: 1800 },
    { key: '30to40', label: '30–40 分钟', min: 1800, max: 2400 },
    { key: 'gte40', label: '40 分钟以上', min: 2400, max: null },
];
/** 把 `YYYY-MM-DD HH:mm:ss` 当作本地时间解析，避免时区漂移。 */
export function parseDbDate(value) {
    const [datePart = '', timePart = '00:00:00'] = value.split(' ');
    const [year = 1970, month = 1, day = 1] = datePart.split('-').map(Number);
    const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
}
function monthRange(firstMonth, lastMonth) {
    const [startYear, startMonth] = firstMonth.split('-').map(Number);
    const [endYear, endMonth] = lastMonth.split('-').map(Number);
    if (!startYear || !startMonth || !endYear || !endMonth)
        return [];
    const months = [];
    let cursor = startYear * 12 + (startMonth - 1);
    const end = endYear * 12 + (endMonth - 1);
    while (cursor <= end) {
        const year = Math.floor(cursor / 12);
        const month = (cursor % 12) + 1;
        months.push(`${year}-${String(month).padStart(2, '0')}`);
        cursor += 1;
    }
    return months;
}
function buildMonthly(videoMonths, signMonths, avatarMonths) {
    const allMonths = [...videoMonths.keys(), ...signMonths.keys(), ...avatarMonths.keys()].sort();
    const first = allMonths[0];
    const last = allMonths[allMonths.length - 1];
    if (!first || !last)
        return [];
    return monthRange(first, last).map((month) => ({
        month,
        videos: videoMonths.get(month) ?? 0,
        signs: signMonths.get(month) ?? 0,
        avatars: avatarMonths.get(month) ?? 0,
    }));
}
function buildWeekday(videoDow, signDow) {
    return WEEKDAY_LABELS.map((label, index) => {
        const isoWeekday = index + 1;
        const sqliteDow = isoWeekday === 7 ? 0 : isoWeekday;
        return {
            weekday: isoWeekday,
            label,
            videos: videoDow.get(sqliteDow) ?? 0,
            signs: signDow.get(sqliteDow) ?? 0,
        };
    });
}
function buildHeatmap(cells) {
    const result = [];
    for (let weekday = 1; weekday <= 7; weekday += 1) {
        const sqliteDow = weekday === 7 ? 0 : weekday;
        for (let hour = 0; hour < 24; hour += 1) {
            result.push({ weekday, hour, count: cells.get(`${sqliteDow}-${hour}`) ?? 0 });
        }
    }
    return result;
}
function buildYears(videoYears, signYears, avatarYears) {
    const years = [...new Set([...videoYears.keys(), ...signYears.keys(), ...avatarYears.keys()])]
        .map(Number)
        .sort((a, b) => a - b);
    return years.map((year) => ({
        year,
        videos: videoYears.get(String(year)) ?? 0,
        signs: signYears.get(String(year)) ?? 0,
        avatars: avatarYears.get(String(year)) ?? 0,
    }));
}
function median(values) {
    if (values.length === 0)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}
function round(value, digits = 1) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}
function buildGaps(timeline) {
    const gaps = [];
    let longest = null;
    for (let index = 1; index < timeline.length; index += 1) {
        const from = timeline[index - 1].publishedAt;
        const to = timeline[index].publishedAt;
        const days = (parseDbDate(to).getTime() - parseDbDate(from).getTime()) / MS_PER_DAY;
        gaps.push(days);
        if (!longest || days > longest.days)
            longest = { days: round(days), from, to };
    }
    return { gaps, longest };
}
function buildDurations(durations) {
    const totalSeconds = durations.reduce((sum, value) => sum + value, 0);
    const longestSeconds = durations.reduce((max, value) => Math.max(max, value), 0);
    const buckets = DURATION_BUCKETS.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        count: durations.filter((seconds) => seconds >= bucket.min && (bucket.max === null || seconds < bucket.max)).length,
    }));
    return {
        totalSeconds,
        averageSeconds: durations.length ? Math.round(totalSeconds / durations.length) : 0,
        longestSeconds,
        buckets,
    };
}
export function getOverview(db, now = new Date()) {
    const videoRange = getDateRange(db, 'videos');
    const signRange = getDateRange(db, 'signs');
    const avatarRange = getDateRange(db, 'avatars');
    const videoMonths = groupByMonth(db, 'videos');
    const signMonths = groupByMonth(db, 'signs');
    const avatarMonths = groupByMonth(db, 'avatars');
    const videoDow = groupByWeekday(db, 'videos');
    const signDow = groupByWeekday(db, 'signs');
    const heatmapCells = groupByHourWeekday(db);
    const videoYears = groupByYear(db, 'videos');
    const signYears = groupByYear(db, 'signs');
    const avatarYears = groupByYear(db, 'avatars');
    const timeline = listVideoTimeline(db);
    const emptySigns = countEmptySigns(db);
    const latestVideos = listLatestVideos(db, 6);
    const latestSigns = listLatestSigns(db, 8);
    const latestAvatars = listLatestAvatars(db, 1);
    const { gaps, longest } = buildGaps(timeline);
    const durations = timeline.map((item) => item.durationSeconds);
    const firstActivityAt = [videoRange.firstAt, signRange.firstAt, avatarRange.firstAt]
        .filter((value) => Boolean(value))
        .sort()[0] ?? null;
    const lastActivityAt = [videoRange.lastAt, signRange.lastAt, avatarRange.lastAt]
        .filter((value) => Boolean(value))
        .sort()
        .pop() ?? null;
    const spanDays = firstActivityAt && lastActivityAt
        ? Math.max(0, Math.round((parseDbDate(lastActivityAt).getTime() - parseDbDate(firstActivityAt).getTime()) / MS_PER_DAY))
        : 0;
    const lastVideoAt = videoRange.lastAt;
    const daysSinceLastVideo = lastVideoAt
        ? Math.max(0, Math.floor((now.getTime() - parseDbDate(lastVideoAt).getTime()) / MS_PER_DAY))
        : 0;
    const activeMonths = videoRange.firstAt && videoRange.lastAt
        ? monthRange(videoRange.firstAt.slice(0, 7), videoRange.lastAt.slice(0, 7)).length
        : 0;
    return {
        generatedAt: now.toISOString(),
        totals: {
            videos: videoRange.total,
            signs: signRange.total,
            avatars: avatarRange.total,
            emptySigns,
        },
        range: {
            firstActivityAt,
            lastActivityAt,
            firstVideoAt: videoRange.firstAt,
            lastVideoAt,
            spanDays,
        },
        cadence: {
            daysSinceLastVideo,
            averageGapDays: gaps.length ? round(gaps.reduce((sum, value) => sum + value, 0) / gaps.length) : 0,
            medianGapDays: round(median(gaps)),
            longestGap: longest,
            videosPerMonth: activeMonths ? round(videoRange.total / activeMonths) : 0,
        },
        durations: buildDurations(durations),
        monthly: buildMonthly(videoMonths, signMonths, avatarMonths),
        weekday: buildWeekday(videoDow, signDow),
        heatmap: buildHeatmap(heatmapCells),
        years: buildYears(videoYears, signYears, avatarYears),
        latest: {
            videos: latestVideos,
            signs: latestSigns,
            avatar: latestAvatars[0] ?? null,
        },
    };
}
//# sourceMappingURL=stats.service.js.map