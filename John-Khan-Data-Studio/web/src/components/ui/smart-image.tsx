import { ImageOff, Play } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';

interface SmartImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  rounded?: string;
  variant?: 'cover' | 'avatar';
}

const coverGradients = [
  'linear-gradient(135deg, #2f5d50 0%, #16231f 100%)',
  'linear-gradient(135deg, #8c4a35 0%, #2a1713 100%)',
  'linear-gradient(135deg, #8a6a2f 0%, #241c10 100%)',
  'linear-gradient(135deg, #4f5894 0%, #191c2b 100%)',
  'linear-gradient(135deg, #6b4a5c 0%, #20161b 100%)',
  'linear-gradient(135deg, #3f5f6b 0%, #131e22 100%)',
];

function gradientFor(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return coverGradients[hash % coverGradients.length] ?? coverGradients[0]!;
}

/**
 * 带加载态与降级封面的图片：B 站封面为外链，可能被防盗链或网络拦截，
 * 头像文件也可能缺失。封面降级为按标题生成的渐变，保证版面不塌。
 */
export function SmartImage({ src, alt, className, imageClassName, rounded, variant = 'cover' }: SmartImageProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(src ? 'loading' : 'error');

  const showPlaceholder = status !== 'ready';

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-card-muted',
        variant === 'cover' ? 'aspect-video' : '',
        rounded,
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
          className={cn(
            'h-full w-full object-cover transition-all duration-700',
            status === 'ready' ? 'scale-100 opacity-100 blur-0' : 'scale-105 opacity-0 blur-sm',
            imageClassName,
          )}
        />
      ) : null}

      {showPlaceholder ? (
        variant === 'cover' ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: gradientFor(alt) }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90 backdrop-blur-sm">
              <Play className="ml-0.5 h-4 w-4" fill="currentColor" strokeWidth={1} />
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.15]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 9px)',
              }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-card-muted text-muted/60">
            {status === 'loading' ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent/60" />
            ) : (
              <ImageOff className="h-6 w-6" />
            )}
          </div>
        )
      ) : null}
    </div>
  );
}
