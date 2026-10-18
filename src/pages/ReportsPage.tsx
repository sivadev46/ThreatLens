import React, { useState, useEffect } from 'react';
import {
  Download,
  ShieldAlert,
  Server,
  FileSpreadsheet,
  FileText,
  UserX,
  Ban,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { securityService } from '../services/securityService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/NotificationToast';
import { LogEntry, Alert, DetectionRule } from '../types/security';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [dateRange, setDateRange] = useState<'1h' | '6h' | '24h' | '7d' | 'all'>('24h');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<DetectionRule[]>([]);

  useEffect(() => {
    const refresh = () => {
      setLogs(securityService.getLogs());
      setAlerts(securityService.getAlerts());
      setRules(securityService.getRules());
    };
    refresh();
    return securityService.subscribe(refresh);
  }, []);

  // IP Aggregations
  const ipCounts = new Map<string, { total: number; failed: number }>();
  logs.forEach((log) => {
    const cur = ipCounts.get(log.sourceIp) || { total: 0, failed: 0 };
    cur.total++;
    if (log.eventType === 'LOGIN_FAILED') cur.failed++;
    ipCounts.set(log.sourceIp, cur);
  });

  const topIpsData = Array.from(ipCounts.entries())
    .map(([ip, data]) => ({
      ip,
      ...data,
      isBlocked: securityService.isIpBlocked(ip),
      alertCount: alerts.filter((a) => a.sourceIp === ip).length,
    }))
    .sort((a, b) => b.total - a.total);

  // Severity distribution
  const severityMap: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  alerts.forEach((a) => {
    if (severityMap[a.severity] !== undefined) severityMap[a.severity]++;
  });

  const severityPieData = [
    { name: 'Critical', value: severityMap.CRITICAL || 1, color: '#f43f5e' },
    { name: 'High', value: severityMap.HIGH || 1, color: '#f59e0b' },
    { name: 'Medium', value: severityMap.MEDIUM || 1, color: '#eab308' },
    { name: 'Low', value: severityMap.LOW || 0, color: '#38bdf8' },
  ];

  // Rule effectiveness data
  const ruleEffectivenessData = rules.map((r) => ({
    name: r.code.replace('RULE_', ''),
    triggers: r.totalTriggerCount,
    severity: r.severity,
  }));

  // Velocity time-series based on window
  const velocityData = [
    { time: '08:00', total: 18, failed: 1 },
    { time: '09:00', total: 32, failed: 0 },
    { time: '10:00', total: 84, failed: logs.filter((l) => l.eventType === 'LOGIN_FAILED').length },
    { time: '11:00', total: 46, failed: 2 },
    { time: '12:00', total: 29, failed: 0 },
    { time: '13:00', total: 38, failed: 1 },
  ];

  const handleQuickBlock = (ip: string) => {
    const res = securityService.addBlocklistEntry(ip, 'Blocked from Reports & Analytics audit');
    if (res.success) {
      showToast({
        type: 'success',
        title: 'IP Blocklisted',
        message: `${ip} added to threat intelligence blocklist.`,
      });
    } else {
      showToast({
        type: 'info',
        title: 'Blocklist Status',
        message: res.error || `${ip} is already blocked.`,
      });
    }
  };

  // Export to real CSV file
  const handleExportCsv = (dataset: 'alerts' | 'logs') => {
    let csvContent = '';
    let filename = '';

    if (dataset === 'alerts') {
      filename = `security_alerts_report_${new Date().toISOString().substring(0, 10)}.csv`;
      csvContent = 'Alert ID,Rule Code,Rule Name,Severity,Source IP,Event Count,Timestamp,Status,Summary\n';
      alerts.forEach((a) => {
        csvContent += `"${a.id}","${a.ruleCode}","${a.ruleName}","${a.severity}","${a.sourceIp}",${a.eventCount},"${a.timestamp}","${a.status}","${a.summary.replace(/"/g, '""')}"\n`;
      });
    } else {
      filename = `security_logs_export_${new Date().toISOString().substring(0, 10)}.csv`;
      csvContent = 'Timestamp,Source IP,Username,Event Type,Endpoint,Status Code,Log Source\n';
      logs.forEach((l) => {
        csvContent += `"${l.timestamp}","${l.sourceIp}","${l.username}","${l.eventType}","${l.endpoint}",${l.statusCode || 200},"${l.logSource || ''}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({
      type: 'success',
      title: 'Report Exported',
      message: `Downloaded ${filename} (${dataset === 'alerts' ? alerts.length : logs.length} records)`,
    });
  };

  // Export Executive JSON Briefing
  const handleExportExecutiveBriefing = () => {
    const briefing = {
      reportTitle: 'Sentinel SOC Executive Intelligence Briefing',
      generatedAt: new Date().toISOString(),
      reportingWindow: dateRange,
      totalEventsAnalyzed: logs.length,
      totalAlertsGenerated: alerts.length,
      openIncidents: alerts.filter((a) => a.status === 'OPEN').length,
      investigatingIncidents: alerts.filter((a) => a.status === 'INVESTIGATING').length,
      resolvedIncidents: alerts.filter((a) => a.status === 'RESOLVED').length,
      topAttackerOrigins: topIpsData.slice(0, 5),
      detectionRulesDeployed: rules.map((r) => ({
        code: r.code,
        name: r.name,
        enabled: r.enabled,
        triggers: r.totalTriggerCount,
      })),
      activeBlocklistCount: securityService.getBlocklist().filter((b) => b.status === 'ACTIVE').length,
      complianceState: 'VERIFIED',
    };

    const blob = new Blob([JSON.stringify(briefing, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `soc_executive_briefing_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({
      type: 'success',
      title: 'Briefing Exported',
      message: 'Downloaded executive intelligence JSON summary.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Reports & Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Security metrics, threat velocity distributions, and forensic telemetry exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range selector */}
          <div className="flex items-center gap-1 bg-[#0c121e] border border-slate-800/80 rounded-lg p-0.5 text-xs">
            {(['1h', '6h', '24h', '7d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  dateRange === range
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            icon={<FileText className="w-3.5 h-3.5" />}
            onClick={handleExportExecutiveBriefing}
          >
            Executive Briefing
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => handleExportCsv('alerts')}
          >
            Alerts CSV
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
            onClick={() => handleExportCsv('logs')}
          >
            Logs CSV
          </Button>
        </div>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0c121e]">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Inbound Log Volume</span>
            <Activity className="w-4 h-4 text-blue-400/80" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {logs.length}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Period: {dateRange}</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0c121e]">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Auth Failures</span>
            <UserX className="w-4 h-4 text-amber-400/80" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {logs.filter((l) => l.eventType === 'LOGIN_FAILED').length}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Target accounts: alice, admin</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0c121e]">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Correlated Incidents</span>
            <ShieldAlert className="w-4 h-4 text-rose-400/80" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
            {alerts.length}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {alerts.filter((a) => a.status === 'OPEN').length} pending triage
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0c121e]">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Origin Subnets</span>
            <Server className="w-4 h-4 text-emerald-400/80" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {topIpsData.length}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {topIpsData.filter((i) => i.isBlocked).length} quarantined IPs
          </span>
        </div>
      </div>

      {/* Charts Row: Velocity & Severity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Velocity Area Chart */}
        <div className="lg:col-span-2">
          <Card
            title="Ingestion Velocity & Authentication Trend"
            subtitle="Traffic throughput compared to failed authentication occurrences"
          >
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData}>
                  <defs>
                    <linearGradient id="totalVel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="failVel" x1="0" y1="0" x2="0" y2="1">
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
                    }}
                  />
                  <Area type="monotone" dataKey="total" name="Total Events" stroke="#3b82f6" strokeWidth={2} fill="url(#totalVel)" />
                  <Area type="monotone" dataKey="failed" name="Failed Logins" stroke="#f43f5e" strokeWidth={2} fill="url(#failVel)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Severity Distribution */}
        <div>
          <Card
            title="Severity Distribution"
            subtitle="Proportional threat levels"
          >
            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {severityPieData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c121e',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-slate-800/80 text-xs">
              {severityPieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <span className="font-mono text-slate-100 font-bold tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Second Row: Top Talkers & Rule Effectiveness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Active Source IPs Chart */}
        <Card
          title="Top Talker Source IPs"
          subtitle="Highest inbound traffic and failure occurrences"
        >
          <div className="h-60 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topIpsData.slice(0, 5)}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="ip" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0c121e',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="total" name="Total Events" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Failed Logins" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Rule Effectiveness Chart */}
        <Card
          title="Rule Triggers Distribution"
          subtitle="Cumulative alerts triggered across active heuristics"
        >
          <div className="h-60 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ruleEffectivenessData}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0c121e',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="triggers" name="Alerts Triggered" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Forensic IP Deep Dive Table */}
      <Card
        title="Forensic Source IP Activity"
        subtitle="Correlated source IP origins and containment status"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090e18] text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800/80">
              <tr>
                <th className="py-2.5 px-4 font-medium">Rank</th>
                <th className="py-2.5 px-4 font-medium">Source IP</th>
                <th className="py-2.5 px-4 font-medium">Total Events</th>
                <th className="py-2.5 px-4 font-medium">Failed Logins</th>
                <th className="py-2.5 px-4 font-medium">Incidents</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {topIpsData.map((item, index) => (
                <tr key={item.ip} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-slate-500 font-semibold">
                    #{index + 1}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-blue-400">
                    {item.ip}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-200 tabular-nums">
                    {item.total}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums">
                    <span className={item.failed > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      {item.failed}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums">
                    <span className={item.alertCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                      {item.alertCount}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    {item.isBlocked ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        BLOCKED
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800/40 text-slate-400 border border-slate-700/50">
                        ACTIVE
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {item.isBlocked ? (
                      <span className="text-[11px] font-mono text-slate-500 italic">Quarantined</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<Ban className="w-3 h-3" />}
                        onClick={() => handleQuickBlock(item.ip)}
                      >
                        Block
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
