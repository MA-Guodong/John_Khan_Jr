import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from './footer';
import { MobileHeader } from './mobile-header';
import { Sidebar } from './sidebar';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}

export function AppShell() {
  return (
    <div className="min-h-screen bg-paper">
      <ScrollToTop />
      <Sidebar />
      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        <MobileHeader />
        <main className="mx-auto w-full max-w-[1240px] flex-1 px-5 pb-16 pt-7 sm:px-8 lg:px-12 lg:pb-20 lg:pt-12">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
