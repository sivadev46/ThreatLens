import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  LayoutDashboard,
  FileText,
  AlertTriangle,
  Sliders,
  Ban,
  BarChart3,
  History,
  Settings,
  RotateCcw,
  FolderArchive,
} from 'lucide-react';
import { securityService } from '../../services/securityService';
import { useToast } from '../common/NotificationToast';

interface SidebarProps {
  onMobileClose?: () => void;
  openAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ onMobileClose, openAlertsCount }) => {
  const { showToast } = useToast();

  const handleResetData = () => {
    securityService.resetToFactoryMockData();
    showToast({
      type: 'info',
      title: 'Sample Data Reset',
      message: 'Restored baseline security events, alerts, and detection rules.',
    });
  };

  const navItems = [
    { to: '/', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/logs', label: 'Logs', icon: <FileText className="w-4 h-4" /> },
    { to: '/files', label: 'File Manager', icon: <FolderArchive className="w-4 h-4" /> },
    {
      to: '/alerts',
      label: 'Alerts',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: openAlertsCount > 0 ? openAlertsCount : undefined,
    },
    { to: '/rules', label: 'Detection Rules', icon: <Sliders className="w-4 h-4" /> },
    { to: '/blocklist', label: 'IP Blocklist', icon: <Ban className="w-4 h-4" /> },
    { to: '/reports', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { to: '/audit', label: 'Audit Trail', icon: <History className="w-4 h-4" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-60 h-full dark:bg-[#0a0f1b] bg-white border-r dark:border-slate-800/80 border-slate-200/90 flex flex-col shrink-0 select-none transition-colors duration-150">
      {/* Brand Zone */}
      <div className="h-14 px-5 border-b dark:border-slate-800/80 border-slate-200/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/25 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="leading-none">
            <div className="text-xs font-bold tracking-wider dark:text-slate-100 text-slate-900 uppercase">
              SENTINEL SOC
            </div>
            <div className="text-[10px] dark:text-slate-400 text-slate-500 font-mono mt-0.5">
              Intrusion Detection
            </div>
          </div>
        </div>
      </div>

      {/* Simplified Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold dark:text-slate-500 text-slate-400 uppercase tracking-wider">
          Platform
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onMobileClose}
            end={item.to === '/'}
            className={({ isActive }) =>
              `relative flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors duration-150 ${
                isActive
                  ? 'dark:bg-sky-500/10 bg-sky-50 dark:text-sky-400 text-sky-700 dark:border-sky-500/20 border-sky-200 border shadow-xs'
                  : 'dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-slate-800/40 hover:bg-slate-100'
              }`
            }
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </div>
            {item.badge !== undefined && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-sm dark:bg-rose-500/15 bg-rose-100 dark:text-rose-400 text-rose-700 dark:border-rose-500/25 border-rose-200 border">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Status & Reset Control */}
      <div className="p-3 border-t dark:border-slate-800/80 border-slate-200/90 dark:bg-[#080d17] bg-slate-50/50">
        <div className="px-3 py-2 rounded-lg dark:bg-slate-900/60 bg-white border dark:border-slate-800/80 border-slate-200 mb-2 flex items-center justify-between text-xs">
          <span className="dark:text-slate-400 text-slate-500 text-[11px]">System Status</span>
          <span className="font-mono text-emerald-500 text-[10px] flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Operational
          </span>
        </div>

        <button
          onClick={handleResetData}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900 dark:bg-slate-800/40 bg-white dark:hover:bg-slate-800/80 hover:bg-slate-100 border dark:border-slate-800 border-slate-200 rounded-lg transition-colors cursor-pointer"
          title="Restore baseline sample logs, alerts and rules"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sample Data</span>
        </button>
      </div>
    </aside>
  );
};
