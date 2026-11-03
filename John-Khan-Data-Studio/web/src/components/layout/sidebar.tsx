import {
  Images,
  Info,
  LayoutDashboard,
  Moon,
  PenLine,
  Sun,
  Video,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme';

const navigation = [
  { to: '/', label: '总览', hint: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/videos', label: '视频档案', hint: 'Videos', icon: Video },
  { to: '/signatures', label: '个性签名', hint: 'Signatures', icon: PenLine },
  { to: '/avatars', label: '头像长廊', hint: 'Avatars', icon: Images },
];

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.7rem] bg-ink font-serif text-[19px] leading-none text-paper shadow-sm">
        可
      </span>
      <span className="min-w-0">
        <span className={cn('block truncate font-serif font-semibold tracking-tight text-ink', compact ? 'text-[15px]' : 'text-base')}>
          小约翰可汗
        </span>
        <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
          Data Archive
        </span>
      </span>
    </div>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn('inline-flex items-center gap-1 rounded-full border border-line bg-card p-1', className)}
      role="group"
      aria-label="主题切换"
    >
      {[
        { value: 'light' as const, icon: Sun, label: '浅色' },
        { value: 'dark' as const, icon: Moon, label: '深色' },
      ].map((item) => {
        const active = theme === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => setTheme(item.value)}
            aria-pressed={active}
            title={item.label}
            className={cn(
              'flex h-7 w-8 items-center justify-center rounded-full transition',
              active ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
            )}
          >
            <item.icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-line bg-paper-deep/70 backdrop-blur-sm lg:flex">
      <div className="px-6 pb-8 pt-7">
        <Brand />
      </div>

      <nav className="flex-1 px-3" aria-label="主导航">
        <p className="px-3 pb-2 font-mono text-[9px] uppercase tracking-[0.24em] text-muted">Archive</p>
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-all duration-200',
                    isActive
                      ? 'bg-accent-soft font-medium text-accent'
                      : 'text-ink-soft hover:bg-card/70 hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn('h-4 w-4 transition', isActive ? 'text-accent' : 'text-muted group-hover:text-ink-soft')}
                      strokeWidth={1.8}
                    />
                    <span className="flex-1">{item.label}</span>
                    <span
                      className={cn(
                        'font-mono text-[9px] uppercase tracking-wider opacity-0 transition group-hover:opacity-100',
                        isActive ? 'text-accent/60' : 'text-muted/60',
                      )}
                    >
                      {item.hint}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <p className="px-3 pb-2 pt-8 font-mono text-[9px] uppercase tracking-[0.24em] text-muted">Project</p>
        <ul className="space-y-1">
          <li>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-all duration-200',
                  isActive
                    ? 'bg-accent-soft font-medium text-accent'
                    : 'text-ink-soft hover:bg-card/70 hover:text-ink',
                )
              }
            >
              <Info className="h-4 w-4 text-muted transition group-hover:text-ink-soft" strokeWidth={1.8} />
              关于本站
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="border-t border-line px-6 py-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-wider text-muted">v2.0</span>
          <ThemeToggle />
        </div>
        <p className="mt-4 text-[10px] leading-relaxed text-muted/80">
          数据来源 Bilibili
          <br />
          仅供学习与研究使用
        </p>
      </div>
    </aside>
  );
}
