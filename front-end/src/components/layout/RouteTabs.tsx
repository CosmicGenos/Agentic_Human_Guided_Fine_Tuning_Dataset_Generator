import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface RouteTab {
  label: string;
  to: string;
  /** Match the path exactly (use for the index tab). */
  end?: boolean;
}

/** URL-driven tabs: each tab is a route, so links, refresh and back/forward just work. */
export function RouteTabs({ tabs, label }: { tabs: RouteTab[]; label: string }) {
  return (
    <nav aria-label={label} className="mb-5 -mx-4 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {tabs.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  '-mb-px inline-flex border-b-2 px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
