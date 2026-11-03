import { Dices, SearchX, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFilterYears, useRandomSign, useSigns } from '@/api/hooks';
import type { Sign, SignListParams } from '@/api/types';
import { SignatureCard } from '@/components/features/signature-row';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/field';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { FilterPill, FilterPillGroup } from '@/components/ui/pill';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useDebouncedValue, usePageTitle } from '@/lib/hooks';
import { patchSearchParams, readNumber, readString } from '@/lib/url';

const PAGE_SIZE = 25;

export function SignaturesPage() {
  usePageTitle('个性签名');
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: years } = useFilterYears();
  const randomSign = useRandomSign();
  const [randomOpen, setRandomOpen] = useState(false);

  const page = readNumber(searchParams, 'page', 1);
  const query = readString(searchParams, 'q');
  const yearParam = searchParams.get('year');
  const year = yearParam ? Number(yearParam) : undefined;
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const withContent = searchParams.get('withContent') === 'true';

  const [draft, setDraft] = useState(query);
  const debounced = useDebouncedValue(draft, 350);

  useEffect(() => {
    if (debounced === query) return;
    setSearchParams(patchSearchParams(searchParams, { q: debounced || undefined }), { replace: true });
  }, [debounced, query, searchParams, setSearchParams]);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  const params: SignListParams = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, q: query || undefined, year, order, withContent: withContent || undefined }),
    [page, query, year, order, withContent],
  );

  const { data, isLoading, isError, refetch, isFetching } = useSigns(params);

  /** 按年份分组，让长列表有清晰的段落。 */
  const groups = useMemo(() => {
    const buckets = new Map<string, Sign[]>();
    for (const sign of data?.data ?? []) {
      const year = sign.postedAt.slice(0, 4);
      const bucket = buckets.get(year) ?? [];
      bucket.push(sign);
      buckets.set(year, bucket);
    }
    return [...buckets.entries()].map(([bucketYear, items]) => ({ year: bucketYear, items }));
  }, [data]);

  const update = (patch: Record<string, string | number | boolean | undefined>) => {
    setSearchParams(patchSearchParams(searchParams, patch));
  };

  const drawRandom = async () => {
    setRandomOpen(true);
    await randomSign.refetch();
  };

  const hasFilters = Boolean(query || yearParam || withContent);
  const current = randomSign.data?.data ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Archive · 签名"
        title="个性签名"
        description="一条条签名像时间轴上的注脚，记录着追更、吐槽与日常。"
        actions={
          <>
            <span className="rounded-full border border-line bg-card px-3.5 py-1.5 font-mono text-[11px] tabular-nums text-muted">
              共 {formatNumber(data?.meta.total ?? 0)} 条
            </span>
            <Button size="sm" onClick={drawRandom}>
              <Dices className="h-3.5 w-3.5" />
              随机回顾
            </Button>
          </>
        }
      />

      <div className="surface mb-5 flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={draft}
            onValueChange={setDraft}
            placeholder="搜索签名内容，例如「更新」"
            className="sm:max-w-xs"
            aria-label="搜索签名内容"
          />
          <div className="flex items-center gap-2 sm:ml-auto">
            <FilterPill active={withContent} onClick={() => update({ withContent: withContent ? undefined : 'true' })}>
              <Sparkles className="h-3 w-3" />
              只看有内容
            </FilterPill>
            <FilterPill active={order === 'asc'} onClick={() => update({ order: order === 'desc' ? 'asc' : 'desc' })}>
              {order === 'desc' ? '最新在前' : '最早在前'}
            </FilterPill>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line/70 pt-3.5">
          <span className="mr-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">年份</span>
          <FilterPillGroup label="按年份筛选">
            <FilterPill active={!yearParam} onClick={() => update({ year: undefined })}>
              全部
            </FilterPill>
            {(years?.signs ?? []).map((value) => (
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
        <ErrorState message="签名列表加载失败" onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="h-[124px] rounded-xl" />
          ))}
        </div>
      ) : data && data.data.length > 0 ? (
        <>
          <div className={`space-y-7 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            {groups.map((group, groupIndex) => (
              <section
                key={group.year}
                className="animate-fade-up"
                style={{ animationDelay: `${groupIndex * 60}ms` }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="font-serif text-[1.55rem] font-semibold leading-none tracking-tight text-ink">
                    {group.year}
                  </h2>
                  <span className="h-px flex-1 bg-line" />
                  <span className="font-mono text-[10px] text-muted">本页 {group.items.length} 条</span>
                </div>
                <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((sign) => (
                    <SignatureCard key={sign.id} sign={sign} />
                  ))}
                </ul>
              </section>
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
          title={hasFilters ? '没有匹配的签名' : '暂无签名数据'}
          description={hasFilters ? '换一个关键词，或清除年份与内容筛选后再试。' : '导入数据后，这里会展示全部签名。'}
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

      <Modal
        open={randomOpen}
        onClose={() => setRandomOpen(false)}
        title="随机回顾"
        subtitle="从全部签名里随机抽一条"
        className="max-w-2xl"
      >
        <div className="relative p-6 sm:p-8">
          <span
            aria-hidden
            className="pointer-events-none absolute right-5 top-2 select-none font-serif text-[5.5rem] leading-none text-accent/10"
          >
            ”
          </span>

          {randomSign.isFetching ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-6 w-3/5" />
            </div>
          ) : current ? (
            <>
              <p className="relative max-w-xl font-serif text-[1.35rem] leading-[1.7] text-ink">
                {current.content}
              </p>
              <p className="mt-6 font-mono text-[10.5px] tracking-wider text-muted">
                {formatDateTime(current.postedAt)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">暂时没有可展示的签名。</p>
          )}

          <div className="mt-7 flex items-center justify-end gap-2 border-t border-line pt-5">
            <Button variant="ghost" size="sm" onClick={() => setRandomOpen(false)}>
              关闭
            </Button>
            <Button size="sm" onClick={() => randomSign.refetch()} disabled={randomSign.isFetching}>
              <Dices className="h-3.5 w-3.5" />
              再来一条
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
