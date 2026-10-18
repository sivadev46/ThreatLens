import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Ban,
  Check,
  Terminal,
} from 'lucide-react';
import { securityService } from '../services/securityService';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Dialog } from '../components/common/Dialog';
import { EmptyState } from '../components/common/StateViews';
import { useToast } from '../components/common/NotificationToast';
import { LogEntry, LogImportResult } from '../types/security';

export const LogExplorerPage: React.FC = () => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logSources, setLogSources] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedStatusCode, setSelectedStatusCode] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected log for detail inspection
  const [inspectLog, setInspectLog] = useState<LogEntry | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Import state & multi-file processing
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [lastImportResult, setLastImportResult] = useState<LogImportResult | null>(null);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [showMalformedModal, setShowMalformedModal] = useState(false);

  // Single Log Line Validator & Ingestion Tool
  const [showLineTester, setShowLineTester] = useState(false);
  const [testLineInput, setTestLineInput] = useState(
    '2026-03-14 10:15:32 | 192.168.1.50 | alice | LOGIN_FAILED | /login'
  );

  const refreshLogs = () => {
    setLogs(securityService.getLogs());
    setLogSources(securityService.getLogSources());
  };

  useEffect(() => {
    refreshLogs();
    return securityService.subscribe(refreshLogs);
  }, []);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      log.sourceIp.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.rawLine.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      selectedEventType === 'ALL' || log.eventType === selectedEventType;

    const matchesSource =
      selectedSource === 'ALL' || log.logSource === selectedSource;

    const matchesStatus =
      selectedStatusCode === 'ALL' ||
      (selectedStatusCode === '200' && log.statusCode === 200) ||
      (selectedStatusCode === '401' && log.statusCode === 401) ||
      (selectedStatusCode === '403' && log.statusCode === 403) ||
      (selectedStatusCode === '404' && log.statusCode === 404);

    return matchesSearch && matchesType && matchesSource && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Process files
  const processFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    setImportProgress(10);

    const fileArray = Array.from(files);
    let totalParsed = 0;
    let totalErrors = 0;
    let totalAlerts = 0;
    let combinedMalformed: Array<{ line: number; raw: string; error: string }> = [];
    let combinedName = fileArray.length === 1 ? fileArray[0].name : `${fileArray.length} batch files`;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const text = await file.text();
      setImportProgress(Math.round(((i + 0.5) / fileArray.length) * 80));

      const res = securityService.importLogContent(text, file.name);
      totalParsed += res.parsedCount;
      totalErrors += res.errorCount;
      totalAlerts += res.newAlertsGenerated;
      combinedMalformed = [...combinedMalformed, ...res.malformedLines];
    }

    setImportProgress(100);
    setTimeout(() => {
      setIsProcessing(false);
      setImportProgress(0);

      const summaryObj: LogImportResult = {
        totalLines: totalParsed + totalErrors,
        parsedCount: totalParsed,
        errorCount: totalErrors,
        newAlertsGenerated: totalAlerts,
        fileName: combinedName,
        sourceName: combinedName,
        importTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        malformedLines: combinedMalformed,
      };

      setLastImportResult(summaryObj);
      setShowImportSummary(true);
      setCurrentPage(1);

      showToast({
        type: totalErrors > 0 ? 'warning' : 'success',
        title: 'Ingestion Completed',
        message: `Parsed ${totalParsed} events. Triggered ${totalAlerts} alerts.`,
      });
    }, 400);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  // Preset generator
  const loadPreset = (type: 'bruteforce' | 'burst' | 'blocklist' | 'malformed' | 'enterprise') => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeBase = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    let sampleContent = '';
    let sampleName = '';

    if (type === 'bruteforce') {
      sampleName = 'auth_bruteforce_attack.log';
      sampleContent = [
        `# Automated Brute-Force Authentication Attempt Test`,
        `${timeBase}:01 | 192.168.1.188 | admin | LOGIN_FAILED | /api/v1/auth`,
        `${timeBase}:05 | 192.168.1.188 | admin | LOGIN_FAILED | /api/v1/auth`,
        `${timeBase}:12 | 192.168.1.188 | admin | LOGIN_FAILED | /api/v1/auth`,
        `${timeBase}:18 | 192.168.1.188 | admin | LOGIN_FAILED | /api/v1/auth`,
        `${timeBase}:25 | 192.168.1.188 | admin | LOGIN_FAILED | /api/v1/auth`,
        `${timeBase}:32 | 192.168.1.188 | admin | LOGIN_FAILED | /api/v1/auth`,
      ].join('\n');
    } else if (type === 'burst') {
      sampleName = 'web_traffic_burst.log';
      const lines = [`# Rapid HTTP Request Burst Test (55 events)`];
      for (let i = 0; i < 55; i++) {
        lines.push(`${timeBase}:0${Math.floor(i / 10)} | 172.16.88.99 | worker_bot | HTTP_REQUEST | /catalog/item?id=${i}`);
      }
      sampleContent = lines.join('\n');
    } else if (type === 'blocklist') {
      sampleName = 'perimeter_blocklist_hit.log';
      sampleContent = [
        `# Inbound traffic from active Blocklist IP`,
        `${timeBase}:10 | 198.51.100.24 | root | LOGIN_FAILED | /ssh/v2/handshake`,
        `${timeBase}:15 | 203.0.113.88 | anonymous | HTTP_REQUEST | /actuator/heapdump`,
        `${timeBase}:22 | 198.51.100.24 | root | HTTP_REQUEST | /admin/database.sql`,
      ].join('\n');
    } else if (type === 'malformed') {
      sampleName = 'sample_corrupted_stream.log';
      sampleContent = [
        `${timeBase}:10 | 192.168.1.55 | valid_user | LOGIN_SUCCESS | /dashboard`,
        `CORRUPTED_ENTRY_WITHOUT_PIPES_OR_IP`,
        `${timeBase}:12 | 999.888.777.666 | invalid_ip_format | LOGIN_FAILED | /login`,
        `${timeBase}:14 | 192.168.1.55 | valid_user | INVALID_EVENT_TYPE | /dashboard`,
        `${timeBase}:18 | 192.168.1.55 | valid_user | LOGOUT | /logout`,
        `2026-99-99 88:88:88 | 10.0.0.1 | | LOGIN_FAILED | /admin`,
      ].join('\n');
    } else if (type === 'enterprise') {
      sampleName = 'enterprise_mixed_traffic.log';
      const lines = [`# Mixed Enterprise SOC Traffic Batch`];
      const users = ['alice', 'bob_operator', 'carol_dev', 'david_sys', 'eva_analyst'];
      const ips = ['192.168.1.10', '192.168.1.12', '10.0.0.15', '172.16.4.100', '192.168.1.80'];
      for (let i = 0; i < 40; i++) {
        const u = users[i % users.length];
        const ip = ips[i % ips.length];
        const type = i % 8 === 0 ? 'LOGIN_FAILED' : i % 5 === 0 ? 'LOGIN_SUCCESS' : 'HTTP_REQUEST';
        lines.push(`${timeBase}:${pad(i % 60)} | ${ip} | ${u} | ${type} | /api/v1/resource/${i}`);
      }
      sampleContent = lines.join('\n');
    }

    const result = securityService.importLogContent(sampleContent, sampleName);
    setLastImportResult(result);
    setShowImportSummary(true);
    setCurrentPage(1);

    showToast({
      type: result.errorCount > 0 ? 'warning' : 'success',
      title: `Loaded Preset: ${sampleName}`,
      message: `Parsed ${result.parsedCount} entries. Alerts: +${result.newAlertsGenerated}`,
    });
  };

  // Test single line parser
  const testSingleLine = () => {
    const { entry, error } = securityService.parseLogLine(testLineInput, 1, 'manual-tester');
    return { entry, error };
  };

  const { entry: testEntry, error: testError } = testSingleLine();

  const handleIngestSingleLine = () => {
    if (testError || !testEntry) {
      showToast({
        type: 'error',
        title: 'Syntax Error',
        message: testError || 'Line syntax is invalid.',
      });
      return;
    }

    const res = securityService.importLogContent(testLineInput, 'manual_entry.log');
    showToast({
      type: 'success',
      title: 'Event Ingested',
      message: `Added ${testEntry.eventType} from ${testEntry.sourceIp}. Alerts: +${res.newAlertsGenerated}`,
    });
    setShowLineTester(false);
  };

  // Quick Blocklist IP from Inspector
  const handleBlockIpFromInspector = (ip: string) => {
    const res = securityService.addBlocklistEntry(ip, 'Blocked from Log Explorer inspection');
    if (res.success) {
      showToast({
        type: 'success',
        title: 'IP Blocklisted',
        message: `${ip} added to firewall blocklist.`,
      });
    } else {
      showToast({
        type: 'error',
        title: 'Blocklist Error',
        message: res.error || 'Failed to add IP.',
      });
    }
  };

  // Copy raw line
  const handleCopyRaw = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
    showToast({
      type: 'info',
      title: 'Copied',
      message: 'Raw log line copied to clipboard.',
    });
  };

  // Download sample .log file
  const handleDownloadSampleLog = () => {
    const sample = [
      `# Standard Sentinel SOC Log File Format Sample`,
      `# Format: TIMESTAMP | SOURCE_IP | USERNAME | EVENT_TYPE | ENDPOINT`,
      `2026-03-14 10:15:10 | 192.168.1.50 | alice | LOGIN_FAILED | /login`,
      `2026-03-14 10:15:18 | 192.168.1.50 | alice | LOGIN_FAILED | /login`,
      `2026-03-14 10:15:24 | 192.168.1.50 | alice | LOGIN_FAILED | /login`,
      `2026-03-14 10:15:32 | 192.168.1.50 | alice | LOGIN_FAILED | /login`,
      `2026-03-14 10:15:45 | 192.168.1.50 | alice | LOGIN_FAILED | /login`,
      `2026-03-14 10:18:20 | 198.51.100.24 | root | LOGIN_FAILED | /admin/ssh-auth`,
      `2026-03-14 10:10:05 | 192.168.1.12 | bob_operator | LOGIN_SUCCESS | /auth/session`,
      `2026-03-14 10:10:40 | 192.168.1.12 | bob_operator | HTTP_REQUEST | /reports/export-monthly`,
      `2026-03-14 10:11:15 | 192.168.1.12 | bob_operator | LOGOUT | /auth/logout`,
      `2026-03-14 10:13:00 | 203.0.113.88 | unknown | HTTP_REQUEST | /solr/admin/info/system`,
    ].join('\n');

    const blob = new Blob([sample], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_soc_server_logs.log';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({
      type: 'info',
      title: 'Sample Downloaded',
      message: 'Saved sample_soc_server_logs.log.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Log Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Query, validate, and ingest server telemetry streams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleDownloadSampleLog}
          >
            Sample File
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<Terminal className="w-3.5 h-3.5" />}
            onClick={() => setShowLineTester((prev) => !prev)}
          >
            {showLineTester ? 'Hide Validator' : 'Line Validator'}
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={<UploadCloud className="w-4 h-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Files
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".log,.txt"
            multiple
            className="hidden"
          />
        </div>
      </div>

      {/* Manual Single Line Validator Tool */}
      {showLineTester && (
        <Card
          title="Log Syntax Validator & Ingestion"
          subtitle="Test arbitrary log lines against parser specifications"
        >
          <div className="space-y-3 text-xs">
            <div className="flex gap-2">
              <input
                type="text"
                value={testLineInput}
                onChange={(e) => setTestLineInput(e.target.value)}
                placeholder="YYYY-MM-DD HH:mm:ss | IP | USER | EVENT_TYPE | ENDPOINT"
                className="flex-1 bg-[#090e18] border border-slate-700/80 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <Button
                size="sm"
                variant="primary"
                disabled={!!testError || !testEntry}
                onClick={handleIngestSingleLine}
              >
                Ingest
              </Button>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
              {testError ? (
                <div className="flex items-center gap-2 text-rose-400 font-mono text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Syntax Error: {testError}</span>
                </div>
              ) : testEntry ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">TIMESTAMP</span>
                    <span className="text-emerald-400">{testEntry.timestamp}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">SOURCE IP</span>
                    <span className="text-blue-400">{testEntry.sourceIp}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">USERNAME</span>
                    <span className="text-slate-200">{testEntry.username}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">EVENT</span>
                    <span className="text-amber-300">{testEntry.eventType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">ENDPOINT</span>
                    <span className="text-slate-300">{testEntry.endpoint}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`p-5 rounded-xl border border-dashed transition-all text-center relative overflow-hidden ${
          isDragging
            ? 'border-blue-500 bg-blue-950/20'
            : 'border-slate-800/80 bg-[#0c121e] hover:border-slate-700/80'
        }`}
      >
        {isProcessing && (
          <div className="absolute inset-0 bg-[#0c121e]/95 z-20 flex flex-col items-center justify-center p-6">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mb-2" />
            <p className="text-xs font-semibold text-slate-100">
              Ingesting stream ({importProgress}%)
            </p>
            <div className="w-56 bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-200"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center max-w-xl mx-auto">
          <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-2">
            <UploadCloud className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-semibold text-slate-200">
            Drop log files here or browse local system
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-2.5">
            Accepts pipe-delimited <span className="font-mono text-slate-300">.log</span> and <span className="font-mono text-slate-300">.txt</span> files
          </p>

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse Files...
          </Button>

          {/* Quick Attack Scenarios Presets */}
          <div className="mt-3.5 pt-3 border-t border-slate-800/80 w-full">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Inject Attack Scenarios
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                onClick={() => loadPreset('bruteforce')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-rose-900/40 bg-rose-950/20 text-rose-300 hover:bg-rose-900/30 transition-colors cursor-pointer"
              >
                Brute Force Attack
              </button>
              <button
                onClick={() => loadPreset('burst')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-amber-900/40 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 transition-colors cursor-pointer"
              >
                Traffic Burst / DoS
              </button>
              <button
                onClick={() => loadPreset('blocklist')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-blue-900/40 bg-blue-950/20 text-blue-300 hover:bg-blue-900/30 transition-colors cursor-pointer"
              >
                Blocklist Origin Hit
              </button>
              <button
                onClick={() => loadPreset('enterprise')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-emerald-900/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/30 transition-colors cursor-pointer"
              >
                Enterprise Mixed Batch (40)
              </button>
              <button
                onClick={() => loadPreset('malformed')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-700/60 bg-slate-800/40 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Malformed Entries
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import Summary Card */}
      {lastImportResult && showImportSummary && (
        <div className="p-3.5 rounded-xl border border-blue-900/40 bg-[#0c1527] text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-blue-900/30 mb-2.5">
            <div className="flex items-center gap-2 text-blue-300 font-semibold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ingested: {lastImportResult.fileName}</span>
            </div>
            <button
              onClick={() => setShowImportSummary(false)}
              className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-slate-400 text-[11px]">Total Lines</span>
              <p className="font-mono font-bold text-slate-100">{lastImportResult.totalLines}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Parsed Valid</span>
              <p className="font-mono font-bold text-emerald-400">{lastImportResult.parsedCount}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Rejected</span>
              <p className="font-mono font-bold text-rose-400">{lastImportResult.errorCount}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Alerts Generated</span>
              <p className="font-mono font-bold text-amber-400">+{lastImportResult.newAlertsGenerated}</p>
            </div>
          </div>

          {lastImportResult.malformedLines.length > 0 && (
            <div className="pt-2 mt-2 border-t border-blue-900/30 flex items-center justify-between">
              <span className="text-rose-300 text-xs">
                {lastImportResult.malformedLines.length} corrupted entries rejected by validator.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMalformedModal(true)}
              >
                Inspect Errors ({lastImportResult.malformedLines.length})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Filter and Table Container */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-800/80 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search IP, username, endpoint, or raw line..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#090e18] border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">Source:</span>
                <select
                  value={selectedSource}
                  onChange={(e) => {
                    setSelectedSource(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-[#090e18] border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Sources ({logs.length})</option>
                  {logSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">HTTP:</span>
                <select
                  value={selectedStatusCode}
                  onChange={(e) => {
                    setSelectedStatusCode(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-[#090e18] border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Codes</option>
                  <option value="200">200 OK</option>
                  <option value="401">401 Auth</option>
                  <option value="403">403 Forbidden</option>
                  <option value="404">404 Missing</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-[#090e18] border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Event Type Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
            {['ALL', 'LOGIN_FAILED', 'LOGIN_SUCCESS', 'HTTP_REQUEST', 'LOGOUT'].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSelectedEventType(type);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  selectedEventType === type
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No log entries match the selected filters"
                description="Try clearing search terms or selecting 'ALL' event types and sources."
                actionText="Reset Filters"
                onAction={() => {
                  setSearchTerm('');
                  setSelectedEventType('ALL');
                  setSelectedSource('ALL');
                  setSelectedStatusCode('ALL');
                }}
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090e18] text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800/80">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Timestamp</th>
                  <th className="py-2.5 px-4 font-medium">Source IP</th>
                  <th className="py-2.5 px-4 font-medium">Principal</th>
                  <th className="py-2.5 px-4 font-medium">Event</th>
                  <th className="py-2.5 px-4 font-medium">Endpoint</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Source</th>
                  <th className="py-2.5 px-4 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-400 tabular-nums">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-blue-400 font-medium">
                      {log.sourceIp}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-200">
                      {log.username}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge label={log.eventType} variant="event" size="sm" />
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-300 max-w-xs truncate" title={log.endpoint}>
                      {log.endpoint}
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      <span
                        className={`text-xs ${
                          log.statusCode && log.statusCode >= 400
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {log.statusCode || 200}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px] max-w-[130px] truncate" title={log.logSource}>
                      {log.logSource || 'system.log'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setInspectLog(log);
                          setCopiedRaw(false);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 bg-[#090e18]">
          <div>
            Showing{' '}
            <span className="font-mono text-slate-200 font-medium">
              {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-mono text-slate-200 font-medium">
              {Math.min(currentPage * pageSize, filteredLogs.length)}
            </span>{' '}
            of{' '}
            <span className="font-mono text-slate-200 font-medium">
              {filteredLogs.length}
            </span>{' '}
            entries
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              icon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Prev
            </Button>
            <span className="px-2 font-mono text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              icon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Raw Log Line Detail Dialog */}
      <Dialog
        isOpen={!!inspectLog}
        onClose={() => setInspectLog(null)}
        title="Event Forensic Inspection"
        description={`Record: ${inspectLog?.id}`}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="danger"
              size="sm"
              icon={<Ban className="w-3.5 h-3.5" />}
              onClick={() => {
                if (inspectLog) handleBlockIpFromInspector(inspectLog.sourceIp);
              }}
            >
              Block {inspectLog?.sourceIp}
            </Button>

            <Button variant="secondary" size="sm" onClick={() => setInspectLog(null)}>
              Close
            </Button>
          </div>
        }
      >
        {inspectLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <div>
                <span className="text-slate-500 font-mono text-[10px]">Timestamp</span>
                <p className="font-mono text-slate-200 mt-0.5">{inspectLog.timestamp}</p>
              </div>
              <div>
                <span className="text-slate-500 font-mono text-[10px]">Source IP</span>
                <p className="font-mono text-blue-400 font-semibold mt-0.5">{inspectLog.sourceIp}</p>
              </div>
              <div>
                <span className="text-slate-500 font-mono text-[10px]">Username</span>
                <p className="text-slate-200 font-medium mt-0.5">{inspectLog.username}</p>
              </div>
              <div>
                <span className="text-slate-500 font-mono text-[10px]">Event Type</span>
                <div className="mt-0.5">
                  <Badge label={inspectLog.eventType} variant="event" size="sm" />
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-mono text-[10px]">Endpoint</span>
                <p className="font-mono text-slate-300 mt-0.5">{inspectLog.endpoint}</p>
              </div>
              <div>
                <span className="text-slate-500 font-mono text-[10px]">HTTP Status</span>
                <p className="font-mono text-slate-200 mt-0.5">{inspectLog.statusCode || 200}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 font-medium">
                  Raw Log Line
                </span>
                <button
                  onClick={() => handleCopyRaw(inspectLog.rawLine)}
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  {copiedRaw ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 bg-black/60 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap select-all">
                {inspectLog.rawLine}
              </pre>
            </div>
          </div>
        )}
      </Dialog>

      {/* Malformed Lines Inspection Dialog */}
      <Dialog
        isOpen={showMalformedModal}
        onClose={() => setShowMalformedModal(false)}
        title="Malformed Entries"
        description="Lines rejected during parser validation."
        maxWidth="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setShowMalformedModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {lastImportResult?.malformedLines.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-950/60 border border-rose-900/30 text-xs font-mono"
              >
                <div className="flex items-center justify-between text-rose-400 font-semibold mb-1">
                  <span>Line {item.line} Error</span>
                  <span className="text-slate-500 text-[10px]">REJECTED</span>
                </div>
                <p className="text-rose-300/90 text-[11px] mb-2">{item.error}</p>
                <div className="p-2 bg-black/50 rounded border border-slate-800 text-slate-400 text-[10px] break-all">
                  &quot;{item.raw}&quot;
                </div>
              </div>
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  );
};
