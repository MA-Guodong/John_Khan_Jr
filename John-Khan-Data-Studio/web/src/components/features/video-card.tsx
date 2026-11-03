import { ArrowUpRight } from 'lucide-react';
import type { Video } from '@/api/types';
import { SmartImage } from '@/components/ui/smart-image';
import { formatDotDate } from '@/lib/format';

export function VideoCard({ video, index }: { video: Video; index?: number }) {
  return (
    <article className="group surface overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <a href={video.url} target="_blank" rel="noreferrer" className="block focus:outline-none">
        <div className="relative overflow-hidden">
          <SmartImage
            src={video.coverUrl}
            alt={video.title}
            imageClassName="group-hover:scale-[1.05]"
            className="aspect-video"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0 opacity-70 transition group-hover:opacity-100" />
          {typeof index === 'number' ? (
            <span className="absolute left-3 top-3 rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-white/90 backdrop-blur-sm">
              No.{String(index).padStart(2, '0')}
            </span>
          ) : null}
          <span className="absolute bottom-2.5 right-2.5 rounded bg-black/65 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-white/95 backdrop-blur-sm">
            {video.durationLabel}
          </span>
        </div>

        <div className="p-4">
          <h3 className="line-clamp-2 min-h-[2.7rem] text-[13.5px] font-medium leading-[1.55] text-ink transition-colors group-hover:text-accent">
            {video.title}
          </h3>
          <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3">
            <time className="font-mono text-[10.5px] tracking-wide text-muted">{formatDotDate(video.publishedAt)}</time>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors group-hover:text-accent">
              观看
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </a>
    </article>
  );
}
