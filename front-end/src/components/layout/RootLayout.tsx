import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Footer } from './Footer';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const COLLAPSED_KEY = 'luman.sidebar.collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * App shell for every authenticated screen (mounted behind <RequireAuth>).
 *
 *   ┌─────────┬──────────────────────────┐
 *   │         │ Header                   │
 *   │ Sidebar ├──────────────────────────┤
 *   │ (ink,   │ <Outlet/>  (scrolls)     │
 *   │ collaps-├──────────────────────────┤
 *   │ ible)   │ Footer                   │
 *   └─────────┴──────────────────────────┘
 *
 * From `lg` the sidebar is a column that collapses to an icon rail (Ctrl/Cmd+B, remembered);
 * below `lg` it is a slide-in drawer. The workspace is a flex column that is at least as tall
 * as the screen, so a page can let its main block (e.g. a data grid) grow to the bottom edge.
 */
export function RootLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1');
      } catch {
        /* not persisted; still works for this session */
      }
      return !c;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggleCollapsed]);

  return (
    <div className="flex h-dvh overflow-hidden bg-workspace text-foreground">
      <Sidebar open={drawerOpen} collapsed={collapsed} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header collapsed={collapsed} onToggleCollapsed={toggleCollapsed} onMenu={() => setDrawerOpen(true)} />

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1800px] flex-col p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
