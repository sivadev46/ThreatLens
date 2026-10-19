import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Play,
  Plus,
  BookOpen,
  Trash2,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { securityService } from '../services/securityService';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Dialog } from '../components/common/Dialog';
import { useToast } from '../components/common/NotificationToast';
import { DetectionRule, AlertSeverity, EventType } from '../types/security';

export const DetectionRulesPage: React.FC = () => {
  const { showToast } = useToast();
  const [rules, setRules] = useState<DetectionRule[]>([]);

  // Expandable rule logic state
  const [expandedRuleIds, setExpandedRuleIds] = useState<Set<string>>(new Set());

  // Edit / Calibrate rule state
  const [editingRule, setEditingRule] = useState<DetectionRule | null>(null);
  const [thresholdValue, setThresholdValue] = useState<number>(5);
  const [windowSeconds, setWindowSeconds] = useState<number>(60);
  const [ruleSeverity, setRuleSeverity] = useState<AlertSeverity>('HIGH');

  // Dry run testing state
  const [testingRule, setTestingRule] = useState<DetectionRule | null>(null);
  const [dryRunningRuleId, setDryRunningRuleId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    matches: number;
    simulatedAlerts: number;
    details: string[];
  } | null>(null);

  // Technical logic / Architecture specs modal
  const [explainingRule, setExplainingRule] = useState<DetectionRule | null>(null);

  // Create Custom Rule state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState('RULE_');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEventType, setNewEventType] = useState<EventType | 'ALL'>('HTTP_REQUEST');
  const [newThreshold, setNewThreshold] = useState<number>(20);
  const [newWindow, setNewWindow] = useState<number>(30);
  const [newSeverity, setNewSeverity] = useState<AlertSeverity>('MEDIUM');
  const [createError, setCreateError] = useState('');

  // Delete rule target
  const [deleteTarget, setDeleteTarget] = useState<DetectionRule | null>(null);

  const refreshRules = () => setRules(securityService.getRules());

  useEffect(() => {
    refreshRules();
    return securityService.subscribe(refreshRules);
  }, []);

  const activeCount = rules.filter((r) => r.enabled).length;

  const toggleLogic = (ruleId: string) => {
    setExpandedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const handleToggle = (rule: DetectionRule) => {
    const willEnable = !rule.enabled;
    const success = securityService.toggleRule(rule.id);
    if (success) {
      showToast({
        type: willEnable ? 'success' : 'info',
        title: willEnable ? 'Rule Activated' : 'Rule Deactivated',
        message: `${rule.name} is now ${willEnable ? 'monitoring traffic' : 'disabled'}.`,
      });
    }
  };

  const handleOpenEdit = (rule: DetectionRule) => {
    setEditingRule(rule);
    setThresholdValue(rule.thresholdValue);
    setWindowSeconds(rule.timeWindowSeconds);
    setRuleSeverity(rule.severity);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    if (thresholdValue <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid Threshold',
        message: 'Threshold value must be greater than zero.',
      });
      return;
    }

    const success = securityService.updateRuleParameters(editingRule.id, {
      thresholdValue,
      timeWindowSeconds: windowSeconds,
      severity: ruleSeverity,
    });

    if (success) {
      showToast({
        type: 'success',
        title: 'Rule Calibrated',
        message: `Updated ${editingRule.code} threshold to ${thresholdValue} events in ${windowSeconds}s.`,
      });
      setEditingRule(null);
    }
  };

  const handleRunDryRun = (rule: DetectionRule) => {
    setDryRunningRuleId(rule.id);
    setTimeout(() => {
      const result = securityService.testRuleDryRun(rule.id);
      setTestingRule(rule);
      setTestResult(result);
      setDryRunningRuleId(null);
      showToast({
        type: 'info',
        title: 'Dry Run Complete',
        message: `Simulated ${result.matches} events for ${rule.name}.`,
      });
    }, 200);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newCode.trim().startsWith('RULE_')) {
      setCreateError('Rule code must start with RULE_ (e.g. RULE_ADMIN_BURST)');
      return;
    }

    if (!newName.trim() || !newDescription.trim()) {
      setCreateError('Please provide both rule name and descriptive explanation.');
      return;
    }

    const res = securityService.addCustomRule({
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      description: newDescription.trim(),
      severity: newSeverity,
      enabled: true,
      thresholdValue: newThreshold,
      timeWindowSeconds: newWindow,
      targetEventType: newEventType,
      triggerConditionExplanation: `Triggers when ${newThreshold} ${newEventType} events occur within ${newWindow}s sliding window.`,
    });

    if (!res.success) {
      setCreateError(res.error || 'Failed to create detection rule.');
      return;
    }

    showToast({
      type: 'success',
      title: 'Rule Created',
      message: `${newCode} is now active in the correlation pipeline.`,
    });

    setShowCreateModal(false);
    setNewCode('RULE_');
    setNewName('');
    setNewDescription('');
  };

  const handleDeleteRule = () => {
    if (!deleteTarget) return;
    const res = securityService.deleteRule(deleteTarget.id);
    if (!res.success) {
      showToast({
        type: 'error',
        title: 'Cannot Delete Rule',
        message: res.error || 'Operation disallowed.',
      });
    } else {
      showToast({
        type: 'warning',
        title: 'Rule Deleted',
        message: `Deleted custom rule ${deleteTarget.code}.`,
      });
    }
    setDeleteTarget(null);
  };

  const formatThresholdWindow = (rule: DetectionRule): string => {
    if (rule.timeWindowSeconds === 0) {
      return '1 matching event';
    }
    if (rule.targetEventType === 'LOGIN_FAILED') {
      return `${rule.thresholdValue} failures / ${rule.timeWindowSeconds}s`;
    }
    if (rule.targetEventType === 'HTTP_REQUEST') {
      return `${rule.thresholdValue}+ requests / ${rule.timeWindowSeconds}s`;
    }
    return `${rule.thresholdValue} events / ${rule.timeWindowSeconds}s`;
  };

  return (
    <div className="space-y-5">
      {/* 2. Simplified Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b dark:border-[#243247] border-[#E2E8F0]">
        <div>
          <h1 className="text-xl font-bold tracking-tight dark:text-[#F1F5F9] text-[#172033]">
            Detection Rules
          </h1>
          <p className="text-xs dark:text-[#94A3B8] text-[#64748B] mt-0.5">
            Manage threat detection.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium dark:bg-[#151F30] bg-[#F4F7FB] border dark:border-[#243247] border-[#E2E8F0] dark:text-[#94A3B8] text-[#64748B]">
            <span className="w-2 h-2 rounded-full bg-[#34D399]" />
            <span className="font-mono tabular-nums dark:text-[#F1F5F9] text-[#172033] font-semibold">
              {activeCount} of {rules.length} active
            </span>
          </div>

          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setCreateError('');
              setShowCreateModal(true);
            }}
          >
            Create Rule
          </Button>
        </div>
      </div>

      {/* 3 & 4. Redesigned Detection Rule Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {rules.map((rule) => {
          const isCoreRule = [
            'RULE_BRUTE_FORCE',
            'RULE_REQUEST_BURST',
            'RULE_BLOCKLIST_IP',
          ].includes(rule.code);

          return (
            <div
              key={rule.id}
              className={`rounded-xl border transition-all ${
                rule.enabled
                  ? 'dark:bg-[#101827] bg-white dark:border-[#243247] border-[#E2E8F0] shadow-xs hover:border-sky-500/40'
                  : 'dark:bg-[#101827]/60 bg-slate-50/70 dark:border-[#243247]/50 border-[#E2E8F0] opacity-80'
              }`}
            >
              <div className="p-4 sm:p-5 space-y-3.5">
                {/* Top Row: Name, Code, Badges, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b dark:border-[#243247]/60 border-[#E2E8F0]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        rule.enabled
                          ? 'dark:bg-sky-500/10 bg-sky-50 dark:text-[#38BDF8] text-[#0284C7]'
                          : 'dark:bg-slate-800 bg-slate-100 dark:text-slate-500 text-slate-400'
                      }`}
                    >
                      {rule.enabled ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <ShieldAlert className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm dark:text-[#F1F5F9] text-[#172033]">
                          {rule.name}
                        </h3>
                        <span className="font-mono text-[11px] dark:text-[#94A3B8] text-[#64748B]">
                          {rule.code}
                        </span>
                        {isCoreRule && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded dark:bg-[#151F30] bg-slate-100 dark:text-[#94A3B8] text-[#64748B] border dark:border-[#243247] border-[#E2E8F0]">
                            Core
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge severity={rule.severity} label={rule.severity} size="sm" />
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${
                        rule.enabled
                          ? 'dark:bg-emerald-500/10 bg-emerald-50 dark:text-[#34D399] text-emerald-700 dark:border-emerald-500/20 border-emerald-200'
                          : 'dark:bg-slate-800/60 bg-slate-100 dark:text-[#94A3B8] text-slate-500 dark:border-[#243247] border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          rule.enabled ? 'bg-[#34D399]' : 'bg-slate-400'
                        }`}
                      />
                      <span>{rule.enabled ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>
                </div>

                {/* Main Content: Description */}
                <p className="text-xs dark:text-[#94A3B8] text-[#64748B] leading-relaxed">
                  {rule.description}
                </p>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 p-2.5 sm:p-3 rounded-lg dark:bg-[#151F30] bg-[#F4F7FB] border dark:border-[#243247]/70 border-[#E2E8F0]">
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wider dark:text-[#94A3B8] text-[#64748B] block">
                      Threshold & Window
                    </span>
                    <span className="font-mono text-xs font-semibold dark:text-[#F1F5F9] text-[#172033] tabular-nums mt-0.5 block">
                      {formatThresholdWindow(rule)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wider dark:text-[#94A3B8] text-[#64748B] block">
                      Total Triggers
                    </span>
                    <span className="font-mono text-xs font-semibold dark:text-[#F1F5F9] text-[#172033] tabular-nums mt-0.5 block">
                      {rule.totalTriggerCount}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider dark:text-[#94A3B8] text-[#64748B] block">
                      Last Triggered
                    </span>
                    <span className="font-mono text-xs font-semibold dark:text-[#F1F5F9] text-[#172033] tabular-nums mt-0.5 block">
                      {rule.lastTriggered
                        ? `${rule.lastTriggered.substring(11, 19)} UTC`
                        : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Expandable "View logic" */}
                {expandedRuleIds.has(rule.id) && (
                  <div className="p-3 rounded-lg dark:bg-[#080C14] bg-slate-50 border dark:border-[#243247] border-[#E2E8F0] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider dark:text-[#94A3B8] text-[#64748B]">
                        Correlation Heuristic
                      </span>
                      <button
                        onClick={() => setExplainingRule(rule)}
                        className="text-[11px] font-medium dark:text-[#38BDF8] text-[#0284C7] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Specifications</span>
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-[#FBBF24] leading-relaxed">
                      {rule.triggerConditionExplanation}
                    </p>
                  </div>
                )}

                {/* Bottom Actions Row */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggleLogic(rule.id)}
                    className="inline-flex items-center gap-1 text-xs dark:text-[#38BDF8] text-[#0284C7] hover:underline cursor-pointer font-medium"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>
                      {expandedRuleIds.has(rule.id) ? 'Hide logic' : 'View logic'}
                    </span>
                    {expandedRuleIds.has(rule.id) ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Play className="w-3 h-3" />}
                      isLoading={dryRunningRuleId === rule.id}
                      onClick={() => handleRunDryRun(rule)}
                    >
                      Dry Run
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Sliders className="w-3 h-3" />}
                      onClick={() => handleOpenEdit(rule)}
                    >
                      Configure
                    </Button>

                    <Button
                      size="sm"
                      variant={rule.enabled ? 'outline' : 'primary'}
                      onClick={() => handleToggle(rule)}
                    >
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </Button>

                    {!isCoreRule && (
                      <button
                        onClick={() => setDeleteTarget(rule)}
                        className="p-1.5 dark:text-[#94A3B8] text-[#64748B] hover:text-[#FB7185] rounded transition-colors cursor-pointer"
                        title="Delete custom rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog 1: Configure / Calibrate Parameters */}
      <Dialog
        isOpen={!!editingRule}
        onClose={() => setEditingRule(null)}
        title={`Configure Rule: ${editingRule?.name}`}
        description={`Code: ${editingRule?.code}`}
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditingRule(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>
              Save Configuration
            </Button>
          </>
        }
      >
        {editingRule && (
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div>
              <label className="block dark:text-[#F1F5F9] text-[#172033] font-medium mb-1">
                Threshold Count (Events)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(parseInt(e.target.value, 10) || 1)}
                className="w-full dark:bg-[#151F30] bg-white border dark:border-[#243247] border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs dark:text-[#F1F5F9] text-[#172033] font-mono focus:outline-none focus:border-[#38BDF8]"
              />
              <span className="text-[11px] dark:text-[#94A3B8] text-[#64748B] mt-1 block">
                Number of matched events required before an alert fires.
              </span>
            </div>

            <div>
              <label className="block dark:text-[#F1F5F9] text-[#172033] font-medium mb-1">
                Rolling Time Window (Seconds)
              </label>
              <input
                type="number"
                min="0"
                max="3600"
                value={windowSeconds}
                onChange={(e) => setWindowSeconds(parseInt(e.target.value, 10) || 0)}
                className="w-full dark:bg-[#151F30] bg-white border dark:border-[#243247] border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs dark:text-[#F1F5F9] text-[#172033] font-mono focus:outline-none focus:border-[#38BDF8]"
              />
              <span className="text-[11px] dark:text-[#94A3B8] text-[#64748B] mt-1 block">
                Sliding evaluation window in seconds (0 = immediate single event match).
              </span>
            </div>

            <div>
              <label className="block dark:text-[#F1F5F9] text-[#172033] font-medium mb-1">
                Triggered Alert Severity
              </label>
              <select
                value={ruleSeverity}
                onChange={(e) => setRuleSeverity(e.target.value as AlertSeverity)}
                className="w-full dark:bg-[#151F30] bg-white border dark:border-[#243247] border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs dark:text-[#F1F5F9] text-[#172033] focus:outline-none cursor-pointer"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </form>
        )}
      </Dialog>

      {/* Dialog 2: Dry Run Evaluation Results */}
      <Dialog
        isOpen={!!testingRule}
        onClose={() => {
          setTestingRule(null);
          setTestResult(null);
        }}
        title={`Dry Run: ${testingRule?.name}`}
        description="Correlation simulation against current in-memory log buffer."
        maxWidth="lg"
        footer={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setTestingRule(null);
              setTestResult(null);
            }}
          >
            Close
          </Button>
        }
      >
        {testingRule && testResult && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 dark:bg-[#151F30] bg-[#F4F7FB] rounded-lg border dark:border-[#243247] border-[#E2E8F0]">
              <div>
                <span className="dark:text-[#94A3B8] text-[#64748B] font-mono text-[10px]">
                  Total Log Matches
                </span>
                <p className="font-mono dark:text-[#F1F5F9] text-[#172033] font-bold text-sm mt-0.5">
                  {testResult.matches} events
                </p>
              </div>
              <div>
                <span className="dark:text-[#94A3B8] text-[#64748B] font-mono text-[10px]">
                  Simulated Alerts Triggered
                </span>
                <p className="font-mono text-[#FB7185] font-bold text-sm mt-0.5">
                  {testResult.simulatedAlerts} incidents
                </p>
              </div>
            </div>

            <div>
              <span className="dark:text-[#F1F5F9] text-[#172033] font-semibold block mb-2">
                Simulated Correlation Breakdown
              </span>
              <div className="p-3 dark:bg-[#080C14] bg-slate-50 rounded-lg border dark:border-[#243247] border-[#E2E8F0] font-mono text-[11px] space-y-1.5 max-h-60 overflow-y-auto">
                {testResult.details.map((detail, idx) => (
                  <div key={idx} className="dark:text-[#F1F5F9] text-[#172033]">
                    &bull; {detail}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Dialog 3: Architecture Specs */}
      <Dialog
        isOpen={!!explainingRule}
        onClose={() => setExplainingRule(null)}
        title={`Correlation Specs: ${explainingRule?.code}`}
        description="Sliding-window algorithm and query logic."
        maxWidth="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setExplainingRule(null)}>
            Close
          </Button>
        }
      >
        {explainingRule && (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-3 rounded-lg dark:bg-[#151F30] bg-sky-50 border dark:border-[#243247] border-sky-200 dark:text-[#38BDF8] text-[#0284C7]">
              <h4 className="font-semibold dark:text-[#38BDF8] text-[#0284C7] mb-1">
                Sliding-Window Correlation Principle
              </h4>
              <p className="text-[11px] dark:text-[#94A3B8] text-[#64748B]">
                Events are evaluated over a rolling window where each new log event looks back exactly{' '}
                <span className="font-mono text-[#FBBF24] font-bold">
                  {explainingRule.timeWindowSeconds}s
                </span>{' '}
                from its own timestamp.
              </p>
            </div>

            <div>
              <h4 className="dark:text-[#F1F5F9] text-[#172033] font-semibold mb-1">
                Java Sliding-Window Implementation
              </h4>
              <pre className="p-3 dark:bg-[#080C14] bg-slate-100 rounded-lg border dark:border-[#243247] border-[#E2E8F0] font-mono text-[11px] dark:text-[#F1F5F9] text-[#172033] overflow-x-auto">
{`Map<String, Deque<Long>> ipEventWindows = new ConcurrentHashMap<>();

public boolean evaluate(LogEntry entry) {
    long now = entry.getTimestampMillis();
    long windowCutoff = now - (${explainingRule.timeWindowSeconds} * 1000L);
    Deque<Long> window = ipEventWindows.computeIfAbsent(entry.getSourceIp(), k -> new ArrayDeque<>());
    synchronized(window) {
        while (!window.isEmpty() && window.peekFirst() < windowCutoff) {
            window.pollFirst();
        }
        window.addLast(now);
        return window.size() >= ${explainingRule.thresholdValue};
    }
}`}
              </pre>
            </div>
          </div>
        )}
      </Dialog>

      {/* Dialog 4: Create Custom Rule */}
      <Dialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Detection Rule"
        description="Define a new correlation heuristic."
        maxWidth="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateSubmit}>
              Create Rule
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block dark:text-[#F1F5F9] text-[#172033] font-medium mb-1">
                Rule Code <span className="text-[#FB7185]">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. RULE_ADMIN_BURST"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="w-full dark:bg-[#151F30] bg-white border dark:border-[#243247] border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs dark:text-[#F1F5F9] text-[#172033] font-mono focus:outline-none focus:border-[#38BDF8]"
              />
            </div>

            <div>
              <label className="block dark:text-[#F1F5F9] text-[#172033] font-medium mb-1">
                Severity Level
              </label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as AlertSeverity)}
                className="w-full dark:bg-[#151F30] bg-white border dark:border-[#243247] border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs dark:text-[#F1F5F9] text-[#172033] focus:outline-none cursor-pointer"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block dark:text-[#F1F5F9] text-[#172033] font-medium mb-1">
              Rule Name <span className="text-[#FB7185]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Rapid Admin Portal Access Burst"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full dark:bg-[#151F30] bg-white border dark:border-[#243247] border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs dark:text-[#F1F5F9] text-[#172033] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          <div>
            <label className="block dark:text-[#F1F5F9] text-[#172033] font-medium mb-1">
              Description <span className="text-[#FB7185]">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Describe the intrusion pattern..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full dark:bg-[#151F30] bg-white border dark:border-[#243247] border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs dark:text-[#F1F5F9] text-[#172033] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block dark:text-[#F1F5F9] text-[#172033] font-medium mb-1">
                Event Type
              </label>
              <select
                value={newEventType}
                onChange={(e) => setNewEventType(e.target.value as any)}
                className="w-full dark:bg-[#151F30] bg-white border dark:border-[#243247] border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs dark:text-[#F1F5F9] text-[#172033] focus:outline-none font-mono cursor-pointer"
              >
                <option value="ALL">ALL Events</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="HTTP_REQUEST">HTTP_REQUEST</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              </select>
            </div>

            <div>
              <label className="block dark:text-[#F1F5F9] text-[#172033] font-medium mb-1">
                Threshold
              </label>
              <input
                type="number"
                min="1"
                value={newThreshold}
                onChange={(e) => setNewThreshold(parseInt(e.target.value, 10) || 1)}
                className="w-full dark:bg-[#151F30] bg-white border dark:border-[#243247] border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs dark:text-[#F1F5F9] text-[#172033] font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block dark:text-[#F1F5F9] text-[#172033] font-medium mb-1">
                Window (Seconds)
              </label>
              <input
                type="number"
                min="1"
                value={newWindow}
                onChange={(e) => setNewWindow(parseInt(e.target.value, 10) || 1)}
                className="w-full dark:bg-[#151F30] bg-white border dark:border-[#243247] border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs dark:text-[#F1F5F9] text-[#172033] font-mono focus:outline-none"
              />
            </div>
          </div>

          {createError && <p className="text-[#FB7185] text-xs">{createError}</p>}
        </form>
      </Dialog>

      {/* Dialog 5: Delete Custom Rule */}
      <Dialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Rule"
        maxWidth="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteRule}>
              Delete
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-xs dark:text-[#F1F5F9] text-[#172033]">
            Permanently delete rule{' '}
            <span className="font-mono font-bold text-[#FB7185]">
              {deleteTarget.code}
            </span>{' '}
            ({deleteTarget.name})?
          </p>
        )}
      </Dialog>
    </div>
  );
};
