export type EventType = 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'HTTP_REQUEST' | 'LOGOUT';

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AlertStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED';

export interface LogEntry {
  id: string;
  timestamp: string; // ISO 8601 or YYYY-MM-DD HH:mm:ss
  sourceIp: string;
  username: string;
  eventType: EventType;
  endpoint: string;
  statusCode?: number;
  rawLine: string;
  isMalformed?: boolean;
  parseError?: string;
  logSource?: string;
}

export interface DetectionRule {
  id: string;
  code: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  enabled: boolean;
  thresholdValue: number;
  timeWindowSeconds: number;
  targetEventType: EventType | 'ALL';
  triggerConditionExplanation: string;
  lastTriggered?: string;
  totalTriggerCount: number;
}

export interface AlertNote {
  id: string;
  alertId: string;
  authorName: string;
  authorRole: string;
  timestamp: string;
  note: string;
}

export interface AlertStatusHistory {
  id: string;
  alertId: string;
  previousStatus: AlertStatus;
  newStatus: AlertStatus;
  changedBy: string;
  timestamp: string;
  reason: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  severity: AlertSeverity;
  sourceIp: string;
  eventCount: number;
  timestamp: string;
  status: AlertStatus;
  summary: string;
  affectedUsername?: string;
  notes: AlertNote[];
  history: AlertStatusHistory[];
  evidenceLogIds?: string[];
}

export interface BlocklistEntry {
  id: string;
  ipAddress: string;
  reason: string;
  addedBy: string;
  createdAt: string;
  status: 'ACTIVE' | 'INACTIVE';
  associatedAlertCount: number;
  lastDetectedActivity?: string;
  threatCategory?: 'CREDENTIAL_STUFFING' | 'SCANNER' | 'BRUTE_FORCE' | 'DOS' | 'PROXY_TOR' | 'MANUAL';
  threatAsn?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  category: 'RULE_CONFIG' | 'BLOCKLIST' | 'ALERT_TRIAGE' | 'AUTH' | 'LOG_IMPORT' | 'SYSTEM';
  details: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILURE';
  hash?: string;
  metadata?: Record<string, string>;
}

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'SOC Analyst' | 'Security Engineer' | 'SOC Admin';
  avatarInitials: string;
  lastLogin: string;
  sessionExpiry: string;
}

export interface DashboardSummary {
  totalLogsAnalyzed: number;
  criticalAlerts: number;
  highAlerts: number;
  failedLoginAttempts: number;
  blocklistedIpHits: number;
  openAlertsCount: number;
  investigatingAlertsCount: number;
  resolvedAlertsCount: number;
  activeBlocklistCount: number;
  activeRulesCount: number;
}

export interface LogImportResult {
  totalLines: number;
  parsedCount: number;
  errorCount: number;
  newAlertsGenerated: number;
  fileName: string;
  sourceName: string;
  importTimestamp: string;
  malformedLines: Array<{ line: number; raw: string; error: string }>;
  fileId?: string;
}

export type FileImportStatus = 'Processing' | 'Completed' | 'Completed with Errors' | 'Failed' | 'Archived';

export interface UploadedFileRecord {
  id: string;
  fileName: string;
  fileType: string;
  uploadDate: string;
  fileSizeFormatted: string;
  fileSizeBytes: number;
  status: FileImportStatus;
  parsedEntries: number;
  rejectedEntries: number;
  totalLines: number;
  newAlertsGenerated: number;
  malformedLines?: Array<{ line: number; raw: string; error: string }>;
  rawContent?: string;
  isSystemSample?: boolean;
}

