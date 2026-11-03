import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Brand, ThemeToggle } from './sidebar';

const links = [
  { to: '/', label: '总览', end: true },
  { to: '/videos', label: '视频档案' },
  { to: '/signatures', label: '个性签名' },
  { to: '/avatars', label: '头像长廊' },
  { to: '/about', label: '关于本站' },
];

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md lg:hidden">
        <div className="flex h-16 items-center justify-between px-5">
          <Brand compact />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="打开菜单"
            aria-expanded={open}
            className="rounded-full border border-line bg-card p-2.5 text-ink-soft"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="站点导航">
              <div
                className="absolute inset-0 bg-[rgb(18_16_13_/0.5)] backdrop-blur-sm"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <div className="absolute inset-y-0 left-0 flex w-[84%] max-w-xs flex-col border-r border-line bg-paper-deep p-5 shadow-lift animate-scale-in">
                <div className="flex items-center justify-between">
                  <Brand compact />
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="关闭菜单"
                    className="rounded-full p-2 text-muted hover:bg-card hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <nav className="mt-8 flex-1" aria-label="移动端导航">
                  <ul className="space-y-1">
                    {links.map((link) => (
                      <li key={link.to}>
                        <NavLink
                          to={link.to}
                          end={link.end}
                          className={({ isActive }) =>
                            cn(
                              'block rounded-xl px-3 py-3 text-sm transition',
                              isActive
                                ? 'bg-accent-soft font-medium text-accent'
                                : 'text-ink-soft hover:bg-card hover:text-ink',
                            )
                          }
                        >
                          {link.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="flex items-center justify-between border-t border-line pt-4">
                  <span className="font-mono text-[10px] tracking-wider text-muted">v2.0</span>
                  <ThemeToggle />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
