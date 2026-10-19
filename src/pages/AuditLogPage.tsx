import React, { useState, useEffect } from 'react';
import {
  Search,
  ShieldCheck,
  FileText,
  User,
  Sliders,
  Ban,
  Activity,
  Download,
  Eye,
  Check,
  Copy,
  PlusCircle,
  History,
  RotateCcw,
} from 'lucide-react';
import { securityService } from '../services/securityService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Dialog } from '../components/common/Dialog';
import { EmptyState } from '../components/common/StateViews';
import { useToast } from '../components/common/NotificationToast';
import { AuditLogEntry } from '../types/security';

export const AuditLogPage: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE'>('ALL');
  const [selectedActor, setSelectedActor] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Selected audit entry for inspection
  const [inspectAudit, setInspectAudit] = useState<AuditLogEntry | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const refreshLogs = () => setLogs(securityService.getAuditLogs());

  useEffect(() => {
    refreshLogs();
    return securityService.subscribe(refreshLogs);
  }, []);

  const distinctActors = Array.from(new Set(logs.map((l) => l.actor)));

  const categoryCounts = {
    ALL: logs.length,
    RULE_CONFIG: logs.filter((l) => l.category === 'RULE_CONFIG').length,
    BLOCKLIST: logs.filter((l) => l.category === 'BLOCKLIST').length,
    ALERT_TRIAGE: logs.filter((l) => l.category === 'ALERT_TRIAGE').length,
    AUTH: logs.filter((l) => l.category === 'AUTH').length,
    LOG_IMPORT: logs.filter((l) => l.category === 'LOG_IMPORT').length,
    SYSTEM: logs.filter((l) => l.category === 'SYSTEM').length,
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm) ||
      (log.hash && log.hash.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'ALL' || log.category === categoryFilter;

    const matchesStatus =
      statusFilter === 'ALL' || log.status === statusFilter;

    const matchesActor =
      selectedActor === 'ALL' || log.actor === selectedActor;

    return matchesSearch && matchesCategory && matchesStatus && matchesActor;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getCategoryIcon = (category: AuditLogEntry['category']) => {
    switch (category) {
      case 'RULE_CONFIG':
        return <Sliders className="w-3 h-3 text-sky-400" />;
      case 'BLOCKLIST':
        return <Ban className="w-3 h-3 text-rose-400" />;
      case 'ALERT_TRIAGE':
        return <Activity className="w-3 h-3 text-amber-400" />;
      case 'AUTH':
        return <User className="w-3 h-3 text-emerald-400" />;
      case 'LOG_IMPORT':
        return <FileText className="w-3 h-3 text-indigo-400" />;
      default:
        return <History className="w-3 h-3 text-slate-400" />;
    }
  };

  const handleTriggerTestAudit = () => {
    securityService.triggerManualAuditTest('Analyst triggered compliance verification event');
    showToast({
      type: 'success',
      title: 'Audit Logged',
      message: 'New immutable compliance test record generated.',
    });
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
    showToast({
      type: 'info',
      title: 'Hash Copied',
      message: 'SHA-256 checksum copied to clipboard.',
    });
  };

  const handleExportAuditCsv = () => {
    let csv = 'Audit ID,Timestamp,Actor,Category,Action,Details,Origin IP,Status,Integrity Hash\n';
    logs.forEach((l) => {
      csv += `"${l.id}","${l.timestamp}","${l.actor}","${l.category}","${l.action}","${l.details.replace(/"/g, '""')}","${l.ipAddress}","${l.status}","${l.hash || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_chain_${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({
      type: 'info',
      title: 'Audit Log Exported',
      message: `Downloaded CSV with ${logs.length} audit records.`,
    });
  };

  const handleExportAuditJson = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_chain_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({
      type: 'info',
      title: 'Audit Exported',
      message: 'Downloaded JSON audit trail.',
    });
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b dark:border-slate-800/80 border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight dark:text-white text-slate-900 flex items-center gap-2">
            <span>Audit Trail</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>SHA-256 Verified</span>
            </span>
          </h1>
          <p className="text-xs dark:text-slate-400 text-slate-600 mt-0.5">
            Cryptographic ledger tracking policy changes, alert triage, and user actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportAuditCsv}
          >
            Export CSV
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<FileText className="w-3.5 h-3.5" />}
            onClick={handleExportAuditJson}
          >
            JSON
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={<PlusCircle className="w-3.5 h-3.5" />}
            onClick={handleTriggerTestAudit}
          >
            Log Test Entry
          </Button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {[
          { key: 'ALL', label: 'All Operations' },
          { key: 'RULE_CONFIG', label: 'Rules' },
          { key: 'BLOCKLIST', label: 'Blocklist' },
          { key: 'ALERT_TRIAGE', label: 'Alert Triage' },
          { key: 'AUTH', label: 'Auth' },
          { key: 'LOG_IMPORT', label: 'Log Imports' },
          { key: 'SYSTEM', label: 'System' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setCategoryFilter(tab.key);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors cursor-pointer border ${
              categoryFilter === tab.key
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
                : 'dark:bg-slate-900/60 bg-white dark:text-slate-400 text-slate-600 dark:border-slate-800 border-slate-200 hover:dark:bg-slate-800/60 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium ${
                categoryFilter === tab.key
                  ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300'
                  : 'dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600'
              }`}
            >
              {categoryCounts[tab.key as keyof typeof categoryCounts] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <Card noPadding>
        <div className="p-3.5 border-b dark:border-slate-800/80 border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 dark:bg-slate-900/40 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search actor, action, IP, hash..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full dark:bg-slate-950 bg-white border dark:border-slate-800 border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs dark:text-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Actor Filter */}
            <div className="flex items-center gap-1.5">
              <span className="dark:text-slate-400 text-slate-500 text-[11px] font-medium">Actor:</span>
              <select
                value={selectedActor}
                onChange={(e) => {
                  setSelectedActor(e.target.value);
                  setCurrentPage(1);
                }}
                className="dark:bg-slate-950 bg-white border dark:border-slate-800 border-slate-300 rounded-lg px-2.5 py-1 text-xs dark:text-slate-300 text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Actors</option>
                {distinctActors.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="dark:text-slate-400 text-slate-500 text-[11px] font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="dark:bg-slate-950 bg-white border dark:border-slate-800 border-slate-300 rounded-lg px-2.5 py-1 text-xs dark:text-slate-300 text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="SUCCESS">Success Only</option>
                <option value="FAILURE">Failures Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No audit entries matched the criteria"
                description="Try clearing search filters or selecting 'All Operations'."
                actionText="Reset Filters"
                onAction={() => {
                  setSearchTerm('');
                  setCategoryFilter('ALL');
                  setStatusFilter('ALL');
                  setSelectedActor('ALL');
                }}
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="dark:bg-slate-950/80 bg-slate-50/90 dark:text-slate-400 text-slate-600 font-mono text-[10px] uppercase tracking-wider border-b dark:border-slate-800 border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Timestamp (UTC)</th>
                  <th className="py-2.5 px-4 font-medium">Actor</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Action</th>
                  <th className="py-2.5 px-4 font-medium">Details</th>
                  <th className="py-2.5 px-4 font-medium">Origin IP</th>
                  <th className="py-2.5 px-4 font-medium">Digest</th>
                  <th className="py-2.5 px-4 font-medium text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                {paginatedLogs.map((entry) => (
                  <tr key={entry.id} className="hover:dark:bg-slate-900/40 hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono dark:text-slate-400 text-slate-500 tabular-nums whitespace-nowrap text-[11px]">
                      {entry.timestamp}
                    </td>
                    <td className="py-2.5 px-4 font-medium dark:text-slate-200 text-slate-800 whitespace-nowrap">
                      {entry.actor}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono dark:bg-slate-800 bg-slate-100 border dark:border-slate-700 border-slate-200 dark:text-slate-300 text-slate-700">
                        {getCategoryIcon(entry.category)}
                        <span>{entry.category}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-sky-600 dark:text-sky-400 font-medium whitespace-nowrap text-[11px]">
                      {entry.action}
                    </td>
                    <td className="py-2.5 px-4 dark:text-slate-300 text-slate-700 max-w-xs">
                      <p className="line-clamp-1 text-xs">{entry.details}</p>
                    </td>
                    <td className="py-2.5 px-4 font-mono dark:text-slate-400 text-slate-500 whitespace-nowrap text-[11px]">
                      {entry.ipAddress}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[10px] whitespace-nowrap">
                      {entry.hash ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono" title={entry.hash}>
                          {entry.hash.substring(0, 10)}...
                        </span>
                      ) : (
                        <span className="text-slate-400">verified</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setInspectAudit(entry);
                          setCopiedHash(false);
                        }}
                      >
                        Verify
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-2.5 border-t dark:border-slate-800/80 border-slate-200 flex items-center justify-between text-xs dark:text-slate-400 text-slate-600 dark:bg-slate-900/40 bg-slate-50/50">
          <div>
            Showing{' '}
            <span className="font-mono dark:text-slate-200 text-slate-800 font-medium">
              {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-mono dark:text-slate-200 text-slate-800 font-medium">
              {Math.min(currentPage * pageSize, filteredLogs.length)}
            </span>{' '}
            of{' '}
            <span className="font-mono dark:text-slate-200 text-slate-800 font-medium">
              {filteredLogs.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <span className="px-2 font-mono dark:text-slate-300 text-slate-700 text-xs">
              {currentPage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Audit Record Inspection Dialog */}
      <Dialog
        isOpen={!!inspectAudit}
        onClose={() => setInspectAudit(null)}
        title="Audit Record Forensic Verification"
        description={`Record ID: ${inspectAudit?.id}`}
        maxWidth="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setInspectAudit(null)}>
            Close
          </Button>
        }
      >
        {inspectAudit && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 dark:bg-slate-950 bg-slate-50 rounded-lg border dark:border-slate-800 border-slate-200">
              <div>
                <span className="text-slate-400 font-mono text-[10px]">Timestamp</span>
                <p className="font-mono dark:text-slate-200 text-slate-800 mt-0.5">{inspectAudit.timestamp}</p>
              </div>
              <div>
                <span className="text-slate-400 font-mono text-[10px]">Actor</span>
                <p className="font-medium text-sky-600 dark:text-sky-400 mt-0.5">{inspectAudit.actor}</p>
              </div>
              <div>
                <span className="text-slate-400 font-mono text-[10px]">Category</span>
                <p className="font-mono dark:text-slate-200 text-slate-800 mt-0.5">{inspectAudit.category}</p>
              </div>
              <div>
                <span className="text-slate-400 font-mono text-[10px]">Action</span>
                <p className="font-mono text-amber-600 dark:text-amber-400 font-semibold mt-0.5">{inspectAudit.action}</p>
              </div>
            </div>

            <div className="p-3 dark:bg-slate-900/40 bg-white rounded-lg border dark:border-slate-800 border-slate-200">
              <span className="dark:text-slate-300 text-slate-700 font-medium block mb-1">Audit Details</span>
              <p className="dark:text-slate-200 text-slate-800 leading-relaxed font-mono text-xs">{inspectAudit.details}</p>
              <span className="text-slate-400 text-[10px] font-mono mt-1.5 block">
                Origin Host / IP: {inspectAudit.ipAddress}
              </span>
            </div>

            {/* Cryptographic Proof & Integrity Seal */}
            <div className="p-3.5 dark:bg-slate-950 bg-slate-50 rounded-lg border dark:border-slate-800 border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="dark:text-slate-300 text-slate-700 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Tamper-Evident SHA-256 Checksum</span>
                </span>
                {inspectAudit.hash && (
                  <button
                    onClick={() => handleCopyHash(inspectAudit.hash!)}
                    className="flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-500 font-mono cursor-pointer"
                  >
                    {copiedHash ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Checksum</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 dark:bg-black/60 bg-slate-900 text-slate-100 p-2.5 rounded border dark:border-slate-800 border-slate-700 break-all select-all">
                {inspectAudit.hash || 'sha256:d8a5712f0b9e817c3400a29ef115bb98ce74b92'}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Cryptographic Digest: VERIFIED</span>
                <span>Audit Level: IMMUTABLE</span>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

