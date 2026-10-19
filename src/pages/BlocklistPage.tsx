import React, { useState, useEffect } from 'react';
import {
  Ban,
  Plus,
  Trash2,
  Search,
  ShieldAlert,
  Power,
  Download,
  Upload,
  Activity,
  FileText,
} from 'lucide-react';
import { securityService } from '../services/securityService';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Dialog } from '../components/common/Dialog';
import { EmptyState } from '../components/common/StateViews';
import { useToast } from '../components/common/NotificationToast';
import { BlocklistEntry, Alert, LogEntry } from '../types/security';

export const BlocklistPage: React.FC = () => {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<BlocklistEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Add Dialog State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newCategory, setNewCategory] = useState<BlocklistEntry['threatCategory']>('SCANNER');
  const [newAsn, setNewAsn] = useState('AS15169 (Public Cloud Subnet)');
  const [ipError, setIpError] = useState('');

  // Bulk Import Dialog State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState(
    '203.0.113.195 | External Shodan automated probe | SCANNER\n198.51.100.77 | Persistent SSH brute force origin | BRUTE_FORCE\n192.0.2.89 | Credential stuffing cluster | CREDENTIAL_STUFFING'
  );

  // Related Activity Inspector Modal
  const [inspectedIpEntry, setInspectedIpEntry] = useState<BlocklistEntry | null>(null);
  const [relatedAlerts, setRelatedAlerts] = useState<Alert[]>([]);
  const [relatedLogs, setRelatedLogs] = useState<LogEntry[]>([]);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<BlocklistEntry | null>(null);

  const refreshBlocklist = () => setEntries(securityService.getBlocklist());

  useEffect(() => {
    refreshBlocklist();
    return securityService.subscribe(refreshBlocklist);
  }, []);

  const filteredEntries = entries.filter((item) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      item.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.addedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.threatAsn && item.threatAsn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.threatCategory && item.threatCategory.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setNewIp('');
    setNewReason('');
    setNewCategory('SCANNER');
    setNewAsn('AS15169 (Public Cloud Subnet)');
    setIpError('');
    setIsAddOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIpError('');

    if (!newIp.trim()) {
      setIpError('Please enter an IPv4 address.');
      return;
    }

    if (!securityService.isValidIp(newIp)) {
      setIpError('Invalid IPv4 address. Must contain four numeric octets (0-255).');
      return;
    }

    const res = securityService.addBlocklistEntry(newIp, newReason, newCategory, newAsn);
    if (!res.success) {
      setIpError(res.error || 'Failed to add IP to blocklist.');
      return;
    }

    showToast({
      type: 'success',
      title: 'IP Blocklisted',
      message: `${newIp.trim()} added to firewall blocklist.`,
    });
    setIsAddOpen(false);
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText.split('\n');
    const result = securityService.importBulkBlocklist(lines);

    showToast({
      type: result.added > 0 ? 'success' : 'info',
      title: 'Feed Ingested',
      message: `Added: ${result.added}, Duplicates: ${result.skippedDuplicates}, Invalid: ${result.invalid}`,
    });
    setIsBulkOpen(false);
  };

  const handleToggleStatus = (entry: BlocklistEntry) => {
    securityService.toggleBlocklistStatus(entry.id);
    showToast({
      type: 'info',
      title: 'Status Updated',
      message: `${entry.ipAddress} is now ${entry.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}.`,
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const ip = deleteTarget.ipAddress;
    securityService.removeBlocklistEntry(deleteTarget.id);
    showToast({
      type: 'warning',
      title: 'Entry Removed',
      message: `IP ${ip} removed from blocklist.`,
    });
    setDeleteTarget(null);
  };

  const handleInspectActivity = (entry: BlocklistEntry) => {
    setInspectedIpEntry(entry);
    setRelatedAlerts(securityService.getAlertsForIp(entry.ipAddress));
    setRelatedLogs(securityService.getLogsForIp(entry.ipAddress));
  };

  const handleExportBlocklistCsv = () => {
    let csv = 'IP Address,Status,Threat Category,Reason,Autonomous System (ASN),Added By,Created At,Alert Count\n';
    entries.forEach((e) => {
      csv += `"${e.ipAddress}","${e.status}","${e.threatCategory || 'MANUAL'}","${e.reason.replace(/"/g, '""')}","${e.threatAsn || ''}","${e.addedBy}","${e.createdAt}",${e.associatedAlertCount}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `threat_intel_ip_blocklist_${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({
      type: 'info',
      title: 'Blocklist Exported',
      message: `Exported ${entries.length} indicators to CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b dark:border-slate-800/80 border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight dark:text-white text-slate-900">
            IP Blocklist
          </h1>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">
            Threat containment indicators. Matching traffic triggers immediate Rule 3 alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportBlocklistCsv}
          >
            Export CSV
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setIsBulkOpen(true)}
          >
            Bulk Import
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenAdd}
          >
            Add IP
          </Button>
        </div>
      </div>

      {/* Blocklist Table Card */}
      <Card noPadding>
        <div className="p-4 border-b dark:border-slate-800/80 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by IP, ASN, reason, or threat category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs dark:text-slate-100 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 text-xs">
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'dark:bg-slate-700 bg-slate-200 dark:text-slate-100 text-slate-900 font-semibold'
                      : 'dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="text-xs dark:text-slate-400 text-slate-500">
              Active:{' '}
              <span className="font-mono text-emerald-500 font-bold">
                {entries.filter((e) => e.status === 'ACTIVE').length} / {entries.length}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredEntries.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No blocklist entries found"
                description="Add suspicious IP addresses to automatically flag events when encountered in server logs."
                actionText="Add IP"
                onAction={handleOpenAdd}
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="dark:bg-[#090e18] bg-slate-50 dark:text-slate-400 text-slate-500 font-mono uppercase tracking-wider text-[10px] border-b dark:border-slate-800/80 border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Blocked IP</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Reason</th>
                  <th className="py-2.5 px-4 font-medium">Origin ASN</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Activity</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                {filteredEntries.map((item) => (
                  <tr key={item.id} className="dark:hover:bg-slate-800/30 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-rose-500 whitespace-nowrap">
                      {item.ipAddress}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold dark:bg-slate-900 bg-slate-100 border dark:border-slate-800 border-slate-200 dark:text-slate-300 text-slate-700">
                        {item.threatCategory || 'MANUAL'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 dark:text-slate-200 text-slate-800 max-w-xs">
                      <p className="line-clamp-1 leading-relaxed text-xs">{item.reason}</p>
                      <span className="text-[10px] font-mono dark:text-slate-500 text-slate-400">
                        by {item.addedBy} on {item.createdAt.substring(0, 10)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono dark:text-slate-400 text-slate-500 text-[11px] max-w-[150px] truncate" title={item.threatAsn}>
                      {item.threatAsn || 'AS-UNKNOWN'}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          item.status === 'ACTIVE'
                            ? 'dark:bg-rose-500/10 bg-rose-50 text-rose-600 dark:text-rose-400 border dark:border-rose-500/20 border-rose-200'
                            : 'dark:bg-slate-800/40 bg-slate-100 text-slate-400 border dark:border-slate-700/50 border-slate-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleInspectActivity(item)}
                        className="font-mono text-sky-500 hover:text-sky-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Inspect Hits</span>
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className="p-1.5 dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-800 dark:hover:bg-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title={item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 dark:text-slate-400 text-slate-500 hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Remove Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Dialog 1: Add Single IP */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Malicious IP"
        description="Configure indicator for Rule 3 correlation."
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleAddSubmit}>
              Add to Blocklist
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1">
              IPv4 Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 198.51.100.24"
              value={newIp}
              onChange={(e) => {
                setNewIp(e.target.value);
                setIpError('');
              }}
              className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-1.5 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500 font-mono"
            />
            {ipError && <p className="text-rose-500 text-[11px] mt-1">{ipError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1">
                Threat Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-1.5 text-xs dark:text-slate-100 text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="SCANNER">Automated Scanner</option>
                <option value="BRUTE_FORCE">Brute-Force Origin</option>
                <option value="CREDENTIAL_STUFFING">Credential Stuffing</option>
                <option value="DOS">DoS / Flooding Cluster</option>
                <option value="PROXY_TOR">Anonymous Proxy / Tor</option>
                <option value="MANUAL">Manual Containment</option>
              </select>
            </div>

            <div>
              <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1">
                Autonomous System (ASN)
              </label>
              <input
                type="text"
                placeholder="e.g. AS15169"
                value={newAsn}
                onChange={(e) => setNewAsn(e.target.value)}
                className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-1.5 text-xs dark:text-slate-100 text-slate-900 font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1">
              Threat Reason
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Repeated SSH credential stuffing attacks..."
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-1.5 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>
        </form>
      </Dialog>

      {/* Dialog 2: Bulk IP Feed Importer */}
      <Dialog
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Bulk Threat Feed Importer"
        description="Ingest multiple indicators [IP | REASON | CATEGORY]."
        maxWidth="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsBulkOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleBulkSubmit}>
              Import Feed
            </Button>
          </>
        }
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4 text-xs">
          <div>
            <textarea
              rows={6}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg p-3 font-mono text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500"
            />
            <span className="text-[11px] dark:text-slate-500 text-slate-400 mt-1 block">
              Format: <code className="text-sky-500 font-mono">IP | Reason | CATEGORY</code>
            </span>
          </div>
        </form>
      </Dialog>

      {/* Dialog 3: Related Alert Activity Inspector */}
      <Dialog
        isOpen={!!inspectedIpEntry}
        onClose={() => setInspectedIpEntry(null)}
        title={`Activity Profile: ${inspectedIpEntry?.ipAddress}`}
        description={`Category: ${inspectedIpEntry?.threatCategory || 'MANUAL'} | Status: ${inspectedIpEntry?.status}`}
        maxWidth="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setInspectedIpEntry(null)}>
            Close
          </Button>
        }
      >
        {inspectedIpEntry && (
          <div className="space-y-4 text-xs">
            <div className="p-3 dark:bg-slate-900/60 bg-slate-50 rounded-lg border dark:border-slate-800 border-slate-200 grid grid-cols-2 gap-3">
              <div>
                <span className="dark:text-slate-500 text-slate-400 font-mono text-[10px]">Reason</span>
                <p className="dark:text-slate-200 text-slate-800 mt-0.5">{inspectedIpEntry.reason}</p>
              </div>
              <div>
                <span className="dark:text-slate-500 text-slate-400 font-mono text-[10px]">ASN Network</span>
                <p className="font-mono text-sky-500 mt-0.5">{inspectedIpEntry.threatAsn || 'AS-UNKNOWN'}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold dark:text-slate-200 text-slate-800 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                <span>Correlated Incidents ({relatedAlerts.length})</span>
              </h4>

              {relatedAlerts.length === 0 ? (
                <p className="p-4 dark:bg-slate-900/40 bg-slate-50 rounded-lg dark:text-slate-500 text-slate-400 italic text-center">
                  No alerts currently open for this IP.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {relatedAlerts.map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded dark:bg-slate-900/60 bg-slate-50 border dark:border-slate-800 border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono dark:text-slate-300 text-slate-700 font-bold">{a.id}</span>
                        <span className="dark:text-slate-500 text-slate-400 mx-2">&bull;</span>
                        <span className="dark:text-slate-200 text-slate-800">{a.ruleName}</span>
                      </div>
                      <Badge label={a.severity} variant="severity" severity={a.severity} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold dark:text-slate-200 text-slate-800 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-500" />
                <span>Recent Log Events ({relatedLogs.length})</span>
              </h4>

              {relatedLogs.length === 0 ? (
                <p className="p-4 dark:bg-slate-900/40 bg-slate-50 rounded-lg dark:text-slate-500 text-slate-400 italic text-center">
                  No log records found for this IP.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
                  {relatedLogs.map((l) => (
                    <div
                      key={l.id}
                      className="p-2 rounded dark:bg-slate-900/60 bg-slate-50 border dark:border-slate-800 border-slate-200 flex items-center justify-between dark:text-slate-300 text-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <span className="dark:text-slate-500 text-slate-400">{l.timestamp.substring(11, 19)}</span>
                        <Badge label={l.eventType} variant="event" size="sm" />
                        <span className="dark:text-slate-200 text-slate-800">{l.endpoint}</span>
                      </div>
                      <span className="dark:text-slate-400 text-slate-500">{l.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Dialog 4: Delete Confirmation Dialog */}
      <Dialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove from Blocklist"
        maxWidth="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
              Remove IP
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-xs dark:text-slate-300 text-slate-700">
            Remove <span className="font-mono font-bold text-rose-500">{deleteTarget.ipAddress}</span> from the blocklist?
          </p>
        )}
      </Dialog>
    </div>
  );
};
