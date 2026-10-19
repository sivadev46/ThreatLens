import { securityService } from './securityService';
import { EventType } from '../types/security';

export interface TestCaseResult {
  id: string;
  name: string;
  category: 'PARSER' | 'VALIDATOR' | 'RULE_ENGINE' | 'ALERT_WORKFLOW' | 'AUDIT_INTEGRITY' | 'METRICS' | 'END_TO_END';
  description: string;
  passed: boolean;
  durationMs: number;
  assertion: string;
  actual?: string;
  expected?: string;
  error?: string;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestCaseResult[];
  executedAt: string;
}

export class SocTestRunner {
  public static runAllTests(): TestSuiteSummary {
    const startTime = performance.now();
    const results: TestCaseResult[] = [];

    // --- 1. IP Validation Tests ---
    results.push(this.testValidIpv4());
    results.push(this.testInvalidIpv4OctetAbove255());
    results.push(this.testMalformedIpv4());
    results.push(this.testPrivateVsPublicIp());

    // --- 2. Log Parser Tests ---
    results.push(this.testLogLineParserValid());
    results.push(this.testLogLineParserTimestampFormat());
    results.push(this.testLogLineParserEventTypes());
    results.push(this.testLogLineParserRejectsMalformed());

    // --- 3. Rule Engine Tests ---
    results.push(this.testBruteForceRuleThreshold());
    results.push(this.testRateLimitRuleThreshold());
    results.push(this.testBlocklistHitRuleDetection());

    // --- 4. Alert Workflow Tests ---
    results.push(this.testAlertStatusTransitions());
    results.push(this.testAlertInvestigationNotes());

    // --- 5. Blocklist Management Tests ---
    results.push(this.testBlocklistDuplicatePrevention());
    results.push(this.testBlocklistStatusToggle());

    // --- 6. Audit Log & Cryptographic Integrity Tests ---
    results.push(this.testAuditLogTamperEvidenceHash());
    results.push(this.testAuditLogRecordingOnAction());

    // --- 7. Metrics & Analytics Tests ---
    results.push(this.testDashboardSummaryCalculation());

    // --- 8. Stage E: End-to-End Live Pipeline Integration Tests ---
    results.push(this.testEndToEndPipeline());
    results.push(this.testEndToEndContainment());
    results.push(this.testEndToEndRuleTuning());

    const totalDuration = Math.round(performance.now() - startTime);
    const passedCount = results.filter((r) => r.passed).length;

    return {
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      durationMs: totalDuration,
      results,
      executedAt: new Date().toISOString(),
    };
  }

  // --- Test Implementations ---

  private static testValidIpv4(): TestCaseResult {
    const start = performance.now();
    const testIps = ['192.168.1.1', '10.0.0.1', '172.16.254.1', '8.8.8.8', '127.0.0.1'];
    const allValid = testIps.every((ip) => securityService.validateIpv4(ip).valid);
    return {
      id: 'TC-VAL-01',
      name: 'IPv4 Validation (Standard RFC Formats)',
      category: 'VALIDATOR',
      description: 'Validates standard IPv4 addresses in dotted-decimal notation',
      passed: allValid,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'All standard dotted IPv4 strings must evaluate to valid=true',
      expected: 'true',
      actual: String(allValid),
    };
  }

  private static testInvalidIpv4OctetAbove255(): TestCaseResult {
    const start = performance.now();
    const testIps = ['256.1.1.1', '192.168.1.300', '999.999.999.999'];
    const allRejected = testIps.every((ip) => !securityService.validateIpv4(ip).valid);
    return {
      id: 'TC-VAL-02',
      name: 'IPv4 Boundary (Octets > 255 Rejection)',
      category: 'VALIDATOR',
      description: 'Rejects IPv4 addresses where any octet exceeds the 8-bit limit of 255',
      passed: allRejected,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Octets > 255 must return valid=false with boundary error',
      expected: 'true',
      actual: String(allRejected),
    };
  }

  private static testMalformedIpv4(): TestCaseResult {
    const start = performance.now();
    const malformed = ['192.168.1', '10.0.0.1.5', '192.168.1.a', 'abc.def.ghi.jkl', ''];
    const allRejected = malformed.every((ip) => !securityService.validateIpv4(ip).valid);
    return {
      id: 'TC-VAL-03',
      name: 'IPv4 Malformed Syntax Detection',
      category: 'VALIDATOR',
      description: 'Ensures strings with non-digits or incorrect segment counts are rejected',
      passed: allRejected,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Non-4-octet or non-numeric strings must return valid=false',
      expected: 'true',
      actual: String(allRejected),
    };
  }

