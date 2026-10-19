import React from 'react';
import { AlertSeverity, AlertStatus } from '../../types/security';

interface BadgeProps {
  label: string;
  variant?: 'severity' | 'status' | 'event' | 'default';
  severity?: AlertSeverity;
  status?: AlertStatus;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  severity,
  status,
  size = 'sm',
}) => {
  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  if (variant === 'severity' || severity) {
    const sev = severity || (label as AlertSeverity);
    let colorCls = 'dark:bg-slate-800/60 bg-slate-100 dark:text-slate-300 text-slate-700 dark:border-slate-700/60 border-slate-200';
    let dotCls = 'bg-slate-400';

    if (sev === 'CRITICAL') {
      colorCls = 'dark:bg-rose-500/10 bg-rose-50 dark:text-rose-400 text-rose-700 dark:border-rose-500/25 border-rose-200';
      dotCls = 'bg-rose-500';
    } else if (sev === 'HIGH') {
      colorCls = 'dark:bg-amber-500/10 bg-amber-50 dark:text-amber-400 text-amber-700 dark:border-amber-500/25 border-amber-200';
      dotCls = 'bg-amber-500';
    } else if (sev === 'MEDIUM') {
      colorCls = 'dark:bg-yellow-500/10 bg-yellow-50 dark:text-yellow-400 text-yellow-700 dark:border-yellow-500/25 border-yellow-200';
      dotCls = 'bg-yellow-500';
    } else if (sev === 'LOW') {
      colorCls = 'dark:bg-sky-500/10 bg-sky-50 dark:text-sky-400 text-sky-700 dark:border-sky-500/25 border-sky-200';
      dotCls = 'bg-sky-500';
    } else if (sev === 'INFO') {
      colorCls = 'dark:bg-slate-800/60 bg-slate-100 dark:text-slate-300 text-slate-700 dark:border-slate-700/60 border-slate-200';
      dotCls = 'bg-slate-400';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${colorCls} ${sizeCls} whitespace-nowrap`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotCls} shrink-0`} aria-hidden="true" />
        <span className="font-mono uppercase tracking-wider text-[10px] font-semibold">{sev}</span>
      </span>
    );
  }

  if (variant === 'status' || status) {
    const st = status || (label as AlertStatus);
    let colorCls = 'dark:bg-slate-800/50 bg-slate-100 dark:text-slate-300 text-slate-700 dark:border-slate-700/50 border-slate-200';
    let dotCls = 'bg-slate-400';

    if (st === 'OPEN') {
      colorCls = 'dark:bg-rose-500/10 bg-rose-50 dark:text-rose-400 text-rose-700 dark:border-rose-500/20 border-rose-200';
      dotCls = 'bg-rose-500';
    } else if (st === 'INVESTIGATING') {
      colorCls = 'dark:bg-amber-500/10 bg-amber-50 dark:text-amber-400 text-amber-700 dark:border-amber-500/20 border-amber-200';
      dotCls = 'bg-amber-500';
    } else if (st === 'RESOLVED') {
      colorCls = 'dark:bg-emerald-500/10 bg-emerald-50 dark:text-emerald-400 text-emerald-700 dark:border-emerald-500/20 border-emerald-200';
      dotCls = 'bg-emerald-500';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${colorCls} ${sizeCls} whitespace-nowrap`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotCls} shrink-0`} aria-hidden="true" />
        <span className="font-mono uppercase tracking-wider text-[10px] font-semibold">{st}</span>
      </span>
    );
  }

  if (variant === 'event') {
    let colorCls = 'dark:bg-slate-800/50 bg-slate-100 dark:text-slate-300 text-slate-700 dark:border-slate-700/50 border-slate-200';
    if (label === 'LOGIN_FAILED') {
      colorCls = 'dark:bg-rose-500/10 bg-rose-50 dark:text-rose-400 text-rose-700 dark:border-rose-500/20 border-rose-200';
    } else if (label === 'LOGIN_SUCCESS') {
      colorCls = 'dark:bg-emerald-500/10 bg-emerald-50 dark:text-emerald-400 text-emerald-700 dark:border-emerald-500/20 border-emerald-200';
    } else if (label === 'HTTP_REQUEST') {
      colorCls = 'dark:bg-sky-500/10 bg-sky-50 dark:text-sky-400 text-sky-700 dark:border-sky-500/20 border-sky-200';
    } else if (label === 'LOGOUT') {
      colorCls = 'dark:bg-slate-800/50 bg-slate-100 dark:text-slate-400 text-slate-600 dark:border-slate-700/50 border-slate-200';
    }

    return (
      <span className={`inline-flex items-center font-mono font-medium rounded-md border ${colorCls} ${sizeCls} whitespace-nowrap text-[10px]`}>
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-md border dark:border-slate-800 border-slate-200 dark:bg-slate-900/60 bg-slate-100 dark:text-slate-300 text-slate-700 ${sizeCls} whitespace-nowrap`}>
      {label}
    </span>
  );
};
