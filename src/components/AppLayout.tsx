import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bookmark,
  Compass,
  GitCompare,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  ScanBarcode,
  Settings,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { Button } from './ui/primitives';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/scan', label: 'Scan Product', icon: ScanBarcode },
  { to: '/explore', label: 'Explore Products', icon: Compass },
  { to: '/compare', label: 'Compare Products', icon: GitCompare },
  { to: '/collection', label: 'My Collection', icon: Bookmark },
  { to: '/insights', label: 'Sustainability Insights', icon: BarChart3 },
  { to: '/profile', label: 'My Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function SuvitaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFAA] rounded-lg whitespace-nowrap shrink-0"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00FFAA]/15 border border-[#00FFAA]/35 text-[#00FFAA]">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M5 12c0-4.5 3.5-8 8.5-8 2.2 0 4 .5 5.5 1.5-1 5.5-4.5 10.5-10.5 11.5C6.5 17 5 15 5 12Z" />
          <path d="M5 19c2.5-3 6-5.5 10.5-7" strokeLinecap="round" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-tight">
          SU<span className="text-[#00FFAA]">vita</span>
        </span>
        {!compact && (
          <span className="mt-0.5 text-[11px] font-normal text-[#8E9C94]">
            Scan Smart. Live Green.
          </span>
        )}
      </span>
    </Link>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAuthenticated, setAuthModalOpen, logout, compareIds } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const initials = (profile.displayName || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-[#1C2421] border-r border-white/[0.07] z-30">
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <SuvitaLogo />
        </div>

        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-[#00FFAA]/12 text-[#00FFAA]'
                      : 'text-[#A0AAA5] hover:bg-white/[0.05] hover:text-white'
                  )
                }
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.to === '/compare' && compareIds.length > 0 && (
                  <span className="font-mono text-xs text-[#00FFAA] tabular-nums">
                    {compareIds.length}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Profile & Account Controls */}
        <div className="p-4 border-t border-white/[0.06] bg-[#18201D]">
          <div className="flex items-center gap-3">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full object-cover border border-white/15 shrink-0"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#26332C] border border-white/10 text-xs font-semibold text-[#00FFAA]">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{profile.displayName}</p>
              <p className="text-xs text-[#8E9C94] truncate">
                {isAuthenticated ? profile.email : 'Guest Workspace'}
              </p>
            </div>
          </div>

          <div className="mt-3">
            {isAuthenticated ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-center"
                onClick={() => logout()}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-center"
                onClick={() => setAuthModalOpen(true)}
              >
                <LogIn className="h-3.5 w-3.5 text-[#00FFAA]" />
                Sign in to sync
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Compact Header */}
      <header className="lg:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.07] bg-[#1C2421]/95 backdrop-blur-md px-4">
        <SuvitaLogo compact />
        <div className="flex items-center gap-2">
          {!isAuthenticated && (
            <Button size="sm" variant="secondary" onClick={() => setAuthModalOpen(true)}>
              Sign in
            </Button>
          )}
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#A0AAA5] hover:bg-white/[0.06] hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer for secondary routes */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/70" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="fixed right-0 top-14 bottom-16 w-64 bg-[#1C2421] border-l border-white/[0.08] p-4 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <nav aria-label="Mobile menu" className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                        isActive
                          ? 'bg-[#00FFAA]/12 text-[#00FFAA]'
                          : 'text-[#A0AAA5] hover:bg-white/[0.05] hover:text-white'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-white/[0.07]">
              {isAuthenticated ? (
                <Button variant="secondary" size="sm" className="w-full" onClick={() => { setMobileMenuOpen(false); logout(); }}>
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </Button>
              ) : (
                <Button variant="primary" size="sm" className="w-full" onClick={() => { setMobileMenuOpen(false); setAuthModalOpen(true); }}>
                  <LogIn className="h-3.5 w-3.5" />
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 pb-20 lg:pb-10 min-w-0">
        <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Home, Prominent Scan, Explore, Profile) */}
      <nav
        aria-label="Mobile primary navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 border-t border-white/[0.08] bg-[#1C2421]/95 backdrop-blur-md px-2 grid grid-cols-4 items-center"
      >
        <Link
          to="/"
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium',
            location.pathname === '/' ? 'text-[#00FFAA]' : 'text-[#A0AAA5]'
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Home</span>
        </Link>

        <Link
          to="/scan"
          className="flex flex-col items-center justify-center"
          aria-label="Scan Product"
        >
          <span
            className={cn(
              'flex h-11 px-4 items-center justify-center gap-1.5 rounded-xl font-semibold text-xs transition-colors',
              location.pathname === '/scan'
                ? 'bg-[#00FFAA] text-[#081510]'
                : 'bg-[#00FFAA] text-[#081510]'
            )}
          >
            <ScanBarcode className="h-4.5 w-4.5" />
            <span>Scan</span>
          </span>
        </Link>

        <Link
          to="/explore"
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium',
            location.pathname === '/explore' ? 'text-[#00FFAA]' : 'text-[#A0AAA5]'
          )}
        >
          <Compass className="h-5 w-5" />
          <span>Explore</span>
        </Link>

        <Link
          to="/profile"
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium',
            location.pathname === '/profile' ? 'text-[#00FFAA]' : 'text-[#A0AAA5]'
          )}
        >
          <User className="h-5 w-5" />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
