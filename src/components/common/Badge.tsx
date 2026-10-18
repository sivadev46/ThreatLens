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
    let colorCls = 'bg-slate-800/60 text-slate-300 border-slate-700/60';
    let dotCls = 'bg-slate-400';

    if (sev === 'CRITICAL') {
      colorCls = 'bg-rose-500/10 text-rose-400 border-rose-500/25';
      dotCls = 'bg-rose-500';
    } else if (sev === 'HIGH') {
      colorCls = 'bg-amber-500/10 text-amber-400 border-amber-500/25';
      dotCls = 'bg-amber-400';
    } else if (sev === 'MEDIUM') {
      colorCls = 'bg-yellow-500/10 text-yellow-300 border-yellow-500/25';
      dotCls = 'bg-yellow-400';
    } else if (sev === 'LOW') {
      colorCls = 'bg-blue-500/10 text-blue-400 border-blue-500/25';
      dotCls = 'bg-blue-400';
    } else if (sev === 'INFO') {
      colorCls = 'bg-slate-800/60 text-slate-300 border-slate-700/60';
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
    let colorCls = 'bg-slate-800/50 text-slate-300 border-slate-700/50';
    let dotCls = 'bg-slate-400';

    if (st === 'OPEN') {
      colorCls = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
      dotCls = 'bg-rose-400';
    } else if (st === 'INVESTIGATING') {
      colorCls = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      dotCls = 'bg-amber-400';
    } else if (st === 'RESOLVED') {
      colorCls = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      dotCls = 'bg-emerald-400';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${colorCls} ${sizeCls} whitespace-nowrap`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotCls} shrink-0`} aria-hidden="true" />
        <span className="font-mono uppercase tracking-wider text-[10px] font-semibold">{st}</span>
      </span>
    );
  }

  if (variant === 'event') {
    let colorCls = 'bg-slate-800/50 text-slate-300 border-slate-700/50';
    if (label === 'LOGIN_FAILED') {
      colorCls = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    } else if (label === 'LOGIN_SUCCESS') {
      colorCls = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    } else if (label === 'HTTP_REQUEST') {
      colorCls = 'bg-blue-500/10 text-blue-300 border-blue-500/20';
    } else if (label === 'LOGOUT') {
      colorCls = 'bg-slate-800/50 text-slate-400 border-slate-700/50';
    }

    return (
      <span className={`inline-flex items-center font-mono font-medium rounded-md border ${colorCls} ${sizeCls} whitespace-nowrap text-[10px]`}>
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-md border border-slate-800 bg-slate-900/60 text-slate-300 ${sizeCls} whitespace-nowrap`}>
      {label}
    </span>
  );
};
