import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  UserX,
  Ban,
  Activity,
  ArrowRight,
  ExternalLink,
  Play,
  Square,
  Eye,
  Info,
  CheckCircle2,
  Server,
  Database,
  Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { securityService } from '../services/securityService';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Dialog } from '../components/common/Dialog';
import { useToast } from '../components/common/NotificationToast';
import { useTheme } from '../context/ThemeContext';
import { Alert, DashboardSummary, LogEntry, DetectionRule } from '../types/security';

export const DashboardPage: React.FC = () => {
  const { showToast } = useToast();
  const { theme } = useTheme();

  const [summary, setSummary] = useState<DashboardSummary>(securityService.getDashboardSummary());
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<DetectionRule[]>(securityService.getRules());

  // Interactive Filter
  const [timeWindow, setTimeWindow] = useState<'15m' | '1h' | '6h' | '24h'>('1h');

  // Live Stream Simulation State
  const [isSimulatingLive, setIsSimulatingLive] = useState(false);
  const liveIntervalRef = useRef<any>(null);

  // Modals for KPI card deep-dives
  const [showFailedLoginsModal, setShowFailedLoginsModal] = useState(false);
  const [failedLoginsList, setFailedLoginsList] = useState<
    Array<{ sourceIp: string; usernames: string[]; count: number; lastSeen: string; isBlocked: boolean }>
  >([]);

  const [showBlocklistHitsModal, setShowBlocklistHitsModal] = useState(false);
  const [blocklistHitsList, setBlocklistHitsList] = useState<LogEntry[]>([]);

  // Quick Alert Inspection Modal from Dashboard
  const [inspectAlert, setInspectAlert] = useState<Alert | null>(null);

  const refreshData = () => {
    setSummary(securityService.getDashboardSummary());
    setRecentAlerts(securityService.getAlerts().slice(0, 5));
    setRules(securityService.getRules());
    setFailedLoginsList(securityService.getFailedLoginsSummary());
    setBlocklistHitsList(securityService.getBlocklistHits());
  };

  useEffect(() => {
    refreshData();
    return securityService.subscribe(refreshData);
  }, []);

  // Handle Live Feed Simulation
  useEffect(() => {
    if (isSimulatingLive) {
      liveIntervalRef.current = setInterval(() => {
        const entry = securityService.generateSimulatedLiveEvent();
        if (entry.eventType === 'LOGIN_FAILED') {
          showToast({
            type: 'warning',
            title: 'Live Stream Ingestion',
            message: `${entry.sourceIp} authentication failure for "${entry.username}"`,
          });
        }
      }, 3500);
    } else {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    }

    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    };
  }, [isSimulatingLive, showToast]);

  const toggleLiveSimulation = () => {
    const nextState = !isSimulatingLive;
    setIsSimulatingLive(nextState);
    showToast({
      type: nextState ? 'info' : ('secondary' as any),
      title: nextState ? 'Live Stream Active' : 'Live Stream Paused',
      message: nextState
        ? 'Periodic log stream ingestion active.'
        : 'Stream simulation suspended.',
    });
  };

  const handleQuickBlockIp = (ip: string, username: string) => {
    const res = securityService.addBlocklistEntry(ip, `Excessive failed logins targeting user ${username}`);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'IP Quarantined',
        message: `${ip} added to threat blocklist.`,
      });
      setFailedLoginsList(securityService.getFailedLoginsSummary());
    } else {
      showToast({
        type: 'error',
        title: 'Blocklist Error',
        message: res.error || 'Failed to add IP.',
      });
    }
  };

  // Dynamic trend data calculated from actual stored event timestamps
  const eventsTrendData = securityService.getEventsTimeSeries();

  // Dynamic severity breakdown from actual alerts
  const allAlerts = securityService.getAlerts();
  const severityData = [
    { name: 'Critical', count: allAlerts.filter((a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length, color: '#f43f5e' },
    { name: 'High', count: allAlerts.filter((a) => a.severity === 'HIGH' && a.status !== 'RESOLVED').length, color: '#f59e0b' },
    { name: 'Medium', count: allAlerts.filter((a) => a.severity === 'MEDIUM' && a.status !== 'RESOLVED').length, color: '#eab308' },
    { name: 'Low', count: allAlerts.filter((a) => a.severity === 'LOW' && a.status !== 'RESOLVED').length, color: '#0284c7' },
  ];

  const totalThreatAlerts = summary.criticalAlerts + summary.highAlerts;
  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#1e293b' : '#e2e8f0';
  const textStroke = isDark ? '#64748b' : '#94a3b8';
  const tooltipBg = isDark ? '#0c121e' : '#ffffff';
  const tooltipBorder = isDark ? '#1e293b' : '#e2e8f0';
  const tooltipColor = isDark ? '#f8fafc' : '#0f172a';

  return (
    <div className="space-y-6">
      {/* Top Header: Overview title & Stream actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b dark:border-slate-800/80 border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight dark:text-white text-slate-900">
            Overview
          </h1>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">
            Real-time security telemetry and rule correlation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isSimulatingLive ? 'danger' : 'outline'}
            icon={isSimulatingLive ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            onClick={toggleLiveSimulation}
          >
            {isSimulatingLive ? 'Pause Stream' : 'Live Stream'}
          </Button>

          <Link to="/logs">
            <Button size="sm" variant="secondary" icon={<Activity className="w-3.5 h-3.5" />}>
              Logs
            </Button>
          </Link>

          <Link to="/alerts">
            <Button size="sm" variant="primary" icon={<ShieldAlert className="w-3.5 h-3.5" />}>
              Alerts ({summary.openAlertsCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Compact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Events */}
        <Link
          to="/logs"
          className="p-4 rounded-xl border dark:border-slate-800/80 border-slate-200 dark:bg-[#0c121e] bg-white hover:dark:border-slate-700 hover:border-slate-300 transition-all shadow-xs block group"
        >
          <div className="flex items-center justify-between text-xs dark:text-slate-400 text-slate-500 mb-2">
            <span className="font-medium">Total Events</span>
            <Activity className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold font-mono tabular-nums dark:text-white text-slate-900 tracking-tight">
            {summary.totalLogsAnalyzed}
          </div>
          <div className="text-[11px] dark:text-slate-400 text-slate-500 mt-2 flex items-center justify-between">
            <span className="text-emerald-500 font-mono text-[10px] font-medium">Parsed 100%</span>
            <span className="text-sky-500 group-hover:translate-x-0.5 transition-transform text-[11px] font-medium">
              View &rarr;
            </span>
          </div>
        </Link>

        {/* KPI 2: Active Alerts */}
        <Link
          to="/alerts"
          className="p-4 rounded-xl border dark:border-rose-900/40 border-rose-200 dark:bg-[#0c121e] bg-white hover:dark:border-rose-700/60 hover:border-rose-300 transition-all shadow-xs block group"
        >
          <div className="flex items-center justify-between text-xs dark:text-slate-400 text-slate-500 mb-2">
            <span className="font-medium">Active Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold font-mono tabular-nums text-rose-500 tracking-tight">
            {totalThreatAlerts}
          </div>
          <div className="text-[11px] dark:text-slate-400 text-slate-500 mt-2 flex items-center justify-between">
            <span>{summary.openAlertsCount} open</span>
            <span className="text-rose-500 group-hover:translate-x-0.5 transition-transform text-[11px] font-medium">
              Triage &rarr;
            </span>
          </div>
        </Link>

        {/* KPI 3: Failed Logins */}
        <div
          onClick={() => {
            setFailedLoginsList(securityService.getFailedLoginsSummary());
            setShowFailedLoginsModal(true);
          }}
          className="p-4 rounded-xl border dark:border-amber-900/40 border-amber-200 dark:bg-[#0c121e] bg-white hover:dark:border-amber-700/60 hover:border-amber-300 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs dark:text-slate-400 text-slate-500 mb-2">
            <span className="font-medium">Failed Logins</span>
            <UserX className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold font-mono tabular-nums text-amber-500 tracking-tight">
            {summary.failedLoginAttempts}
          </div>
          <div className="text-[11px] dark:text-slate-400 text-slate-500 mt-2 flex items-center justify-between">
            <span>Threshold: 5</span>
            <span className="text-amber-500 group-hover:translate-x-0.5 transition-transform text-[11px] font-medium">
              Inspect &rarr;
            </span>
          </div>
        </div>

        {/* KPI 4: Blocklisted IP Hits */}
        <div
          onClick={() => {
            setBlocklistHitsList(securityService.getBlocklistHits());
            setShowBlocklistHitsModal(true);
          }}
          className="p-4 rounded-xl border dark:border-slate-800/80 border-slate-200 dark:bg-[#0c121e] bg-white hover:dark:border-slate-700 hover:border-slate-300 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs dark:text-slate-400 text-slate-500 mb-2">
            <span className="font-medium">Blocklisted IP Hits</span>
            <Ban className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold font-mono tabular-nums dark:text-white text-slate-900 tracking-tight">
            {summary.blocklistedIpHits}
          </div>
          <div className="text-[11px] dark:text-slate-400 text-slate-500 mt-2 flex items-center justify-between">
            <span>{summary.activeBlocklistCount} IPs blocked</span>
            <span className="text-sky-500 group-hover:translate-x-0.5 transition-transform text-[11px] font-medium">
              List &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Row 1: Security Activity Chart & Alert Severity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prominent Security Activity Chart (2 Cols) */}
        <div className="lg:col-span-2">
          <Card
            title="Security Activity"
            subtitle="Ingestion rate and failed authentication events"
            action={
              <div className="flex items-center gap-1 dark:bg-[#090e18] bg-slate-100 border dark:border-slate-800 border-slate-200 rounded-lg p-0.5 text-xs">
                {(['15m', '1h', '6h', '24h'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setTimeWindow(w)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      timeWindow === w
                        ? 'bg-sky-600 text-white font-semibold'
                        : 'dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            }
          >
            <div className="h-60 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={eventsTrendData}>
                  <defs>
                    <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="failedColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke={gridStroke} opacity={0.6} />
                  <XAxis dataKey="time" stroke={textStroke} tick={{ fontSize: 11 }} />
                  <YAxis stroke={textStroke} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: tooltipColor,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Events"
                    stroke="#0284c7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#totalColor)"
                  />
                  <Area
                    type="monotone"
                    dataKey="failedLogins"
                    name="Failed Logins"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#failedColor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between pt-3 mt-1 border-t dark:border-slate-800/80 border-slate-100 text-xs dark:text-slate-400 text-slate-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>Total Events</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Failed Logins</span>
                </div>
              </div>
              {isSimulatingLive && (
                <div className="flex items-center gap-1.5 font-mono text-emerald-500 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Stream Active</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Compact Alert Severity Chart (1 Col) */}
        <div>
          <Card
            title="Alert Severity"
            subtitle="Distribution by priority level"
            action={
              <Link to="/alerts" className="text-xs text-sky-500 hover:text-sky-600 font-medium">
                View All
              </Link>
            }
          >
            <div className="h-60 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} layout="vertical">
                  <CartesianGrid strokeDasharray="2 2" stroke={gridStroke} opacity={0.6} horizontal={false} />
                  <XAxis type="number" stroke={textStroke} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" stroke={textStroke} tick={{ fontSize: 11 }} width={55} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: tooltipColor,
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1 pt-3 border-t dark:border-slate-800/80 border-slate-100 text-xs">
              <div className="dark:text-slate-400 text-slate-500">
                Open: <span className="dark:text-slate-200 text-slate-800 font-mono font-semibold">{summary.openAlertsCount}</span>
              </div>
              <div className="dark:text-slate-400 text-slate-500">
                Investigating: <span className="text-amber-500 font-mono font-semibold">{summary.investigatingAlertsCount}</span>
              </div>
              <div className="dark:text-slate-400 text-slate-500">
                Resolved: <span className="text-emerald-500 font-mono font-semibold">{summary.resolvedAlertsCount}</span>
              </div>
              <div className="dark:text-slate-400 text-slate-500">
                Rules: <span className="text-sky-500 font-mono font-semibold">{summary.activeRulesCount}/3</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Row 2: Recent Alerts Table & System Status Indicator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts Table (2 Cols) */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Alerts"
            subtitle="Heuristic detections requiring triage"
            action={
              <Link to="/alerts">
                <Button size="sm" variant="ghost" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Queue
                </Button>
              </Link>
            }
            noPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="dark:bg-[#090e18] bg-slate-50 dark:text-slate-400 text-slate-500 font-mono uppercase tracking-wider text-[10px] border-b dark:border-slate-800/80 border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Severity</th>
                    <th className="py-2.5 px-4 font-medium">Detection Rule</th>
                    <th className="py-2.5 px-4 font-medium">Source IP</th>
                    <th className="py-2.5 px-4 font-medium">Time</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                  {recentAlerts.map((alert) => (
                    <tr key={alert.id} className="dark:hover:bg-slate-800/30 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4">
                        <Badge label={alert.severity} variant="severity" severity={alert.severity} size="sm" />
                      </td>
                      <td className="py-2.5 px-4 font-medium dark:text-slate-200 text-slate-800">
                        <div className="truncate max-w-[200px]" title={alert.ruleName}>
                          {alert.ruleName}
                        </div>
                        <span className="text-[10px] font-mono dark:text-slate-500 text-slate-400">{alert.id}</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono dark:text-slate-300 text-slate-700">
                        {alert.sourceIp}
                      </td>
                      <td className="py-2.5 px-4 font-mono dark:text-slate-400 text-slate-500 tabular-nums">
                        {alert.timestamp.substring(11, 19)}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge label={alert.status} variant="status" status={alert.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => setInspectAlert(alert)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Concise System Status Indicator (1 Col) */}
        <div>
          <Card
            title="System Status"
            subtitle="Platform diagnostics & engine health"
            action={
              <Link to="/settings">
                <Button size="sm" variant="ghost" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Settings
                </Button>
              </Link>
            }
          >
            <div className="space-y-3 text-xs">
              {/* Overall Health Score */}
              <div className="p-3 rounded-lg dark:bg-slate-900/60 bg-slate-50 border dark:border-slate-800 border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] dark:text-slate-400 text-slate-500">Security Posture</span>
                  <p className="text-base font-bold font-mono text-emerald-500 mt-0.5">98% Secure</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              {/* Status checklist */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs py-1 border-b dark:border-slate-800/60 border-slate-100">
                  <span className="dark:text-slate-400 text-slate-500 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-500" />
                    Detection Engine
                  </span>
                  <span className="font-mono text-emerald-500 font-medium text-[11px]">3 Rules Active</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b dark:border-slate-800/60 border-slate-100">
                  <span className="dark:text-slate-400 text-slate-500 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-sky-500" />
                    REST API Adapter
                  </span>
                  <span className="font-mono dark:text-slate-300 text-slate-700 text-[11px]">Port 8080</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b dark:border-slate-800/60 border-slate-100">
                  <span className="dark:text-slate-400 text-slate-500 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-sky-500" />
                    MySQL Schema
                  </span>
                  <span className="font-mono text-emerald-500 font-medium text-[11px]">9 Tables Ready</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="dark:text-slate-400 text-slate-500 flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 text-sky-500" />
                    Firewall Blocklist
                  </span>
                  <span className="font-mono text-sky-500 font-medium text-[11px]">
                    {summary.activeBlocklistCount} Active
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal 1: Failed Logins Drill-down */}
      <Dialog
        isOpen={showFailedLoginsModal}
        onClose={() => setShowFailedLoginsModal(false)}
        title="Failed Logins"
        description="Grouped by origin IP address."
        maxWidth="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setShowFailedLoginsModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 dark:bg-amber-950/20 bg-amber-50 border dark:border-amber-900/40 border-amber-200 rounded-lg text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              Brute-Force rule triggers when an IP exceeds 5 failed logins within 60s.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="dark:bg-[#090e18] bg-slate-50 dark:text-slate-400 text-slate-500 font-mono uppercase text-[10px] border-b dark:border-slate-800 border-slate-200">
                <tr>
                  <th className="py-2 px-3">Source IP</th>
                  <th className="py-2 px-3">Attempts</th>
                  <th className="py-2 px-3">Target Accounts</th>
                  <th className="py-2 px-3">Last Seen</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
                {failedLoginsList.map((item) => (
                  <tr key={item.sourceIp} className="dark:hover:bg-slate-800/30 hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-500">{item.sourceIp}</td>
                    <td className="py-2.5 px-3 font-mono dark:text-slate-200 text-slate-800 tabular-nums">
                      {item.count}
                    </td>
                    <td className="py-2.5 px-3 dark:text-slate-300 text-slate-700">
                      {item.usernames.map((u) => (
                        <span
                          key={u}
                          className="inline-block dark:bg-slate-800/80 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono mr-1"
                        >
                          {u}
                        </span>
                      ))}
                    </td>
                    <td className="py-2.5 px-3 font-mono dark:text-slate-400 text-slate-500 tabular-nums">
                      {item.lastSeen}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {item.isBlocked ? (
                        <span className="text-[10px] font-mono text-rose-500 font-semibold">BLOCKED</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<Ban className="w-3 h-3" />}
                          onClick={() => handleQuickBlockIp(item.sourceIp, item.usernames[0] || 'unknown')}
                        >
                          Block IP
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Dialog>

      {/* Modal 2: Blocklist Inbound Hits Drill-down */}
      <Dialog
        isOpen={showBlocklistHitsModal}
        onClose={() => setShowBlocklistHitsModal(false)}
        title="Blocklist Inbound Hits"
        description="All server log events matching active threat IP records."
        maxWidth="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setShowBlocklistHitsModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          {blocklistHitsList.length === 0 ? (
            <p className="p-6 text-center dark:text-slate-400 text-slate-500 italic">
              No blocklisted IP events detected in current log buffer.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="dark:bg-[#090e18] bg-slate-50 dark:text-slate-400 text-slate-500 font-mono uppercase text-[10px] border-b dark:border-slate-800 border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Blocked IP</th>
                    <th className="py-2 px-3">User</th>
                    <th className="py-2 px-3">Event Type</th>
                    <th className="py-2 px-3">Endpoint</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
                  {blocklistHitsList.map((log) => (
                    <tr key={log.id} className="dark:hover:bg-slate-800/30 hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono dark:text-slate-400 text-slate-500 tabular-nums">
                        {log.timestamp}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-500">{log.sourceIp}</td>
                      <td className="py-2.5 px-3 dark:text-slate-300 text-slate-700">{log.username}</td>
                      <td className="py-2.5 px-3">
                        <Badge label={log.eventType} variant="event" size="sm" />
                      </td>
                      <td className="py-2.5 px-3 font-mono dark:text-slate-400 text-slate-500">{log.endpoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Dialog>

      {/* Modal 3: Quick Alert Inspection */}
      <Dialog
        isOpen={!!inspectAlert}
        onClose={() => setInspectAlert(null)}
        title={`Alert: ${inspectAlert?.id}`}
        description={inspectAlert?.ruleName}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Link to="/alerts">
              <Button size="sm" variant="primary" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                Open Triage
              </Button>
            </Link>
            <Button size="sm" variant="secondary" onClick={() => setInspectAlert(null)}>
              Close
            </Button>
          </div>
        }
      >
        {inspectAlert && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 dark:bg-slate-900/60 bg-slate-50 rounded-lg border dark:border-slate-800/80 border-slate-200">
              <div>
                <span className="dark:text-slate-400 text-slate-500 font-mono text-[10px]">Severity</span>
                <div className="mt-1">
                  <Badge label={inspectAlert.severity} variant="severity" severity={inspectAlert.severity} size="sm" />
                </div>
              </div>
              <div>
                <span className="dark:text-slate-400 text-slate-500 font-mono text-[10px]">Status</span>
                <div className="mt-1">
                  <Badge label={inspectAlert.status} variant="status" status={inspectAlert.status} size="sm" />
                </div>
              </div>
              <div>
                <span className="dark:text-slate-400 text-slate-500 font-mono text-[10px]">Source IP</span>
                <p className="font-mono text-sky-500 font-semibold mt-0.5">{inspectAlert.sourceIp}</p>
              </div>
              <div>
                <span className="dark:text-slate-400 text-slate-500 font-mono text-[10px]">Occurrences</span>
                <p className="font-mono dark:text-slate-200 text-slate-800 font-semibold mt-0.5">
                  {inspectAlert.eventCount} events
                </p>
              </div>
            </div>

            <div className="p-3 dark:bg-slate-900/40 bg-slate-50 rounded-lg border dark:border-slate-800/80 border-slate-200">
              <span className="dark:text-slate-400 text-slate-500 font-semibold block mb-1">Incident Summary</span>
              <p className="dark:text-slate-200 text-slate-800 leading-relaxed">{inspectAlert.summary}</p>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
