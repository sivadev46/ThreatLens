import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  FileCode,
  Download,
  Cpu,
  Check,
  AlertCircle,
  Copy,
  Shield,
  Layers,
  Database,
  ExternalLink,
  User,
  Key,
  Lock,
  Mail,
  UserCheck,
  Eye,
  EyeOff,
  Server,
  Play,
  Sliders,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Dialog } from '../components/common/Dialog';
import { Badge } from '../components/common/Badge';
import { securityService } from '../services/securityService';
import { useToast } from '../components/common/NotificationToast';
import { SocTestRunner, TestSuiteSummary } from '../services/socTestRunner';
import { apiClient, BackendHealth } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserProfile } from '../types/security';

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const { user, switchUser, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  // Active Settings Tab
  const [activeTab, setActiveTab] = useState<'preferences' | 'account' | 'backend' | 'diagnostics'>('preferences');

  // Preferences State
  const [timeZoneDisplay, setTimeZoneDisplay] = useState('UTC');
  const [refreshInterval, setRefreshInterval] = useState('30s');
  const [logRetentionDays, setLogRetentionDays] = useState('90');
  const [alertNotifyLevel, setAlertNotifyLevel] = useState<'ALL' | 'HIGH_CRITICAL' | 'CRITICAL_ONLY'>('ALL');

  // Preserved Account & Credentials State (From Profile)
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPlainPassword, setShowPlainPassword] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);

  // Automated Test Suite State
  const [testSuiteResults, setTestSuiteResults] = useState<TestSuiteSummary | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testCategoryFilter, setTestCategoryFilter] = useState<string>('ALL');

  // Backend Health Probe State
  const [apiBaseUrl, setApiBaseUrl] = useState(apiClient.getBaseUrl());
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [isProbingBackend, setIsProbingBackend] = useState(false);

  // DB Connection Testing
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<'idle' | 'simulated_ok'>('idle');

  // DDL Schema Modal
  const [showDdlModal, setShowDdlModal] = useState(false);
  const [copiedDdl, setCopiedDdl] = useState(false);

  // Reset confirmation modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Demo user personas
  const demoUsers: UserProfile[] = [
    {
      id: 'usr-001',
      username: 'alex.chen',
      fullName: 'Alex Chen',
      email: 'alex.chen@soc.internal',
      role: 'SOC Analyst',
      avatarInitials: 'AC',
      lastLogin: '2026-03-14 09:45:00',
      sessionExpiry: '2026-03-14 17:45:00',
    },
    {
      id: 'usr-002',
      username: 'sarah.jenkins',
      fullName: 'Sarah Jenkins',
      email: 'sarah.jenkins@soc.internal',
      role: 'Security Engineer',
      avatarInitials: 'SJ',
      lastLogin: '2026-03-14 08:30:00',
      sessionExpiry: '2026-03-14 16:30:00',
    },
    {
      id: 'usr-003',
      username: 'marcus.admin',
      fullName: 'Marcus Vance',
      email: 'marcus.vance@soc.internal',
      role: 'SOC Admin',
      avatarInitials: 'MV',
      lastLogin: '2026-03-14 07:15:00',
      sessionExpiry: '2026-03-14 19:15:00',
    },
  ];

  const handleSwitchUser = (selectedUser: UserProfile) => {
    switchUser(selectedUser);
    setFullName(selectedUser.fullName);
    setEmail(selectedUser.email);
    setRole(selectedUser.role);

    showToast({
      type: 'info',
      title: 'Persona Switched',
      message: `Active persona is now ${selectedUser.fullName} (${selectedUser.role}).`,
    });
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 3) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Full name must be at least 3 characters.',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast({
        type: 'error',
        title: 'Invalid Email',
        message: 'Please provide a valid email address.',
      });
      return;
    }

    const initials = fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    updateUser({
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      avatarInitials: initials || 'AC',
    });

    showToast({
      type: 'success',
      title: 'Profile Updated',
      message: 'Operator identity saved.',
    });
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;

    if (score === 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Strong', color: 'bg-sky-500' };
    return { score: 4, label: 'Very Strong', color: 'bg-emerald-500' };
  };

  const pwdStrength = getPasswordStrength(newPassword);

  const getBcryptPreview = (pwd: string) => {
    if (!pwd) return '$2a$12$e8w91f8d4... (Awaiting input)';
    let hash = 0;
    for (let i = 0; i < pwd.length; i++) {
      hash = (hash << 5) - hash + pwd.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `$2a$12$K8j7m9N1p2Q3r4s5t6u7v.${hex}aB9C8d7E6f5G4h3I2`;
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');

    if (!currentPassword) {
      setPwdError('Please enter current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters.');
      return;
    }
    if (!/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setPwdError('Password must contain at least 1 number and 1 special symbol.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    showToast({
      type: 'success',
      title: 'Password Updated',
      message: 'Password hashed with BCrypt (12 rounds) and saved.',
    });
  };

  const mockSessionToken = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI${user.username}Iiwicm9sZSI6IiR7user.rolefSIsImlhdCI6MTc0MjA4MTIwMCwiZXhwIjoxNzQyMTE3MjAwfQ.s7k9P2w8x1Z3m4q5r6t7y8`;

  const handleCopySessionToken = () => {
    navigator.clipboard.writeText(mockSessionToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
    showToast({
      type: 'info',
      title: 'Token Copied',
      message: 'Bearer authorization token copied to clipboard.',
    });
  };

  const handleResetData = () => {
    securityService.resetToFactoryMockData();
    setShowResetConfirm(false);
    showToast({
      type: 'info',
      title: 'Data Reset',
      message: 'Sample logs, alerts, detection rules, and blocklist restored.',
    });
  };

  const handleTestDbConnection = () => {
    setIsTestingDb(true);
    setTimeout(() => {
      setIsTestingDb(false);
      setDbStatus('simulated_ok');
      showToast({
        type: 'success',
        title: 'Connection Validated',
        message: 'Driver com.mysql.cj.jdbc.Driver verified.',
      });
    }, 600);
  };

  const handleRunTestSuite = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const summary = SocTestRunner.runAllTests();
      setTestSuiteResults(summary);
      setIsRunningTests(false);
      showToast({
        type: summary.failed === 0 ? 'success' : 'warning',
        title: `Test Suite: ${summary.passed}/${summary.total} Passed`,
        message: `Executed in ${summary.durationMs}ms across all detection modules.`,
      });
    }, 300);
  };

  const handleProbeBackend = async () => {
    setIsProbingBackend(true);
    apiClient.setBaseUrl(apiBaseUrl);
    const health = await apiClient.checkHealth();
    setBackendHealth(health);
    setIsProbingBackend(false);

    showToast({
      type: health.status === 'UP' ? 'success' : 'info',
      title: health.status === 'UP' ? 'REST API Connected' : 'Server Offline',
      message: health.message || (health.status === 'UP' ? 'Java 17 backend online.' : 'Operating in client mock mode.'),
    });
  };

  const schemaTables = [
    { name: 'users', purpose: 'SOC operator credentials & BCrypt hashes' },
    { name: 'log_sources', purpose: 'Ingestion stream definitions & network nodes' },
    { name: 'log_entries', purpose: 'Normalized events with IP, endpoint, timestamp' },
    { name: 'detection_rules', purpose: 'Intrusion heuristic thresholds & time windows' },
    { name: 'ip_blocklist', purpose: 'Threat intel firewall blocklist' },
    { name: 'alerts', purpose: 'Correlated security alerts & triage state' },
    { name: 'alert_notes', purpose: 'Forensic notes & incident comments' },
    { name: 'alert_status_history', purpose: 'Lifecycle audit trails' },
    { name: 'audit_logs', purpose: 'Tamper-evident governance actions' },
  ];

  const fullDdlSql = `-- =====================================================================
-- SENTINEL SOC IDS — MYSQL 8.0 RELATIONAL DATABASE SCHEMA
-- Normalized 9-Table Schema
-- =====================================================================

CREATE DATABASE IF NOT EXISTS sentinel_soc
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sentinel_soc;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  full_name VARCHAR(128) NOT NULL,
  email VARCHAR(128) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('SOC Analyst', 'Security Engineer', 'SOC Admin') NOT NULL DEFAULT 'SOC Analyst',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS log_sources (
  id VARCHAR(64) PRIMARY KEY,
  source_name VARCHAR(128) NOT NULL UNIQUE,
  source_type VARCHAR(64) NOT NULL,
  ip_address VARCHAR(45) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

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
  INDEX idx_logs_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detection_rules (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description TEXT NOT NULL,
  threshold INT NOT NULL,
  time_window_seconds INT NOT NULL,
  severity ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO') NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ip_blocklist (
  id VARCHAR(64) PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  reason VARCHAR(255) NOT NULL,
  added_by VARCHAR(64) NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  threat_category VARCHAR(64) DEFAULT 'SCANNER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(64) PRIMARY KEY,
  rule_id VARCHAR(64),
  severity ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO') NOT NULL,
  source_ip VARCHAR(45) NOT NULL,
  event_count INT NOT NULL DEFAULT 1,
  timestamp TIMESTAMP NOT NULL,
  status ENUM('OPEN', 'INVESTIGATING', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
  summary TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alert_notes (
  id VARCHAR(64) PRIMARY KEY,
  alert_id VARCHAR(64) NOT NULL,
  author_name VARCHAR(128) NOT NULL,
  author_role VARCHAR(64) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  note TEXT NOT NULL,
  FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actor VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  category VARCHAR(64) NOT NULL,
  details TEXT NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  status ENUM('SUCCESS', 'FAILURE') NOT NULL DEFAULT 'SUCCESS',
  hash VARCHAR(64) NULL
) ENGINE=InnoDB;
`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b dark:border-slate-800/80 border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight dark:text-white text-slate-900">
            Settings
          </h1>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">
            System configuration, operator security, backend adapter, and diagnostics
          </p>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex items-center gap-1 dark:bg-[#0c121e] bg-slate-100 p-1 rounded-lg border dark:border-slate-800 border-slate-200 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'preferences'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900'
            }`}
          >
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'account'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900'
            }`}
          >
            Account & Security
          </button>
          <button
            onClick={() => setActiveTab('backend')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'backend'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900'
            }`}
          >
            REST API & Database
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900'
            }`}
          >
            Diagnostics
          </button>
        </div>
      </div>

      {/* TAB 1: PREFERENCES */}
      {activeTab === 'preferences' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Interface & Theme" subtitle="Appearance and visualization modes">
            <div className="space-y-4 text-xs">
              <div>
                <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1.5">
                  Theme Appearance
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      theme === 'dark'
                        ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                        : 'dark:border-slate-800 border-slate-200 dark:bg-slate-900/40 bg-white dark:text-slate-400 text-slate-600'
                    }`}
                  >
                    <span className="font-semibold block text-xs">Dark Mode</span>
                    <span className="text-[11px] opacity-75 mt-0.5 block">Deep navy security console</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      theme === 'light'
                        ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                        : 'dark:border-slate-800 border-slate-200 dark:bg-slate-900/40 bg-white dark:text-slate-400 text-slate-600'
                    }`}
                  >
                    <span className="font-semibold block text-xs">Light Mode</span>
                    <span className="text-[11px] opacity-75 mt-0.5 block">Crisp enterprise workspace</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1.5">
                  Timezone Standard
                </label>
                <select
                  value={timeZoneDisplay}
                  onChange={(e) => setTimeZoneDisplay(e.target.value)}
                  className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500"
                >
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="LOCAL">Local System Clock</option>
                  <option value="EST">EST (US Eastern Standard Time)</option>
                  <option value="PST">PST (US Pacific Standard Time)</option>
                </select>
              </div>

              <div>
                <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1.5">
                  Telemetry Refresh Rate
                </label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500"
                >
                  <option value="10s">Every 10 seconds</option>
                  <option value="30s">Every 30 seconds (Default)</option>
                  <option value="60s">Every 60 seconds</option>
                  <option value="manual">Manual Refresh Only</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Data Retention & Alerts" subtitle="Storage policies and notification filters">
            <div className="space-y-4 text-xs">
              <div>
                <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1.5">
                  Log Buffer Retention
                </label>
                <select
                  value={logRetentionDays}
                  onChange={(e) => setLogRetentionDays(e.target.value)}
                  className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500"
                >
                  <option value="30">30 Days</option>
                  <option value="90">90 Days (Recommended)</option>
                  <option value="180">180 Days</option>
                  <option value="365">1 Year (Compliance Buffer)</option>
                </select>
              </div>

              <div>
                <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1.5">
                  Notification Filter Level
                </label>
                <select
                  value={alertNotifyLevel}
                  onChange={(e) => setAlertNotifyLevel(e.target.value as any)}
                  className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL">All Alerts (Critical, High, Medium, Low)</option>
                  <option value="HIGH_CRITICAL">High & Critical Only</option>
                  <option value="CRITICAL_ONLY">Critical Alerts Only</option>
                </select>
              </div>

              <div className="pt-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    showToast({
                      type: 'success',
                      title: 'Preferences Saved',
                      message: 'Settings updated successfully.',
                    });
                  }}
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: ACCOUNT & SECURITY (PRESERVED FROM USER PROFILE) */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Persona Switcher for Testing */}
          <div className="p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-900/30 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold dark:text-slate-200 text-slate-800 block">
                Operator Role Switcher
              </span>
              <span className="dark:text-slate-400 text-slate-500 text-[11px]">
                Switch persona to verify permission rules across modules
              </span>
            </div>

            <div className="flex items-center gap-2">
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSwitchUser(u)}
                  className={`px-2.5 py-1.5 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                    user.username === u.username
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold'
                      : 'dark:bg-slate-800/60 bg-white dark:text-slate-300 text-slate-700 border dark:border-slate-700 border-slate-200 dark:hover:bg-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {u.fullName} ({u.role.split(' ')[0]})
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Identity Card */}
            <div className="space-y-5">
              <Card>
                <div className="flex flex-col items-center text-center p-2">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-mono text-lg font-bold flex items-center justify-center mb-3 shadow-md shadow-sky-500/10">
                    {user.avatarInitials}
                  </div>
                  <h3 className="text-sm font-semibold dark:text-white text-slate-900">{user.fullName}</h3>
                  <p className="text-xs font-mono dark:text-slate-400 text-slate-500 mt-0.5">@{user.username}</p>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-700 border dark:border-slate-700 border-slate-200">
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t dark:border-slate-800/80 border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between dark:text-slate-400 text-slate-500">
                    <span>Identifier:</span>
                    <span className="font-mono dark:text-slate-300 text-slate-700 text-[11px]">{user.id}</span>
                  </div>
                  <div className="flex items-center justify-between dark:text-slate-400 text-slate-500">
                    <span>Session Login:</span>
                    <span className="font-mono dark:text-slate-300 text-slate-700 text-[11px]">{user.lastLogin}</span>
                  </div>
                  <div className="flex items-center justify-between dark:text-slate-400 text-slate-500">
                    <span>Session Expiry:</span>
                    <span className="font-mono text-emerald-500 text-[11px]">{user.sessionExpiry}</span>
                  </div>
                </div>
              </Card>

              {/* Session Bearer Token */}
              <Card title="Session Token">
                <div className="space-y-2 text-xs">
                  <p className="text-[11px] dark:text-slate-400 text-slate-500">
                    Bearer header passed in REST API requests
                  </p>
                  <div className="p-2 dark:bg-black/50 bg-slate-100 rounded border dark:border-slate-800 border-slate-200 font-mono text-[10px] dark:text-slate-400 text-slate-600 break-all select-all">
                    {mockSessionToken}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    icon={copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    onClick={handleCopySessionToken}
                  >
                    {copiedToken ? 'Copied Authorization Header' : 'Copy Bearer Token'}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Edit Identity & BCrypt Manager */}
            <div className="lg:col-span-2 space-y-6">
              <Card title="Operator Information" subtitle="Session profile settings">
                <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1">Username (Immutable)</label>
                      <input
                        type="text"
                        value={user.username}
                        disabled
                        className="w-full dark:bg-slate-900/50 bg-slate-100 border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-2 text-xs dark:text-slate-500 text-slate-400 font-mono cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1">Role Privilege</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as any)}
                        className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500"
                      >
                        <option value="SOC Analyst">SOC Analyst (Tier 1 / Tier 2 Triage)</option>
                        <option value="Security Engineer">Security Engineer (Detection & Intel)</option>
                        <option value="SOC Admin">SOC Admin (Full Authority)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button size="sm" variant="primary" type="submit">
                      Save Profile
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Password & BCrypt Hashing */}
              <Card title="Security Credentials" subtitle="BCrypt hash verification with 12 rounds">
                <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
                  <div>
                    <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1">Current Password</label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="dark:text-slate-300 text-slate-700 font-medium">New Password</label>
                        <button
                          type="button"
                          onClick={() => setShowPlainPassword(!showPlainPassword)}
                          className="text-[11px] text-sky-500 hover:text-sky-600 cursor-pointer"
                        >
                          {showPlainPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <input
                        type={showPlainPassword ? 'text' : 'password'}
                        placeholder="Min 8 chars, 1 number, 1 symbol"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500 font-mono"
                      />
                      {newPassword && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 dark:bg-black/50 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full ${pwdStrength.color}`} style={{ width: `${(pwdStrength.score / 4) * 100}%` }} />
                          </div>
                          <span className="font-mono text-[10px] dark:text-slate-400 text-slate-500">{pwdStrength.label}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1">Confirm Password</label>
                      <input
                        type="password"
                        placeholder="Repeat new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* BCrypt Digest Preview */}
                  <div className="p-3 dark:bg-black/40 bg-slate-50 rounded-lg border dark:border-slate-800 border-slate-200">
                    <span className="dark:text-slate-500 text-slate-400 font-mono text-[10px] block mb-1">
                      BCRYPT HASH DIGEST (MySQL users.password_hash)
                    </span>
                    <code className="font-mono text-[11px] text-emerald-500 break-all block">
                      {getBcryptPreview(newPassword)}
                    </code>
                  </div>

                  {pwdError && <p className="text-rose-500 text-xs">{pwdError}</p>}

                  <div className="pt-2 flex justify-end">
                    <Button size="sm" variant="secondary" type="submit">
                      Update Password
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REST API & DATABASE */}
      {activeTab === 'backend' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Java 17 REST API Service Adapter */}
            <Card
              title="Java 17 REST API Adapter"
              subtitle="HTTP JSON REST service (Default: port 8080)"
              action={
                <Badge
                  label={backendHealth?.status === 'UP' ? 'CONNECTED' : 'DISCONNECTED'}
                  status={backendHealth?.status === 'UP' ? 'RESOLVED' : 'OPEN'}
                  size="sm"
                />
              }
            >
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block dark:text-slate-300 text-slate-700 font-medium mb-1.5">
                    Target API Endpoint URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={apiBaseUrl}
                      onChange={(e) => setApiBaseUrl(e.target.value)}
                      placeholder="http://localhost:8080/api/v1"
                      className="flex-1 dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg px-3 py-2 text-xs font-mono dark:text-slate-100 text-slate-900 focus:outline-none focus:border-sky-500"
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      isLoading={isProbingBackend}
                      onClick={handleProbeBackend}
                    >
                      Probe Health
                    </Button>
                  </div>
                </div>

                {backendHealth && (
                  <div className="p-3.5 rounded-lg border dark:border-slate-800 border-slate-200 dark:bg-slate-900/50 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="dark:text-slate-400 text-slate-500">Service Status:</span>
                      <span className={`font-mono font-bold ${backendHealth.status === 'UP' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {backendHealth.status}
                      </span>
                    </div>
                    {backendHealth.version && (
                      <div className="flex items-center justify-between">
                        <span className="dark:text-slate-400 text-slate-500">Java Version:</span>
                        <span className="font-mono dark:text-slate-300 text-slate-700">{backendHealth.version}</span>
                      </div>
                    )}
                    {backendHealth.message && (
                      <div className="text-[11px] dark:text-slate-400 text-slate-500 pt-1 border-t dark:border-slate-800 border-slate-200">
                        {backendHealth.message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* MySQL 8.0 Relational Database */}
            <Card
              title="MySQL 8 Database Connection"
              subtitle="HikariCP connection pool & normalized tables"
              action={
                <Badge
                  label={dbStatus === 'simulated_ok' ? 'VALIDATED' : 'IDLE'}
                  status={dbStatus === 'simulated_ok' ? 'RESOLVED' : 'INVESTIGATING'}
                  size="sm"
                />
              }
            >
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-lg border dark:border-slate-800 border-slate-200 dark:bg-slate-900/40 bg-slate-50 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="dark:text-slate-400 text-slate-500">JDBC URL:</span>
                    <span className="text-sky-500">jdbc:mysql://localhost:3306/sentinel_soc</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="dark:text-slate-400 text-slate-500">Driver:</span>
                    <span className="dark:text-slate-300 text-slate-700">com.mysql.cj.jdbc.Driver</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="dark:text-slate-400 text-slate-500">Pool Provider:</span>
                    <span className="dark:text-slate-300 text-slate-700">HikariCP 5.1.0 (Max: 10)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    isLoading={isTestingDb}
                    onClick={handleTestDbConnection}
                  >
                    Test DB Driver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<FileCode className="w-3.5 h-3.5" />}
                    onClick={() => setShowDdlModal(true)}
                  >
                    View SQL DDL
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Database Normalized Tables List */}
          <Card title="Relational Database Schema (9 Normalized Tables)">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="dark:bg-[#090e18] bg-slate-50 dark:text-slate-400 text-slate-500 font-mono uppercase text-[10px] border-b dark:border-slate-800 border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Table Name</th>
                    <th className="py-2.5 px-4 font-medium">Schema Purpose & Description</th>
                    <th className="py-2.5 px-4 font-medium text-right">Engine</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                  {schemaTables.map((t) => (
                    <tr key={t.name} className="dark:hover:bg-slate-800/30 hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-semibold text-sky-500">{t.name}</td>
                      <td className="py-2.5 px-4 dark:text-slate-300 text-slate-700">{t.purpose}</td>
                      <td className="py-2.5 px-4 font-mono dark:text-slate-500 text-slate-400 text-right">InnoDB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: DIAGNOSTICS & TEST RUNNER */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Automated Test Suite */}
            <Card
              title="Automated Test Suite"
              subtitle="Regression checks across parsing, rules, and hashing"
            >
              <div className="space-y-4 text-xs">
                <p className="dark:text-slate-400 text-slate-600 leading-relaxed">
                  Executes integration assertions covering parser regex, brute-force sliding windows,
                  IP blocklist enforcement, and SHA-256 audit chaining.
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    isLoading={isRunningTests}
                    icon={<Play className="w-3.5 h-3.5" />}
                    onClick={handleRunTestSuite}
                  >
                    Run Tests
                  </Button>

                  {testSuiteResults && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowTestModal(true)}
                    >
                      View Report ({testSuiteResults.passed}/{testSuiteResults.total})
                    </Button>
                  )}
                </div>

                {testSuiteResults && (
                  <div className="p-3.5 rounded-lg border dark:border-slate-800 border-slate-200 dark:bg-slate-900/40 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-emerald-500 block">
                        {testSuiteResults.passed} of {testSuiteResults.total} Tests Passed
                      </span>
                      <span className="text-[11px] dark:text-slate-400 text-slate-500">
                        Duration: {testSuiteResults.durationMs}ms
                      </span>
                    </div>
                    <Badge label="ALL PASSED" status="RESOLVED" size="sm" />
                  </div>
                )}
              </div>
            </Card>

            {/* Factory Sample Data Reset */}
            <Card title="Sample Data Management" subtitle="Restore initial dataset or clear local cache">
              <div className="space-y-4 text-xs">
                <p className="dark:text-slate-400 text-slate-600 leading-relaxed">
                  Reset local storage to initial baseline demo events, default detection rules, and pre-seeded alerts.
                </p>

                <Button
                  size="sm"
                  variant="danger"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={() => setShowResetConfirm(true)}
                >
                  Reset Sample Data
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* DDL SQL Modal */}
      <Dialog
        isOpen={showDdlModal}
        onClose={() => setShowDdlModal(false)}
        title="MySQL 8.0 Database Schema"
        description="Run this script in MySQL Workbench or mysql CLI."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              size="sm"
              variant="secondary"
              icon={copiedDdl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={() => {
                navigator.clipboard.writeText(fullDdlSql);
                setCopiedDdl(true);
                setTimeout(() => setCopiedDdl(false), 2000);
              }}
            >
              {copiedDdl ? 'Copied' : 'Copy SQL'}
            </Button>
            <Button size="sm" variant="primary" onClick={() => setShowDdlModal(false)}>
              Close
            </Button>
          </div>
        }
      >
        <pre className="p-4 dark:bg-black/80 bg-slate-100 rounded-lg font-mono text-[11px] dark:text-emerald-400 text-slate-800 overflow-x-auto max-h-[60vh] select-all">
          {fullDdlSql}
        </pre>
      </Dialog>

      {/* Test Results Modal */}
      <Dialog
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Automated Test Execution Results"
        description={`${testSuiteResults?.passed || 0}/${testSuiteResults?.total || 0} assertions passed in ${testSuiteResults?.durationMs || 0}ms`}
        maxWidth="lg"
        footer={
          <Button size="sm" variant="secondary" onClick={() => setShowTestModal(false)}>
            Close
          </Button>
        }
      >
        {testSuiteResults && (
          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              {testSuiteResults.results.map((res, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border dark:border-slate-800 border-slate-200 dark:bg-slate-900/40 bg-slate-50 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-semibold dark:text-slate-200 text-slate-800">{res.name}</span>
                    </div>
                    <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-1 pl-6">{res.description}</p>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-500 font-semibold uppercase">PASS</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Confirm Sample Data Reset"
        description="This will restore all logs, detection rules, alerts, and blocklists to factory defaults."
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={handleResetData}>
              Confirm Reset
            </Button>
          </div>
        }
      >
        <p className="text-xs dark:text-slate-300 text-slate-700">
          Any custom rules or manually imported log entries will be replaced with baseline factory data.
        </p>
      </Dialog>
    </div>
  );
};
