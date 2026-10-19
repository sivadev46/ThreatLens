import {
  LogEntry,
  DetectionRule,
  Alert,
  AlertStatus,
  BlocklistEntry,
  AuditLogEntry,
  UserProfile,
  DashboardSummary,
  LogImportResult,
  UploadedFileRecord,
  FileImportStatus,
} from '../types/security';
import {
  INITIAL_USER,
  INITIAL_DETECTION_RULES,
  INITIAL_BLOCKLIST,
  INITIAL_LOG_ENTRIES,
  INITIAL_ALERTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_UPLOADED_FILES,
} from './mockSecurityData';

const STORAGE_KEYS = {
  LOGS: 'sla_logs_v1',
  RULES: 'sla_rules_v1',
  ALERTS: 'sla_alerts_v1',
  BLOCKLIST: 'sla_blocklist_v1',
  AUDIT: 'sla_audit_v1',
  USER: 'sla_user_v1',
  FILES: 'sla_files_v1',
};

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

class SecurityService {
  private logs: LogEntry[] = [];
  private rules: DetectionRule[] = [];
  private alerts: Alert[] = [];
  private blocklist: BlocklistEntry[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private uploadedFiles: UploadedFileRecord[] = [];
  private currentUser: UserProfile = INITIAL_USER;
  private listeners: Array<() => void> = [];

  constructor() {
    this.initFromStorage();
  }

  private initFromStorage() {
    try {
      const storedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
      const storedRules = localStorage.getItem(STORAGE_KEYS.RULES);
      const storedAlerts = localStorage.getItem(STORAGE_KEYS.ALERTS);
      const storedBlocklist = localStorage.getItem(STORAGE_KEYS.BLOCKLIST);
      const storedAudit = localStorage.getItem(STORAGE_KEYS.AUDIT);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const storedFiles = localStorage.getItem(STORAGE_KEYS.FILES);

      this.logs = storedLogs ? JSON.parse(storedLogs) : [...INITIAL_LOG_ENTRIES];
      this.rules = storedRules ? JSON.parse(storedRules) : [...INITIAL_DETECTION_RULES];
      this.alerts = storedAlerts ? JSON.parse(storedAlerts) : [...INITIAL_ALERTS];
      this.blocklist = storedBlocklist ? JSON.parse(storedBlocklist) : [...INITIAL_BLOCKLIST];
      this.auditLogs = storedAudit ? JSON.parse(storedAudit) : [...INITIAL_AUDIT_LOGS];
      this.currentUser = storedUser ? JSON.parse(storedUser) : { ...INITIAL_USER };
      this.uploadedFiles = storedFiles ? JSON.parse(storedFiles) : [...INITIAL_UPLOADED_FILES];
    } catch {
      this.logs = [...INITIAL_LOG_ENTRIES];
      this.rules = [...INITIAL_DETECTION_RULES];
      this.alerts = [...INITIAL_ALERTS];
      this.blocklist = [...INITIAL_BLOCKLIST];
      this.auditLogs = [...INITIAL_AUDIT_LOGS];
      this.currentUser = { ...INITIAL_USER };
      this.uploadedFiles = [...INITIAL_UPLOADED_FILES];
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(this.logs));
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(this.rules));
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(this.alerts));
      localStorage.setItem(STORAGE_KEYS.BLOCKLIST, JSON.stringify(this.blocklist));
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(this.auditLogs));
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(this.uploadedFiles));
    } catch {
      // storage unavailable fallback
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // Current User
  public getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  public updateProfile(updated: Partial<UserProfile>): void {
    this.currentUser = { ...this.currentUser, ...updated };
    this.logAudit({
      actor: this.currentUser.username,
      action: 'PROFILE_UPDATE',
      category: 'AUTH',
      details: 'Updated analyst user profile configuration',
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });
    this.persist();
  }

  // Dashboard Metrics
  public getDashboardSummary(): DashboardSummary {
    const totalLogsAnalyzed = this.logs.length;
    const criticalAlerts = this.alerts.filter((a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
    const highAlerts = this.alerts.filter((a) => a.severity === 'HIGH' && a.status !== 'RESOLVED').length;
    const failedLoginAttempts = this.logs.filter((l) => l.eventType === 'LOGIN_FAILED').length;

    const activeBlockedIps = new Set(
      this.blocklist.filter((b) => b.status === 'ACTIVE').map((b) => b.ipAddress)
    );
    const blocklistedIpHits = this.logs.filter((l) => activeBlockedIps.has(l.sourceIp)).length;

    const openAlertsCount = this.alerts.filter((a) => a.status === 'OPEN').length;
    const investigatingAlertsCount = this.alerts.filter((a) => a.status === 'INVESTIGATING').length;
    const resolvedAlertsCount = this.alerts.filter((a) => a.status === 'RESOLVED').length;
    const activeBlocklistCount = this.blocklist.filter((b) => b.status === 'ACTIVE').length;
    const activeRulesCount = this.rules.filter((r) => r.enabled).length;

    return {
      totalLogsAnalyzed,
      criticalAlerts,
      highAlerts,
      failedLoginAttempts,
      blocklistedIpHits,
      openAlertsCount,
      investigatingAlertsCount,
      resolvedAlertsCount,
      activeBlocklistCount,
      activeRulesCount,
    };
  }

  // Logs
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public getLogSources(): string[] {
    const sources = new Set<string>();
    this.logs.forEach((l) => {
      if (l.logSource) sources.add(l.logSource);
    });
    return Array.from(sources);
  }

  public clearLogs(): void {
    const count = this.logs.length;
    this.logs = [];
    this.logAudit({
      actor: this.currentUser.username,
      action: 'LOGS_CLEARED',
      category: 'LOG_IMPORT',
      details: `Purged ${count} event records from active correlation memory`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });
    this.persist();
  }

  // Log Import & Parsing
  public parseLogLine(raw: string, lineNum = 1, sourceName = 'uploaded.log'): { entry?: LogEntry; error?: string } {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) return {};

    // Standard format: 2026-03-14 10:15:32 | 192.168.1.50 | alice | LOGIN_FAILED | /login
    const parts = trimmed.split('|').map((p) => p.trim());
    if (parts.length < 5) {
      return {
        error: `Line ${lineNum}: Expected 5 pipe-delimited fields [timestamp | ip | user | event_type | endpoint], found ${parts.length}`,
      };
    }

    const [timestamp, sourceIp, username, eventTypeRaw, endpoint] = parts;

    // Validate event type
    const validEventTypes = ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'HTTP_REQUEST', 'LOGOUT'];
    if (!validEventTypes.includes(eventTypeRaw)) {
      return {
        error: `Line ${lineNum}: Invalid event type "${eventTypeRaw}". Must be one of: ${validEventTypes.join(', ')}`,
      };
    }

    // Basic IP validation
    if (!this.isValidIp(sourceIp)) {
      return {
        error: `Line ${lineNum}: Invalid IPv4 format "${sourceIp}"`,
      };
    }

    return {
      entry: {
        id: `log-${Date.now()}-${lineNum}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        sourceIp,
        username,
        eventType: eventTypeRaw as LogEntry['eventType'],
        endpoint,
        rawLine: trimmed,
        logSource: sourceName,
        statusCode: eventTypeRaw === 'LOGIN_FAILED' ? 401 : 200,
      },
    };
  }

  public importLogContent(
    content: string,
    fileName = 'imported_logs.log',
    fileSizeBytes?: number
  ): LogImportResult {
    const lines = content.split('\n');
    const parsedEntries: LogEntry[] = [];
    const malformedLines: Array<{ line: number; raw: string; error: string }> = [];

    lines.forEach((line, index) => {
      if (!line.trim() || line.trim().startsWith('#')) return;
      const { entry, error } = this.parseLogLine(line, index + 1, fileName);
      if (error) {
        malformedLines.push({ line: index + 1, raw: line, error });
      } else if (entry) {
        parsedEntries.push(entry);
      }
    });

    // Check existing logs to deduplicate entries by signature
    const existingSignatures = new Set(
      this.logs.map((l) => `${l.timestamp}|${l.sourceIp}|${l.username}|${l.eventType}|${l.endpoint}`)
    );

    const newUniqueEntries: LogEntry[] = [];
    parsedEntries.forEach((entry) => {
      const sig = `${entry.timestamp}|${entry.sourceIp}|${entry.username}|${entry.eventType}|${entry.endpoint}`;
      if (!existingSignatures.has(sig)) {
        existingSignatures.add(sig);
        newUniqueEntries.push(entry);
      }
    });

    // Add only new unique entries to logs collection
    this.logs = [...newUniqueEntries, ...this.logs];

    // Trigger local simulation rule evaluation on new unique entries
    const newAlertsGenerated = newUniqueEntries.length > 0
      ? this.simulateRuleEvaluation(newUniqueEntries)
      : 0;

    // Determine status
    let status: FileImportStatus = 'Completed';
    if (parsedEntries.length === 0) {
      status = 'Failed';
    } else if (malformedLines.length > 0) {
      status = 'Completed with Errors';
    }

    const calculatedSize = fileSizeBytes || new Blob([content]).size;
    const fileId = `file-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const fileRecord: UploadedFileRecord = {
      id: fileId,
      fileName,
      fileType: fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || 'log' : 'log',
      uploadDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      fileSizeFormatted: formatBytes(calculatedSize),
      fileSizeBytes: calculatedSize,
      status,
      parsedEntries: parsedEntries.length,
      rejectedEntries: malformedLines.length,
      totalLines: lines.length,
      newAlertsGenerated,
      malformedLines,
      rawContent: content.length <= 500000 ? content : content.substring(0, 500000),
      isSystemSample: false,
    };

    // Prepend to uploaded files list, updating if existing non-system file with exact same name exists
    const existingFileIdx = this.uploadedFiles.findIndex((f) => f.fileName === fileName && !f.isSystemSample);
    if (existingFileIdx >= 0) {
      this.uploadedFiles[existingFileIdx] = fileRecord;
    } else {
      this.uploadedFiles.unshift(fileRecord);
    }

    const duplicatesSkipped = parsedEntries.length - newUniqueEntries.length;
    this.logAudit({
      actor: this.currentUser.username,
      action: 'LOG_IMPORT',
      category: 'LOG_IMPORT',
      details: `Imported ${parsedEntries.length} valid entries from ${fileName} (${newUniqueEntries.length} new ingested, ${duplicatesSkipped} duplicates skipped, ${malformedLines.length} malformed)`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    this.persist();

    return {
      totalLines: lines.length,
      parsedCount: parsedEntries.length,
      errorCount: malformedLines.length,
      newAlertsGenerated,
      fileName,
      sourceName: fileName,
      importTimestamp: fileRecord.uploadDate,
      malformedLines,
      fileId,
    };
  }

  // File Manager API
  public getUploadedFiles(): UploadedFileRecord[] {
    return [...this.uploadedFiles];
  }

  public getUploadedFileById(id: string): UploadedFileRecord | undefined {
    return this.uploadedFiles.find((f) => f.id === id);
  }

  public getFileLogs(sourceName: string): LogEntry[] {
    return this.logs.filter((l) => l.logSource === sourceName);
  }

  public getFilesSummary() {
    const totalFiles = this.uploadedFiles.length;
    const completedCount = this.uploadedFiles.filter((f) => f.status === 'Completed').length;
    const failedCount = this.uploadedFiles.filter((f) => f.status === 'Failed' || f.status === 'Completed with Errors').length;
    const totalEventsImported = this.uploadedFiles.reduce((acc, f) => acc + f.parsedEntries, 0);

    return {
      totalFiles,
      completedCount,
      successfullyProcessed: completedCount,
      failedCount,
      failedImports: failedCount,
      totalEventsImported,
    };
  }

  public deleteUploadedFile(id: string): {
    success: boolean;
    status: 'Archived' | 'Deleted' | 'Failed';
    message: string;
    evidenceProtectedCount?: number;
  } {
    const file = this.uploadedFiles.find((f) => f.id === id);
    if (!file) {
      return { success: false, status: 'Failed', message: 'File record not found.' };
    }

    if (file.isSystemSample) {
      return { success: false, status: 'Failed', message: 'System baseline log files cannot be deleted.' };
    }

    // Safety check: Find all evidence logs tied to active or existing alerts
    const protectedEvidenceIds = new Set<string>();
    this.alerts.forEach((alert) => {
      alert.evidenceLogIds?.forEach((eId) => protectedEvidenceIds.add(eId));
    });

    // Check which logs from this file are protected evidence
    const fileLogs = this.logs.filter((l) => l.logSource === file.fileName);
    const evidenceLogs = fileLogs.filter((l) => protectedEvidenceIds.has(l.id));

    if (evidenceLogs.length > 0) {
      // Retain evidence logs, remove non-evidence logs, mark file as Archived
      file.status = 'Archived';
      this.logs = this.logs.filter((l) => l.logSource !== file.fileName || protectedEvidenceIds.has(l.id));

      this.logAudit({
        actor: this.currentUser.username,
        action: 'FILE_ARCHIVE',
        category: 'LOG_IMPORT',
        details: `Archived ${file.fileName}: safely retained ${evidenceLogs.length} incident evidence log(s) for active security alerts`,
        ipAddress: '127.0.0.1',
        status: 'SUCCESS',
      });
      this.persist();
      return {
        success: true,
        status: 'Archived',
        message: `File archived: ${evidenceLogs.length} incident evidence log(s) preserved to protect forensic audit trails.`,
        evidenceProtectedCount: evidenceLogs.length,
      };
    }

    // Safe to delete completely: remove all logs belonging to this source
    this.logs = this.logs.filter((l) => l.logSource !== file.fileName);
    this.uploadedFiles = this.uploadedFiles.filter((f) => f.id !== id);

    this.logAudit({
      actor: this.currentUser.username,
      action: 'FILE_DELETE',
      category: 'LOG_IMPORT',
      details: `Deleted file ${file.fileName} and purged ${fileLogs.length} associated log entries`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    this.persist();
    return {
      success: true,
      status: 'Deleted',
      message: `File ${file.fileName} deleted and ${fileLogs.length} event records purged.`,
    };
  }

  public reprocessUploadedFile(id: string): { success: boolean; message: string; result?: LogImportResult } {
    const file = this.uploadedFiles.find((f) => f.id === id);
    if (!file) {
      return { success: false, message: 'File not found.' };
    }
    if (!file.rawContent) {
      return { success: false, message: 'Raw content not available for reprocessing.' };
    }

    // Purge previous non-evidence logs from this source before reprocessing
    const protectedEvidenceIds = new Set<string>();
    this.alerts.forEach((alert) => {
      alert.evidenceLogIds?.forEach((eId) => protectedEvidenceIds.add(eId));
    });
    this.logs = this.logs.filter((l) => l.logSource !== file.fileName || protectedEvidenceIds.has(l.id));

    // Re-import
    const res = this.importLogContent(file.rawContent, file.fileName, file.fileSizeBytes);
    this.persist();
    return {
      success: true,
      message: `Reprocessed ${file.fileName}: ${res.parsedCount} valid events, ${res.newAlertsGenerated} alerts generated.`,
      result: res,
    };
  }

  public getEventsTimeSeries(): Array<{ time: string; total: number; failedLogins: number }> {
    if (this.logs.length === 0) {
      return [
        { time: '08:00', total: 0, failedLogins: 0 },
        { time: '10:00', total: 0, failedLogins: 0 },
        { time: '12:00', total: 0, failedLogins: 0 },
        { time: '14:00', total: 0, failedLogins: 0 },
      ];
    }

    const bucketMap = new Map<string, { total: number; failedLogins: number }>();
    const sorted = [...this.logs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    sorted.forEach((l) => {
      const timeStr = l.timestamp.length >= 16 ? l.timestamp.substring(11, 16) : '00:00';
      const cur = bucketMap.get(timeStr) || { total: 0, failedLogins: 0 };
      cur.total++;
      if (l.eventType === 'LOGIN_FAILED') cur.failedLogins++;
      bucketMap.set(timeStr, cur);
    });

    const list = Array.from(bucketMap.entries())
      .map(([time, data]) => ({ time, total: data.total, failedLogins: data.failedLogins }))
      .sort((a, b) => a.time.localeCompare(b.time));

    if (list.length > 10) {
      const step = Math.ceil(list.length / 8);
      return list.filter((_, idx) => idx % step === 0);
    }
    return list.length > 0 ? list : [{ time: 'Now', total: this.logs.length, failedLogins: 0 }];
  }

  // Local simulated rule engine (mirrors Stage D Java business logic in frontend prototype)
  private simulateRuleEvaluation(newEntries: LogEntry[]): number {
    let alertCount = 0;
    const rule1 = this.rules.find((r) => r.code === 'RULE_BRUTE_FORCE');
    const rule2 = this.rules.find((r) => r.code === 'RULE_REQUEST_BURST');
    const rule3 = this.rules.find((r) => r.code === 'RULE_BLOCKLIST_IP');

    const activeBlocklistIps = new Set(
      this.blocklist.filter((b) => b.status === 'ACTIVE').map((b) => b.ipAddress)
    );

    // Rule 3: Blocklist hits
    if (rule3 && rule3.enabled) {
      newEntries.forEach((entry) => {
        if (activeBlocklistIps.has(entry.sourceIp)) {
          // Check if open alert already exists for this IP and rule
          const existing = this.alerts.find(
            (a) => a.ruleCode === 'RULE_BLOCKLIST_IP' && a.sourceIp === entry.sourceIp && a.status !== 'RESOLVED'
          );
          if (!existing) {
            const newAlert: Alert = {
              id: `alt-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
              ruleId: rule3.id,
              ruleCode: rule3.code,
              ruleName: rule3.name,
              severity: rule3.severity,
              sourceIp: entry.sourceIp,
              eventCount: 1,
              timestamp: entry.timestamp,
              status: 'OPEN',
              summary: `Blocked IP ${entry.sourceIp} generated event [${entry.eventType}] on ${entry.endpoint}`,
              affectedUsername: entry.username,
              notes: [],
              history: [
                {
                  id: `hist-${Date.now()}`,
                  alertId: '',
                  previousStatus: 'OPEN',
                  newStatus: 'OPEN',
                  changedBy: 'System (Rule Engine)',
                  timestamp: entry.timestamp,
                  reason: 'Immediate blocklist match trigger',
                },
              ],
              evidenceLogIds: [entry.id],
            };
            this.alerts.unshift(newAlert);
            rule3.totalTriggerCount += 1;
            rule3.lastTriggered = entry.timestamp;
            alertCount++;
          }
        }
      });
    }

    // Rule 1: Failed logins >= threshold within rolling window
    if (rule1 && rule1.enabled) {
      const failedByIp = new Map<string, LogEntry[]>();
      newEntries
        .filter((e) => e.eventType === 'LOGIN_FAILED')
        .forEach((e) => {
          const list = failedByIp.get(e.sourceIp) || [];
          list.push(e);
          failedByIp.set(e.sourceIp, list);
        });

      failedByIp.forEach((entries, ip) => {
        if (entries.length >= rule1.thresholdValue) {
          const existing = this.alerts.find(
            (a) => a.ruleCode === 'RULE_BRUTE_FORCE' && a.sourceIp === ip && a.status !== 'RESOLVED'
          );
          if (!existing) {
            const newAlert: Alert = {
              id: `alt-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
              ruleId: rule1.id,
              ruleCode: rule1.code,
              ruleName: rule1.name,
              severity: rule1.severity,
              sourceIp: ip,
              eventCount: entries.length,
              timestamp: entries[entries.length - 1].timestamp,
              status: 'OPEN',
              summary: `Detected ${entries.length} failed login attempts for account "${entries[0].username}" within rolling window.`,
              affectedUsername: entries[0].username,
              notes: [],
              history: [
                {
                  id: `hist-${Date.now()}`,
                  alertId: '',
                  previousStatus: 'OPEN',
                  newStatus: 'OPEN',
                  changedBy: 'System (Rule Engine)',
                  timestamp: entries[entries.length - 1].timestamp,
                  reason: `Threshold met: ${entries.length} failed logins`,
                },
              ],
              evidenceLogIds: entries.map((e) => e.id),
            };
            this.alerts.unshift(newAlert);
            rule1.totalTriggerCount += 1;
            rule1.lastTriggered = entries[entries.length - 1].timestamp;
            alertCount++;
          }
        }
      });
    }

    return alertCount;
  }

  // Alerts
  public getAlerts(): Alert[] {
    return [...this.alerts];
  }

  public getAlertById(id: string): Alert | undefined {
    return this.alerts.find((a) => a.id === id);
  }

  public updateAlertStatus(alertId: string, newStatus: AlertStatus, reason: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) return false;

    const previousStatus = alert.status;
    alert.status = newStatus;
    const historyEntry = {
      id: `hist-${Date.now()}`,
      alertId,
      previousStatus,
      newStatus,
      changedBy: this.currentUser.fullName,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      reason: reason || `Analyst triage updated status to ${newStatus}`,
    };
    alert.history.unshift(historyEntry);

    this.logAudit({
      actor: this.currentUser.username,
      action: 'ALERT_STATUS_UPDATE',
      category: 'ALERT_TRIAGE',
      details: `Alert ${alertId} status changed from ${previousStatus} to ${newStatus} (Reason: ${reason})`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    this.persist();
    return true;
  }

  public addAlertNote(alertId: string, noteText: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert || !noteText.trim()) return false;

    alert.notes.unshift({
      id: `note-${Date.now()}`,
      alertId,
      authorName: this.currentUser.fullName,
      authorRole: this.currentUser.role,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      note: noteText.trim(),
    });

    this.logAudit({
      actor: this.currentUser.username,
      action: 'ALERT_NOTE_ADD',
      category: 'ALERT_TRIAGE',
      details: `Added investigation note to alert ${alertId}`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    this.persist();
    return true;
  }

  public batchUpdateAlertStatus(alertIds: string[], newStatus: AlertStatus, reason: string): number {
    let count = 0;
    alertIds.forEach((id) => {
      const alert = this.alerts.find((a) => a.id === id);
      if (alert && alert.status !== newStatus) {
        const prev = alert.status;
        alert.status = newStatus;
        alert.history.unshift({
          id: `hist-${Date.now()}-${count}`,
          alertId: id,
          previousStatus: prev,
          newStatus,
          changedBy: this.currentUser.fullName,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          reason: reason || `Batch update to ${newStatus}`,
        });
        count++;
      }
    });

    if (count > 0) {
      this.logAudit({
        actor: this.currentUser.username,
        action: 'BATCH_ALERT_STATUS_UPDATE',
        category: 'ALERT_TRIAGE',
        details: `Batch transitioned ${count} alerts to ${newStatus} status`,
        ipAddress: '127.0.0.1',
        status: 'SUCCESS',
      });
      this.persist();
    }
    return count;
  }

  public getEvidenceLogsForAlert(alert: Alert): LogEntry[] {
    if (alert.evidenceLogIds && alert.evidenceLogIds.length > 0) {
      const idSet = new Set(alert.evidenceLogIds);
      const matches = this.logs.filter((l) => idSet.has(l.id));
      if (matches.length > 0) return matches;
    }
    // Fallback: match by source IP and relevant event type
    return this.logs
      .filter((l) => l.sourceIp === alert.sourceIp)
      .slice(0, 10);
  }

  public isIpBlocked(ip: string): boolean {
    return this.blocklist.some((b) => b.ipAddress === ip && b.status === 'ACTIVE');
  }

  // Detection Rules
  public getRules(): DetectionRule[] {
    return [...this.rules];
  }

  public toggleRule(ruleId: string): boolean {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return false;

    rule.enabled = !rule.enabled;

    this.logAudit({
      actor: this.currentUser.username,
      action: rule.enabled ? 'RULE_ENABLED' : 'RULE_DISABLED',
      category: 'RULE_CONFIG',
      details: `${rule.name} was ${rule.enabled ? 'enabled' : 'disabled'}`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    this.persist();
    return true;
  }

  public updateRuleParameters(ruleId: string, updates: Partial<DetectionRule>): boolean {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return false;

    if (updates.thresholdValue !== undefined) rule.thresholdValue = updates.thresholdValue;
    if (updates.timeWindowSeconds !== undefined) rule.timeWindowSeconds = updates.timeWindowSeconds;
    if (updates.severity !== undefined) rule.severity = updates.severity;
    if (updates.name !== undefined) rule.name = updates.name;
    if (updates.description !== undefined) rule.description = updates.description;

    this.logAudit({
      actor: this.currentUser.username,
      action: 'RULE_PARAMETERS_UPDATE',
      category: 'RULE_CONFIG',
      details: `Updated parameters for detection rule ${rule.code}`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    this.persist();
    return true;
  }

  public updateRule(rule: DetectionRule): boolean {
    return this.updateRuleParameters(rule.id, rule);
  }

  public addCustomRule(ruleData: Omit<DetectionRule, 'id' | 'totalTriggerCount'>): { success: boolean; error?: string } {
    const code = ruleData.code.trim().toUpperCase();
    if (!code.startsWith('RULE_')) {
      return { success: false, error: 'Rule code must start with "RULE_" prefix (e.g. RULE_ADMIN_SCAN).' };
    }

    if (this.rules.some((r) => r.code === code)) {
      return { success: false, error: `Rule code ${code} already exists.` };
    }

    const newRule: DetectionRule = {
      id: `rule-${Date.now()}`,
      code,
      name: ruleData.name.trim(),
      description: ruleData.description.trim(),
      severity: ruleData.severity,
      enabled: true,
      thresholdValue: ruleData.thresholdValue,
      timeWindowSeconds: ruleData.timeWindowSeconds,
      targetEventType: ruleData.targetEventType,
      triggerConditionExplanation: ruleData.triggerConditionExplanation || `COUNT(${ruleData.targetEventType}) >= ${ruleData.thresholdValue} in ${ruleData.timeWindowSeconds}s`,
      totalTriggerCount: 0,
    };

    this.rules.push(newRule);

    this.logAudit({
      actor: this.currentUser.username,
      action: 'CUSTOM_RULE_CREATED',
      category: 'RULE_CONFIG',
      details: `Created new detection heuristic ${code} (${newRule.name})`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    this.persist();
    return { success: true };
  }

  public deleteRule(ruleId: string): { success: boolean; error?: string } {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return { success: false, error: 'Rule not found.' };

    const coreRules = ['RULE_BRUTE_FORCE', 'RULE_REQUEST_BURST', 'RULE_BLOCKLIST_IP'];
    if (coreRules.includes(rule.code)) {
      return { success: false, error: 'Core engine detection rules cannot be deleted. You may disable them instead.' };
    }

    this.rules = this.rules.filter((r) => r.id !== ruleId);

    this.logAudit({
      actor: this.currentUser.username,
      action: 'CUSTOM_RULE_DELETED',
      category: 'RULE_CONFIG',
      details: `Deleted custom detection rule ${rule.code}`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    this.persist();
    return { success: true };
  }

  public testRuleDryRun(ruleId: string): { matches: number; simulatedAlerts: number; details: string[] } {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return { matches: 0, simulatedAlerts: 0, details: ['Rule not found'] };

    const details: string[] = [];
    let matches = 0;
    let simulatedAlerts = 0;

    if (rule.code === 'RULE_BLOCKLIST_IP') {
      const activeBlockedIps = new Set(this.blocklist.filter((b) => b.status === 'ACTIVE').map((b) => b.ipAddress));
      this.logs.forEach((log) => {
        if (activeBlockedIps.has(log.sourceIp)) {
          matches++;
          details.push(`Matched event: [${log.timestamp}] ${log.sourceIp} generated ${log.eventType} on ${log.endpoint}`);
        }
      });
      simulatedAlerts = matches > 0 ? 1 : 0;
    } else {
      // Group matching logs by source IP
      const matchingLogs = this.logs.filter((l) =>
        rule.targetEventType === 'ALL' ? true : l.eventType === rule.targetEventType
      );
      matches = matchingLogs.length;

      const ipGroups = new Map<string, LogEntry[]>();
      matchingLogs.forEach((l) => {
        const list = ipGroups.get(l.sourceIp) || [];
        list.push(l);
        ipGroups.set(l.sourceIp, list);
      });

      ipGroups.forEach((entries, ip) => {
        if (entries.length >= rule.thresholdValue) {
          simulatedAlerts++;
          details.push(`Condition satisfied for ${ip}: ${entries.length} events (Threshold: ${rule.thresholdValue})`);
        }
      });
    }

    return { matches, simulatedAlerts, details };
  }

  // IP Blocklist
  public getBlocklist(): BlocklistEntry[] {
    return [...this.blocklist];
  }

  public validateIpv4(ip: string): { valid: boolean; isPrivate: boolean; error?: string } {
    const trimmed = ip.trim();
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = trimmed.match(ipv4Regex);
    if (!match) {
      return { valid: false, isPrivate: false, error: 'Must contain exactly 4 numeric octets separated by dots' };
    }

    const octets = [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), parseInt(match[4], 10)];
    for (let i = 0; i < 4; i++) {
      if (octets[i] < 0 || octets[i] > 255) {
        return { valid: false, isPrivate: false, error: `Octet ${i + 1} (${octets[i]}) exceeds 0-255 boundary` };
      }
    }

    // RFC 1918 Private ranges & Loopback
    // 10.0.0.0 - 10.255.255.255
    // 172.16.0.0 - 172.31.255.255
    // 192.168.0.0 - 192.168.255.255
    // 127.0.0.0/8
    const isPrivate =
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168);

    return { valid: true, isPrivate };
  }

  public isValidIp(ip: string): boolean {
    return this.validateIpv4(ip).valid;
  }

  public addBlocklistEntry(
    ipOrEntry: string | { ipAddress: string; reason?: string; threatCategory?: BlocklistEntry['threatCategory']; threatAsn?: string },
    optReason = '',
    optThreatCategory: BlocklistEntry['threatCategory'] = 'MANUAL',
    optThreatAsn = 'AS-UNKNOWN'
  ): { success: boolean; error?: string } {
    const ipAddress = typeof ipOrEntry === 'string' ? ipOrEntry : ipOrEntry.ipAddress;
    const reason = typeof ipOrEntry === 'string' ? optReason : (ipOrEntry.reason || 'Manual containment');
    const threatCategory = typeof ipOrEntry === 'string' ? optThreatCategory : (ipOrEntry.threatCategory || 'MANUAL');
    const threatAsn = typeof ipOrEntry === 'string' ? optThreatAsn : (ipOrEntry.threatAsn || 'AS-UNKNOWN');

    const cleanIp = (ipAddress || '').trim();
    const validation = this.validateIpv4(cleanIp);
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Invalid IPv4 address format. Must be four octets (0-255).' };
    }

    const existing = this.blocklist.find((b) => b.ipAddress === cleanIp);
    if (existing) {
      if (existing.status === 'ACTIVE') {
        return { success: false, error: `IP ${cleanIp} is already actively in the blocklist.` };
      } else {
        existing.status = 'ACTIVE';
        existing.reason = reason;
        existing.threatCategory = threatCategory;
        existing.threatAsn = threatAsn;
        this.logAudit({
          actor: this.currentUser.username,
          action: 'IP_BLOCKLIST_REACTIVATE',
          category: 'BLOCKLIST',
          details: `Reactivated IP ${cleanIp} on blocklist (Reason: ${reason})`,
          ipAddress: '127.0.0.1',
          status: 'SUCCESS',
        });
        this.persist();
        return { success: true };
      }
    }

    const newEntry: BlocklistEntry = {
      id: `blk-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
      ipAddress: cleanIp,
      reason: reason || 'Manual analyst containment rule',
      addedBy: this.currentUser.username,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'ACTIVE',
      associatedAlertCount: this.alerts.filter((a) => a.sourceIp === cleanIp).length,
      threatCategory,
      threatAsn,
    };

    this.blocklist.unshift(newEntry);

    this.logAudit({
      actor: this.currentUser.username,
      action: 'IP_BLOCKLIST_ADD',
      category: 'BLOCKLIST',
      details: `Added ${cleanIp} to blocklist [${threatCategory}]: ${reason}`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    this.persist();
    return { success: true };
  }

  public importBulkBlocklist(lines: string[]): { added: number; skippedDuplicates: number; invalid: number } {
    let added = 0;
    let skippedDuplicates = 0;
    let invalid = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const parts = trimmed.split('|').map((p) => p.trim());
      const ip = parts[0];
      const reason = parts[1] || 'Bulk threat intelligence feed import';
      const cat = (parts[2] as BlocklistEntry['threatCategory']) || 'SCANNER';

      if (!this.isValidIp(ip)) {
        invalid++;
        return;
      }

      if (this.blocklist.some((b) => b.ipAddress === ip && b.status === 'ACTIVE')) {
        skippedDuplicates++;
        return;
      }

      const res = this.addBlocklistEntry(ip, reason, cat, 'AS-BULK-FEED');
      if (res.success) added++;
    });

    return { added, skippedDuplicates, invalid };
  }

  public getAlertsForIp(ip: string): Alert[] {
    return this.alerts.filter((a) => a.sourceIp === ip);
  }

  public getLogsForIp(ip: string): LogEntry[] {
    return this.logs.filter((l) => l.sourceIp === ip);
  }

  public removeBlocklistEntry(id: string): boolean {
    const entry = this.blocklist.find((b) => b.id === id);
    if (!entry) return false;

    this.blocklist = this.blocklist.filter((b) => b.id !== id);

    this.logAudit({
      actor: this.currentUser.username,
      action: 'IP_BLOCKLIST_REMOVE',
      category: 'BLOCKLIST',
      details: `Removed IP ${entry.ipAddress} from blocklist`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    this.persist();
    return true;
  }

  public toggleBlocklistStatus(id: string): boolean {
    const entry = this.blocklist.find((b) => b.id === id);
    if (!entry) return false;

    entry.status = entry.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    this.logAudit({
      actor: this.currentUser.username,
      action: 'IP_BLOCKLIST_TOGGLE',
      category: 'BLOCKLIST',
      details: `Changed blocklist status for ${entry.ipAddress} to ${entry.status}`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    this.persist();
    return true;
  }

  // Audit Logs
  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  private generateAuditHash(timestamp: string, actor: string, action: string, details: string): string {
    let hash = 0;
    const str = `${timestamp}:${actor}:${action}:${details}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `sha256:${hex}${hex.split('').reverse().join('')}e74b92`;
  }

  public logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const hash = this.generateAuditHash(timestamp, entry.actor, entry.action, entry.details);
    const auditItem: AuditLogEntry = {
      id: `adt-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
      timestamp,
      ...entry,
      hash,
    };
    this.auditLogs.unshift(auditItem);
    this.persist();
  }

  public triggerManualAuditTest(details = 'SOC Compliance Verification Check'): void {
    this.logAudit({
      actor: this.currentUser.username,
      action: 'SOC_COMPLIANCE_TEST',
      category: 'SYSTEM',
      details,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });
  }

  // Real-time Event Simulation for SOC Live View
  public generateSimulatedLiveEvent(): LogEntry {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // Sample realistic traffic pools
    const trafficPool = [
      { ip: '192.168.1.42', user: 'system_agent', type: 'HTTP_REQUEST' as const, endpoint: '/api/v1/metrics', code: 200 },
      { ip: '10.0.1.20', user: 'bob_operator', type: 'HTTP_REQUEST' as const, endpoint: '/dashboard/stats', code: 200 },
      { ip: '172.16.4.100', user: 'carol_dev', type: 'HTTP_REQUEST' as const, endpoint: '/api/v1/health', code: 200 },
      { ip: '192.168.1.188', user: 'admin', type: 'LOGIN_FAILED' as const, endpoint: '/api/v1/auth', code: 401 },
      { ip: '198.51.100.24', user: 'root', type: 'HTTP_REQUEST' as const, endpoint: '/admin/config.env', code: 403 },
      { ip: '192.168.1.15', user: 'david_sys', type: 'LOGIN_SUCCESS' as const, endpoint: '/login', code: 200 },
      { ip: '203.0.113.88', user: 'scanner_bot', type: 'HTTP_REQUEST' as const, endpoint: '/actuator/env', code: 404 },
    ];

    const pick = trafficPool[Math.floor(Math.random() * trafficPool.length)];
    const rawLine = `${timestamp} | ${pick.ip} | ${pick.user} | ${pick.type} | ${pick.endpoint}`;

    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
      timestamp,
      sourceIp: pick.ip,
      username: pick.user,
      eventType: pick.type,
      endpoint: pick.endpoint,
      statusCode: pick.code,
      rawLine,
      logSource: 'live-stream-simulator.log',
    };

    this.logs.unshift(newLog);
    // Evaluate against rules
    this.simulateRuleEvaluation([newLog]);
    this.persist();
    return newLog;
  }

  // Failed Logins Breakdown by Source IP
  public getFailedLoginsSummary(): Array<{ sourceIp: string; usernames: string[]; count: number; lastSeen: string; isBlocked: boolean }> {
    const failedMap = new Map<string, { usernames: Set<string>; count: number; lastSeen: string }>();
    const blockedIps = new Set(this.blocklist.filter((b) => b.status === 'ACTIVE').map((b) => b.ipAddress));

    this.logs
      .filter((l) => l.eventType === 'LOGIN_FAILED')
      .forEach((log) => {
        const cur = failedMap.get(log.sourceIp) || { usernames: new Set<string>(), count: 0, lastSeen: log.timestamp };
        cur.count++;
        cur.usernames.add(log.username);
        if (log.timestamp > cur.lastSeen) cur.lastSeen = log.timestamp;
        failedMap.set(log.sourceIp, cur);
      });

    return Array.from(failedMap.entries())
      .map(([ip, data]) => ({
        sourceIp: ip,
        usernames: Array.from(data.usernames),
        count: data.count,
        lastSeen: data.lastSeen,
        isBlocked: blockedIps.has(ip),
      }))
      .sort((a, b) => b.count - a.count);
  }

  // Blocklist Activity Summary
  public getBlocklistHits(): LogEntry[] {
    const blockedIps = new Set(this.blocklist.filter((b) => b.status === 'ACTIVE').map((b) => b.ipAddress));
    return this.logs.filter((l) => blockedIps.has(l.sourceIp));
  }

  // Reset to initial mock dataset
  public resetToFactoryMockData(): void {
    this.logs = [...INITIAL_LOG_ENTRIES];
    this.rules = [...INITIAL_DETECTION_RULES];
    this.alerts = [...INITIAL_ALERTS];
    this.blocklist = [...INITIAL_BLOCKLIST];
    this.auditLogs = [...INITIAL_AUDIT_LOGS];
    this.currentUser = { ...INITIAL_USER };
    this.uploadedFiles = [...INITIAL_UPLOADED_FILES];
    this.persist();
  }
}

export const securityService = new SecurityService();
