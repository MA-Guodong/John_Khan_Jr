import { ArrowDownUp, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFilterYears, useVideos } from '@/api/hooks';
import type { VideoListParams } from '@/api/types';
import { VideoCard } from '@/components/features/video-card';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { SearchInput, SelectField } from '@/components/ui/field';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { FilterPill, FilterPillGroup } from '@/components/ui/pill';
import { formatNumber } from '@/lib/format';
import { useDebouncedValue, usePageTitle } from '@/lib/hooks';
import { patchSearchParams, readEnum, readNumber, readString } from '@/lib/url';

const SORT_FIELDS = ['publishedAt', 'duration', 'title'] as const;
type SortField = (typeof SORT_FIELDS)[number];

const SORT_LABELS: Record<SortField, string> = {
  publishedAt: '按发布时间',
  duration: '按时长',
  title: '按标题',
};

const PAGE_SIZE = 12;

export function VideosPage() {
  usePageTitle('视频档案');
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: years } = useFilterYears();

  const page = readNumber(searchParams, 'page', 1);
  const query = readString(searchParams, 'q');
  const yearParam = searchParams.get('year');
  const year = yearParam ? Number(yearParam) : undefined;
  const sort = readEnum<SortField>(searchParams, 'sort', SORT_FIELDS, 'publishedAt');
  const order = readEnum(searchParams, 'order', ['desc', 'asc'] as const, 'desc');

  const [draft, setDraft] = useState(query);
  const debounced = useDebouncedValue(draft, 350);

  useEffect(() => {
    if (debounced === query) return;
    setSearchParams(patchSearchParams(searchParams, { q: debounced || undefined }), { replace: true });
  }, [debounced, query, searchParams, setSearchParams]);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  const params: VideoListParams = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, q: query || undefined, year, sort, order }),
    [page, query, year, sort, order],
  );

  const { data, isLoading, isError, refetch, isFetching } = useVideos(params);

  const update = (patch: Record<string, string | number | undefined>) => {
    setSearchParams(patchSearchParams(searchParams, patch));
  };

  const videoYears = years?.videos ?? [];
  const hasFilters = Boolean(query || yearParam);

  return (
    <>
      <PageHeader
        eyebrow="Archive · 视频"
        title="视频档案"
        description="按时间、时长或标题检索全部视频，点击封面可直达 B 站观看。"
        actions={
          <span className="rounded-full border border-line bg-card px-3.5 py-1.5 font-mono text-[11px] tabular-nums text-muted">
            共 {formatNumber(data?.meta.total ?? 0)} 支
          </span>
        }
      />

      <div className="surface mb-5 flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={draft}
            onValueChange={setDraft}
            placeholder="搜索视频标题，例如「苏联」"
            className="sm:max-w-xs"
            aria-label="搜索视频标题"
          />
          <div className="flex items-center gap-2 sm:ml-auto">
            <SelectField
              label="排序方式"
              value={sort}
              onChange={(event) => update({ sort: event.target.value })}
              className="w-[132px]"
            >
              {SORT_FIELDS.map((field) => (
                <option key={field} value={field}>
                  {SORT_LABELS[field]}
                </option>
              ))}
            </SelectField>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => update({ order: order === 'desc' ? 'asc' : 'desc' })}
              aria-label={order === 'desc' ? '当前倒序，切换为升序' : '当前升序，切换为倒序'}
              title={order === 'desc' ? '倒序' : '升序'}
            >
              <ArrowDownUp className={`h-3.5 w-3.5 transition-transform ${order === 'asc' ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line/70 pt-3.5">
          <span className="mr-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">年份</span>
          <FilterPillGroup label="按年份筛选">
            <FilterPill active={!yearParam} onClick={() => update({ year: undefined })}>
              全部
            </FilterPill>
            {videoYears.map((value) => (
              <FilterPill
                key={value}
                active={year === value}
                onClick={() => update({ year: year === value ? undefined : value })}
              >
                {value}
              </FilterPill>
            ))}
          </FilterPillGroup>
        </div>
      </div>

      {isError ? (
        <ErrorState message="视频列表加载失败" onRetry={() => refetch()} />
      ) : isLoading ? (
        <VideoGridSkeleton />
      ) : data && data.data.length > 0 ? (
        <>
          <div className={`grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${isFetching ? 'opacity-60' : ''}`}>
            {data.data.map((video, index) => (
              <div key={video.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}>
                <VideoCard video={video} index={(data.meta.page - 1) * data.meta.pageSize + index + 1} />
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              onChange={(next) => update({ page: next })}
            />
            <p className="font-mono text-[10.5px] tracking-wide text-muted">
              第 {data.meta.page} / {data.meta.totalPages} 页 · 共 {formatNumber(data.meta.total)} 条
            </p>
          </div>
        </>
      ) : (
        <EmptyState
          title={hasFilters ? '没有匹配的视频' : '暂无视频数据'}
          description={hasFilters ? '换一个关键词，或清除年份筛选后再试。' : '导入数据后，这里会展示全部视频。'}
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDraft('');
                  setSearchParams(new URLSearchParams(), { replace: true });
                }}
              >
                <SearchX className="h-3.5 w-3.5" />
                清除筛选
              </Button>
            ) : null
          }
        />
      )}
    </>
  );
}

function VideoGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="surface overflow-hidden">
          <Skeleton className="aspect-video rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-2/3" />
            <div className="flex justify-between pt-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
