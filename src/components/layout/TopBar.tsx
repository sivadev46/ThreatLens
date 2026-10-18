import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Clock, Bell, ShieldCheck } from 'lucide-react';
import { securityService } from '../../services/securityService';

interface TopBarProps {
  onMobileMenuToggle: () => void;
  openAlertsCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({ onMobileMenuToggle, openAlertsCount }) => {
  const location = useLocation();
  const [user, setUser] = useState(securityService.getCurrentUser());
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return securityService.subscribe(() => {
      setUser(securityService.getCurrentUser());
    });
  }, []);

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Operations / Dashboard';
    if (path === '/logs') return 'Operations / Log Explorer';
    if (path === '/alerts') return 'Incidents / Alert Queue';
    if (path === '/rules') return 'Detection / Rules Engine';
    if (path === '/blocklist') return 'Threat Intel / IP Blocklist';
    if (path === '/reports') return 'Analytics / SOC Metrics';
    if (path === '/audit') return 'Governance / Audit Trail';
    if (path === '/settings') return 'System / Settings';
    if (path === '/profile') return 'Account / Profile';
    if (path === '/login') return 'Auth / Sign In';
    return 'Operations / Overview';
  };

  return (
    <header className="h-14 bg-[#0a0f1b] border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 select-none">
      {/* Zone 1: Mobile menu toggle + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 truncate">
          <span className="text-slate-500 font-mono text-[11px]">SENTINEL</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200 font-medium truncate">{getBreadcrumb()}</span>
        </div>
      </div>

      {/* Zone 2: Real-time Telemetry Indicators */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-mono text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800/80 text-[11px]">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className="tabular-nums">{timeStr}</span>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800/80 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400">Rules Active</span>
          <span className="font-mono text-slate-200 font-semibold">3/3</span>
        </div>
      </div>

      {/* Zone 3: Notification Bell & User Avatar Pill */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          to="/alerts"
          className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
          title={`${openAlertsCount} active security alerts`}
        >
          <Bell className="w-4 h-4" />
          {openAlertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0a0f1b]" />
          )}
        </Link>

        <div className="h-4 w-px bg-slate-800" />

        <Link
          to="/profile"
          className="flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-mono text-xs font-semibold flex items-center justify-center shadow-xs">
            {user.avatarInitials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium text-slate-200 leading-none">{user.fullName}</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-none">{user.role}</p>
          </div>
        </Link>
      </div>
    </header>
  );
};