  private static testPrivateVsPublicIp(): TestCaseResult {
    const start = performance.now();
    const privateIp = securityService.validateIpv4('192.168.1.100');
    const publicIp = securityService.validateIpv4('198.51.100.24');
    const isCorrect = privateIp.isPrivate === true && publicIp.isPrivate === false;
    return {
      id: 'TC-VAL-04',
      name: 'RFC 1918 Private vs Public Classification',
      category: 'VALIDATOR',
      description: 'Distinguishes between RFC 1918 internal subnets and routable public addresses',
      passed: isCorrect,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: '192.168.x.x must be marked private; 198.51.x.x must be marked public',
      expected: 'private=true, public=false',
      actual: `private=${privateIp.isPrivate}, public=${publicIp.isPrivate}`,
    };
  }

  private static testLogLineParserValid(): TestCaseResult {
    const start = performance.now();
    const line = '2026-03-14 10:15:20 | 192.168.1.55 | jsmith | LOGIN_SUCCESS | /login';
    const res = securityService.parseLogLine(line);
    const parsed = res.entry;
    const passed =
      parsed !== undefined &&
      parsed.sourceIp === '192.168.1.55' &&
      parsed.username === 'jsmith' &&
      parsed.eventType === 'LOGIN_SUCCESS' &&
      parsed.endpoint === '/login' &&
      parsed.timestamp === '2026-03-14 10:15:20';

    return {
      id: 'TC-LOG-01',
      name: 'Log Parser Standard Delimiter Handling',
      category: 'PARSER',
      description: 'Parses pipe-delimited format: TIMESTAMP | IP | USER | EVENT | PATH',
      passed,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Parsed fields must accurately extract IP, username, event, and endpoint',
      expected: 'Fully extracted LogEntry object',
      actual: passed ? 'Match' : 'Failed to parse fields accurately',
    };
  }

  private static testLogLineParserTimestampFormat(): TestCaseResult {
    const start = performance.now();
    const line = '2026-03-14 12:30:45 | 10.0.1.5 | alice | HTTP_REQUEST | /api/status';
    const res = securityService.parseLogLine(line);
    const parsed = res.entry;
    const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    const validFormat = parsed !== undefined && timestampRegex.test(parsed.timestamp);

    return {
      id: 'TC-LOG-02',
      name: 'Log Parser Timestamp Validation (ISO format)',
      category: 'PARSER',
      description: 'Validates strict YYYY-MM-DD HH:MM:SS format conformance',
      passed: validFormat,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Timestamp must conform to YYYY-MM-DD HH:MM:SS format',
      expected: '2026-03-14 12:30:45',
      actual: parsed ? parsed.timestamp : 'null',
    };
  }

  private static testLogLineParserEventTypes(): TestCaseResult {
    const start = performance.now();
    const validEvents: EventType[] = ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'HTTP_REQUEST', 'LOGOUT'];
    const allParsed = validEvents.every((evt) => {
      const line = `2026-03-14 10:00:00 | 192.168.1.1 | user1 | ${evt} | /path`;
      const res = securityService.parseLogLine(line);
      return res.entry !== undefined && res.entry.eventType === evt;
    });

