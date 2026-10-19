import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Send,
  Eye,
  CheckSquare,
  Square,
  Ban,
  Download,
} from 'lucide-react';
import { securityService } from '../services/securityService';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Dialog } from '../components/common/Dialog';
import { EmptyState } from '../components/common/StateViews';
import { useToast } from '../components/common/NotificationToast';
import { Alert, AlertSeverity, AlertStatus, LogEntry } from '../types/security';

export const AlertsPage: React.FC = () => {
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'timestamp' | 'severity' | 'count'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inspection modal
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [modalTab, setModalTab] = useState<'overview' | 'evidence' | 'notes' | 'history'>('overview');
  const [evidenceLogs, setEvidenceLogs] = useState<LogEntry[]>([]);
  const [newNote, setNewNote] = useState('');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [targetStatus, setTargetStatus] = useState<AlertStatus>('OPEN');

  const refreshAlerts = () => {
    const allAlerts = securityService.getAlerts();
    setAlerts(allAlerts);
    if (selectedAlert) {
      const updated = allAlerts.find((a) => a.id === selectedAlert.id);
      if (updated) {
        setSelectedAlert(updated);
        setEvidenceLogs(securityService.getEvidenceLogsForAlert(updated));
      }
    }
  };

  useEffect(() => {
    refreshAlerts();
    return securityService.subscribe(refreshAlerts);
  }, [selectedAlert?.id]);

  const countsBySeverity = {
    ALL: alerts.length,
    CRITICAL: alerts.filter((a) => a.severity === 'CRITICAL').length,
    HIGH: alerts.filter((a) => a.severity === 'HIGH').length,
    MEDIUM: alerts.filter((a) => a.severity === 'MEDIUM').length,
    LOW: alerts.filter((a) => a.severity === 'LOW').length,
  };

  const countsByStatus = {
    ALL: alerts.length,
    OPEN: alerts.filter((a) => a.status === 'OPEN').length,
    INVESTIGATING: alerts.filter((a) => a.status === 'INVESTIGATING').length,
    RESOLVED: alerts.filter((a) => a.status === 'RESOLVED').length,
  };

  // Filter and sort alerts
  const filteredAlerts = alerts
    .filter((alert) => {
      const matchesSearch =
        searchTerm.trim() === '' ||
        alert.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.sourceIp.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (alert.affectedUsername && alert.affectedUsername.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSeverity =
        severityFilter === 'ALL' || alert.severity === severityFilter;

      const matchesStatus =
        statusFilter === 'ALL' || alert.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'timestamp') {
        comparison = a.timestamp.localeCompare(b.timestamp);
      } else if (sortBy === 'count') {
        comparison = a.eventCount - b.eventCount;
      } else if (sortBy === 'severity') {
        const weight: Record<AlertSeverity, number> = {
          CRITICAL: 4,
          HIGH: 3,
          MEDIUM: 2,
          LOW: 1,
          INFO: 0,
        };
        comparison = weight[a.severity] - weight[b.severity];
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAlerts.length && filteredAlerts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAlerts.map((a) => a.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBatchStatus = (status: AlertStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const count = securityService.batchUpdateAlertStatus(
      ids,
      status,
      `Batch analyst triage to ${status}`
    );

    showToast({
      type: 'success',
      title: 'Batch Action Complete',
      message: `Updated ${count} alert(s) to ${status}.`,
    });
    setSelectedIds(new Set());
  };

  const handleBatchBlockIps = () => {
    const ids = Array.from(selectedIds);
    const targetAlerts = alerts.filter((a) => ids.includes(a.id));
    let blockedCount = 0;

    targetAlerts.forEach((a) => {
      const res = securityService.addBlocklistEntry(
        a.sourceIp,
        `Contained from incident ${a.id}`
      );
      if (res.success) blockedCount++;
    });

    showToast({
      type: 'success',
      title: 'Batch Blocklist Action',
      message: `Added ${blockedCount} IP address(es) to firewall blocklist.`,
    });
    setSelectedIds(new Set());
  };

  const handleOpenDetail = (alert: Alert) => {
    setSelectedAlert(alert);
    setTargetStatus(alert.status);
    setStatusChangeReason('');
    setNewNote('');
    setModalTab('overview');
    setEvidenceLogs(securityService.getEvidenceLogsForAlert(alert));
  };

  const handleUpdateStatus = () => {
    if (!selectedAlert) return;
    if (targetStatus === selectedAlert.status) {
      showToast({
        type: 'info',
        title: 'Status Unchanged',
        message: `Alert is already in ${targetStatus} state.`,
      });
      return;
    }

    const success = securityService.updateAlertStatus(
      selectedAlert.id,
      targetStatus,
      statusChangeReason || `Status changed to ${targetStatus}`
    );

    if (success) {
      showToast({
        type: 'success',
        title: 'Status Updated',
        message: `Alert ${selectedAlert.id} marked as ${targetStatus}.`,
      });
      setStatusChangeReason('');
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert || !newNote.trim()) return;

    const success = securityService.addAlertNote(selectedAlert.id, newNote);
    if (success) {
      showToast({
        type: 'success',
        title: 'Note Added',
        message: 'Investigation findings appended to incident record.',
      });
      setNewNote('');
    }
  };

  const applyCannedNote = (template: string) => {
    setNewNote(template);
  };

  const handleBlockAlertIp = (ip: string) => {
    if (!selectedAlert) return;
    const res = securityService.addBlocklistEntry(
      ip,
      `Quarantine for incident ${selectedAlert.id}`
    );
    if (res.success) {
      showToast({
        type: 'success',
        title: 'IP Blocklisted',
        message: `${ip} added to threat blocklist.`,
      });
    } else {
      showToast({
        type: 'info',
        title: 'Blocklist Status',
        message: res.error || `${ip} is already blocked.`,
      });
    }
  };

  const handleExportIncidentReport = (alert: Alert) => {
    const reportText = [
      `=============================================================`,
      `          SENTINEL SOC INCIDENT INVESTIGATION REPORT         `,
      `=============================================================`,
      `Incident ID       : ${alert.id}`,
      `Detection Rule    : ${alert.ruleName} (${alert.ruleCode})`,
      `Severity Level    : ${alert.severity}`,
      `Current Status    : ${alert.status}`,
      `Timestamp (UTC)   : ${alert.timestamp}`,
      `Source IP Address : ${alert.sourceIp}`,
      `Target Username   : ${alert.affectedUsername || 'N/A'}`,
      `Event Count       : ${alert.eventCount}`,
      `-------------------------------------------------------------`,
      `INCIDENT SUMMARY:`,
      alert.summary,
      `-------------------------------------------------------------`,
      `INVESTIGATION NOTES (${alert.notes.length}):`,
      alert.notes.length === 0
        ? 'No analyst notes recorded.'
        : alert.notes
            .map(
              (n) => `[${n.timestamp}] ${n.authorName} (${n.authorRole}):\n${n.note}`
            )
            .join('\n\n'),
      `-------------------------------------------------------------`,
      `AUDIT HISTORY:`,
      alert.history
        .map(
          (h) => `[${h.timestamp}] ${h.changedBy} -> ${h.newStatus} | Reason: ${h.reason}`
        )
        .join('\n'),
      `=============================================================`,
    ].join('\n');

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incident_report_${alert.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({
      type: 'info',
      title: 'Report Exported',
      message: `Downloaded incident_report_${alert.id}.txt`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b dark:border-slate-800/80 border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight dark:text-white text-slate-900">
            Alerts
          </h1>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">
            Correlation queue for incident triage and containment
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-[#0c121e] bg-white border dark:border-slate-800 border-slate-200">
            <span className="dark:text-slate-400 text-slate-500">Open Alerts:</span>
            <span className="font-mono font-bold text-rose-500">{countsByStatus.OPEN}</span>
            <span className="dark:text-slate-600 text-slate-300">/</span>
            <span className="font-mono dark:text-slate-300 text-slate-700 font-semibold">{alerts.length} Total</span>
          </div>
        </div>
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 text-xs">
        {[
          { key: 'ALL', label: 'All Severities', count: countsBySeverity.ALL },
          { key: 'CRITICAL', label: 'Critical', count: countsBySeverity.CRITICAL },
          { key: 'HIGH', label: 'High', count: countsBySeverity.HIGH },
          { key: 'MEDIUM', label: 'Medium', count: countsBySeverity.MEDIUM },
          { key: 'LOW', label: 'Low', count: countsBySeverity.LOW },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSeverityFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              severityFilter === tab.key
                ? 'bg-sky-600 text-white shadow-xs font-semibold'
                : 'dark:bg-[#0c121e] bg-white dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900 border dark:border-slate-800 border-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                severityFilter === tab.key
                  ? 'bg-sky-700 text-sky-100'
                  : 'dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Batch Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="p-3 dark:bg-[#0d1629] bg-sky-50/60 border dark:border-sky-900/60 border-sky-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2 font-medium text-sky-600 dark:text-sky-400">
            <CheckSquare className="w-4 h-4 text-sky-500" />
            <span>{selectedIds.size} alert(s) selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchStatus('INVESTIGATING')}
            >
              Investigating
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleBatchStatus('RESOLVED')}
            >
              Resolved
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Ban className="w-3.5 h-3.5" />}
              onClick={handleBatchBlockIps}
            >
              Block IPs
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Deselect
            </Button>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <Card noPadding>
        <div className="p-4 border-b dark:border-slate-800/80 border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by IP, ID, Rule, Username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs dark:text-slate-100 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 text-xs">
              {(['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'dark:bg-slate-700 bg-slate-200 dark:text-slate-100 text-slate-900 font-semibold'
                      : 'dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900'
                  }`}
                >
                  {st} ({countsByStatus[st]})
                </button>
              ))}
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="dark:text-slate-400 text-slate-500 text-[11px]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-2 py-1 text-xs dark:text-slate-200 text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="timestamp">Timestamp</option>
                <option value="severity">Severity</option>
                <option value="count">Count</option>
              </select>
              <button
                onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                className="p-1 rounded-lg dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-600 cursor-pointer"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Alerts Table */}
        <div className="overflow-x-auto">
          {filteredAlerts.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No alerts match the applied filters"
                description="Try clearing search filters or check detection rule configurations."
                actionText="Reset Filters"
                onAction={() => {
                  setSearchTerm('');
                  setSeverityFilter('ALL');
                  setStatusFilter('ALL');
                }}
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="dark:bg-[#090e18] bg-slate-50 dark:text-slate-400 text-slate-500 font-mono uppercase tracking-wider text-[10px] border-b dark:border-slate-800/80 border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="dark:text-slate-400 text-slate-500 hover:text-slate-800 cursor-pointer"
                      title="Select all visible"
                    >
                      {selectedIds.size > 0 && selectedIds.size === filteredAlerts.length ? (
                        <CheckSquare className="w-4 h-4 text-sky-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-4 font-medium">Alert ID</th>
                  <th className="py-2.5 px-4 font-medium">Severity</th>
                  <th className="py-2.5 px-4 font-medium">Rule Name</th>
                  <th className="py-2.5 px-4 font-medium">Source IP</th>
                  <th className="py-2.5 px-4 font-medium">Events</th>
                  <th className="py-2.5 px-4 font-medium">Timestamp</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                {filteredAlerts.map((alert) => {
                  const isSelected = selectedIds.has(alert.id);
                  return (
                    <tr
                      key={alert.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'dark:bg-sky-950/20 bg-sky-50'
                          : 'dark:hover:bg-slate-800/30 hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        <button
                          onClick={() => toggleSelectOne(alert.id)}
                          className="dark:text-slate-400 text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-medium dark:text-slate-300 text-slate-700">
                        {alert.id}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge label={alert.severity} variant="severity" severity={alert.severity} size="sm" />
                      </td>
                      <td className="py-2.5 px-4 font-medium dark:text-slate-200 text-slate-800">
                        <div className="max-w-xs truncate" title={alert.ruleName}>
                          {alert.ruleName}
                        </div>
                        <div className="text-[11px] dark:text-slate-400 text-slate-500 truncate max-w-sm mt-0.5">
                          {alert.summary}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-sky-500 font-medium">
                        {alert.sourceIp}
                      </td>
                      <td className="py-2.5 px-4 font-mono dark:text-slate-300 text-slate-700 tabular-nums">
                        {alert.eventCount}
                      </td>
                      <td className="py-2.5 px-4 font-mono dark:text-slate-400 text-slate-500 tabular-nums">
                        {alert.timestamp}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge label={alert.status} variant="status" status={alert.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenDetail(alert)}
                        >
                          Investigate
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Investigation Drawer / Modal */}
      <Dialog
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title={`Incident Investigation: ${selectedAlert?.id}`}
        description={selectedAlert?.ruleName}
        maxWidth="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {selectedAlert && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => handleExportIncidentReport(selectedAlert)}
                >
                  Export Report (.txt)
                </Button>
              )}
            </div>

            <Button variant="secondary" size="sm" onClick={() => setSelectedAlert(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedAlert && (
          <div className="space-y-4 text-xs">
            {/* Top Incident Summary Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 dark:bg-slate-900/60 bg-slate-50 rounded-lg border dark:border-slate-800 border-slate-200">
              <div>
                <span className="dark:text-slate-500 text-slate-400 font-mono text-[10px]">Severity</span>
                <div className="mt-1">
                  <Badge label={selectedAlert.severity} variant="severity" severity={selectedAlert.severity} size="sm" />
                </div>
              </div>
              <div>
                <span className="dark:text-slate-500 text-slate-400 font-mono text-[10px]">Status</span>
                <div className="mt-1">
                  <Badge label={selectedAlert.status} variant="status" status={selectedAlert.status} size="sm" />
                </div>
              </div>
              <div>
                <span className="dark:text-slate-500 text-slate-400 font-mono text-[10px]">Source IP</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sky-500 font-bold">{selectedAlert.sourceIp}</span>
                  {securityService.isIpBlocked(selectedAlert.sourceIp) ? (
                    <span className="text-[10px] font-mono text-rose-500 font-semibold px-1.5 py-0.2 rounded dark:bg-rose-950/40 bg-rose-50 border dark:border-rose-800 border-rose-200">
                      BLOCKED
                    </span>
                  ) : (
                    <button
                      onClick={() => handleBlockAlertIp(selectedAlert.sourceIp)}
                      className="text-[10px] text-rose-500 hover:text-rose-600 underline font-mono cursor-pointer"
                    >
                      + Block
                    </button>
                  )}
                </div>
              </div>
              <div>
                <span className="dark:text-slate-500 text-slate-400 font-mono text-[10px]">Occurrences</span>
                <p className="font-mono dark:text-slate-200 text-slate-800 font-bold mt-1">{selectedAlert.eventCount} events</p>
              </div>
            </div>

            {/* Dialog Navigation Tabs */}
            <div className="flex items-center gap-1 border-b dark:border-slate-800 border-slate-200 pb-1 text-xs">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'evidence', label: `Evidence (${evidenceLogs.length})` },
                { key: 'notes', label: `Notes (${selectedAlert.notes.length})` },
                { key: 'history', label: `History (${selectedAlert.history.length})` },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setModalTab(t.key as any)}
                  className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors cursor-pointer ${
                    modalTab === t.key
                      ? 'dark:bg-slate-800 bg-slate-200 text-sky-500 border-b-2 border-sky-500 font-semibold'
                      : 'dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Overview & Status Transition */}
            {modalTab === 'overview' && (
              <div className="space-y-3.5">
                <div className="p-3 dark:bg-slate-900/40 bg-slate-50 rounded-lg border dark:border-slate-800 border-slate-200">
                  <span className="dark:text-slate-400 text-slate-600 font-semibold block mb-1">Detection Summary</span>
                  <p className="dark:text-slate-200 text-slate-800 leading-relaxed">{selectedAlert.summary}</p>
                  {selectedAlert.affectedUsername && (
                    <p className="dark:text-slate-400 text-slate-600 mt-2 text-[11px]">
                      Targeted Account: <span className="font-mono dark:text-slate-200 text-slate-800 font-bold">{selectedAlert.affectedUsername}</span>
                    </p>
                  )}
                </div>

                {/* Status Transition Control */}
                <div className="p-3.5 dark:bg-slate-900/30 bg-slate-50 rounded-lg border dark:border-slate-800 border-slate-200 space-y-2.5">
                  <h4 className="text-xs font-semibold dark:text-slate-200 text-slate-800">Update Incident Status</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block dark:text-slate-400 text-slate-600 mb-1 text-[11px]">Target Status</label>
                      <select
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value as AlertStatus)}
                        className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-2.5 py-1.5 text-xs dark:text-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="OPEN">OPEN (Unassigned)</option>
                        <option value="INVESTIGATING">INVESTIGATING (Under Review)</option>
                        <option value="RESOLVED">RESOLVED (Mitigated)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block dark:text-slate-400 text-slate-600 mb-1 text-[11px]">Justification Note</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Validated automated vulnerability scan"
                          value={statusChangeReason}
                          onChange={(e) => setStatusChangeReason(e.target.value)}
                          className="flex-1 dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-1.5 text-xs dark:text-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                        />
                        <Button size="sm" variant="primary" onClick={handleUpdateStatus}>
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Correlated Evidence Logs */}
            {modalTab === 'evidence' && (
              <div className="space-y-3">
                {evidenceLogs.length === 0 ? (
                  <p className="p-6 text-center dark:text-slate-500 text-slate-400 italic dark:bg-slate-900/40 bg-slate-50 rounded-lg">
                    No specific correlated evidence events found in buffer.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-80 overflow-y-auto font-mono text-[11px]">
                    {evidenceLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded dark:bg-slate-900/60 bg-slate-50 border dark:border-slate-800 border-slate-200 dark:text-slate-300 text-slate-700"
                      >
                        <div className="flex items-center justify-between dark:text-slate-500 text-slate-400 text-[10px] mb-1">
                          <span>{log.timestamp}</span>
                          <span className="text-sky-500">{log.logSource || 'auth-gateway'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge label={log.eventType} variant="event" size="sm" />
                          <span className="dark:text-slate-200 text-slate-800">{log.endpoint}</span>
                          <span className="dark:text-slate-500 text-slate-400">as</span>
                          <span className="text-amber-500 font-semibold">{log.username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Investigation Notes */}
            {modalTab === 'notes' && (
              <div className="space-y-3.5">
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedAlert.notes.length === 0 ? (
                    <p className="dark:text-slate-500 text-slate-400 italic p-4 dark:bg-slate-900/40 bg-slate-50 rounded-lg text-center">
                      No investigation notes recorded yet.
                    </p>
                  ) : (
                    selectedAlert.notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-2.5 dark:bg-slate-900/60 bg-slate-50 rounded-lg border dark:border-slate-800 border-slate-200 text-xs"
                      >
                        <div className="flex items-center justify-between dark:text-slate-400 text-slate-500 mb-1">
                          <span className="font-semibold dark:text-slate-200 text-slate-800">
                            {note.authorName}{' '}
                            <span className="dark:text-slate-500 text-slate-400 font-normal">({note.authorRole})</span>
                          </span>
                          <span className="font-mono text-[10px] dark:text-slate-500 text-slate-400">{note.timestamp}</span>
                        </div>
                        <p className="dark:text-slate-300 text-slate-700 leading-relaxed">{note.note}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t dark:border-slate-800 border-slate-200">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      'Scheduled scan drill verified (False positive)',
                      'Credential stuffing attack confirmed on /login',
                      'Suspicious IP quarantined at perimeter',
                      'User notified for password reset',
                    ].map((template) => (
                      <button
                        key={template}
                        type="button"
                        onClick={() => applyCannedNote(template)}
                        className="text-[10px] px-2 py-0.5 rounded dark:bg-slate-800/60 bg-slate-100 dark:text-slate-300 text-slate-700 dark:hover:bg-slate-700 hover:bg-slate-200 border dark:border-slate-700 border-slate-200 transition-colors cursor-pointer"
                      >
                        + {template}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type investigation findings or forensic notes..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1 dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-1.5 text-xs dark:text-slate-100 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                    />
                    <Button size="sm" variant="secondary" type="submit" icon={<Send className="w-3.5 h-3.5" />}>
                      Add Note
                    </Button>
                  </form>
                </div>
              </div>
            )}

            {/* Tab 4: Audit Trail */}
            {modalTab === 'history' && (
              <div className="space-y-1.5 font-mono text-xs max-h-64 overflow-y-auto">
                {selectedAlert.history.map((hist) => (
                  <div
                    key={hist.id}
                    className="p-2.5 rounded dark:bg-slate-900/60 bg-slate-50 border dark:border-slate-800 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between dark:text-slate-300 text-slate-700"
                  >
                    <div>
                      <span className="text-sky-500 font-semibold">{hist.changedBy}</span>
                      <span className="dark:text-slate-500 text-slate-400 mx-1.5">&rarr;</span>
                      <span className="text-amber-500 font-bold">{hist.newStatus}</span>
                      <p className="text-[11px] dark:text-slate-400 text-slate-500 font-sans mt-0.5">{hist.reason}</p>
                    </div>
                    <span className="dark:text-slate-500 text-slate-400 text-[10px] mt-1 sm:mt-0 sm:ml-4 whitespace-nowrap">
                      {hist.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
};
