-- =====================================================================
-- SENTINEL SOC LOG ANALYZER & INTRUSION DETECTION SYSTEM
-- MySQL 8.0 Relational Database Schema (Stage D)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS sentinel_soc
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sentinel_soc;

-- 1. USERS & CREDENTIALS
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  full_name VARCHAR(128) NOT NULL,
  email VARCHAR(128) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('SOC Analyst', 'Security Engineer', 'SOC Admin') NOT NULL DEFAULT 'SOC Analyst',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL
) ENGINE=InnoDB;

-- 2. LOG SOURCES (Registered syslog / web servers)
CREATE TABLE IF NOT EXISTS log_sources (
  id VARCHAR(64) PRIMARY KEY,
  source_name VARCHAR(128) NOT NULL UNIQUE,
  source_type VARCHAR(64) NOT NULL,
  ip_address VARCHAR(45) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. LOG ENTRIES (High Volume Ingestion Table with Composite Indexes)
CREATE TABLE IF NOT EXISTS log_entries (
  id VARCHAR(64) PRIMARY KEY,
  source_id VARCHAR(64),
  timestamp TIMESTAMP NOT NULL,
  source_ip VARCHAR(45) NOT NULL,
  username VARCHAR(64) NOT NULL,
  event_type ENUM('LOGIN_SUCCESS', 'LOGIN_FAILED', 'HTTP_REQUEST', 'LOGOUT') NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  status_code INT DEFAULT 200,
  raw_line TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_timestamp (timestamp),
  INDEX idx_logs_source_ip (source_ip),
  INDEX idx_logs_event_type (event_type),
  INDEX idx_logs_composite (source_ip, event_type, timestamp),
  FOREIGN KEY (source_id) REFERENCES log_sources(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. DETECTION RULES (Configurable Sliding Window Heuristics)
CREATE TABLE IF NOT EXISTS detection_rules (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description TEXT NOT NULL,
  severity ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO') NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  threshold_value INT NOT NULL DEFAULT 5,
  time_window_seconds INT NOT NULL DEFAULT 60,
  target_event_type VARCHAR(32) NOT NULL DEFAULT 'LOGIN_FAILED',
  explanation TEXT NOT NULL,
  total_trigger_count INT NOT NULL DEFAULT 0,
  last_triggered TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. IP BLOCKLIST (Prohibited / Monitored Addresses)
CREATE TABLE IF NOT EXISTS ip_blocklist (
  id VARCHAR(64) PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  reason VARCHAR(255) NOT NULL,
  added_by VARCHAR(64) NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  threat_category ENUM('BRUTE_FORCE', 'DOS_FLOOD', 'SCANNER', 'SUSPICIOUS', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
  threat_asn VARCHAR(64) DEFAULT 'AS-UNKNOWN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_blocklist_ip (ip_address),
  INDEX idx_blocklist_status (status)
) ENGINE=InnoDB;

-- 6. ALERTS (Correlated Security Incidents)
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(64) PRIMARY KEY,
  rule_id VARCHAR(64) NOT NULL,
  rule_code VARCHAR(64) NOT NULL,
  rule_name VARCHAR(128) NOT NULL,
  severity ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO') NOT NULL,
  status ENUM('OPEN', 'INVESTIGATING', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
  source_ip VARCHAR(45) NOT NULL,
  target_username VARCHAR(64) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  event_count INT NOT NULL DEFAULT 1,
  time_window_seconds INT NOT NULL DEFAULT 60,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alerts_status (status),
  INDEX idx_alerts_severity (severity),
  INDEX idx_alerts_timestamp (timestamp),
  INDEX idx_alerts_source_ip (source_ip),
  FOREIGN KEY (rule_id) REFERENCES detection_rules(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. ALERT EVIDENCE LOGS (Association Mapping)
CREATE TABLE IF NOT EXISTS alert_evidence (
  alert_id VARCHAR(64) NOT NULL,
  log_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (alert_id, log_id),
  FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
  FOREIGN KEY (log_id) REFERENCES log_entries(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. ALERT NOTES (Forensic Journaling)
CREATE TABLE IF NOT EXISTS alert_notes (
  id VARCHAR(64) PRIMARY KEY,
  alert_id VARCHAR(64) NOT NULL,
  author_name VARCHAR(128) NOT NULL,
  author_role VARCHAR(64) NOT NULL,
  note TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. AUDIT LOGS (Immutable Activity Log with Cryptographic Hashes)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actor VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  category ENUM('RULE_CONFIG', 'BLOCKLIST', 'ALERT_TRIAGE', 'AUTH', 'LOG_IMPORT', 'SYSTEM') NOT NULL,
  details TEXT NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  status ENUM('SUCCESS', 'FAILURE') NOT NULL DEFAULT 'SUCCESS',
  hash VARCHAR(128) NULL,
  INDEX idx_audit_timestamp (timestamp),
  INDEX idx_audit_category (category)
) ENGINE=InnoDB;

-- =====================================================================
-- SEED DATA INITIALIZATION
-- =====================================================================

-- Default Analyst Account (Password: "SentinelPass2026!", BCrypt hashed)
INSERT INTO users (id, username, full_name, email, password_hash, role)
VALUES (
  'usr-001',
  'alex.chen',
  'Alex Chen',
  'alex.chen@soc.internal',
  '$2a$12$e8n7i3jO5Xm2fX9pQz8YReJ4Y3l8eWz7t8r6y5u4i3o2p1a0s9d8f',
  'SOC Analyst'
) ON DUPLICATE KEY UPDATE id=id;

-- Core Detection Rules
INSERT INTO detection_rules (id, code, name, description, severity, enabled, threshold_value, time_window_seconds, target_event_type, explanation)
VALUES
(
  'rule-001',
  'RULE_BRUTE_FORCE',
  'SSH & Web Password Brute-Force Detection',
  'Detects multiple consecutive authentication failures from an identical source IP within a sliding observation window.',
  'HIGH',
  TRUE,
  5,
  60,
  'LOGIN_FAILED',
  'COUNT(LOGIN_FAILED) >= 5 from same source IP in <= 60 seconds.'
),
(
  'rule-002',
  'RULE_REQUEST_BURST',
  'High-Velocity DoS / Web Application Scan',
  'Flags volumetric bursts of HTTP requests from a single client exceeding benign user velocity.',
  'MEDIUM',
  TRUE,
  20,
  10,
  'HTTP_REQUEST',
  'COUNT(HTTP_REQUEST) >= 20 from same source IP in <= 10 seconds.'
),
(
  'rule-003',
  'RULE_BLOCKLIST_IP',
  'Known Hostile Threat Intelligence IP Access',
  'Zero-tolerance rule flagging any connection attempt or event originating from an active blocklisted IP.',
  'CRITICAL',
  TRUE,
  1,
  1,
  'ALL',
  'Immediate trigger whenever source_ip matches active entry in ip_blocklist.'
)
ON DUPLICATE KEY UPDATE id=id;

-- Initial Blocklist
INSERT INTO ip_blocklist (id, ip_address, reason, added_by, status, threat_category, threat_asn)
VALUES
('blk-001', '198.51.100.24', 'Known automated credential stuffing botnet node', 'system_ingest', 'ACTIVE', 'BRUTE_FORCE', 'AS13335-CLOUDFLARE'),
('blk-002', '203.0.113.88', 'Reconnaissance vulnerability scanner targeting /actuator/env', 'alex.chen', 'ACTIVE', 'SCANNER', 'AS16509-AMAZON')
ON DUPLICATE KEY UPDATE id=id;
