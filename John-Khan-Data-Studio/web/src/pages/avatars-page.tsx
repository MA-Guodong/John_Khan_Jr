import { ArrowLeft, ArrowRight, ArrowDownUp, ImageOff, SearchX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAvatars, useFilterYears } from '@/api/hooks';
import type { AvatarListParams } from '@/api/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { FilterPill, FilterPillGroup } from '@/components/ui/pill';
import { SmartImage } from '@/components/ui/smart-image';
import { formatDateTime, formatNumber } from '@/lib/format';
import { usePageTitle } from '@/lib/hooks';
import { patchSearchParams, readNumber } from '@/lib/url';

const PAGE_SIZE = 24;

export function AvatarsPage() {
  usePageTitle('头像长廊');
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: years } = useFilterYears();
  const [active, setActive] = useState<number | null>(null);

  const page = readNumber(searchParams, 'page', 1);
  const yearParam = searchParams.get('year');
  const year = yearParam ? Number(yearParam) : undefined;
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

  const params: AvatarListParams = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, year, order }),
    [page, year, order],
  );

  const { data, isLoading, isError, refetch, isFetching } = useAvatars(params);

  const avatars = data?.data ?? [];
  const currentIndex = active === null ? -1 : avatars.findIndex((item) => item.id === active);
  const current = currentIndex >= 0 ? avatars[currentIndex] : null;

  const move = useCallback(
    (delta: number) => {
      if (currentIndex < 0) return;
      const nextIndex = currentIndex + delta;
      if (nextIndex < 0 || nextIndex >= avatars.length) return;
      setActive(avatars[nextIndex]?.id ?? null);
    },
    [avatars, currentIndex],
  );

  useEffect(() => {
    if (!current) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, move]);

  const update = (patch: Record<string, string | number | boolean | undefined>) => {
    setSearchParams(patchSearchParams(searchParams, patch));
  };

  return (
    <>
      <PageHeader
        eyebrow="Gallery · 头像"
        title="头像长廊"
        description="他换过的每一张头像，按时间铺成一面墙。点击任意一张可以放大查看。"
        actions={
          <span className="rounded-full border border-line bg-card px-3.5 py-1.5 font-mono text-[11px] tabular-nums text-muted">
            共 {formatNumber(data?.meta.total ?? 0)} 张
          </span>
        }
      />

      <div className="surface mb-5 flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <FilterPillGroup label="按年份筛选">
          <FilterPill active={!yearParam} onClick={() => update({ year: undefined })}>
            全部
          </FilterPill>
          {(years?.avatars ?? []).map((value) => (
            <FilterPill
              key={value}
              active={year === value}
              onClick={() => update({ year: year === value ? undefined : value })}
            >
              {value}
            </FilterPill>
          ))}
        </FilterPillGroup>

        <div className="ml-auto flex items-center gap-2">
          <FilterPill active={order === 'asc'} onClick={() => update({ order: order === 'desc' ? 'asc' : 'desc' })}>
            <ArrowDownUp className={`h-3 w-3 ${order === 'asc' ? 'rotate-180' : ''}`} />
            {order === 'desc' ? '最新在前' : '最早在前'}
          </FilterPill>
        </div>
      </div>

      {isError ? (
        <ErrorState message="头像列表加载失败" onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : avatars.length > 0 ? (
        <>
          <div
            className={`grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${
              isFetching ? 'opacity-60' : ''
            }`}
          >
            {avatars.map((avatar, index) => (
              <button
                type="button"
                key={avatar.id}
                onClick={() => setActive(avatar.id)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-card-muted text-left shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 animate-fade-up"
                style={{ animationDelay: `${Math.min(index, 10) * 22}ms` }}
                aria-label={`查看 ${formatDateTime(avatar.postedAt)} 的头像`}
              >
                <SmartImage
                  src={avatar.imageUrl}
                  alt={`头像 ${avatar.postedAt}`}
                  variant="avatar"
                  className="h-full w-full"
                  imageClassName="group-hover:scale-[1.06]"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/65 via-black/20 to-transparent px-3 pb-2.5 pt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="font-mono text-[10px] text-white/90">{avatar.postedAt.slice(0, 10)}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-white/60">View</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <Pagination
              page={data!.meta.page}
              totalPages={data!.meta.totalPages}
              onChange={(next) => update({ page: next })}
            />
            <p className="font-mono text-[10.5px] tracking-wide text-muted">
              第 {data!.meta.page} / {data!.meta.totalPages} 页 · 共 {formatNumber(data!.meta.total)} 张
            </p>
          </div>
        </>
      ) : (
        <EmptyState
          title="这一年份没有头像"
          description="换一个年份，或回到全部头像。"
          action={
            yearParam ? (
              <Button variant="secondary" size="sm" onClick={() => update({ year: undefined })}>
                <SearchX className="h-3.5 w-3.5" />
                查看全部
              </Button>
            ) : null
          }
        />
      )}

      <Modal
        open={Boolean(current)}
        onClose={() => setActive(null)}
        hideClose
        className="max-w-3xl overflow-hidden bg-paper"
      >
        {current ? (
          <div>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div className="flex items-center gap-2.5">
                <ImageOff className="h-3.5 w-3.5 text-muted" />
                <span className="font-mono text-[11px] tracking-wider text-ink-soft">
                  {formatDateTime(current.postedAt)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="关闭预览"
                className="rounded-full p-2 text-muted transition hover:bg-card hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative flex min-h-[320px] items-center justify-center bg-paper-deep/70 p-4 sm:p-6">
              <img
                src={current.imageUrl}
                alt={`头像 ${current.postedAt}`}
                className="max-h-[62vh] w-auto max-w-full rounded-lg object-contain shadow-lift"
                referrerPolicy="no-referrer"
              />
              <LightboxArrow
                direction="prev"
                disabled={currentIndex <= 0}
                onClick={() => move(-1)}
              />
              <LightboxArrow
                direction="next"
                disabled={currentIndex >= avatars.length - 1}
                onClick={() => move(1)}
              />
            </div>

            <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[10.5px] text-muted">
              <span className="font-mono">
                第 {currentIndex + 1} / {avatars.length} 张
              </span>
              <span className="hidden sm:block">使用 ← → 方向键切换</span>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function LightboxArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === 'prev' ? ArrowLeft : ArrowRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? '上一张' : '下一张'}
      className={`absolute ${
        direction === 'prev' ? 'left-3' : 'right-3'
      } flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card/90 text-ink-soft shadow-card backdrop-blur transition hover:text-ink disabled:pointer-events-none disabled:opacity-30`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