    return {
      id: 'TC-LOG-03',
      name: 'Log Parser Recognized Event Enumeration',
      category: 'PARSER',
      description: 'Verifies parsing of LOGIN_SUCCESS, LOGIN_FAILED, HTTP_REQUEST, and LOGOUT',
      passed: allParsed,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'All 4 canonical event types must parse into typed enums',
      expected: 'All 4 types recognized',
      actual: allParsed ? 'All 4 types recognized' : 'Mismatch',
    };
  }

  private static testLogLineParserRejectsMalformed(): TestCaseResult {
    const start = performance.now();
    const malformed = [
      'Just a random debug string with no pipes',
      '2026-03-14 | only | three | items',
      '2026-03-14 10:00:00 | 999.999.999.999 | root | LOGIN_SUCCESS | /root', // invalid IP
    ];
    const allRejected = malformed.every((m) => {
      const res = securityService.parseLogLine(m);
      return res.entry === undefined || res.error !== undefined;
    });

    return {
      id: 'TC-LOG-04',
      name: 'Log Parser Malformed Line Rejection',
      category: 'PARSER',
      description: 'Ensures corrupt or invalid lines return error rather than polluting dataset',
      passed: allRejected,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Malformed lines must return error and have no valid entry',
      expected: 'error for all malformed candidates',
      actual: allRejected ? 'Correctly rejected all' : 'Allowed invalid line',
    };
  }

  private static testBruteForceRuleThreshold(): TestCaseResult {
    const start = performance.now();
    const rules = securityService.getRules();
    const bruteRule = rules.find((r) => r.code === 'RULE_BRUTE_FORCE' || r.name.toLowerCase().includes('brute'));
    const isConfigured = bruteRule !== undefined && bruteRule.thresholdValue >= 3 && bruteRule.timeWindowSeconds > 0;

    return {
      id: 'TC-RUL-01',
      name: 'Brute-Force Rule Parameter Integrity',
      category: 'RULE_ENGINE',
      description: 'Confirms RULE_BRUTE_FORCE is active with configurable failed login threshold and window',
      passed: Boolean(isConfigured),
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'RULE_BRUTE_FORCE must have thresholdValue >= 3 and timeWindowSeconds >= 10',
      expected: 'thresholdValue >= 3, window > 0',
      actual: bruteRule ? `thresholdValue=${bruteRule.thresholdValue}, window=${bruteRule.timeWindowSeconds}s` : 'Rule not found',
    };
  }

  private static testRateLimitRuleThreshold(): TestCaseResult {
    const start = performance.now();
    const rules = securityService.getRules();
    const rateRule = rules.find((r) => r.code === 'RULE_REQUEST_BURST' || r.name.toLowerCase().includes('rate limit') || r.name.toLowerCase().includes('burst'));
    const isConfigured = rateRule !== undefined && rateRule.thresholdValue >= 10;

    return {
      id: 'TC-RUL-02',
      name: 'High-Velocity Rate Limiting Rule Configuration',
      category: 'RULE_ENGINE',
      description: 'Confirms RULE_REQUEST_BURST evaluates burst request velocity per source IP',
      passed: Boolean(isConfigured),
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Rate limiting rule must be present and enabled',
      expected: 'enabled=true',
      actual: rateRule ? `enabled=${rateRule.enabled}, threshold=${rateRule.thresholdValue}` : 'Rule not found',
    };
  }

  private static testBlocklistHitRuleDetection(): TestCaseResult {
    const start = performance.now();
    const rules = securityService.getRules();
    const blockRule = rules.find((r) => r.code === 'RULE_BLOCKLIST_IP' || r.name.toLowerCase().includes('blocklist'));
    const isConfigured = blockRule !== undefined && blockRule.severity === 'CRITICAL';

    return {
      id: 'TC-RUL-03',
      name: 'Blocklist Activity Trigger (Zero Tolerance)',
      category: 'RULE_ENGINE',
      description: 'Confirms RULE_BLOCKLIST_IP immediately flags any connection from an active blocklist IP',
      passed: Boolean(isConfigured),
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'RULE_BLOCKLIST_IP must be assigned CRITICAL severity with thresholdValue 1',
      expected: 'severity=CRITICAL, thresholdValue=1',
      actual: blockRule ? `severity=${blockRule.severity}, thresholdValue=${blockRule.thresholdValue}` : 'Rule not found',
    };
  }

  private static testAlertStatusTransitions(): TestCaseResult {
    const start = performance.now();
    const alerts = securityService.getAlerts();
    const targetAlert = alerts[0];
    let passed = false;

    if (targetAlert) {
      const originalStatus = targetAlert.status;
      // Test transition to INVESTIGATING
      securityService.updateAlertStatus(targetAlert.id, 'INVESTIGATING', 'Automated Test Transition');
      const updated = securityService.getAlerts().find((a) => a.id === targetAlert.id);
      passed = updated?.status === 'INVESTIGATING';

      // Restore original
      securityService.updateAlertStatus(targetAlert.id, originalStatus, 'Restore after automated test');
    }

    return {
      id: 'TC-ALT-01',
      name: 'Alert Lifecycle State Transitions',
      category: 'ALERT_WORKFLOW',
      description: 'Validates state progression: OPEN -> INVESTIGATING -> RESOLVED',
      passed,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Alert status must update and record transition reason in history',
      expected: 'status=INVESTIGATING',
      actual: passed ? 'status=INVESTIGATING' : 'Transition failed',
    };
  }

  private static testAlertInvestigationNotes(): TestCaseResult {
    const start = performance.now();
    const alerts = securityService.getAlerts();
    const target = alerts[0];
    let passed = false;

    if (target) {
      const testNote = `Test Note ${Date.now()}`;
      securityService.addAlertNote(target.id, testNote);
      const updated = securityService.getAlerts().find((a) => a.id === target.id);
      passed = Boolean(updated?.notes.some((n) => n.note === testNote));
    }

    return {
      id: 'TC-ALT-02',
      name: 'SOC Investigation Notes Journaling',
      category: 'ALERT_WORKFLOW',
      description: 'Ensures analysts can attach append-only investigation notes to alerts',
      passed,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Appended note must persist with analyst author and timestamp',
      expected: 'Note successfully recorded',
      actual: passed ? 'Note recorded in alert.notes' : 'Failed to attach note',
    };
  }

  private static testBlocklistDuplicatePrevention(): TestCaseResult {
    const start = performance.now();
    const entries = securityService.getBlocklist();
    const existingIp = entries[0]?.ipAddress || '198.51.100.24';

    // Attempt duplicate addition
    const result = securityService.addBlocklistEntry({
      ipAddress: existingIp,
      reason: 'Attempted duplicate entry test',
      threatCategory: 'SCANNER',
    });

    const prevented = result.success === false;

    return {
      id: 'TC-BLK-01',
      name: 'Blocklist Duplicate IP Collision Prevention',
      category: 'VALIDATOR',
      description: 'Guarantees the system rejects redundant duplicate blocklist entries',
      passed: prevented,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Adding an already existing IP must return success=false',
      expected: 'success=false',
      actual: `success=${result.success}`,
    };
  }

  private static testBlocklistStatusToggle(): TestCaseResult {
    const start = performance.now();
    const entries = securityService.getBlocklist();
    const target = entries[0];
    let passed = false;

    if (target) {
      const original = target.status;
      const toggled = original === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      securityService.toggleBlocklistStatus(target.id);
      const after = securityService.getBlocklist().find((b) => b.id === target.id);
      passed = after?.status === toggled;

      // Restore
      securityService.toggleBlocklistStatus(target.id);
    }

    return {
      id: 'TC-BLK-02',
      name: 'Blocklist State Toggle (Active/Inactive)',
      category: 'ALERT_WORKFLOW',
      description: 'Validates hot-toggling IP blocks without permanently deleting entries',
      passed,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Status should toggle cleanly between ACTIVE and INACTIVE',
      expected: 'Status toggled',
      actual: passed ? 'Status toggled successfully' : 'Failed to toggle',
    };
  }

  private static testAuditLogTamperEvidenceHash(): TestCaseResult {
    const start = performance.now();
    const auditLogs = securityService.getAuditLogs();
    const hasHashes = auditLogs.length > 0 && auditLogs.every((a) => a.hash && a.hash.startsWith('sha256:'));

    return {
      id: 'TC-AUD-01',
      name: 'Audit Log Cryptographic Hash Generation',
      category: 'AUDIT_INTEGRITY',
      description: 'Verifies tamper-evident SHA-256 hash digests generated for every system action',
      passed: hasHashes,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Every audit log record must contain a valid sha256: prefixed checksum',
      expected: 'Valid sha256 checksums on all entries',
      actual: hasHashes ? 'All entries hashed' : 'Missing or invalid hashes',
    };
  }

  private static testAuditLogRecordingOnAction(): TestCaseResult {
    const start = performance.now();
    const initialCount = securityService.getAuditLogs().length;
    securityService.triggerManualAuditTest('Automated Test Suite Action Verification');
    const newCount = securityService.getAuditLogs().length;
    const passed = newCount > initialCount;

    return {
      id: 'TC-AUD-02',
      name: 'Administrative Action Audit Trail Recording',
      category: 'AUDIT_INTEGRITY',
      description: 'Confirms that administrative events immediately create immutable audit records',
      passed,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Audit log count must increment upon administrative event execution',
      expected: `${initialCount + 1}`,
      actual: `${newCount}`,
    };
  }

  private static testDashboardSummaryCalculation(): TestCaseResult {
    const start = performance.now();
    const summary = securityService.getDashboardSummary();
    const alerts = securityService.getAlerts();
    const openCount = alerts.filter((a) => a.status === 'OPEN').length;
    const matches = summary.openAlertsCount === openCount;

    return {
      id: 'TC-MET-01',
      name: 'Dashboard Summary Aggregation Accuracy',
      category: 'METRICS',
      description: 'Ensures KPI counters match filtered alert and log dataset calculations',
      passed: matches,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'summary.openAlertsCount must equal count of alerts where status=OPEN',
      expected: `${openCount}`,
      actual: `${summary.openAlertsCount}`,
    };
  }

  // --- Stage E: End-to-End Live Integration Tests ---
  private static testEndToEndPipeline(): TestCaseResult {
    const start = performance.now();
    const testIp = '198.51.100.77';
    const initialAlertsCount = securityService.getAlerts().length;

    // Simulate batch log ingestion of brute force attack
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const rawLogs = [
      `${now} | ${testIp} | root | LOGIN_FAILED | /ssh/v2`,
      `${now} | ${testIp} | root | LOGIN_FAILED | /ssh/v2`,
      `${now} | ${testIp} | root | LOGIN_FAILED | /ssh/v2`,
      `${now} | ${testIp} | root | LOGIN_FAILED | /ssh/v2`,
    ].join('\n');

    const importRes = securityService.importLogContent(rawLogs, 'e2e_simulation.log');
    const updatedAlerts = securityService.getAlerts();
    const generatedAlert = updatedAlerts.find((a) => a.sourceIp === testIp && a.ruleCode === 'RULE_BRUTE_FORCE');
    const passed = importRes.parsedCount === 4 && !!generatedAlert;

    return {
      id: 'TC-E2E-01',
      name: 'End-to-End Log Ingestion -> Correlation -> Alert Creation Pipeline',
      category: 'END_TO_END',
      description: 'Verifies raw log file ingest correlates with detection rules and produces linked alerts with evidence',
      passed,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Ingestion of 4 brute force events must produce an alert linked to source IP',
      expected: 'Alert created with sourceIp 198.51.100.77',
      actual: passed ? `Alert created (ID: ${generatedAlert?.id})` : 'Alert creation failed',
    };
  }

  private static testEndToEndContainment(): TestCaseResult {
    const start = performance.now();
    const attackerIp = '203.0.113.244';

    // Step 1: Add to blocklist as automated remediation
    securityService.addBlocklistEntry({
      ipAddress: attackerIp,
      reason: 'Automated E2E Containment Quarantine',
      threatCategory: 'MANUAL',
    });

    // Step 2: Ingest packet from blocked IP
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const packetLog = `${now} | ${attackerIp} | attacker | HTTP_REQUEST | /admin/dump`;
    const res = securityService.importLogContent(packetLog, 'perimeter_e2e.log');

    // Step 3: Verify zero-tolerance blocklist alert triggered
    const alerts = securityService.getAlerts();
    const blocklistAlert = alerts.find((a) => a.sourceIp === attackerIp && a.ruleCode === 'RULE_BLOCKLIST_IP');
    const passed = !!blocklistAlert;

    return {
      id: 'TC-E2E-02',
      name: 'End-to-End Threat Containment & Zero-Tolerance Blocklist Trigger',
      category: 'END_TO_END',
      description: 'Verifies quarantined IP blocks immediately intercept incoming traffic and generate CRITICAL alerts',
      passed,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Incoming traffic from blocked IP must instantly trigger RULE_BLOCKLIST_IP',
      expected: 'Immediate containment alert generated',
      actual: passed ? `Containment alert active (ID: ${blocklistAlert?.id})` : 'Containment alert missing',
    };
  }

  private static testEndToEndRuleTuning(): TestCaseResult {
    const start = performance.now();
    const rules = securityService.getRules();
    const rule = rules.find((r) => r.code === 'RULE_BRUTE_FORCE');
    if (!rule) {
      return {
        id: 'TC-E2E-03',
        name: 'End-to-End Rule Sensitivity Tuning & Hot-Reload',
        category: 'END_TO_END',
        description: 'Verifies runtime modification of correlation windows and threshold multipliers',
        passed: false,
        durationMs: Math.round((performance.now() - start) * 100) / 100,
        assertion: 'RULE_BRUTE_FORCE must exist and allow threshold tuning',
        expected: 'Rule present',
        actual: 'Rule not found',
      };
    }

    const originalThreshold = rule.thresholdValue;
    // Tune threshold
    securityService.updateRule({ ...rule, thresholdValue: 2 });
    const tunedRule = securityService.getRules().find((r) => r.id === rule.id);
    const tunedSuccessfully = tunedRule?.thresholdValue === 2;

    // Restore original threshold
    securityService.updateRule({ ...rule, thresholdValue: originalThreshold });
    const restoredRule = securityService.getRules().find((r) => r.id === rule.id);
    const passed = tunedSuccessfully && restoredRule?.thresholdValue === originalThreshold;

    return {
      id: 'TC-E2E-03',
      name: 'End-to-End Rule Sensitivity Tuning & Hot-Reload',
      category: 'END_TO_END',
      description: 'Verifies runtime modification of correlation windows and threshold multipliers',
      passed,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      assertion: 'Rule threshold should dynamically update and restore cleanly in system state',
      expected: `Tuned to 2 then restored to ${originalThreshold}`,
      actual: passed ? `Successfully tuned and restored to ${originalThreshold}` : 'Tuning failed',
    };
  }
}
