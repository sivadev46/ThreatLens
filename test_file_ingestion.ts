import { securityService } from './src/services/securityService';

console.log('====================================================');
console.log('SENTINEL SOC — LOG INGESTION & FILE MANAGER TEST RUN');
console.log('====================================================');

// Reset to clean baseline
securityService.resetToFactoryMockData();

const baselineLogs = securityService.getLogs().length;
const baselineFiles = securityService.getUploadedFiles().length;
const baselineAlerts = securityService.getAlerts().length;

console.log(`Baseline state: ${baselineLogs} logs, ${baselineFiles} files, ${baselineAlerts} alerts.`);

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(` [PASS] ${testName}${detail ? ` -> ${detail}` : ''}`);
    passCount++;
  } else {
    console.error(` [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failCount++;
  }
}

// TEST 1: Valid log file
console.log('\n--- TEST 1: Valid log file ---');
const validLogContent = `2026-03-14 10:00:00 | 192.168.1.100 | alice | LOGIN_SUCCESS | /api/auth/login
2026-03-14 10:01:00 | 192.168.1.100 | alice | HTTP_REQUEST | /api/dashboard
2026-03-14 10:02:00 | 192.168.1.100 | alice | LOGOUT | /api/auth/logout`;

const res1 = securityService.importLogContent(validLogContent, 'valid_test_log.log', 250);
assert(res1.parsedCount === 3, 'Valid log file: 3 records parsed', `parsedCount=${res1.parsedCount}`);
assert(res1.errorCount === 0, 'Valid log file: 0 errors', `errorCount=${res1.errorCount}`);
const file1 = securityService.getUploadedFiles().find(f => f.fileName === 'valid_test_log.log');
assert(file1 !== undefined && file1.status === 'Completed', 'File record created with Completed status');

// TEST 2: Empty file
console.log('\n--- TEST 2: Empty file ---');
const res2 = securityService.importLogContent('', 'empty_file.log', 0);
assert(res2.parsedCount === 0, 'Empty file: 0 parsed records', `parsedCount=${res2.parsedCount}`);
assert(res2.errorCount === 0, 'Empty file: 0 error count', `errorCount=${res2.errorCount}`);
const file2 = securityService.getUploadedFiles().find(f => f.fileName === 'empty_file.log');
assert(file2 !== undefined && file2.status === 'Failed', 'Empty file recorded with Failed status (0 entries)', `status=${file2?.status}`);

// TEST 3: File containing malformed lines
console.log('\n--- TEST 3: File containing malformed lines ---');
const malformedContent = `2026-03-14 11:00:00 | 10.0.0.1 | bob | LOGIN_SUCCESS | /api/login
CORRUPTED_LINE_WITHOUT_DELIMITERS_OR_FIELDS
2026-03-14 11:02:00 | 10.0.0.2 | bob | HTTP_REQUEST | /api/user
ANOTHER_MALFORMED_ROW_MISSING_PARTS
   
2026-03-14 11:05:00 | 10.0.0.3 | charlie | LOGOUT | /api/logout`;

const res3 = securityService.importLogContent(malformedContent, 'malformed_test.log', 320);
assert(res3.parsedCount === 3, 'Malformed file: exactly 3 valid entries parsed', `parsedCount=${res3.parsedCount}`);
assert(res3.errorCount === 2, 'Malformed file: exactly 2 malformed lines identified', `errorCount=${res3.errorCount}`);
assert(res3.malformedLines.length === 2, 'Malformed lines breakdown captured', `length=${res3.malformedLines.length}`);
const file3 = securityService.getUploadedFiles().find(f => f.fileName === 'malformed_test.log');
assert(file3 !== undefined && file3.status === 'Completed with Errors', 'File status is "Completed with Errors"');

// TEST 4: Repeated upload of the same file (deduplication & overwrite)
console.log('\n--- TEST 4: Repeated upload of the same file ---');
const logsBeforeDuplicate = securityService.getLogs().length;
const res4 = securityService.importLogContent(validLogContent, 'valid_test_log.log', 250);
const logsAfterDuplicate = securityService.getLogs().length;
assert(res4.parsedCount === 3, 'Re-upload parsed identical 3 valid lines');
assert(logsAfterDuplicate === logsBeforeDuplicate, 'Duplicate records were NOT multiplied in database/localStorage', `before=${logsBeforeDuplicate}, after=${logsAfterDuplicate}`);

// TEST 5: File containing normal events and failed logins (threshold trigger)
console.log('\n--- TEST 5: Normal events and failed logins (Threshold trigger) ---');
const bruteForceContent = `2026-03-14 12:00:01 | 185.220.101.5 | attacker_1 | LOGIN_FAILED | /api/auth/login
2026-03-14 12:00:02 | 185.220.101.5 | attacker_1 | LOGIN_FAILED | /api/auth/login
2026-03-14 12:00:03 | 185.220.101.5 | attacker_1 | LOGIN_FAILED | /api/auth/login
2026-03-14 12:00:04 | 185.220.101.5 | attacker_1 | LOGIN_FAILED | /api/auth/login
2026-03-14 12:00:05 | 185.220.101.5 | attacker_1 | LOGIN_FAILED | /api/auth/login
2026-03-14 12:00:06 | 185.220.101.5 | attacker_1 | LOGIN_FAILED | /api/auth/login
2026-03-14 12:00:10 | 192.168.1.10 | dave | LOGIN_SUCCESS | /api/dashboard`;

const alertsBefore = securityService.getAlerts().length;
const res5 = securityService.importLogContent(bruteForceContent, 'attack_simulation.log', 500);
const alertsAfter = securityService.getAlerts().length;
assert(res5.parsedCount === 7, 'Attack log: 7 events parsed', `parsedCount=${res5.parsedCount}`);
assert(alertsAfter > alertsBefore, 'Security rule triggered new Alert', `before=${alertsBefore}, after=${alertsAfter}`);

// TEST 6: Safe Delete / Archive with incident evidence protection
console.log('\n--- TEST 6: Safe Delete & Forensic Evidence Protection ---');
const file5 = securityService.getUploadedFiles().find(f => f.fileName === 'attack_simulation.log');
assert(file5 !== undefined, 'Attack simulation file record found');

if (file5) {
  const deleteRes = securityService.deleteUploadedFile(file5.id);
  assert(deleteRes.status === 'Archived', 'File with active alert evidence safely ARCHIVED (not silently deleted)', `status=${deleteRes.status}`);
  const updatedFile5 = securityService.getUploadedFileById(file5.id);
  assert(updatedFile5?.status === 'Archived', 'File status in storage updated to Archived');
}

// TEST 7: Clean delete for file with no active alert evidence
console.log('\n--- TEST 7: Clean delete for non-evidence file ---');
const file1ToDelete = securityService.getUploadedFiles().find(f => f.fileName === 'valid_test_log.log');
if (file1ToDelete) {
  const deleteRes1 = securityService.deleteUploadedFile(file1ToDelete.id);
  assert(deleteRes1.status === 'Deleted', 'Non-evidence file completely purged with records cleaned', `status=${deleteRes1.status}`);
  const file1Check = securityService.getUploadedFileById(file1ToDelete.id);
  assert(file1Check === undefined, 'File successfully removed from registry');
}

// SUMMARY
console.log('\n====================================================');
console.log(`TOTAL TESTS RUN: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
