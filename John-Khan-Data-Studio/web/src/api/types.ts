export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface Video {
  id: number;
  title: string;
  url: string;
  coverUrl: string | null;
  publishedAt: string;
  durationSeconds: number;
  durationLabel: string;
}

export interface Sign {
  id: number;
  content: string | null;
  postedAt: string;
}

export interface Avatar {
  id: number;
  imageFile: string;
  imageUrl: string;
  postedAt: string;
}

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

export interface FilterYears {
  videos: number[];
  signs: number[];
  avatars: number[];
}

export interface VideoListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  year?: number;
  sort?: 'publishedAt' | 'duration' | 'title';
  order?: 'asc' | 'desc';
}

export interface SignListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  year?: number;
  order?: 'asc' | 'desc';
  withContent?: boolean;
}

export interface AvatarListParams {
  page?: number;
  pageSize?: number;
  year?: number;
  order?: 'asc' | 'desc';
}
