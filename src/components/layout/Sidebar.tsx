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
  User,
  RotateCcw,
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
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/logs', label: 'Log Explorer', icon: <FileText className="w-4 h-4" /> },
    {
      to: '/alerts',
      label: 'Security Alerts',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: openAlertsCount > 0 ? openAlertsCount : undefined,
    },
    { to: '/rules', label: 'Detection Rules', icon: <Sliders className="w-4 h-4" /> },
    { to: '/blocklist', label: 'IP Blocklist', icon: <Ban className="w-4 h-4" /> },
    { to: '/reports', label: 'Reports & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { to: '/audit', label: 'Audit Log', icon: <History className="w-4 h-4" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { to: '/profile', label: 'User Profile', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-60 h-full bg-[#0a0f1b] border-r border-slate-800/80 flex flex-col shrink-0 select-none">
      {/* Brand Zone */}
      <div className="h-14 px-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600/15 text-blue-400 border border-blue-500/25 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="leading-none">
            <div className="text-xs font-bold tracking-wider text-slate-100 uppercase">SENTINEL SOC</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Intrusion Detection</div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Navigation
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
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`
            }
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </div>
            {item.badge !== undefined && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-sm bg-rose-500/15 text-rose-400 border border-rose-500/25">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Status & Reset Control */}
      <div className="p-3 border-t border-slate-800/80 bg-[#080d17]">
        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800/80 mb-2 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">System Status</span>
          <span className="font-mono text-emerald-400 text-[10px] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Operational
          </span>
        </div>

        <button
          onClick={handleResetData}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Restore baseline sample logs, alerts and rules"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sample Data</span>
        </button>
      </div>
    </aside>
  );
};
