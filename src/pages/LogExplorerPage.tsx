import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logSources, setLogSources] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedStatusCode, setSelectedStatusCode] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Read URL query parameter for source filtering (e.g. from File Manager)
  useEffect(() => {
    const src = searchParams.get('source');
    if (src) {
      setSelectedSource(src);
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Selected log for detail inspection
  const [inspectLog, setInspectLog] = useState<LogEntry | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Import state
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [lastImportResult, setLastImportResult] = useState<LogImportResult | null>(null);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [showMalformedModal, setShowMalformedModal] = useState(false);

  // Single Log Line Validator
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

      const res = securityService.importLogContent(text, file.name, file.size);
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
      if (fileArray.length === 1) {
        setSelectedSource(fileArray[0].name);
      }
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
    }
  };

  const handleCopyRaw = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const handleBlockIpFromInspector = (ip: string) => {
    const res = securityService.addBlocklistEntry(ip, 'Manual quarantine from Log Explorer');
    if (res.success) {
      showToast({
        type: 'success',
        title: 'IP Blocked',
        message: `${ip} added to firewall blocklist.`,
      });
      setInspectLog(null);
    } else {
      showToast({
        type: 'error',
        title: 'Blocklist Error',
        message: res.error || 'Failed to add IP.',
      });
    }
  };

  const testLineValidation = () => {
    if (!testLineInput.trim()) return { error: 'Empty line', entry: null };
    const parts = testLineInput.split('|').map((s) => s.trim());
    if (parts.length < 5) {
      return {
        error: `Expected 5 pipe-delimited fields, received ${parts.length}`,
        entry: null,
      };
    }
    const [timestamp, ip, user, eventType, endpoint] = parts;
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ip)) {
      return { error: `Invalid IPv4 address: "${ip}"`, entry: null };
    }
    const validTypes = ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'HTTP_REQUEST', 'LOGOUT'];
    if (!validTypes.includes(eventType)) {
      return { error: `Unknown event type: "${eventType}"`, entry: null };
    }
    return {
      error: null,
      entry: {
        timestamp,
        sourceIp: ip,
        username: user,
        eventType: eventType as any,
        endpoint,
      },
    };
  };

  const { error: testError, entry: testEntry } = testLineValidation();

  const handleIngestSingleLine = () => {
    if (!testEntry) return;
    const res = securityService.importLogContent(testLineInput, 'single-line-tester.log');
    showToast({
      type: 'success',
      title: 'Line Ingested',
      message: `Parsed successfully. Generated ${res.newAlertsGenerated} alerts.`,
    });
    setTestLineInput('');
    setShowLineTester(false);
  };

  const loadPreset = (scenario: 'bruteforce' | 'burst' | 'blocklist' | 'enterprise' | 'malformed') => {
    let rawContent = '';
    let name = '';
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ts = (secOffset = 0) => {
      const d = new Date(now.getTime() - secOffset * 1000);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    if (scenario === 'bruteforce') {
      name = 'bruteforce_attack_simulation.log';
      rawContent = [
        `${ts(50)} | 198.51.100.99 | admin | LOGIN_FAILED | /api/v1/auth`,
        `${ts(40)} | 198.51.100.99 | admin | LOGIN_FAILED | /api/v1/auth`,
        `${ts(30)} | 198.51.100.99 | root | LOGIN_FAILED | /api/v1/auth`,
        `${ts(20)} | 198.51.100.99 | operator | LOGIN_FAILED | /api/v1/auth`,
        `${ts(10)} | 198.51.100.99 | system | LOGIN_FAILED | /api/v1/auth`,
        `${ts(5)} | 198.51.100.99 | admin | LOGIN_FAILED | /api/v1/auth`,
      ].join('\n');
    } else if (scenario === 'burst') {
      name = 'dos_http_flood_simulation.log';
      const lines = [];
      for (let i = 0; i < 55; i++) {
        lines.push(`${ts(i % 10)} | 203.0.113.44 | bot_flood | HTTP_REQUEST | /search?q=${i}`);
      }
      rawContent = lines.join('\n');
    } else if (scenario === 'blocklist') {
      name = 'blocklist_quarantined_traffic.log';
      rawContent = [
        `${ts(15)} | 203.0.113.195 | crawler | HTTP_REQUEST | /admin/config.env`,
        `${ts(10)} | 198.51.100.77 | root | LOGIN_FAILED | /ssh-login`,
        `${ts(5)} | 203.0.113.195 | scanner | HTTP_REQUEST | /phpmyadmin`,
      ].join('\n');
    } else if (scenario === 'enterprise') {
      name = 'enterprise_mixed_traffic.log';
      const lines = [];
      const users = ['sarah', 'alex', 'marcus', 'dev_agent', 'operator'];
      const endpoints = ['/dashboard', '/api/v1/metrics', '/settings', '/logs', '/login'];
      for (let i = 0; i < 35; i++) {
        const u = users[i % users.length];
        const ep = endpoints[i % endpoints.length];
        lines.push(`${ts(i * 4)} | 10.0.1.${(i % 15) + 1} | ${u} | HTTP_REQUEST | ${ep}`);
      }
      lines.push(`${ts(10)} | 192.168.1.105 | alex.chen | LOGIN_SUCCESS | /login`);
      rawContent = lines.join('\n');
    } else if (scenario === 'malformed') {
      name = 'corrupted_syslog_sample.log';
      rawContent = [
        `${ts(20)} | 192.168.1.10 | valid_user | HTTP_REQUEST | /home`,
        `INVALID_LINE_MISSING_PIPES_AND_TIMESTAMPS_ERROR`,
        `${ts(10)} | 999.999.999.999 | test | LOGIN_FAILED | /login`,
        `${ts(5)} | 192.168.1.12 | test | UNKNOWN_TYPE | /api`,
        `127.0.0.1 - - [14/Mar/2026] Apache standard format mismatch`,
      ].join('\n');
    }

    const file = new File([rawContent], name, { type: 'text/plain' });
    processFiles([file]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b dark:border-slate-800/80 border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight dark:text-white text-slate-900">
            Logs
          </h1>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">
            Query, validate, and ingest security log streams
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Terminal className="w-3.5 h-3.5" />}
            onClick={() => setShowLineTester((prev) => !prev)}
          >
            {showLineTester ? 'Hide Validator' : 'Line Validator'}
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={<UploadCloud className="w-3.5 h-3.5" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Import Logs
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
        <Card title="Line Validator" subtitle="Test individual log syntax against parser specifications">
          <div className="space-y-3 text-xs">
            <div className="flex gap-2">
              <input
                type="text"
                value={testLineInput}
                onChange={(e) => setTestLineInput(e.target.value)}
                placeholder="YYYY-MM-DD HH:mm:ss | IP | USER | EVENT_TYPE | ENDPOINT"
                className="flex-1 dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-1.5 font-mono text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500"
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

            <div className="p-3 dark:bg-slate-900/50 bg-slate-50 rounded-lg border dark:border-slate-800 border-slate-200">
              {testError ? (
                <div className="flex items-center gap-2 text-rose-500 font-mono text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Syntax Error: {testError}</span>
                </div>
              ) : testEntry ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
                  <div>
                    <span className="dark:text-slate-500 text-slate-400 block text-[10px]">TIMESTAMP</span>
                    <span className="text-emerald-500">{testEntry.timestamp}</span>
                  </div>
                  <div>
                    <span className="dark:text-slate-500 text-slate-400 block text-[10px]">SOURCE IP</span>
                    <span className="text-sky-500">{testEntry.sourceIp}</span>
                  </div>
                  <div>
                    <span className="dark:text-slate-500 text-slate-400 block text-[10px]">USERNAME</span>
                    <span className="dark:text-slate-200 text-slate-800">{testEntry.username}</span>
                  </div>
                  <div>
                    <span className="dark:text-slate-500 text-slate-400 block text-[10px]">EVENT</span>
                    <span className="text-amber-500">{testEntry.eventType}</span>
                  </div>
                  <div>
                    <span className="dark:text-slate-500 text-slate-400 block text-[10px]">ENDPOINT</span>
                    <span className="dark:text-slate-300 text-slate-700">{testEntry.endpoint}</span>
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
            ? 'border-sky-500 bg-sky-500/10'
            : 'dark:border-slate-800 border-slate-200 dark:bg-[#0c121e] bg-white hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
        }`}
      >
        {isProcessing && (
          <div className="absolute inset-0 dark:bg-[#0c121e]/95 bg-white/95 z-20 flex flex-col items-center justify-center p-6">
            <RefreshCw className="w-6 h-6 text-sky-500 animate-spin mb-2" />
            <p className="text-xs font-semibold dark:text-slate-100 text-slate-800">
              Ingesting stream ({importProgress}%)
            </p>
            <div className="w-56 dark:bg-slate-800 bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-sky-500 h-full transition-all duration-200"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center max-w-xl mx-auto">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center mb-2">
            <UploadCloud className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-semibold dark:text-slate-200 text-slate-800">
            Drop log files here or browse local storage
          </h3>
          <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5 mb-2.5">
            Accepts pipe-delimited <span className="font-mono">.log</span> and <span className="font-mono">.txt</span> streams
          </p>

          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            Browse Files...
          </Button>

          {/* Quick Attack Scenario Buttons */}
          <div className="mt-3.5 pt-3 border-t dark:border-slate-800/80 border-slate-100 w-full">
            <div className="text-[10px] font-mono dark:text-slate-500 text-slate-400 uppercase tracking-wider mb-2">
              Inject Attack Scenarios
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                onClick={() => loadPreset('bruteforce')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md border dark:border-rose-900/40 border-rose-200 dark:bg-rose-950/20 bg-rose-50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                Brute Force Attack
              </button>
              <button
                onClick={() => loadPreset('burst')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md border dark:border-amber-900/40 border-amber-200 dark:bg-amber-950/20 bg-amber-50 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                DoS Flood
              </button>
              <button
                onClick={() => loadPreset('blocklist')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md border dark:border-sky-900/40 border-sky-200 dark:bg-sky-950/20 bg-sky-50 text-sky-600 dark:text-sky-400 hover:bg-sky-100 transition-colors cursor-pointer"
              >
                Blocklist Origin Hit
              </button>
              <button
                onClick={() => loadPreset('enterprise')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md border dark:border-emerald-900/40 border-emerald-200 dark:bg-emerald-950/20 bg-emerald-50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Enterprise Mixed Batch (40)
              </button>
              <button
                onClick={() => loadPreset('malformed')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md border dark:border-slate-700/60 border-slate-200 dark:bg-slate-800/40 bg-slate-50 dark:text-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Malformed Entries
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ingestion Summary Card */}
      {lastImportResult && showImportSummary && (
        <div className="p-3.5 rounded-xl border dark:border-sky-900/40 border-sky-200 dark:bg-[#0c1527] bg-sky-50/50 text-xs shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b dark:border-sky-900/30 border-sky-200 mb-2.5">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-semibold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ingested: {lastImportResult.fileName}</span>
            </div>
            <button
              onClick={() => setShowImportSummary(false)}
              className="dark:text-slate-400 text-slate-500 hover:text-slate-800 text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="dark:text-slate-400 text-slate-500 text-[11px]">Total Lines</span>
              <p className="font-mono font-bold dark:text-slate-100 text-slate-900">{lastImportResult.totalLines}</p>
            </div>
            <div>
              <span className="dark:text-slate-400 text-slate-500 text-[11px]">Parsed Valid</span>
              <p className="font-mono font-bold text-emerald-500">{lastImportResult.parsedCount}</p>
            </div>
            <div>
              <span className="dark:text-slate-400 text-slate-500 text-[11px]">Rejected</span>
              <p className="font-mono font-bold text-rose-500">{lastImportResult.errorCount}</p>
            </div>
            <div>
              <span className="dark:text-slate-400 text-slate-500 text-[11px]">Alerts Generated</span>
              <p className="font-mono font-bold text-amber-500">+{lastImportResult.newAlertsGenerated}</p>
            </div>
          </div>

          {lastImportResult.malformedLines.length > 0 && (
            <div className="pt-2 mt-2 border-t dark:border-sky-900/30 border-sky-200 flex items-center justify-between">
              <span className="text-rose-500 text-xs">
                {lastImportResult.malformedLines.length} corrupted entries rejected by validator.
              </span>
              <Button size="sm" variant="outline" onClick={() => setShowMalformedModal(true)}>
                Inspect Errors ({lastImportResult.malformedLines.length})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Filter and Table Container */}
      <Card noPadding>
        <div className="p-4 border-b dark:border-slate-800/80 border-slate-200 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search IP, username, endpoint, or raw line..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs dark:text-slate-100 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="dark:text-slate-400 text-slate-500 text-[11px]">Source:</span>
                <select
                  value={selectedSource}
                  onChange={(e) => {
                    setSelectedSource(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-2 py-1 text-xs dark:text-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Sources ({logs.length})</option>
                  {logSources.map((s) => {
                    const count = logs.filter((l) => l.logSource === s).length;
                    return (
                      <option key={s} value={s}>
                        {s} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="dark:text-slate-400 text-slate-500 text-[11px]">HTTP:</span>
                <select
                  value={selectedStatusCode}
                  onChange={(e) => {
                    setSelectedStatusCode(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-2 py-1 text-xs dark:text-slate-200 text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Codes</option>
                  <option value="200">200 OK</option>
                  <option value="401">401 Auth</option>
                  <option value="403">403 Forbidden</option>
                  <option value="404">404 Missing</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="dark:text-slate-400 text-slate-500 text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-2 py-1 text-xs dark:text-slate-200 text-slate-800 focus:outline-none cursor-pointer"
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
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-slate-800/40 hover:bg-slate-100'
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
              <thead className="dark:bg-[#090e18] bg-slate-50 dark:text-slate-400 text-slate-500 font-mono uppercase tracking-wider text-[10px] border-b dark:border-slate-800/80 border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Timestamp</th>
                  <th className="py-2.5 px-4 font-medium">Source IP</th>
                  <th className="py-2.5 px-4 font-medium">User</th>
                  <th className="py-2.5 px-4 font-medium">Event</th>
                  <th className="py-2.5 px-4 font-medium">Endpoint</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Source</th>
                  <th className="py-2.5 px-4 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="dark:hover:bg-slate-800/30 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono dark:text-slate-400 text-slate-500 tabular-nums">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-sky-500 font-medium">
                      {log.sourceIp}
                    </td>
                    <td className="py-2.5 px-4 font-medium dark:text-slate-200 text-slate-800">
                      {log.username}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge label={log.eventType} variant="event" size="sm" />
                    </td>
                    <td className="py-2.5 px-4 font-mono dark:text-slate-300 text-slate-700 max-w-xs truncate" title={log.endpoint}>
                      {log.endpoint}
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      <span
                        className={`text-xs ${
                          log.statusCode && log.statusCode >= 400
                            ? 'text-rose-500'
                            : 'text-emerald-500'
                        }`}
                      >
                        {log.statusCode || 200}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 dark:text-slate-400 text-slate-500 text-[11px] max-w-[130px] truncate" title={log.logSource}>
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
        <div className="px-4 py-3 border-t dark:border-slate-800/80 border-slate-200 flex items-center justify-between text-xs dark:text-slate-400 text-slate-500 dark:bg-[#090e18] bg-slate-50">
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
            <span className="px-2 font-mono dark:text-slate-300 text-slate-700">
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
        title="Event Details"
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3.5 dark:bg-slate-900/60 bg-slate-50 rounded-lg border dark:border-slate-800/80 border-slate-200">
              <div>
                <span className="dark:text-slate-500 text-slate-400 font-mono text-[10px]">Timestamp</span>
                <p className="font-mono dark:text-slate-200 text-slate-800 mt-0.5">{inspectLog.timestamp}</p>
              </div>
              <div>
                <span className="dark:text-slate-500 text-slate-400 font-mono text-[10px]">Source IP</span>
                <p className="font-mono text-sky-500 font-semibold mt-0.5">{inspectLog.sourceIp}</p>
              </div>
              <div>
                <span className="dark:text-slate-500 text-slate-400 font-mono text-[10px]">Username</span>
                <p className="dark:text-slate-200 text-slate-800 font-medium mt-0.5">{inspectLog.username}</p>
              </div>
              <div>
                <span className="dark:text-slate-500 text-slate-400 font-mono text-[10px]">Event Type</span>
                <div className="mt-0.5">
                  <Badge label={inspectLog.eventType} variant="event" size="sm" />
                </div>
              </div>
              <div>
                <span className="dark:text-slate-500 text-slate-400 font-mono text-[10px]">Endpoint</span>
                <p className="font-mono dark:text-slate-300 text-slate-700 mt-0.5">{inspectLog.endpoint}</p>
              </div>
              <div>
                <span className="dark:text-slate-500 text-slate-400 font-mono text-[10px]">HTTP Status</span>
                <p className="font-mono dark:text-slate-200 text-slate-800 mt-0.5">{inspectLog.statusCode || 200}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="dark:text-slate-400 text-slate-600 font-medium">
                  Raw Log Line
                </span>
                <button
                  onClick={() => handleCopyRaw(inspectLog.rawLine)}
                  className="flex items-center gap-1 text-[11px] text-sky-500 hover:text-sky-600 cursor-pointer"
                >
                  {copiedRaw ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
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
              <pre className="p-3 dark:bg-black/60 bg-slate-100 rounded-lg border dark:border-slate-800 border-slate-200 font-mono text-[11px] dark:text-slate-300 text-slate-800 overflow-x-auto whitespace-pre-wrap select-all">
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
                className="p-3 rounded-lg dark:bg-slate-900/60 bg-slate-50 border dark:border-rose-900/30 border-rose-200 text-xs font-mono"
              >
                <div className="flex items-center justify-between text-rose-500 font-semibold mb-1">
                  <span>Line {item.line} Error</span>
                  <span className="dark:text-slate-500 text-slate-400 text-[10px]">REJECTED</span>
                </div>
                <p className="text-rose-500 text-[11px] mb-2">{item.error}</p>
                <div className="p-2 dark:bg-black/50 bg-slate-100 rounded border dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-600 text-[10px] break-all">
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
