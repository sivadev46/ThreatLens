import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  UserX,
  Ban,
  Activity,
  Sliders,
  ArrowRight,
  ExternalLink,
  Play,
  Square,
  Eye,
  TrendingUp,
  Info,
  Clock,
  Layers,
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
import { Alert, DashboardSummary, AuditLogEntry, LogEntry, DetectionRule } from '../types/security';

export const DashboardPage: React.FC = () => {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<DashboardSummary>(securityService.getDashboardSummary());
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditLogEntry[]>([]);
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
    setRecentAudit(securityService.getAuditLogs().slice(0, 5));
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
      type: nextState ? 'info' : 'secondary' as any,
      title: nextState ? 'Live Ingestion Active' : 'Live Ingestion Paused',
      message: nextState
        ? 'Injecting realistic periodic log events every 3.5s.'
        : 'Stream simulation suspended.',
    });
  };

  const handleQuickBlockIp = (ip: string, username: string) => {
    const res = securityService.addBlocklistEntry(ip, `Excessive failed logins targeting user ${username}`);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'IP Quarantined',
        message: `${ip} added to firewall blocklist.`,
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

  const handleToggleRule = (ruleId: string) => {
    const success = securityService.toggleRule(ruleId);
    if (success) {
      const rule = rules.find((r) => r.id === ruleId);
      showToast({
        type: 'info',
        title: 'Rule Status Changed',
        message: `${rule?.name} is now ${rule?.enabled ? 'disabled' : 'enabled'}.`,
      });
    }
  };

  // Events trend data dynamically styled according to time window
  const eventsTrendData = [
    { time: '10:00', total: 24, failedLogins: 1, requests: 22 },
    { time: '10:05', total: 42, failedLogins: 0, requests: 40 },
    { time: '10:10', total: 68, failedLogins: 2, requests: 62 },
    { time: '10:15', total: 115, failedLogins: summary.failedLoginAttempts, requests: 104 },
    { time: '10:20', total: 54, failedLogins: 1, requests: 51 },
    { time: '10:25', total: 38, failedLogins: 0, requests: 36 },
  ];

  // Severity distribution
  const severityData = [
    { name: 'Critical', count: summary.criticalAlerts, color: '#f43f5e' },
    { name: 'High', count: summary.highAlerts, color: '#f59e0b' },
    { name: 'Medium', count: 1, color: '#eab308' },
    { name: 'Low', count: 0, color: '#38bdf8' },
  ];

  const totalThreatAlerts = summary.criticalAlerts + summary.highAlerts;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Security Operations
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time correlation of log streams against intrusion heuristics.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isSimulatingLive ? 'danger' : 'outline'}
            icon={isSimulatingLive ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            onClick={toggleLiveSimulation}
          >
            {isSimulatingLive ? 'Pause Stream' : 'Simulate Stream'}
          </Button>

          <Link to="/logs">
            <Button size="sm" variant="secondary" icon={<Activity className="w-3.5 h-3.5" />}>
              Ingest Logs
            </Button>
          </Link>

          <Link to="/alerts">
            <Button size="sm" variant="primary" icon={<ShieldAlert className="w-3.5 h-3.5" />}>
              Alert Queue ({summary.openAlertsCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Concise KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ingested Events */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0c121e] hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Log Events Analyzed</span>
            <Activity className="w-4 h-4 text-blue-400/80" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-white tracking-tight">
            {summary.totalLogsAnalyzed}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span className="text-emerald-400 font-mono text-[10px]">100% Parsed</span>
            <Link to="/logs" className="text-slate-400 hover:text-blue-400 transition-colors">
              Explorer &rarr;
            </Link>
          </div>
        </div>

        {/* KPI 2: Critical & High Threats */}
        <Link
          to="/alerts"
          className="p-4 rounded-xl border border-rose-900/30 bg-[#0c121e] hover:border-rose-700/50 transition-all block group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Critical & High Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-400/80" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-rose-400 tracking-tight">
            {totalThreatAlerts}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span className="text-slate-400">{summary.openAlertsCount} pending action</span>
            <span className="text-rose-400/90 font-medium group-hover:translate-x-0.5 transition-transform">
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
          className="p-4 rounded-xl border border-amber-900/30 bg-[#0c121e] hover:border-amber-700/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Failed Logins</span>
            <UserX className="w-4 h-4 text-amber-400/80" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-amber-400 tracking-tight">
            {summary.failedLoginAttempts}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span className="text-slate-400">Threshold: 5 attempts</span>
            <span className="text-amber-400/90 font-medium group-hover:translate-x-0.5 transition-transform">
              Analyze &rarr;
            </span>
          </div>
        </div>

        {/* KPI 4: Blocklist Hits */}
        <div
          onClick={() => {
            setBlocklistHitsList(securityService.getBlocklistHits());
            setShowBlocklistHitsModal(true);
          }}
          className="p-4 rounded-xl border border-slate-800/80 bg-[#0c121e] hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Blocklist Inbound Hits</span>
            <Ban className="w-4 h-4 text-blue-400/80" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-white tracking-tight">
            {summary.blocklistedIpHits}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span className="text-slate-400">{summary.activeBlocklistCount} IPs contained</span>
            <span className="text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform">
              Inspect &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts: Activity Timeline & Threat Severity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Over Time Area Chart (2 Cols) */}
        <div className="lg:col-span-2">
          <Card
            title="Event Velocity & Ingestion"
            subtitle="Traffic throughput and anomaly rates"
            action={
              <div className="flex items-center gap-1 bg-[#090e18] border border-slate-800 rounded-lg p-0.5 text-xs">
                {(['15m', '1h', '6h', '24h'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setTimeWindow(w)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      timeWindow === w
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            }
          >
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={eventsTrendData}>
                  <defs>
                    <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="failedColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" opacity={0.6} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c121e',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Events"
                    stroke="#3b82f6"
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
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                  <span>Total Ingestion</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  <span>Auth Failures</span>
                </div>
              </div>
              {isSimulatingLive && (
                <div className="flex items-center gap-1.5 font-mono text-emerald-400 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Stream Active</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Alert Severity Distribution */}
        <div>
          <Card
            title="Threat Severity"
            subtitle="Active alert distribution"
            action={
              <Link to="/alerts" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                View All
              </Link>
            }
          >
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} layout="vertical">
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" opacity={0.6} horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={55} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c121e',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '12px',
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
            <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-800/80 text-xs">
              <div className="text-slate-400">
                Open: <span className="text-slate-200 font-mono font-semibold tabular-nums">{summary.openAlertsCount}</span>
              </div>
              <div className="text-slate-400">
                Investigating: <span className="text-amber-300 font-mono font-semibold tabular-nums">{summary.investigatingAlertsCount}</span>
              </div>
              <div className="text-slate-400">
                Resolved: <span className="text-emerald-400 font-mono font-semibold tabular-nums">{summary.resolvedAlertsCount}</span>
              </div>
              <div className="text-slate-400">
                Rules: <span className="text-blue-400 font-mono font-semibold tabular-nums">{summary.activeRulesCount}/3</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Tables Row: Recent Alerts & Live Analyst Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts (2 Cols) */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Intrusion Alerts"
            subtitle="Heuristic detections requiring analyst review"
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
                <thead className="bg-[#090e18] text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800/80">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Severity</th>
                    <th className="py-2.5 px-4 font-medium">Detection Rule</th>
                    <th className="py-2.5 px-4 font-medium">Source IP</th>
                    <th className="py-2.5 px-4 font-medium">Time</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentAlerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-4">
                        <Badge label={alert.severity} variant="severity" severity={alert.severity} size="sm" />
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-200">
                        <div className="truncate max-w-[200px]" title={alert.ruleName}>
                          {alert.ruleName}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{alert.id}</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-300">
                        {alert.sourceIp}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-400 tabular-nums">
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

        {/* Recent Audit & System Feed (1 Col) */}
        <div>
          <Card
            title="Activity Stream"
            subtitle="Analyst actions & state changes"
            action={
              <Link to="/audit">
                <Button size="sm" variant="ghost" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Audit Trail
                </Button>
              </Link>
            }
          >
            <div className="space-y-2.5">
              {recentAudit.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/40 text-xs hover:border-slate-700/60 transition-colors"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-mono text-blue-400 text-[10px] font-semibold">{item.action}</span>
                    <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                      {item.timestamp.substring(11, 19)}
                    </span>
                  </div>
                  <p className="text-slate-200 text-xs line-clamp-2 leading-relaxed">{item.details}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/60">
                    <span>{item.actor}</span>
                    <span className="font-mono">{item.ipAddress}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Detection Rules Heuristics */}
      <Card
        title="Active Detection Heuristics"
        subtitle="Rule engine status. Toggle to activate or pause detection."
        action={
          <Link to="/rules">
            <Button size="sm" variant="outline" icon={<Sliders className="w-3.5 h-3.5" />}>
              Configure
            </Button>
          </Link>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="p-4 rounded-xl border border-slate-800/80 bg-[#090e18] flex flex-col justify-between hover:border-slate-700/60 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] text-slate-400 uppercase font-semibold">{rule.code}</span>
                  <Badge label={rule.severity} variant="severity" severity={rule.severity} size="sm" />
                </div>
                <h4 className="text-xs font-semibold text-slate-100 mb-1">{rule.name}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{rule.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="font-mono text-[10px] text-slate-400">
                  <span>Threshold: {rule.thresholdValue}</span>
                  <span className="block text-slate-300">Triggers: {rule.totalTriggerCount}</span>
                </div>
                <Button
                  size="sm"
                  variant={rule.enabled ? 'secondary' : 'primary'}
                  onClick={() => handleToggleRule(rule.id)}
                >
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal 1: Failed Logins Drill-down */}
      <Dialog
        isOpen={showFailedLoginsModal}
        onClose={() => setShowFailedLoginsModal(false)}
        title="Failed Logins Analysis"
        description="Correlated authentication failures grouped by origin IP address."
        maxWidth="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setShowFailedLoginsModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-lg text-amber-300 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              Brute-Force rule triggers when an IP exceeds 5 failed logins within a 60-second sliding window.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090e18] text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Source IP</th>
                  <th className="py-2 px-3">Attempts</th>
                  <th className="py-2 px-3">Target Accounts</th>
                  <th className="py-2 px-3">Last Seen</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {failedLoginsList.map((item) => (
                  <tr key={item.sourceIp} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-300">{item.sourceIp}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-200 tabular-nums">{item.count}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {item.usernames.map((u) => (
                        <span key={u} className="inline-block bg-slate-800/80 px-1.5 py-0.5 rounded text-[11px] font-mono mr-1">
                          {u}
                        </span>
                      ))}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 tabular-nums">{item.lastSeen}</td>
                    <td className="py-2.5 px-3 text-right">
                      {item.isBlocked ? (
                        <span className="text-[10px] font-mono text-rose-400 font-semibold">BLOCKED</span>
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
        description="All server log events matching active IP blocklist records."
        maxWidth="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setShowBlocklistHitsModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          {blocklistHitsList.length === 0 ? (
            <p className="p-6 text-center text-slate-400 italic">No blocklisted IP events detected in current log buffer.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#090e18] text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Blocked IP</th>
                    <th className="py-2 px-3">User</th>
                    <th className="py-2 px-3">Event Type</th>
                    <th className="py-2 px-3">Endpoint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {blocklistHitsList.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono text-slate-400 tabular-nums">{log.timestamp}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-400">{log.sourceIp}</td>
                      <td className="py-2.5 px-3 text-slate-300">{log.username}</td>
                      <td className="py-2.5 px-3">
                        <Badge label={log.eventType} variant="event" size="sm" />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{log.endpoint}</td>
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
        title={`Alert Overview: ${inspectAlert?.id}`}
        description={inspectAlert?.ruleName}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Link to="/alerts">
              <Button size="sm" variant="primary" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                Open Triage View
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
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <div>
                <span className="text-slate-400 font-mono text-[10px]">Severity</span>
                <div className="mt-1">
                  <Badge label={inspectAlert.severity} variant="severity" severity={inspectAlert.severity} size="sm" />
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-mono text-[10px]">Status</span>
                <div className="mt-1">
                  <Badge label={inspectAlert.status} variant="status" status={inspectAlert.status} size="sm" />
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-mono text-[10px]">Source IP</span>
                <p className="font-mono text-blue-400 font-semibold mt-0.5">{inspectAlert.sourceIp}</p>
              </div>
              <div>
                <span className="text-slate-400 font-mono text-[10px]">Occurrences</span>
                <p className="font-mono text-slate-200 font-semibold mt-0.5">{inspectAlert.eventCount} events</p>
              </div>
            </div>

            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 font-semibold block mb-1">Incident Summary</span>
              <p className="text-slate-200 leading-relaxed">{inspectAlert.summary}</p>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
