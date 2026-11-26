import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bookmark,
  Bot,
  Compass,
  GitCompareArrows,
  Home,
  LogIn,
  LogOut,
  ScanBarcode,
  Settings,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/utils';
import { AuthModal } from '../auth/AuthModal';
import { OnboardingModal } from '../onboarding/OnboardingModal';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: Home, end: true },
  { to: '/scan', label: 'Scan Product', icon: ScanBarcode, end: false },
  { to: '/explore', label: 'Explore Products', icon: Compass, end: false },
  { to: '/compare', label: 'Compare Products', icon: GitCompareArrows, end: false },
  { to: '/assistant', label: 'SUvita AI', icon: Bot, end: false },
  { to: '/collection', label: 'My Collection', icon: Bookmark, end: false },
  { to: '/insights', label: 'Sustainability Insights', icon: BarChart3, end: false },
  { to: '/profile', label: 'My Profile', icon: User, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

export const SuvitaLogoMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('h-7 w-7 shrink-0', className)}
    aria-hidden="true"
  >
    <rect width="28" height="28" rx="7" fill="#00FFAA" fillOpacity="0.14" />
    <rect x="0.5" y="0.5" width="27" height="27" rx="6.5" stroke="#00FFAA" strokeOpacity="0.35" />
    <path
      d="M8 10V18M11.5 8.5V19.5M15 11V18"
      stroke="#00FFAA"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <path
      d="M18.5 18.5C18.5 13.5 20.5 9.5 22 9.5C22 14 20.8 18.5 18.5 18.5Z"
      fill="#00FFAA"
    />
  </svg>
);

export const AppLayout: React.FC = () => {
  const { profile, isAuthenticated, setAuthModalOpen, logout, compareIds } = useApp();
  const location = useLocation();

  const initials = (profile.displayName || 'S')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-[252px] lg:shrink-0 lg:flex-col lg:fixed lg:inset-y-0 border-r border-white/[0.08] bg-[#1C2421]">
        <div className="px-5 pt-6 pb-5 border-b border-white/[0.07]">
          <Link to="/" className="flex items-center gap-3 focus-visible:outline-none">
            <SuvitaLogoMark />
            <div>
              <div className="text-base font-bold tracking-tight text-white leading-none">
                SUvita
              </div>
              <div className="mt-1 text-[11px] text-[#A0AAA5] leading-none">
                Scan Smart. Live Green.
              </div>
            </div>
          </Link>
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
                    'flex items-center justify-between gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-[#00FFAA]/12 text-[#00FFAA]'
                      : 'text-[#A0AAA5] hover:bg-white/[0.05] hover:text-white'
                  )
                }
              >
                <span className="flex items-center gap-3 truncate">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.to === '/compare' && compareIds.length > 0 && (
                  <span className="font-mono text-xs tabular-nums text-[#00FFAA]">
                    {compareIds.length}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom User Profile & Account Controls */}
        <div className="border-t border-white/[0.08] p-4">
          <div className="flex items-center gap-3">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00FFAA]/15 text-xs font-semibold text-[#00FFAA]">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">
                {profile.displayName}
              </div>
              <div className="truncate text-xs text-[#8E9B94]">
                {isAuthenticated ? profile.email : 'Guest · India (INR)'}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#151B18] px-3 py-2 text-xs font-medium text-[#C8D3CD] hover:text-white hover:border-white/20 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00FFAA] px-3 py-2 text-xs font-semibold text-[#09130F] hover:bg-[#19FFB3] transition-colors cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign in / Sync
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Compact Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.08] bg-[#1C2421]/95 px-4 backdrop-blur-md lg:hidden">
        <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <SuvitaLogoMark className="h-6 w-6" />
          <span className="text-sm font-bold tracking-tight text-white">SUvita</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/compare"
            aria-label="Compare Products"
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium whitespace-nowrap',
              location.pathname === '/compare'
                ? 'border-[#00FFAA]/40 bg-[#00FFAA]/12 text-[#00FFAA]'
                : 'border-white/10 bg-[#151B18] text-[#C8D3CD]'
            )}
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
            Compare{compareIds.length > 0 ? ` (${compareIds.length})` : ''}
          </Link>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex h-9 items-center rounded-lg bg-[#00FFAA] px-3 text-xs font-semibold text-[#09130F] whitespace-nowrap cursor-pointer"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-[252px] pb-24 lg:pb-12">
        <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 inset-x-0 z-30 flex h-16 items-center justify-around border-t border-white/[0.08] bg-[#1C2421]/95 px-2 backdrop-blur-md lg:hidden"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium whitespace-nowrap',
              isActive ? 'text-[#00FFAA]' : 'text-[#A0AAA5]'
            )
          }
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/explore"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium whitespace-nowrap',
              isActive ? 'text-[#00FFAA]' : 'text-[#A0AAA5]'
            )
          }
        >
          <Compass className="h-5 w-5" />
          <span>Explore</span>
        </NavLink>

        <NavLink
          to="/scan"
          aria-label="Scan Product"
          className="flex -mt-5 h-13 w-13 flex-col items-center justify-center rounded-full bg-[#00FFAA] text-[#09130F] shadow-lg shadow-[#00FFAA]/20"
        >
          <ScanBarcode className="h-6 w-6" />
        </NavLink>

        <NavLink
          to="/assistant"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium whitespace-nowrap',
              isActive ? 'text-[#00FFAA]' : 'text-[#A0AAA5]'
            )
          }
        >
          <Bot className="h-5 w-5" />
          <span>SUvita AI</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium whitespace-nowrap',
              isActive ? 'text-[#00FFAA]' : 'text-[#A0AAA5]'
            )
          }
        >
          <User className="h-5 w-5" />
          <span>Profile</span>
        </NavLink>
      </nav>

      <AuthModal />
      <OnboardingModal />
    </div>
  );
};
