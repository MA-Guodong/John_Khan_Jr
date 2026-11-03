import type { Avatar } from '../avatars/avatars.schema.js';
import type { Sign } from '../signs/signs.schema.js';
import type { Video } from '../videos/videos.schema.js';

export interface MonthPoint {
  month: string;
  videos: number;
  signs: number;
  avatars: number;
}

export interface WeekdayPoint {
  weekday: number;
  label: string;
  videos: number;
  signs: number;
}

export interface HeatmapCell {
  weekday: number;
  hour: number;
  count: number;
}

export interface YearPoint {
  year: number;
  videos: number;
  signs: number;
  avatars: number;
}

export interface DurationBucket {
  key: string;
  label: string;
  count: number;
}

export interface GapInfo {
  days: number;
  from: string;
  to: string;
}

export interface Overview {
  generatedAt: string;
  totals: {
    videos: number;
    signs: number;
    avatars: number;
    emptySigns: number;
  };
  range: {
    firstActivityAt: string | null;
    lastActivityAt: string | null;
    firstVideoAt: string | null;
    lastVideoAt: string | null;
    spanDays: number;
  };
  cadence: {
    daysSinceLastVideo: number;
    averageGapDays: number;
    medianGapDays: number;
    longestGap: GapInfo | null;
    videosPerMonth: number;
  };
  durations: {
    totalSeconds: number;
    averageSeconds: number;
    longestSeconds: number;
    buckets: DurationBucket[];
  };
  monthly: MonthPoint[];
  weekday: WeekdayPoint[];
  heatmap: HeatmapCell[];
  years: YearPoint[];
  latest: {
    videos: Video[];
    signs: Sign[];
    avatar: Avatar | null;
  };
}
