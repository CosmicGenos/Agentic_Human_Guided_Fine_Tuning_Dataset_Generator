import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/use-auth';
import { titleFor } from './nav';

interface HeaderProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onMenu: () => void;
}

export function Header({ collapsed, onToggleCollapsed, onMenu }: HeaderProps) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const name = user?.username ?? user?.email ?? '';
  const initial = name.charAt(0).toUpperCase() || '?';
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4 sm:px-6">
      {/* below lg: opens the drawer */}
      <Button variant="ghost" size="icon-sm" className="-ml-1.5 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu />
      </Button>
      {/* from lg: collapses / expands the sidebar */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="-ml-1.5 hidden lg:inline-flex"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={collapsed}
        title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
      >
        <ToggleIcon />
      </Button>

      <p className="ml-1 truncate text-[15px] font-semibold tracking-tight">{titleFor(pathname)}</p>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/30">
            <span className="flex size-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-cream">
              {initial}
            </span>
            <span className="hidden max-w-40 truncate text-sm text-foreground/80 md:block">{name}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium">{user?.username ?? 'Account'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
