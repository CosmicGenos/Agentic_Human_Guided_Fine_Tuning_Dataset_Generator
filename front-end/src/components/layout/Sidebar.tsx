import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav';

interface SidebarProps {
  /** Mobile drawer state. */
  open: boolean;
  /** Desktop icon-rail state (ignored below `lg`, where the drawer is always full width). */
  collapsed: boolean;
  onClose: () => void;
}

/** Ink sidebar: column from `lg` up (collapsible to an icon rail), slide-in drawer below. */
export function Sidebar({ open, collapsed, onClose }: SidebarProps) {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((n) => !n.roles || (user && n.roles.includes(user.role)));
  // visual state only applies from `lg`; the drawer is always the full sidebar
  const hideLabel = collapsed ? 'lg:sr-only' : '';

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-ink/50 backdrop-blur-[2px] transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col overflow-hidden bg-ink text-cream transition-[transform,width] duration-200 lg:static lg:translate-x-0',
          collapsed && 'lg:w-[68px]',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Primary"
      >
        <div className={cn('flex h-14 shrink-0 items-center justify-between px-5', collapsed && 'lg:justify-center lg:px-0')}>
          <div className="flex items-center gap-2.5">
            <Logo tone="light" size={collapsed ? 28 : 26} />
            <span className={cn('font-serif text-[15px] font-medium', collapsed && 'lg:hidden')}>Luman</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-cream/60 hover:bg-cream/10 hover:text-cream lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        <nav className={cn('flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3 py-3', collapsed && 'lg:px-2.5')}>
          {items.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  collapsed && 'lg:justify-center lg:px-0',
                  isActive ? 'bg-cream/12 text-cream' : 'text-cream/60 hover:bg-cream/6 hover:text-cream',
                )
              }
            >
              <Icon className="size-[18px] shrink-0" />
              <span className={cn('truncate', hideLabel)}>{label}</span>
            </NavLink>
          ))}
        </nav>

        {user && (
          <div
            className={cn('flex shrink-0 items-center gap-3 border-t border-cream/10 px-5 py-3.5', collapsed && 'lg:justify-center lg:px-0')}
            title={collapsed ? (user.username ?? user.email) : undefined}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cream/15 text-xs font-semibold text-cream">
              {(user.username ?? user.email).charAt(0).toUpperCase()}
            </span>
            <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
              <p className="truncate text-sm text-cream">{user.username ?? user.email}</p>
              <p className="truncate text-xs text-cream/45">{user.role === 'admin' ? 'Administrator' : user.email}</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
