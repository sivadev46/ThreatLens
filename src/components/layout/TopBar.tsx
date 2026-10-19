import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Clock,
  Bell,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  Settings,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../common/NotificationToast';

interface TopBarProps {
  onMobileMenuToggle: () => void;
  openAlertsCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({ onMobileMenuToggle, openAlertsCount }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isDemoMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [timeStr, setTimeStr] = useState<string>('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Overview';
    if (path === '/logs') return 'Logs';
    if (path === '/alerts') return 'Alerts';
    if (path === '/rules') return 'Detection Rules';
    if (path === '/blocklist') return 'IP Blocklist';
    if (path === '/reports' || path === '/analytics') return 'Analytics';
    if (path === '/audit') return 'Audit Trail';
    if (path === '/settings') return 'Settings';
    return 'Overview';
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    showToast({
      type: 'info',
      title: 'Signed Out',
      message: 'Console session closed safely.',
    });
    navigate('/login');
  };

  return (
    <header className="h-14 dark:bg-[#0a0f1b] bg-white border-b dark:border-slate-800/80 border-slate-200/90 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 select-none transition-colors duration-150">
      {/* Zone 1: Mobile toggle + Minimal Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-1.5 dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-slate-800/60 hover:bg-slate-100 rounded-lg cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium dark:text-slate-400 text-slate-500 truncate">
          <span className="font-mono text-[11px] font-semibold dark:text-slate-500 text-slate-400">
            SENTINEL
          </span>
          <span className="dark:text-slate-600 text-slate-300">/</span>
          <span className="dark:text-slate-200 text-slate-800 font-semibold truncate">
            {getBreadcrumb()}
          </span>
        </div>
      </div>

      {/* Zone 2: Telemetry Indicators */}
      <div className="hidden lg:flex items-center gap-3 text-xs dark:text-slate-400 text-slate-500">
        <div className="flex items-center gap-2 font-mono dark:bg-slate-900/60 bg-slate-100 px-2.5 py-1 rounded-md border dark:border-slate-800/80 border-slate-200 text-[11px]">
          <Clock className="w-3.5 h-3.5 dark:text-slate-500 text-slate-400" />
          <span className="tabular-nums">{timeStr}</span>
        </div>

        <div className="flex items-center gap-2 dark:bg-slate-900/60 bg-slate-100 px-2.5 py-1 rounded-md border dark:border-slate-800/80 border-slate-200 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
          <span>Active Rules</span>
          <span className="font-mono dark:text-slate-200 text-slate-800 font-semibold">3/3</span>
        </div>

        {isDemoMode && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium">
            Demo Mode
          </span>
        )}
      </div>

      {/* Zone 3: Controls (Theme Toggle beside Notification Bell, Compact User Avatar) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Day/Night Theme Toggle (immediately beside Notification Bell) */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="p-2 rounded-lg dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-slate-800/50 hover:bg-slate-100 transition-colors cursor-pointer relative focus-visible:outline-2 focus-visible:outline-sky-500"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* Notification Bell */}
        <Link
          to="/alerts"
          className="relative p-2 rounded-lg dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-slate-800/50 hover:bg-slate-100 transition-colors cursor-pointer"
          title={`${openAlertsCount} active security alerts`}
          aria-label={`${openAlertsCount} active security alerts`}
        >
          <Bell className="w-4 h-4" />
          {openAlertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 dark:ring-[#0a0f1b] ring-white" />
          )}
        </Link>

        <div className="h-4 w-px dark:bg-slate-800 bg-slate-200 mx-1" />

        {/* Compact User Indicator with quick Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 p-1.5 rounded-lg dark:hover:bg-slate-800/50 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-500"
          >
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-mono text-xs font-semibold flex items-center justify-center shadow-xs shrink-0">
              {user.avatarInitials || 'OP'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium dark:text-slate-200 text-slate-800 leading-none">
                {user.fullName}
              </p>
              <p className="text-[10px] dark:text-slate-400 text-slate-500 mt-0.5 leading-none font-mono">
                {user.role}
              </p>
            </div>
            <ChevronDown className="w-3 h-3 dark:text-slate-500 text-slate-400" />
          </button>

          {/* Compact User Menu Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-[#0c121e] bg-white shadow-xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-2 border-b dark:border-slate-800/80 border-slate-100">
                <p className="font-semibold dark:text-slate-200 text-slate-800">{user.fullName}</p>
                <p className="text-[11px] font-mono dark:text-slate-400 text-slate-500 truncate">
                  {user.email}
                </p>
                <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-700">
                  {user.role}
                </span>
              </div>

              <div className="py-1">
                <Link
                  to="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 dark:text-slate-300 text-slate-700 dark:hover:bg-slate-800/60 hover:bg-slate-100 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 dark:text-slate-400 text-slate-500" />
                  <span>Security & Account Settings</span>
                </Link>
              </div>

              <div className="pt-1 border-t dark:border-slate-800/80 border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-500 hover:text-rose-600 dark:hover:bg-rose-500/10 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
